export interface RedditPost {
	id: string; // Reddit post ID (without t3_ prefix)
	fullname: string; // t3_xxxxx
	subreddit: string;
	title: string;
	url: string;
	permalink: string; // /r/subreddit/comments/...
	selftext?: string;
	author: string;
	score: number;
	upvoteRatio: number;
	numComments: number;
	createdUtc: number; // Unix seconds
	contentType: 'link' | 'self' | 'image' | 'video' | 'gallery';
	thumbnail?: string;
	preview?: string;
	flair?: string;
	isNsfw: boolean;
}

export interface ScoredPost extends RedditPost {
	ourScore: number;
	scoreBreakdown: {
		redditScore: number;
		recency: number;
		subredditAffinity: number;
		contentType: number;
		novelty: number;
		engagement: number;
		similarityPenalty: number;
	};
	llmSummary?: string;
}

export interface Post extends ScoredPost {
	batchId?: number;
	interaction?: 'like' | 'dislike' | 'skip';
	dislikeReason?: string;
	dislikeTags?: string[];
	fetchedAt: string;
}

export interface Batch {
	id: number;
	postIds: string[];
	totalCandidates?: number;
	createdAt: string;
	notified: boolean;
}

export interface Interaction {
	id: number;
	postId: string;
	batchId?: number;
	action: 'like' | 'dislike' | 'skip';
	dislikeReason?: string;
	dislikeTags?: string[];
	createdAt: string;
}

export interface SubredditScore {
	subreddit: string;
	likes: number;
	dislikes: number;
	score: number; // Bayesian
	lastUpdated: string;
}

export interface ContentFingerprint {
	postId: string;
	keywords: string[];
	createdAt: string;
}
