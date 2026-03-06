import type { ScoredPost } from '../types';

/**

 * Enforce max 2 posts per subreddit in the final batch.

 * Takes sorted list (best first), picks top N with diversity constraint.

 */

export function applyDiversityFilter(posts: ScoredPost[], targetCount: number, maxPerSubreddit = 2): ScoredPost[] {
	const subredditCounts: Record<string, number> = {};

	const result: ScoredPost[] = [];

	for (const post of posts) {
		if (result.length >= targetCount) break;

		const count = subredditCounts[post.subreddit] || 0;

		if (count >= maxPerSubreddit) continue;

		result.push(post);

		subredditCounts[post.subreddit] = count + 1;
	}

	return result;
}
