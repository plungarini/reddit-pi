import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import Fastify from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { config, ensureDataDirs } from './config';
import { getSchedule, startCron } from './cron';
import { getBatchHistory, getCurrentBatch, getPost, recordInteraction, resetSubredditScores } from './db/queries';
import { getDb } from './db/schema';
import { getAllSubredditScores, updateSubredditScore } from './engine/preferences';
import { globalLogger } from './logger';
import { getPipelineStatus, runPipeline } from './pipeline';
import { hidePost, upvotePost } from './reddit/actions';
import { initRedditClient, isRedditAuthenticated } from './reddit/auth';

ensureDataDirs();

const app = Fastify({
	logger: {
		transport: { target: 'pino-pretty', options: { colorize: true } },
	},
});

// ── Health ─────────────────────────────────────────────────────────────────────

app.get('/api/health', async () => ({
	ok: true,
	uptime: process.uptime(),
	pipeline: getPipelineStatus(),
}));

// ── Pipeline (manual trigger) ─────────────────────────────────────────────────

app.post('/api/pipeline/run', async (_req, reply) => {
	const status = getPipelineStatus();
	if (status.isRunning) {
		return reply.code(409).send({ error: 'Pipeline already running' });
	}

	// Fire and don't await — returns immediately
	runPipeline().catch((err) => globalLogger.error(`Pipeline failed: ${err.message}`));

	return { ok: true, message: 'Pipeline started' };
});

// ── Batches ────────────────────────────────────────────────────────────────────

app.get('/api/current-batch', async (_req, reply) => {
	const batch = getCurrentBatch();
	if (!batch) return reply.code(404).send({ error: 'No batches yet. Run the pipeline first.' });
	return batch;
});

app.get('/api/history', async (req) => {
	const query = req.query as any;
	return getBatchHistory(Number.parseInt(query.limit || '20', 10));
});

// ── Post interactions ─────────────────────────────────────────────────────────

app.post('/api/posts/:id/like', async (req, reply) => {
	const { id } = req.params as { id: string };

	const post = getPost(id);
	if (!post) return reply.code(404).send({ error: 'Post not found' });

	recordInteraction(id, 'like');

	// Immediate Reddit action for responsiveness
	try {
		await upvotePost(post.fullname);
	} catch (err) {
		globalLogger.error(`Failed to upvote ${id} on Reddit: ${err}`);
	}

	return { ok: true, action: 'like', postId: id };
});

app.post('/api/posts/:id/dislike', async (req, reply) => {
	const { id } = req.params as { id: string };
	const body = req.body as any;

	const post = getPost(id);
	if (!post) return reply.code(404).send({ error: 'Post not found' });

	recordInteraction(id, 'dislike', undefined, body?.reason, body?.tags);

	// Immediate Reddit action for responsiveness
	try {
		await hidePost(post.fullname);
	} catch (err) {
		globalLogger.error(`Failed to hide ${id} on Reddit: ${err}`);
	}

	return { ok: true, action: 'dislike', postId: id };
});

// ── Preferences ───────────────────────────────────────────────────────────────

app.get('/api/preferences', async () => {
	return getAllSubredditScores();
});

app.post('/api/preferences/update', async (req) => {
	const { subreddit, isLike } = req.body as { subreddit: string; isLike: boolean };
	updateSubredditScore(subreddit, isLike);
	return { ok: true };
});

app.delete('/api/preferences', async () => {
	resetSubredditScores();
	return { ok: true };
});

// ── Status ────────────────────────────────────────────────────────────────────

app.get('/api/status', async () => {
	const db = getDb();
	const postsCount = (db.prepare('SELECT COUNT(*) as count FROM posts').get() as any).count;
	const interactionsCount = (db.prepare('SELECT COUNT(*) as count FROM interactions').get() as any).count;

	return {
		waOnline: true,
		redditValid: isRedditAuthenticated(),
		postsCount,
		interactionsCount,
		logs: globalLogger.getRecentLogs(25).reverse(),
		schedule: getSchedule(),
	};
});

app.get('/api/config', async () => {
	return {
		cronSchedule: config.cron.schedule,
		postsPerBatch: config.cron.postsPerBatch,
		candidatePoolSize: config.cron.candidatePoolSize,
	};
});

app.post('/api/config/update', async (req, reply) => {
	const body = req.body as { cronSchedule?: string; postsPerBatch?: number; candidatePoolSize?: number };

	// Simple validation
	if (body.postsPerBatch && (body.postsPerBatch < 5 || body.postsPerBatch > 50)) {
		return reply.code(400).send({ error: 'Posts per batch must be 5-50' });
	}
	if (body.candidatePoolSize && (body.candidatePoolSize < 50 || body.candidatePoolSize > 1500)) {
		return reply.code(400).send({ error: 'Pool size must be 50-1500' });
	}

	const { updatePersistentConfig } = await import('./config');
	const { rescheduleCron } = await import('./cron');

	updatePersistentConfig(body);
	if (body.cronSchedule) {
		rescheduleCron(body.cronSchedule);
	}

	return { ok: true };
});

// ── Start ─────────────────────────────────────────────────────────────────────

(async () => {
	try {
		await initRedditClient();
		await app.register(cors, { origin: true });

		// Serve built React UI (ui-dist/)
		const uiDistPath = path.join(process.cwd(), 'ui-dist');

		if (fs.existsSync(uiDistPath)) {
			await app.register(staticFiles, {
				root: uiDistPath,
				prefix: '/',
			});

			// SPA fallback — return index.html for all non-API routes
			app.setNotFoundHandler(async (req, reply) => {
				if (!req.url.startsWith('/api/')) {
					return reply.sendFile('index.html');
				}

				return reply.code(404).send({ error: 'Not found' });
			});
		}

		await app.listen({ port: config.port, host: '0.0.0.0' });

		globalLogger.info(`[server] reddit-pi running on port ${config.port}`);

		startCron();

		// Graceful Shutdown Handlers
		const shutdown = async (signal: string) => {
			globalLogger.info(`\n[server] Received ${signal}. Starting graceful shutdown...`);
			await app.close();
			await globalLogger.close();
			process.exit(0);
		};

		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));
	} catch (err) {
		globalLogger.error(err);
		process.exit(1);
	}
})();
