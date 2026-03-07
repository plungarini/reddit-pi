import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Pause, X } from 'lucide-react';
import React, { useState } from 'react';

interface PauseModalProps {
	isOpen: boolean;
	onClose: () => void;
	onPause: (days: number | 'forever') => void;
}

const DURATIONS = [
	{ label: 'Day', days: 1 },
	{ label: '3 Days', days: 3 },
	{ label: 'Week', days: 7 },
	{ label: 'Month', days: 30 },
];

export const PauseModal: React.FC<PauseModalProps> = ({ isOpen, onClose, onPause }) => {
	const [customDays, setCustomDays] = useState('2');

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
			>
				<motion.div
					initial={{ scale: 0.9, y: 20 }}
					animate={{ scale: 1, y: 0 }}
					exit={{ scale: 0.9, y: 20 }}
					className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm overflow-hidden"
				>
					<div className="p-6">
						<div className="flex justify-between items-start mb-4">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
									<Pause size={18} />
								</div>
								<h2 className="text-xl font-bold">Pause Automation</h2>
							</div>
							<button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
								<X size={20} />
							</button>
						</div>

						<p className="text-xs text-zinc-500 mb-6">
							Select how long you'd like to pause automated pipeline runs. Manual runs will still be available.
						</p>

						<div className="grid grid-cols-2 gap-2 mb-6">
							{DURATIONS.map((dur) => (
								<button
									key={dur.days}
									onClick={() => {
										onPause(dur.days);
										onClose();
									}}
									className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1"
								>
									<span className="text-zinc-500 text-[10px] uppercase">{dur.label}</span>
									<span>
										{dur.days} {dur.days === 1 ? 'Day' : 'Days'}
									</span>
								</button>
							))}
						</div>

						<div className="relative mb-4">
							<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
								<Calendar size={16} />
							</div>
							<input
								type="number"
								min="1"
								value={customDays}
								onChange={(e) => setCustomDays(e.target.value)}
								className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all"
								placeholder="Custom days..."
							/>
							<button
								onClick={() => {
									const d = Number.parseInt(customDays, 10);
									if (d > 0) {
										onPause(d);
										onClose();
									}
								}}
								className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
							>
								Set
							</button>
						</div>

						<button
							onClick={() => {
								onPause('forever');
								onClose();
							}}
							className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-900/20 active:scale-95 mb-3"
						>
							Pause Forever
						</button>

						<button
							onClick={onClose}
							className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-2xl font-bold text-xs transition-all"
						>
							Cancel
						</button>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
};
