import { config } from '../config';
import { sendAuthFailureNotification } from '../notify/whatsapp';

export interface RedditClient {
	get<T = unknown>(path: string, params?: Record<string, string>): Promise<T>;
	post(path: string, body: Record<string, string>): Promise<unknown>;
	modhash: string;
}

let _modhash = '';

function buildCookie(): string {
	const parts = [`token_v2=${config.reddit.tokenV2}`];
	if (config.reddit.session) parts.push(`reddit_session=${config.reddit.session}`);
	return parts.join('; ');
}

function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
	return {
		'User-Agent': config.reddit.userAgent,
		Cookie: buildCookie(),
		Accept: 'application/json',
		...extra,
	};
}

async function redditGet<T = unknown>(path: string, params: Record<string, string> = {}): Promise<T> {
	const url = new URL(`https://www.reddit.com${path}`);
	url.searchParams.set('raw_json', '1');
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

	const res = await fetch(url.toString(), { headers: buildHeaders() });

	if (res.status === 401 || res.status === 403) {
		await sendAuthFailureNotification();
		throw new Error(`Reddit auth failed (${res.status}). Refresh REDDIT_TOKEN_V2 in .env`);
	}
	if (!res.ok) throw new Error(`Reddit GET ${path} → ${res.status}`);

	const json = (await res.json()) as T;
	return json;
}

async function redditPost(path: string, body: Record<string, string>): Promise<unknown> {
	if (!_modhash) await refreshModhash();

	const url = `https://www.reddit.com${path}`;
	const form = new URLSearchParams(body);

	const res = await fetch(url, {
		method: 'POST',
		headers: buildHeaders({
			'Content-Type': 'application/x-www-form-urlencoded',
			'x-modhash': _modhash,
		}),
		body: form.toString(),
	});

	if (res.status === 401 || res.status === 403) {
		await sendAuthFailureNotification();
		throw new Error(`Reddit auth failed (${res.status}). Refresh REDDIT_TOKEN_V2 in .env`);
	}
	if (!res.ok) throw new Error(`Reddit POST ${path} → ${res.status}`);

	return res.json();
}

async function refreshModhash(): Promise<void> {
	const me = await redditGet<{ data: { modhash: string } }>('/api/me.json');
	_modhash = me.data.modhash;
}

export const redditClient: RedditClient = {
	get: redditGet,
	post: redditPost,
	get modhash() {
		return _modhash;
	},
};

export function isRedditAuthenticated(): boolean {
	return !!_modhash;
}

/** Call once at startup to validate auth and prime modhash */
export async function initRedditClient(): Promise<void> {
	await refreshModhash();
	console.log(`[reddit] auth OK, modhash acquired: ${_modhash}`);
}
