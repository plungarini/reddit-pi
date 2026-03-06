import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';
import { config, ensureDataDirs } from './config';
import { startCron } from './cron';
import { getAllSubredditScores, getBatchHistory, getCurrentBatch, getPost, recordInteraction } from './db';
import './logger.js'; // initialize global logger first
import { globalLogger } from './logger.js';
import { getPipelineStatus, runPipeline } from './pipeline';
import { initRedditClient } from './reddit/auth';

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
	runPipeline().catch(console.error);

	return { ok: true, message: 'Pipeline started' };
});

// ── Batches ────────────────────────────────────────────────────────────────────

app.get('/api/batches/current', async (_req, reply) => {
	const batch = getCurrentBatch();
	if (!batch) return reply.code(404).send({ error: 'No batches yet. Run the pipeline first.' });
	return batch;
});

app.get('/api/batches', async (req) => {
	const query = req.query as any;
	return { batches: getBatchHistory(parseInt(query.limit || '20', 10)) };
});

// ── Post interactions ─────────────────────────────────────────────────────────

app.post('/api/posts/:id/like', async (req, reply) => {
	const { id } = req.params as { id: string };

	const post = getPost(id);
	if (!post) return reply.code(404).send({ error: 'Post not found' });

	recordInteraction(id, 'like');

	return { ok: true, action: 'like', postId: id };
});

app.post('/api/posts/:id/dislike', async (req, reply) => {
	const { id } = req.params as { id: string };

	const body = req.body as any;

	const post = getPost(id);

	if (!post) return reply.code(404).send({ error: 'Post not found' });

	recordInteraction(id, 'dislike', undefined, body?.reason, body?.tags);

	return { ok: true, action: 'dislike', postId: id };
});

// ── Preferences ───────────────────────────────────────────────────────────────

app.get('/api/preferences', async () => ({
	subreddits: getAllSubredditScores(),
}));

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
				decorateReply: false,
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

		console.log(`[server] reddit-pi running on port ${config.port}`);

		startCron();

		// Graceful Shutdown Handlers
		const shutdown = async (signal: string) => {
			console.log(`\n[server] Received ${signal}. Starting graceful shutdown...`);

			// 1. Stop taking new requests
			await app.close();
			console.log('[server] Fastify server closed.');

			// 2. Wait for logger to flush its batch
			await globalLogger.close();
			console.log('[server] Logger flushed. Goodbye!');

			process.exit(0);
		};

		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));
	} catch (err) {
		app.log.error(err);

		process.exit(1);
	}
})();
