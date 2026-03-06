import { config } from './config.js';
import {
	createBatch,
	getInteractedPostIds,
	getSeenPostIds,
	markBatchNotified,
	upsertFingerprint,
	upsertPost,
} from './db';
import { applyDiversityFilter } from './engine/diversity';
import { extractAndStoreKeywords, scorePosts } from './engine/scorer';
import { summarizePostComments } from './llm/summarize';
import './logger.js';
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

	const { initRedditClient } = await import('./reddit/auth.js');
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
		const top8 = scored.slice(0, 8);

		// Step 5: Enhance with LLM summaries (async, non-blocking per post)
		console.log(`[pipeline] Fetching LLM summaries for ${top8.length} candidates...`);

		const enhanced = await Promise.all(
			top8.map(async (post): Promise<ScoredPost & { llmSummary?: string }> => {
				const summary = await summarizePostComments(post.id, post.title);
				return { ...post, llmSummary: summary };
			}),
		);

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
		const batchId = createBatch(final.map((p) => p.id));
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

	const db_module = await import('./db');
	const rows = (db_module.getDb() as any)
		.prepare(
			`
    SELECT i.post_id, i.action
    FROM interactions i
    LEFT JOIN posts p ON i.post_id = p.id
    WHERE i.created_at > datetime('now', '-6 hours')
      AND (p.id IS NULL OR p.id IS NOT NULL)
    ORDER BY i.created_at DESC
    LIMIT 20
  `,
		)
		.all() as any[];

	for (const row of rows) {
		try {
			if (row.action === 'like') {
				await upvotePost(row.post_id);
			} else if (row.action === 'dislike') {
				await hidePost(row.post_id);
			}

			await new Promise((r) => setTimeout(r, 500)); // Rate limit buffer
		} catch (err) {
			console.error(`[pipeline] Failed to apply action ${row.action} for ${row.post_id}:`, err);
		}
	}
}
