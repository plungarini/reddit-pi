import { TrendingDown, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { SubredditScore } from '../../types';

export const Preferences: React.FC = () => {
	const [scores, setScores] = useState<SubredditScore[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchScores = async () => {
			try {
				const res = await fetch('/api/preferences');
				const data = await res.json();
				setScores(data || []);
			} catch (err) {
				console.error('Failed to fetch preferences:', err);
			} finally {
				setLoading(false);
			}
		};
		fetchScores();
	}, []);

	const handleReset = async () => {
		if (!confirm('Are you sure you want to reset all subreddit preferences? This cannot be undone.')) return;
		try {
			await fetch('/api/preferences', { method: 'DELETE' });
			setScores([]);
		} catch (err) {
			console.error('Failed to reset preferences:', err);
		}
	};

	if (loading)
		return (
			<div className="p-8 text-center text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">
				Computing learned affinities...
			</div>
		);

	return (
		<div className="p-4 pb-12">
			<div className="flex items-center justify-between mb-8">
				<h1 className="text-3xl font-black tracking-tight underline decoration-zinc-800 decoration-1 underline-offset-8">
					Affinities
				</h1>
				{scores.length > 0 && (
					<button
						onClick={handleReset}
						className="text-[8px] font-black uppercase tracking-widest text-zinc-600 hover:text-red-500 transition-colors border border-zinc-800 px-2 py-1 rounded-full"
					>
						Reset Engine
					</button>
				)}
			</div>

			{scores.length === 0 ? (
				<div className="bg-zinc-900/50 backdrop-blur-md rounded-3xl p-16 text-center text-zinc-500 border border-zinc-900 border-dashed">
					<div className="w-12 h-12 bg-zinc-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
						<TrendingUp className="text-zinc-800" size={20} />
					</div>
					<p className="mb-2 font-bold text-sm tracking-tight text-zinc-400">The engine is still in training.</p>
					<p className="text-[9px] uppercase tracking-[0.15em] font-black opacity-40">
						Like or dislike posts to build your profile
					</p>
				</div>
			) : (
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4 mb-8">
						<div className="bg-orange-500/3 border border-orange-500/10 p-5 rounded-4xl shadow-2xl shadow-orange-500/5">
							<div className="flex items-center gap-2 text-orange-500 mb-2">
								<TrendingUp size={16} />
								<span className="text-[9px] font-black uppercase tracking-widest">High Affinity</span>
							</div>
							<p className="text-3xl font-black tabular-nums">{scores.filter((s) => s.score > 0.6).length}</p>
						</div>
						<div className="bg-zinc-900 border border-zinc-800 p-5 rounded-4xl">
							<div className="flex items-center gap-2 text-zinc-500 mb-2">
								<TrendingDown size={16} />
								<span className="text-[9px] font-black uppercase tracking-widest">Low Affinity</span>
							</div>
							<p className="text-3xl font-black tabular-nums text-zinc-700">
								{scores.filter((s) => s.score < 0.4).length}
							</p>
						</div>
					</div>

					<div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] overflow-hidden p-2">
						<div className="space-y-1">
							{scores.map((score, i) => (
								<div
									key={score.subreddit}
									className={cn(
										'flex items-center justify-between p-5 rounded-4xl transition-all hover:bg-zinc-800/50 group',
										score.score > 0.6 ? 'bg-orange-500/2' : '',
									)}
								>
									<div className="flex items-center gap-4">
										<div className="w-8 h-8 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center font-black text-[10px] text-zinc-500 group-hover:border-orange-500/50 transition-colors">
											{score.subreddit.substring(0, 2).toUpperCase()}
										</div>
										<div>
											<p className="text-sm font-black tracking-tight group-hover:text-orange-500 transition-colors">
												r/{score.subreddit}
											</p>
											<div className="flex items-center gap-2 text-[9px] font-bold tracking-tighter uppercase text-zinc-500">
												<span className="text-green-500/80 decoration-green-500/20 underline decoration-2">
													{score.likes} likes
												</span>
												<span className="opacity-20">•</span>
												<span className="text-red-500/80 decoration-red-500/20 underline decoration-2">
													{score.dislikes} dislikes
												</span>
											</div>
										</div>
									</div>

									<div className="flex flex-col items-end gap-1.5">
										<span className="text-[10px] font-mono font-black text-zinc-500 group-hover:text-white transition-colors">
											{Math.round(score.score * 100)}% Match
										</span>
										<div className="w-20 h-1 bg-zinc-950 rounded-full overflow-hidden">
											<div
												className={cn(
													'h-full transition-all duration-1000 ease-out',
													score.score > 0.5 ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 'bg-zinc-800',
												)}
												style={{ width: `${score.score * 100}%` }}
											/>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

function cn(...classes: any[]) {
	return classes.filter(Boolean).join(' ');
}
