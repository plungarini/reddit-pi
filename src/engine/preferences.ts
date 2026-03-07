import { getDb } from '../db/schema';
import type { SubredditScore } from '../types';

export function updateSubredditScore(subreddit: string, isLike: boolean): void {
	const db = getDb();
	const existing = db.prepare('SELECT likes, dislikes FROM subreddit_scores WHERE subreddit = ?').get(subreddit) as any;

	const likes = (existing?.likes || 0) + (isLike ? 1 : 0);
	const dislikes = (existing?.dislikes || 0) + (isLike ? 0 : 1);

	// Bayesian average with prior (alpha=2, beta=2 -> start at 0.5)
	const alpha = 2;
	const beta = 2;
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
