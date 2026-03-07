import { config } from '../config';

import { getDislikeFingerprints } from './fingerprint';
import { getSubredditScore } from './preferences';

import type { RedditPost, ScoredPost } from '../types';

// TF-IDF based keyword extraction from title

function extractKeywords(text: string): string[] {
	return text

		.toLowerCase()

		.replace(/[^a-z0-9\s]/g, ' ')

		.split(/\s+/)

		.filter((w) => w.length > 3)

		.filter((w) => !STOPWORDS.has(w));
}

const STOPWORDS = new Set([
	'this',
	'that',
	'with',
	'from',
	'have',
	'will',
	'what',
	'when',
	'where',
	'which',

	'they',
	'them',
	'their',
	'there',
	'been',
	'were',
	'more',
	'than',
	'into',
	'your',

	'about',
	'would',
	'could',
	'should',
	'just',
	'some',
	'also',
	'then',
	'than',
]);

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
	if (!setA.size || !setB.size) return 0;

	let intersection = 0;

	for (const item of setA) {
		if (setB.has(item)) intersection++;
	}

	return intersection / (setA.size + setB.size - intersection);
}

export function computeSimilarityPenalty(post: RedditPost): number {
	const fingerprints = getDislikeFingerprints(30);

	if (!fingerprints.length) return 0;

	const postKeywords = new Set(extractKeywords(post.title + ' ' + (post.selftext || '')));

	let maxSimilarity = 0;

	for (const fp of fingerprints) {
		const fpKeywords = new Set(fp.keywords);

		const sim = jaccardSimilarity(postKeywords, fpKeywords);

		if (sim > maxSimilarity) maxSimilarity = sim;
	}

	return maxSimilarity; // 0-1, higher = more similar to dislikes
}

export function extractAndStoreKeywords(post: RedditPost): string[] {
	return extractKeywords(post.title + ' ' + (post.selftext || ''));
}

export function scorePost(post: RedditPost, seenSubredditsInBatch: Set<string>): ScoredPost {
	const now = Date.now() / 1000;

	const w = config.weights;

	// 1. Reddit score (normalized upvote ratio * log score)

	const redditScore = post.upvoteRatio * Math.min(Math.log10(Math.max(post.score, 1)) / 4, 1);

	// 2. Recency (exponential decay: half-life ~12 hours)

	const ageHours = (now - post.createdUtc) / 3600;

	const recencyScore = Math.exp(-ageHours / 12);

	// 3. Subreddit affinity (learned from interactions)

	const subredditAffinityScore = getSubredditScore(post.subreddit);

	// 4. Content type match (prefer non-NSFW, variety)

	const contentTypeScore = post.isNsfw ? 0 : 0.8 + (post.contentType === 'self' ? 0.2 : 0);

	// 5. Novelty (penalize if same subreddit already in current batch)

	const noveltyScore = seenSubredditsInBatch.has(post.subreddit) ? 0.3 : 1.0;

	// 6. Engagement (normalized comment count)

	const engagementScore = Math.min(post.numComments / 500, 1);

	// 7. Similarity penalty (similarity to disliked content)

	const simPenalty = computeSimilarityPenalty(post);

	const breakdown = {
		redditScore: redditScore * w.redditScore,

		recency: recencyScore * w.recency,

		subredditAffinity: subredditAffinityScore * w.subredditAffinity,

		contentType: contentTypeScore * w.contentType,

		novelty: noveltyScore * w.novelty,

		engagement: engagementScore * w.engagement,

		similarityPenalty: -(simPenalty * w.similarityPenalty),
	};

	const ourScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

	return { ...post, ourScore, scoreBreakdown: breakdown };
}

export function scorePosts(posts: RedditPost[]): ScoredPost[] {
	const seenSubreddits = new Set<string>();

	return posts

		.map((p) => scorePost(p, seenSubreddits))

		.sort((a, b) => b.ourScore - a.ourScore);
}
