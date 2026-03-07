import { config } from './config';
import { createBatch, getInteractedPostIds, getSeenPostIds, markBatchNotified, upsertPost } from './db/queries';
import { applyDiversityFilter } from './engine/diversity';
import { upsertFingerprint } from './engine/fingerprint';
import { extractAndStoreKeywords, scorePosts } from './engine/scorer';
import { summarizePostComments } from './llm/summarize';
import './logger';
import { sendBatchNotification } from './notify/whatsapp';
import { hidePost, upvotePost } from './reddit/actions';
import { fetchHomeFeed } from './reddit/feed';
import type { ScoredPost } from './types';

let isRunning = false;
let lastRunAt: string | null = null;
let lastRunResult: string | null = null;

export function getPipelineStatus() {
	return { isRunning, lastRunAt, lastRunResult };
}

export async function runPipeline(): Promise<void> {
	if (isRunning) {
		console.log('[pipeline] Already running, skipping');
		return;
	}

	isRunning = true;
	const startTime = Date.now();
	console.log('[pipeline] ── Starting pipeline run ──');

	const { initRedditClient } = await import('./reddit/auth');
	await initRedditClient();

	try {
		// Step 1: Apply pending actions from previous batch
		await applyPendingActions();

		// Step 2: Fetch home feed
		const allPosts = await fetchHomeFeed(config.cron.candidatePoolSize);

		// Step 3: Filter seen & interacted posts
		const seenIds = getSeenPostIds(24);
		const interactedIds = getInteractedPostIds();
		const candidates = allPosts.filter((p) => !seenIds.has(p.id) && !interactedIds.has(p.id) && !p.isNsfw);

		console.log(`[pipeline] Candidates after filtering: ${candidates.length}`);

		if (!candidates.length) {
			lastRunResult = 'No new candidates';
			console.log('[pipeline] No candidates — aborting');
			return;
		}

		// Step 4: Score (Phase 1 — algorithmic)
		const scored = scorePosts(candidates);

		// Take enough candidates to fulfill postsPerBatch even after diversity filtering
		// Since each sub can have max 2, we need at least postsPerBatch / 2 subreddits.
		// We take postsPerBatch * 2 to be safe, capped at 30 to preserve performance on Pi.
		const selectionLimit = Math.min(config.cron.postsPerBatch * 2, 30);
		const topCandidates = scored.slice(0, selectionLimit);

		// Step 5: Enhance with LLM summaries (sequential on Pi to avoid connection overhead)
		console.log(`[pipeline] Fetching LLM summaries for ${topCandidates.length} candidates...`);

		const enhanced: Array<ScoredPost & { llmSummary?: string }> = [];
		for (const post of topCandidates) {
			try {
				const summary = await summarizePostComments(post.id, post.title);
				enhanced.push({ ...post, llmSummary: summary });
			} catch (err) {
				console.error(`[pipeline] LLM enhancement failed for ${post.id}:`, (err as Error).message);
				enhanced.push({ ...post });
			}
		}

		// Step 6: Diversity filter → top 5
		const final = applyDiversityFilter(enhanced, config.cron.postsPerBatch);

		console.log(`[pipeline] Final picks: ${final.map((p) => p.subreddit).join(', ')}`);

		// Step 7: Persist posts
		const now = new Date().toISOString();

		for (const post of final) {
			upsertPost({ ...post, fetchedAt: now });
			// Store fingerprint for future similarity checks
			const keywords = extractAndStoreKeywords(post);
			upsertFingerprint(post.id, keywords);
		}

		// Step 8: Create batch record
		const batchId = createBatch(
			final.map((p) => p.id),
			candidates.length,
		);
		console.log(`[pipeline] Batch ${batchId} created`);

		// Step 9: Send WhatsApp notification
		const notified = await sendBatchNotification(final as any);
		if (notified) markBatchNotified(batchId);

		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
		lastRunResult = `OK — batch ${batchId}, ${final.length} posts, ${elapsed}s`;
		lastRunAt = new Date().toISOString();

		console.log(`[pipeline] ── Complete in ${elapsed}s ──`);
	} catch (err) {
		lastRunResult = `Error: ${(err as Error).message}`;
		console.error('[pipeline] Error:', err);
	} finally {
		isRunning = false;
	}
}

async function applyPendingActions(): Promise<void> {
	// Get interactions that haven't been applied to Reddit yet
	// We apply the PREVIOUS batch's interactions so there's time to interact

	const db_module = await import('./db/schema');
	const rows = (db_module.getDb() as any)
		.prepare(
			`
    SELECT i.post_id, i.action, p.fullname
    FROM interactions i
    LEFT JOIN posts p ON i.post_id = p.id
    WHERE i.created_at > datetime('now', '-6 hours')
    ORDER BY i.created_at DESC
    LIMIT 20
  `,
		)
		.all() as any[];

	for (const row of rows) {
		try {
			// Reddit API requires fullnames (e.g. t3_abc123)
			const fullname = row.fullname || `t3_${row.post_id}`;

			if (row.action === 'like') {
				await upvotePost(fullname);
			} else if (row.action === 'dislike') {
				await hidePost(fullname);
			}

			await new Promise((r) => setTimeout(r, 500)); // Rate limit buffer
		} catch (err) {
			console.error(`[pipeline] Failed to apply action ${row.action} for ${row.post_id}:`, err);
		}
	}
}
