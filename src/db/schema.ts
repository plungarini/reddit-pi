import Database from 'better-sqlite3';
import { config } from '../config';

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
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      post_ids         TEXT NOT NULL,
      total_candidates INTEGER,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      notified         INTEGER NOT NULL DEFAULT 0
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

	// Ensure new columns exist for existing tables
	const tableInfo = db.prepare("PRAGMA table_info('batches')").all() as any[];
	const hasTotalCandidates = tableInfo.some((col) => col.name === 'total_candidates');

	if (!hasTotalCandidates) {
		console.log('[db] Adding missing column: total_candidates to batches table');
		db.exec('ALTER TABLE batches ADD COLUMN total_candidates INTEGER');
	}

	console.log('[db] Migrations applied');
}
