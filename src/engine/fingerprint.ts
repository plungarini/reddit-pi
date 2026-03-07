import { getDb } from '../db/schema';
import type { ContentFingerprint } from '../types';

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

export function extractKeywords(text: string): string[] {
	// Simple keyword extraction for now: lowercase, remove punctuation, filter short words
	return text
		.toLowerCase()
		.replace(/[^\w\s]/g, '')
		.split(/\s+/)
		.filter((word) => word.length > 3);
}
