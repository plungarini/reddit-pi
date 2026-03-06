import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config', () => ({
	config: {
		reddit: {
			clientId: 'test_id',
			clientSecret: 'test_secret',
			username: 'test_user',
			password: 'test_password',
			userAgent: 'test_agent',
		},
	},
}));

import { getRedditClient } from '../src/reddit/auth';

const globalFetch = global.fetch;

describe('Reddit Native client', () => {
	beforeEach(() => {
		global.fetch = vi.fn().mockImplementation(async (url: string) => {
			if (url.includes('access_token')) {
				return {
					ok: true,
					json: async () => ({ access_token: 'mock_token', expires_in: 3600 }),
				};
			}
			if (url.includes('/best')) {
				return {
					ok: true,
					text: async () =>
						JSON.stringify({
							data: {
								children: [
									{ data: { id: 'post1', title: 'First post' } },
									{ data: { id: 'post2', title: 'Second post' } },
								],
							},
						}),
				};
			}
			return { ok: true, text: async () => '{}' };
		}) as any;
	});

	afterAll(() => {
		global.fetch = globalFetch;
	});

	it('should fetch tokens and best listing', async () => {
		const client = getRedditClient();
		const posts = await client.getBest({ limit: 2 });
		expect(posts).toHaveLength(2);
		expect(posts[0].id).toBe('post1');
	});
});
