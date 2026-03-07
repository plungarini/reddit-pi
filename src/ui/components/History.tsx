import { Clock } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { Batch, Post } from '../../types';

export const History: React.FC = () => {
	const [batches, setBatches] = useState<(Batch & { posts: Post[] })[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchHistory = async () => {
			try {
				const res = await fetch('/api/history');
				const data = await res.json();
				setBatches(data || []);
			} catch (err) {
				console.error('Failed to fetch history:', err);
			} finally {
				setLoading(false);
			}
		};
		fetchHistory();
	}, []);

	if (loading) return <div className="p-8 text-center text-zinc-500">Loading history...</div>;

	return (
		<div className="p-4 pb-12">
			{batches.length === 0 ? (
				<div className="bg-zinc-900/50 rounded-2xl p-12 text-center text-zinc-500 border border-zinc-900 border-dashed">
					No past recommendations found.
				</div>
			) : (
				<div className="space-y-4">
					{batches.map((batch) => (
						<div key={batch.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2 text-zinc-400">
									<Clock size={14} />
									<span className="text-sm font-bold">
										{new Date(batch.createdAt).toLocaleDateString(undefined, {
											month: 'short',
											day: 'numeric',
											hour: '2-digit',
											minute: '2-digit',
										})}
									</span>
								</div>
								<span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest bg-zinc-950 px-2 py-1 rounded">
									Batch #{batch.id} • {batch.posts.length}/{batch.totalCandidates || '?'}
								</span>
							</div>

							<div className="space-y-2">
								{batch.posts.map((post) => (
									<div key={post.id} className="flex items-center gap-3 group">
										<div className="w-1 h-1 rounded-full bg-zinc-700 group-hover:bg-orange-500 transition-colors" />
										<p className="text-xs text-zinc-400 flex-1 truncate">{post.title}</p>
										{post.interaction && (
											<span
												className={cn(
													'text-[8px] font-black uppercase px-1.5 py-0.5 rounded',
													post.interaction === 'like' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500',
												)}
											>
												{post.interaction}
											</span>
										)}
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

// Helper for cn in this file since I didn't import it in the code above and I want to avoid errors
function cn(...classes: any[]) {
	return classes.filter(Boolean).join(' ');
}
