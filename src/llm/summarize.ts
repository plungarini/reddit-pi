import type { RedditComment } from '../reddit/comments';
import { fetchTopComments } from '../reddit/comments';
import { chatCompletion } from './openrouter';

export async function summarizePostComments(postId: string, postTitle: string): Promise<string> {
	let comments: RedditComment[];

	try {
		comments = await fetchTopComments(postId, 10);
	} catch {
		return '';
	}

	if (!comments.length) return '';

	const commentText = comments
		.sort((a, b) => b.score - a.score)
		.slice(0, 8)
		.map((c, i) => `${i + 1}. [+${c.score}] ${c.body}`)
		.join('\n');

	return chatCompletion([
		{
			role: 'system',
			content: 'You are a concise Reddit discussion summarizer. Respond in 1-2 sentences only.',
		},
		{
			role: 'user',
			content: `Post: "${postTitle}"\n\nTop comments:\n${commentText}\n\nSummarize the key discussion points.`,
		},
	]);
}
