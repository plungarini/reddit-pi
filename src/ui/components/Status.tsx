import { Activity, Clock, Database, MessageSquare, Plus, Save, Trash2, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const Status: React.FC = () => {
	const [status, setStatus] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [config, setConfig] = useState<{
		cronSchedule: string;
		postsPerBatch: number;
		candidatePoolSize: number;
	} | null>(null);
	const [saving, setSaving] = useState(false);

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

	const fetchConfig = async () => {
		try {
			const res = await fetch('/api/config');
			const data = await res.json();
			setConfig(data);
		} catch (err) {
			console.error('Failed to fetch config:', err);
		}
	};

	useEffect(() => {
		fetchStatus();
		fetchConfig();
	}, []);

	const handleSaveConfig = async () => {
		if (!config) return;
		setSaving(true);
		try {
			const res = await fetch('/api/config/update', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(config),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to update config');
			}
			alert('Settings saved successfully!');
			fetchStatus(); // Refresh status to show new schedule
		} catch (err: any) {
			alert(err.message);
		} finally {
			setSaving(false);
		}
	};

	const cronTimes =
		config?.cronSchedule
			.split(' ')[1]
			.split(',')
			.map((t) => (t.length === 1 ? `0${t}:00` : `${t}:00`)) || [];

	const updateCronTimes = (newTimes: string[]) => {
		if (!config) return;
		const hours = newTimes.map((t) => Number.parseInt(t.split(':')[0], 10)).join(',');
		setConfig({ ...config, cronSchedule: `0 ${hours} * * *` });
	};

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

	const headerActions = document.getElementById('header-actions');

	return (
		<div className="p-4 pb-12">
			{headerActions &&
				createPortal(
					<button
						onClick={async () => {
							if (!confirm('Trigger manual recommendation run?')) return;
							try {
								await fetch('/api/pipeline/run', { method: 'POST' });
								alert('Pipeline started! System is processing.');
							} catch (err) {
								console.error('Failed to start pipeline:', err);
							}
						}}
						className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-900/20"
					>
						Run Pipeline
					</button>,
					headerActions,
				)}

			{loading ? (
				<div className="flex items-center justify-center h-48 text-zinc-600 animate-pulse font-black uppercase tracking-widest text-[10px]">
					Fetching system vitals...
				</div>
			) : (
				<div className="space-y-6">
					<div className="grid gap-4">
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
					</div>

					{/* Settings Section */}
					<div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
						<div className="flex items-center gap-2 text-zinc-400 mb-6">
							<Activity size={18} />
							<span className="text-sm font-black uppercase tracking-widest">Pipeline Settings</span>
						</div>

						{config ? (
							<div className="space-y-6">
								{/* Cron Schedule */}
								<div>
									<label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 block">
										Cron Times ({cronTimes.length}/10)
									</label>
									<div className="space-y-2">
										{cronTimes.map((time, idx) => (
											<div key={`${time}-${idx}`} className="flex gap-2">
												<div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm flex items-center gap-2">
													<Clock size={14} className="text-zinc-600" />
													<input
														type="time"
														id={`cron-${idx}`}
														value={time}
														onChange={(e) => {
															const newTimes = [...cronTimes];
															newTimes[idx] = e.target.value;
															updateCronTimes(newTimes);
														}}
														className="bg-transparent border-none focus:outline-none w-full text-zinc-300"
													/>
												</div>
												<button
													onClick={() => {
														if (cronTimes.length <= 1) return;
														const newTimes = cronTimes.filter((_, i) => i !== idx);
														updateCronTimes(newTimes);
													}}
													className="p-3 bg-zinc-800 text-zinc-500 hover:text-red-500 rounded-xl transition-colors"
												>
													<Trash2 size={16} />
												</button>
											</div>
										))}
										{cronTimes.length < 10 && (
											<button
												onClick={() => updateCronTimes([...cronTimes, '12:00'])}
												className="w-full py-2 border border-zinc-800 border-dashed rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all flex items-center justify-center gap-2"
											>
												<Plus size={14} /> Add Time
											</button>
										)}
									</div>
								</div>

								{/* Numeric Settings */}
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label
											htmlFor="postsPerBatch"
											className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block"
										>
											Posts Per Batch
										</label>
										<input
											id="postsPerBatch"
											type="number"
											min="5"
											max="50"
											value={config.postsPerBatch}
											onChange={(e) =>
												setConfig({ ...config, postsPerBatch: Number.parseInt(e.target.value, 10) || 5 })
											}
											className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none transition-colors"
										/>
										<p className="text-[8px] text-zinc-600 mt-1 uppercase font-bold">Min: 5, Max: 50</p>
									</div>
									<div>
										<label
											htmlFor="poolSize"
											className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block"
										>
											Pool Size
										</label>
										<input
											id="poolSize"
											type="number"
											min="50"
											max="1500"
											value={config.candidatePoolSize}
											onChange={(e) =>
												setConfig({ ...config, candidatePoolSize: Number.parseInt(e.target.value, 10) || 50 })
											}
											className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none transition-colors"
										/>
										<p className="text-[8px] text-zinc-600 mt-1 uppercase font-bold">Min: 50, Max: 1500</p>
									</div>
								</div>

								<button
									onClick={handleSaveConfig}
									disabled={saving}
									className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95 mt-4"
								>
									{saving ? (
										<Zap className="animate-spin" size={20} />
									) : (
										<>
											<Save size={20} /> Save Settings
										</>
									)}
								</button>
							</div>
						) : (
							<div className="text-center py-8 text-zinc-600 text-[10px] font-black uppercase tracking-widest animate-pulse">
								Loading configuration...
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

function cn(...classes: any[]) {
	return classes.filter(Boolean).join(' ');
}
