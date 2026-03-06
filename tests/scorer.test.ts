import { describe, expect, it, vi } from 'vitest';
import { extractAndStoreKeywords, scorePost } from '../src/engine/scorer';
import type { RedditPost } from '../src/types';

// Mock DB dependency
vi.mock('../src/db', () => ({
	getSubredditScore: vi.fn(() => 0.6),
	getDislikeFingerprints: vi.fn(() => []),
}));

describe('Scorer Module', () => {
	it('should score a post correctly', () => {
		const post: RedditPost = {
			id: 'test_post_1',
			fullname: 't3_test_post_1',
			subreddit: 'test',
			title: 'A very interesting test post',
			url: 'https://example.com',
			permalink: '/r/test/comments/test_post_1',
			author: 'user1',
			score: 1000,
			upvoteRatio: 0.98,
			numComments: 150,
			createdUtc: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
			contentType: 'link',
			isNsfw: false,
		};

		const seen = new Set<string>();
		const scored = scorePost(post, seen);

		expect(scored.id).toBe(post.id);
		expect(scored.ourScore).toBeGreaterThan(0);
		expect(scored.scoreBreakdown).toBeDefined();
	});

	it('should penalize NSFW posts', () => {
		const post: RedditPost = {
			id: 'nsfw_post',
			fullname: 't3_nsfw_post',
			subreddit: 'test',
			title: 'NSFW post',
			url: 'https://example.com',
			permalink: '/r/test/comments/nsfw_post',
			author: 'user1',
			score: 1000,
			upvoteRatio: 0.98,
			numComments: 150,
			createdUtc: Math.floor(Date.now() / 1000) - 3600,
			contentType: 'link',
			isNsfw: true,
		};

		const scored = scorePost(post, new Set());
		expect(scored.scoreBreakdown.contentType).toBe(0);
	});

	it('should correctly extract keywords, ignoring stopwords', () => {
		const post: RedditPost = {
			id: 'test_keyword',
			fullname: 't3_test_keyword',
			subreddit: 'test',
			title: 'This is a beautiful test post about something',
			url: 'https://example.com',
			permalink: '/r/test/comments/123/',
			author: 'user',
			score: 10,
			upvoteRatio: 1,
			numComments: 0,
			createdUtc: 0,
			contentType: 'self',
			isNsfw: false,
			selftext: 'Some additional text that should be extracted',
		};

		const keywords = extractAndStoreKeywords(post);
		expect(keywords).toContain('beautiful');
		expect(keywords).toContain('test');
		expect(keywords).toContain('text');
		expect(keywords).not.toContain('this');
		expect(keywords).not.toContain('about');
		expect(keywords).not.toContain('is');
		expect(keywords).not.toContain('that');
	});
});
