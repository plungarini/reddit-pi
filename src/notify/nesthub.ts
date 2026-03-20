import { config } from '../config';
import type { Post } from '../types';

/**
 * Sends a notification to nesthub-pi about a new batch of Reddit posts.
 */
export async function sendBatchAlert(posts: Post[]): Promise<boolean> {
	if (!config.nesthub.apiUrl) return false;

	const title = 'Reddit Intelligence';
	const message = `New batch ready with ${posts.length} recommendations.`;

	try {
		const response = await fetch(`${config.nesthub.apiUrl}/api/alerts`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				source: 'reddit-pi',
				title,
				message,
				level: 'info',
				durationMs: 8000, // Custom duration for this alert
			}),
		});

		if (!response.ok) {
			const err = await response.text();
			console.error('[notify-nesthub] API error:', err);
			return false;
		}

		console.log('[notify-nesthub] Alert sent to Nest Hub');
		return true;
	} catch (err) {
		console.error('[notify-nesthub] Failed to reach Nest Hub API:', err);
		return false;
	}
}
