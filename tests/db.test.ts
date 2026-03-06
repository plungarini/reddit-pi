import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config', () => ({
	config: {
		data: { dbPath: ':memory:' },
		reddit: {},
		wa: {},
		weights: {},
		cron: {},
	},
}));

import { createBatch, getCurrentBatch, getDb, getPost, markBatchNotified, upsertPost } from '../src/db';
import type { ScoredPost } from '../src/types';

describe('Database Module', () => {
	beforeAll(() => {
		getDb(); // Initializes migration
	});

	it('should upsert and retrieve a post', () => {
		const post: ScoredPost & { fetchedAt: string; llmSummary?: string } = {
			id: '123',
			fullname: 't3_123',
			subreddit: 'test_subreddit',
			title: 'Test Post',
			url: 'https://test.com',
			permalink: '/r/test_subreddit/comments/123/test_post/',
			author: 'tester',
			score: 100,
			upvoteRatio: 0.95,
			numComments: 10,
			createdUtc: Math.floor(Date.now() / 1000),
			contentType: 'link',
			isNsfw: false,
			ourScore: 0.8,
			scoreBreakdown: {
				redditScore: 0.1,
				recency: 0.1,
				subredditAffinity: 0.1,
				contentType: 0.1,
				novelty: 0.1,
				engagement: 0.1,
				similarityPenalty: 0.1,
			},
			fetchedAt: new Date().toISOString(),
		};

		upsertPost(post);
		const retrieved = getPost('123');
		expect(retrieved).not.toBeNull();
		expect(retrieved?.id).toBe('123');
		expect(retrieved?.title).toBe('Test Post');
	});

	it('should manage batches', () => {
		const batchId = createBatch(['123']);
		expect(batchId).toBeGreaterThan(0);

		markBatchNotified(batchId);
		const current = getCurrentBatch();

		expect(current).not.toBeNull();
		expect(current?.notified).toBe(true);
		expect(current?.postIds).toContain('123');
	});
});
