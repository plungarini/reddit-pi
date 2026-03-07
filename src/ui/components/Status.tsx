import { Activity, Database, MessageSquare, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export const Status: React.FC = () => {
	const [status, setStatus] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const res = await fetch('/api/status');
				const data = await res.json();
				setStatus(data);
			} catch (err) {
				console.error('Failed to fetch status:', err);
			} finally {
				setLoading(false);
			}
		};
		fetchStatus();
	}, []);

	const items = [
		{
			label: 'Engine',
			value: 'Recommendation Core',
			status: status?.schedule ? `Runs: ${status.schedule}` : 'Online',
			icon: Zap,
			color: 'text-orange-500',
			bg: 'bg-orange-500/10',
		},
		{
			label: 'WhatsApp',
			value: 'Messaging Bridge',
			status: status?.waOnline ? 'Connected' : 'Waiting',
			icon: MessageSquare,
			color: 'text-green-500',
			bg: 'bg-green-500/10',
		},
		{
			label: 'Database',
			value: 'Reddit-Pi Archive',
			status: `${status?.postsCount || 0} posts, ${status?.interactionsCount || 0} acts`,
			icon: Database,
			color: 'text-blue-500',
			bg: 'bg-blue-500/10',
		},
	];

	return (
		<div className="p-4 pb-12">
			<div className="flex items-center justify-between mb-8 transition-all">
				<h1 className="text-3xl font-black tracking-tight underline decoration-orange-500/50 decoration-4 underline-offset-8 transition-all hover:decoration-orange-500">
					Status
				</h1>
				<button
					onClick={async () => {
						if (!confirm('Trigger manual recommendation run?')) return;
						try {
							await fetch('/api/pipeline/run', { method: 'POST' });
							alert('Pipeline started! Check logs below.');
						} catch (err) {
							console.error('Failed to start pipeline:', err);
						}
					}}
					className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-900/20"
				>
					Run Pipeline
				</button>
			</div>

			{loading ? (
				<div className="flex items-center justify-center h-48 text-zinc-600 animate-pulse font-black uppercase tracking-widest text-[10px]">
					Fetching system vitals...
				</div>
			) : (
				<div className="space-y-4">
					{items.map((item) => (
						<div
							key={item.label}
							className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors group"
						>
							<div
								className={cn(
									'p-3 rounded-xl transition-transform group-hover:scale-110 duration-500',
									item.bg,
									item.color,
								)}
							>
								<item.icon size={24} />
							</div>
							<div className="flex-1">
								<h3 className="font-bold text-sm tracking-tight">{item.label}</h3>
								<p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{item.value}</p>
							</div>
							<div className="text-right">
								<p className={cn('text-[10px] font-black uppercase tracking-widest', item.color)}>{item.status}</p>
							</div>
						</div>
					))}

					<div className="mt-8">
						<div className="flex items-center justify-between mb-4 px-1">
							<div className="flex items-center gap-2 text-zinc-400">
								<Activity size={16} />
								<span className="text-xs font-black uppercase tracking-widest">Recent Activity</span>
							</div>
							<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Live connection" />
						</div>

						<div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/50 text-[10px] font-mono">
							{(status?.logs && status.logs.length > 0
								? status.logs
								: ['Waiting for system activity...', 'No logs in current session']
							).map((log: string, i: number) => (
								<div key={i} className="p-3 text-zinc-500 hover:text-zinc-300 transition-colors flex gap-3">
									<span className="text-zinc-800 font-bold tabular-nums">{(i + 1).toString().padStart(2, '0')}</span>
									<span className="flex-1 break-all">{log}</span>
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
