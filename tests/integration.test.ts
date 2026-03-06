import { describe, expect, it } from 'vitest';
import { initRedditClient, redditClient } from '../src/reddit/auth.js';

describe('Live Reddit API Integration', () => {
	it('should successfully authenticate and fetch a modhash', async () => {
		await initRedditClient();

		const modhash = redditClient.modhash;

		expect(modhash).toBeTruthy();
		expect(typeof modhash).toBe('string');
		expect(modhash.length).toBeGreaterThan(10);
	});
});
