import type { RedditPost } from '../types';
import { redditClient } from './auth';

interface RawChild {
	kind: string;
	data: {
		id: string;
		name: string; // fullname e.g. t3_abc123
		title: string;
		subreddit: string;
		author: string;
		score: number;
		upvote_ratio: number;
		num_comments: number;
		url: string;
		permalink: string;
		selftext: string;
		is_self: boolean;
		created_utc: number;
		over_18: boolean;
	};
}

interface Listing {
	data: {
		children: RawChild[];
		after: string | null;
		modhash?: string;
	};
}

function toRedditPost(raw: RawChild['data']): RedditPost {
	let contentType: RedditPost['contentType'] = 'link';
	if (raw.is_self) contentType = 'self';
	else if (raw.url.match(/\.(jpg|png|gif)$/i)) contentType = 'image';
	else if (raw.url.includes('v.redd.it')) contentType = 'video';
	else if (raw.url.includes('reddit.com/gallery')) contentType = 'gallery';

	return {
		id: raw.id,
		fullname: raw.name,
		title: raw.title,
		subreddit: raw.subreddit,
		author: raw.author,
		score: raw.score,
		upvoteRatio: raw.upvote_ratio,
		numComments: raw.num_comments,
		url: raw.url,
		permalink: `https://reddit.com${raw.permalink}`,
		selftext: raw.selftext,
		createdUtc: raw.created_utc,
		contentType,
		isNsfw: raw.over_18,
	};
}

/**
 * Fetch the authenticated user's home feed (best ranking).
 * Paginates up to `limit` posts total.
 */
export async function fetchHomeFeed(limit = 100): Promise<RedditPost[]> {
	const posts: RedditPost[] = [];
	let after: string | undefined;

	while (posts.length < limit) {
		const batchSize = Math.min(25, limit - posts.length);
		const params: Record<string, string> = { limit: String(batchSize) };
		if (after) params.after = after;

		const listing = await redditClient.get<Listing>('/best.json', params);

		const children = listing.data.children.filter((c) => c.kind === 't3');
		if (children.length === 0) break;

		posts.push(...children.map((c) => toRedditPost(c.data)));
		after = listing.data.after ?? undefined;
		if (!after) break;

		// polite delay between pages
		await new Promise((r) => setTimeout(r, 500));
	}

	return posts;
}
