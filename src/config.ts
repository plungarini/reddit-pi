import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

const CONFIG_PATH = process.env.DB_PATH
	? path.join(path.dirname(process.env.DB_PATH), 'config.json')
	: './data/config.json';

function loadExternalConfig() {
	if (fs.existsSync(CONFIG_PATH)) {
		try {
			return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
		} catch (e) {
			console.error('Failed to load external config:', e);
		}
	}
	return {};
}

const externalConfig = loadExternalConfig();

export const config = {
	port: Number.parseInt(process.env.PORT || '3000', 10),
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
		schedule: externalConfig.cronSchedule || process.env.CRON_SCHEDULE || '0 15,17,19,21 * * *',
		postsPerBatch: Number.parseInt(externalConfig.postsPerBatch || process.env.POSTS_PER_BATCH || '5', 10),
		candidatePoolSize: Number.parseInt(
			externalConfig.candidatePoolSize || process.env.CANDIDATE_POOL_SIZE || '100',
			10,
		),
		pausedUntil: externalConfig.pausedUntil || process.env.CRON_PAUSED_UNTIL || null,
	},

	nesthub: {
		apiUrl: process.env.NESTHUB_PI_URL || 'http://127.0.0.1:3004',
	},

	weights: {
		redditScore: Number.parseFloat(process.env.WEIGHT_REDDIT_SCORE || '0.15'),
		recency: Number.parseFloat(process.env.WEIGHT_RECENCY || '0.10'),
		subredditAffinity: Number.parseFloat(process.env.WEIGHT_SUBREDDIT_AFFINITY || '0.30'),
		contentType: Number.parseFloat(process.env.WEIGHT_CONTENT_TYPE || '0.10'),
		novelty: Number.parseFloat(process.env.WEIGHT_NOVELTY || '0.15'),
		engagement: Number.parseFloat(process.env.WEIGHT_ENGAGEMENT || '0.10'),
		similarityPenalty: Number.parseFloat(process.env.WEIGHT_SIMILARITY_PENALTY || '0.10'),
	},
};

export function updatePersistentConfig(updates: {
	cronSchedule?: string;
	postsPerBatch?: number;
	candidatePoolSize?: number;
	pausedUntil?: string | null;
}) {
	const current = loadExternalConfig();
	const next = { ...current, ...updates };

	// 1. Update config.json
	fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2));

	// 2. Update .env (naively replace/append)
	let envContent = '';
	if (fs.existsSync('.env')) {
		envContent = fs.readFileSync('.env', 'utf-8');
	}

	const updateEnvVar = (key: string, value: string) => {
		const regex = new RegExp(`^${key}=.*`, 'm');
		if (regex.test(envContent)) {
			envContent = envContent.replace(regex, `${key}=${value}`);
		} else {
			envContent += `\n${key}=${value}`;
		}
	};

	if (updates.cronSchedule) {
		updateEnvVar('CRON_SCHEDULE', updates.cronSchedule);
		(config.cron as any).schedule = updates.cronSchedule;
	}
	if (updates.postsPerBatch) {
		updateEnvVar('POSTS_PER_BATCH', String(updates.postsPerBatch));
		(config.cron as any).postsPerBatch = updates.postsPerBatch;
	}
	if (updates.candidatePoolSize) {
		updateEnvVar('CANDIDATE_POOL_SIZE', String(updates.candidatePoolSize));
		(config.cron as any).candidatePoolSize = updates.candidatePoolSize;
	}
	if (updates.hasOwnProperty('pausedUntil')) {
		const val = updates.pausedUntil || '';
		updateEnvVar('CRON_PAUSED_UNTIL', val);
		(config.cron as any).pausedUntil = updates.pausedUntil;
	}

	fs.writeFileSync('.env', envContent.trim() + '\n');
}

export function ensureDataDirs(): void {
	[config.data.dir].forEach((dir) => {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	});
}
