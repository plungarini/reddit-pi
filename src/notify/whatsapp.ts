import { config } from '../config.js';
import type { Post } from '../types.js';

export async function sendBatchNotification(posts: Post[]): Promise<boolean> {
	if (!config.wa.notifyNumber) {
		console.warn('[notify] WA_NOTIFY_NUMBER not set — skipping notification');
		return false;
	}

	const lines = posts.map(
		(p, i) => `${i + 1}. ${p.title.slice(0, 60)}${p.title.length > 60 ? '...' : ''}\n   r/${p.subreddit}`,
	);

	const message = [
		'🔥 *Your Reddit picks are ready!*',
		'',
		...lines,
		'',
		'👉 Open http://reddit.pi to like/dislike',
	].join('\n');

	try {
		const response = await fetch(`${config.wa.apiUrl}/sessions/${config.wa.sessionId}/send`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': config.wa.apiKey,
			},
			body: JSON.stringify({ to: config.wa.notifyNumber, text: message }),
		});

		if (!response.ok) {
			const err = await response.text();
			console.error('[notify] WhatsApp API error:', err);
			return false;
		}

		console.log('[notify] WhatsApp notification sent');
		return true;
	} catch (err) {
		console.error('[notify] Failed to reach WhatsApp API:', err);
		return false;
	}
}

export async function sendAuthFailureNotification(): Promise<boolean> {
	if (!config.wa.notifyNumber) {
		console.warn('[notify] WA_NOTIFY_NUMBER not set — skipping auth failure notification');
		return false;
	}

	const message =
		'⚠️ *Reddit-pi Auth Failed*\n\nYour Reddit API session has expired. Please run `npm run onboard` to re-authenticate.';

	try {
		const response = await fetch(`${config.wa.apiUrl}/sessions/${config.wa.sessionId}/send`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': config.wa.apiKey,
			},
			body: JSON.stringify({ to: config.wa.notifyNumber, text: message }),
		});

		if (!response.ok) {
			const err = await response.text();
			console.error('[notify] WhatsApp API error (auth failure):', err);
			return false;
		}

		console.log('[notify] Auth failure WhatsApp notification sent');
		return true;
	} catch (err) {
		console.error('[notify] Failed to reach WhatsApp API (auth failure):', err);
		return false;
	}
}
