import { pipeline } from '@xenova/transformers';

let embedder: any = null;

export async function getEmbedder() {
	if (!embedder) {
		// Using a small, efficient model suitable for Raspberry Pi
		embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
	}
	return embedder;
}

export async function generateEmbedding(text: string): Promise<number[]> {
	const extractor = await getEmbedder();
	const output = await extractor(text, { pooling: 'mean', normalize: true });
	return Array.from(output.data);
}

export function cosineSimilarity(a: number[], b: number[]): number {
	let dotProduct = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
