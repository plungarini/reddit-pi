import { updateSubredditScore } from '../engine/preferences';
import type { Batch, Post, ScoredPost } from '../types';
import { getDb } from './schema';

// ── Posts ─────────────────────────────────────────────────────────────────────

export function upsertPost(post: ScoredPost & { fetchedAt: string; llmSummary?: string }): void {
	const db = getDb();
	db.prepare(
		`
    INSERT OR REPLACE INTO posts
      (id, fullname, subreddit, title, url, permalink, selftext, author, score,
       upvote_ratio, num_comments, created_utc, content_type, thumbnail, preview,
       flair, is_nsfw, our_score, score_breakdown, llm_summary, fetched_at)
    VALUES
      (@id, @fullname, @subreddit, @title, @url, @permalink, @selftext, @author, @score,
       @upvoteRatio, @numComments, @createdUtc, @contentType, @thumbnail, @preview,
       @flair, @isNsfw, @ourScore, @scoreBreakdown, @llmSummary, @fetchedAt)
  `,
	).run({
		id: post.id,
		fullname: post.fullname,
		subreddit: post.subreddit,
		title: post.title,
		url: post.url || null,
		permalink: post.permalink || null,
		selftext: post.selftext || null,
		author: post.author,
		score: post.score,
		upvoteRatio: post.upvoteRatio,
		numComments: post.numComments,
		createdUtc: post.createdUtc,
		contentType: post.contentType,
		thumbnail: post.thumbnail || null,
		preview: post.preview || null,
		flair: post.flair || null,
		isNsfw: post.isNsfw ? 1 : 0,
		ourScore: post.ourScore,
		scoreBreakdown: JSON.stringify(post.scoreBreakdown),
		llmSummary: post.llmSummary || null,
		fetchedAt: post.fetchedAt,
	});
}

export function getPost(id: string): Post | null {
	const row = getDb().prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
	return row ? rowToPost(row) : null;
}

export function getPostsByIds(ids: string[]): Post[] {
	if (!ids.length) return [];
	const placeholders = ids.map(() => '?').join(',');
	const rows = getDb()
		.prepare(`SELECT * FROM posts WHERE id IN (${placeholders})`)
		.all(...ids) as any[];
	return rows.map(rowToPost);
}

export function getSeenPostIds(sinceHours = 48): Set<string> {
	const since = Math.floor(Date.now() / 1000) - sinceHours * 3600;
	const rows = getDb().prepare('SELECT id FROM posts WHERE created_utc > ?').all(since) as any[];
	return new Set(rows.map((r) => r.id));
}

function rowToPost(row: any): Post {
	return {
		id: row.id,
		fullname: row.fullname,
		subreddit: row.subreddit,
		title: row.title,
		url: row.url || '',
		permalink: row.permalink || '',
		selftext: row.selftext || undefined,
		author: row.author,
		score: row.score,
		upvoteRatio: row.upvote_ratio,
		numComments: row.num_comments,
		createdUtc: row.created_utc,
		contentType: row.content_type,
		thumbnail: row.thumbnail || undefined,
		preview: row.preview || undefined,
		flair: row.flair || undefined,
		isNsfw: row.is_nsfw === 1,
		ourScore: row.our_score,
		scoreBreakdown: row.score_breakdown ? JSON.parse(row.score_breakdown) : {},
		llmSummary: row.llm_summary || undefined,
		fetchedAt: row.fetched_at,
	};
}

// ── Batches ───────────────────────────────────────────────────────────────────

export function createBatch(postIds: string[]): number {
	const info = getDb().prepare('INSERT INTO batches (post_ids) VALUES (?)').run(JSON.stringify(postIds));
	return info.lastInsertRowid as number;
}

export function markBatchNotified(id: number): void {
	getDb().prepare('UPDATE batches SET notified = 1 WHERE id = ?').run(id);
}

export function getCurrentBatch(): (Batch & { posts: Post[] }) | null {
	const row = getDb().prepare('SELECT * FROM batches ORDER BY created_at DESC LIMIT 1').get() as any;
	if (!row) return null;

	const postIds: string[] = JSON.parse(row.post_ids);
	const posts = getPostsByIds(postIds);

	const enriched = posts.map((p) => ({
		...p,
		...getPostInteraction(p.id),
	}));

	return {
		id: row.id,
		postIds,
		createdAt: row.created_at,
		notified: row.notified === 1,
		posts: enriched,
	};
}

export function getBatchHistory(limit = 20): (Batch & { posts: Post[] })[] {
	const rows = getDb().prepare('SELECT * FROM batches ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
	return rows.map((row) => {
		const postIds: string[] = JSON.parse(row.post_ids);
		const posts = getPostsByIds(postIds);

		const enriched = posts.map((p) => ({
			...p,
			...getPostInteraction(p.id),
		}));

		return { id: row.id, postIds, createdAt: row.created_at, notified: row.notified === 1, posts: enriched };
	});
}

export function resetSubredditScores(): void {
	getDb().prepare('DELETE FROM subreddit_scores').run();
}

function getPostInteraction(postId: string): Partial<Post> {
	const row = getDb()
		.prepare('SELECT * FROM interactions WHERE post_id = ? ORDER BY created_at DESC LIMIT 1')
		.get(postId) as any;
	if (!row) return {};
	return {
		interaction: row.action,
		dislikeReason: row.dislike_reason || undefined,
		dislikeTags: row.dislike_tags ? JSON.parse(row.dislike_tags) : undefined,
	};
}

// ── Interactions ──────────────────────────────────────────────────────────────

export function recordInteraction(
	postId: string,
	action: 'like' | 'dislike' | 'skip',
	batchId?: number,
	dislikeReason?: string,
	dislikeTags?: string[],
): void {
	getDb()
		.prepare(
			`
    INSERT INTO interactions (post_id, batch_id, action, dislike_reason, dislike_tags)
    VALUES (@postId, @batchId, @action, @dislikeReason, @dislikeTags)
  `,
		)
		.run({
			postId,
			batchId: batchId || null,
			action,
			dislikeReason: dislikeReason || null,
			dislikeTags: dislikeTags ? JSON.stringify(dislikeTags) : null,
		});

	const post = getPost(postId);
	if (post) updateSubredditScore(post.subreddit, action === 'like');
}

export function getInteractedPostIds(): Set<string> {
	const rows = getDb()
		.prepare("SELECT DISTINCT post_id FROM interactions WHERE action IN ('like','dislike')")
		.all() as any[];
	return new Set(rows.map((r) => r.post_id));
}
