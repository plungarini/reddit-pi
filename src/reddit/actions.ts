import { redditClient } from './auth.js';

/**
 * Upvote a post. direction: 1 = upvote, 0 = remove, -1 = downvote
 */
export async function upvotePost(fullname: string, direction: 1 | 0 | -1 = 1): Promise<void> {
	await redditClient.post('/api/vote', {
		id: fullname, // e.g. "t3_abc123"
		dir: String(direction),
		rank: '10',
	});
}

/**
 * Hide a post from feed. Reddit will stop showing it in personalized feeds.
 */
export async function hidePost(fullname: string): Promise<void> {
	await redditClient.post('/api/hide', { id: fullname });
}

/**
 * Unhide a previously hidden post.
 */
export async function unhidePost(fullname: string): Promise<void> {
	await redditClient.post('/api/unhide', { id: fullname });
}
