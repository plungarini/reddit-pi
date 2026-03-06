import { redditClient } from './auth.js';

export interface RedditComment {
	id: string;
	author: string;
	body: string;
	score: number;
	createdUtc: number;
}

interface RawComment {
	kind: string;
	data: {
		id: string;
		author: string;
		body: string;
		score: number;
		created_utc: number;
		replies?: { data?: { children?: RawComment[] } } | string;
	};
}

function flattenComments(children: RawComment[], maxDepth = 2, depth = 0): RedditComment[] {
	const result: RedditComment[] = [];
	for (const child of children) {
		if (child.kind !== 't1') continue;
		if (child.data.author === '[deleted]' || child.data.body === '[deleted]') continue;

		result.push({
			id: child.data.id,
			author: child.data.author,
			body: child.data.body,
			score: child.data.score,
			createdUtc: child.data.created_utc,
		});

		if (depth < maxDepth && typeof child.data.replies === 'object' && child.data.replies?.data?.children) {
			result.push(...flattenComments(child.data.replies.data.children, maxDepth, depth + 1));
		}
	}
	return result;
}

/**
 * Fetch top comments for a post. Returns flat list sorted by score desc.
 * postId is the bare ID (without t3_ prefix).
 */
export async function fetchTopComments(postId: string, limit = 10): Promise<RedditComment[]> {
	// Response is a 2-element array: [post_listing, comments_listing]
	const response = await redditClient.get<[unknown, { data: { children: RawComment[] } }]>(`/comments/${postId}.json`, {
		limit: String(limit),
		depth: '2',
		sort: 'top',
	});

	const commentListing = response[1];
	const comments = flattenComments(commentListing.data.children);

	return comments
		.filter((c) => c.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);
}
