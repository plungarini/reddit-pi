import { config } from '../config';

interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface OpenRouterResponse {
	choices: Array<{ message: { content: string } }>;
}

export async function chatCompletion(messages: ChatMessage[], model?: string): Promise<string> {
	const apiKey = config.openrouter.apiKey;

	if (!apiKey) {
		console.warn('[llm] OPENROUTER_API_KEY not set — skipping LLM call');
		return '';
	}

	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': 'https://github.com/pietrolungarini/reddit-pi',
			'X-Title': 'reddit-pi',
		},
		body: JSON.stringify({
			model: model || config.openrouter.summaryModel,
			messages,
			max_tokens: 150,
			temperature: 0.3,
		}),
		signal: AbortSignal.timeout(60000), // 60s timeout for Pi connectivity
	});

	if (!response.ok) {
		const err = await response.text().catch(() => 'No error body');
		console.error(`[llm] OpenRouter error (${response.status}):`, err);
		return '';
	}

	const data = (await response.json()) as OpenRouterResponse;
	return data.choices?.[0]?.message?.content?.trim() || '';
}
