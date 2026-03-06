import Database from 'better-sqlite3';

import { config } from './config';

import type { Post, Batch, Interaction, SubredditScore, ContentFingerprint, RedditPost, ScoredPost } from './types';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (!_db) {
		_db = new Database(config.data.dbPath);

		_db.pragma('journal_mode = WAL');

		_db.pragma('foreign_keys = ON');

		migrate(_db);
	}

	return _db;
}

function migrate(db: Database.Database): void {
	db.exec(`

    CREATE TABLE IF NOT EXISTS posts (

      id              TEXT PRIMARY KEY,

      fullname        TEXT NOT NULL,

      subreddit       TEXT NOT NULL,

      title           TEXT NOT NULL,

      url             TEXT,

      permalink       TEXT,

      selftext        TEXT,

      author          TEXT,

      score           INTEGER DEFAULT 0,

      upvote_ratio    REAL DEFAULT 0,

      num_comments    INTEGER DEFAULT 0,

      created_utc     INTEGER,

      content_type    TEXT DEFAULT 'link',

      thumbnail       TEXT,

      preview         TEXT,

      flair           TEXT,

      is_nsfw         INTEGER DEFAULT 0,

      our_score       REAL,

      score_breakdown TEXT,

      llm_summary     TEXT,

      fetched_at      TEXT NOT NULL DEFAULT (datetime('now'))

    );



    CREATE TABLE IF NOT EXISTS batches (

      id          INTEGER PRIMARY KEY AUTOINCREMENT,

      post_ids    TEXT NOT NULL,

      created_at  TEXT NOT NULL DEFAULT (datetime('now')),

      notified    INTEGER NOT NULL DEFAULT 0

    );



    CREATE TABLE IF NOT EXISTS interactions (

      id             INTEGER PRIMARY KEY AUTOINCREMENT,

      post_id        TEXT NOT NULL REFERENCES posts(id),

      batch_id       INTEGER REFERENCES batches(id),

      action         TEXT NOT NULL CHECK(action IN ('like','dislike','skip')),

      dislike_reason TEXT,

      dislike_tags   TEXT,

      created_at     TEXT NOT NULL DEFAULT (datetime('now'))

    );



    CREATE TABLE IF NOT EXISTS subreddit_scores (

      subreddit    TEXT PRIMARY KEY,

      likes        INTEGER NOT NULL DEFAULT 0,

      dislikes     INTEGER NOT NULL DEFAULT 0,

      score        REAL NOT NULL DEFAULT 0.5,

      last_updated TEXT NOT NULL DEFAULT (datetime('now'))

    );



    CREATE TABLE IF NOT EXISTS content_fingerprints (

      post_id    TEXT PRIMARY KEY REFERENCES posts(id),

      keywords   TEXT NOT NULL DEFAULT '[]',

      created_at TEXT NOT NULL DEFAULT (datetime('now'))

    );



    CREATE INDEX IF NOT EXISTS idx_posts_subreddit  ON posts(subreddit);

    CREATE INDEX IF NOT EXISTS idx_posts_fetched    ON posts(fetched_at);

    CREATE INDEX IF NOT EXISTS idx_interactions_post ON interactions(post_id);

    CREATE INDEX IF NOT EXISTS idx_interactions_act  ON interactions(action);

    CREATE INDEX IF NOT EXISTS idx_batches_created  ON batches(created_at DESC);

  `);

	console.log('[db] Migrations applied');
}

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

	// Enrich with interactions

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

		return { id: row.id, postIds, createdAt: row.created_at, notified: row.notified === 1, posts };
	});
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

	// Update subreddit score

	const post = getPost(postId);

	if (post) updateSubredditScore(post.subreddit, action === 'like');
}

export function getInteractedPostIds(): Set<string> {
	const rows = getDb()
		.prepare("SELECT DISTINCT post_id FROM interactions WHERE action IN ('like','dislike')")
		.all() as any[];

	return new Set(rows.map((r) => r.post_id));
}

// ── Subreddit scores ──────────────────────────────────────────────────────────

export function updateSubredditScore(subreddit: string, isLike: boolean): void {
	const db = getDb();

	const existing = db.prepare('SELECT likes, dislikes FROM subreddit_scores WHERE subreddit = ?').get(subreddit) as any;

	const likes = (existing?.likes || 0) + (isLike ? 1 : 0);

	const dislikes = (existing?.dislikes || 0) + (isLike ? 0 : 1);

	// Bayesian average with prior (alpha=2, beta=2 → start at 0.5)

	const alpha = 2,
		beta = 2;

	const score = (likes + alpha) / (likes + dislikes + alpha + beta);

	db.prepare(
		`

    INSERT OR REPLACE INTO subreddit_scores (subreddit, likes, dislikes, score, last_updated)

    VALUES (@subreddit, @likes, @dislikes, @score, datetime('now'))

  `,
	).run({ subreddit, likes, dislikes, score });
}

export function getSubredditScore(subreddit: string): number {
	const row = getDb().prepare('SELECT score FROM subreddit_scores WHERE subreddit = ?').get(subreddit) as any;

	return row?.score ?? 0.5; // Neutral prior
}

export function getAllSubredditScores(): SubredditScore[] {
	return (getDb().prepare('SELECT * FROM subreddit_scores ORDER BY score DESC').all() as any[]).map((r) => ({
		subreddit: r.subreddit,

		likes: r.likes,

		dislikes: r.dislikes,

		score: r.score,

		lastUpdated: r.last_updated,
	}));
}

// ── Content fingerprints (for dislike similarity) ─────────────────────────────

export function upsertFingerprint(postId: string, keywords: string[]): void {
	getDb()
		.prepare(
			`

    INSERT OR REPLACE INTO content_fingerprints (post_id, keywords)

    VALUES (?, ?)

  `,
		)
		.run(postId, JSON.stringify(keywords));
}

export function getDislikeFingerprints(limit = 50): ContentFingerprint[] {
	const rows = getDb()
		.prepare(
			`

    SELECT cf.post_id, cf.keywords, cf.created_at

    FROM content_fingerprints cf

    JOIN interactions i ON cf.post_id = i.post_id

    WHERE i.action = 'dislike'

    ORDER BY cf.created_at DESC

    LIMIT ?

  `,
		)
		.all(limit) as any[];

	return rows.map((r) => ({
		postId: r.post_id,

		keywords: JSON.parse(r.keywords),

		createdAt: r.created_at,
	}));
}
