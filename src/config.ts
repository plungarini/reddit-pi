import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

export const config = {
	port: parseInt(process.env.PORT || '3000', 10),
	nodeEnv: process.env.NODE_ENV || 'development',

	reddit: {
		tokenV2: process.env.REDDIT_TOKEN_V2 || '',
		session: process.env.REDDIT_SESSION || '',
		userAgent: process.env.REDDIT_USER_AGENT || 'reddit-pi:v1.0.0 (personal; raspberry pi)',
	},

	openrouter: {
		apiKey: process.env.OPENROUTER_API_KEY || '',
		summaryModel: process.env.OPENROUTER_SUMMARY_MODEL || 'deepseek/deepseek-chat',
	},

	wa: {
		apiUrl: process.env.WA_API_URL || 'http://localhost:3001',
		apiKey: process.env.WA_API_KEY || '',
		sessionId: process.env.WA_SESSION_ID || 'reddit-pi',
		notifyNumber: process.env.WA_NOTIFY_NUMBER || '',
	},

	data: {
		dir: process.env.DATA_DIR || './data',
		dbPath: process.env.DB_PATH || './data/reddit-pi.db',
	},

	cron: {
		schedule: process.env.CRON_SCHEDULE || '0 15,17,19,21 * * *',
		postsPerBatch: parseInt(process.env.POSTS_PER_BATCH || '5', 10),
		candidatePoolSize: parseInt(process.env.CANDIDATE_POOL_SIZE || '50', 10),
	},

	weights: {
		redditScore: parseFloat(process.env.WEIGHT_REDDIT_SCORE || '0.15'),
		recency: parseFloat(process.env.WEIGHT_RECENCY || '0.10'),
		subredditAffinity: parseFloat(process.env.WEIGHT_SUBREDDIT_AFFINITY || '0.30'),
		contentType: parseFloat(process.env.WEIGHT_CONTENT_TYPE || '0.10'),
		novelty: parseFloat(process.env.WEIGHT_NOVELTY || '0.15'),
		engagement: parseFloat(process.env.WEIGHT_ENGAGEMENT || '0.10'),
		similarityPenalty: parseFloat(process.env.WEIGHT_SIMILARITY_PENALTY || '0.10'),
	},
} as const;

export function ensureDataDirs(): void {
	[config.data.dir].forEach((dir) => {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	});
}
