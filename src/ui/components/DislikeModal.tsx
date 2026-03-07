import { AnimatePresence, motion } from 'framer-motion';
import { Send, X } from 'lucide-react';
import React, { useState } from 'react';
import { cn } from '../lib/utils';

interface DislikeModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (reason: string, tags: string[]) => void;
	postTitle: string;
}

const PREDEFINED_TAGS = ['Repetitive', 'Not Interested', 'Low Quality', 'Too Political', 'Spam', 'Spoiler'];

export const DislikeModal: React.FC<DislikeModalProps> = ({ isOpen, onClose, onSubmit, postTitle }) => {
	const [reason, setReason] = useState('');
	const [selectedTags, setSelectedTags] = useState<string[]>([]);

	const toggleTag = (tag: string) => {
		setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
	};

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
							<h2 className="text-xl font-bold">Improve Feed</h2>
							<button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
								<X size={20} />
							</button>
						</div>

						<p className="text-xs text-zinc-500 mb-4 line-clamp-2">Why didn't you like: "{postTitle}"?</p>

						<div className="flex flex-wrap gap-2 mb-6">
							{PREDEFINED_TAGS.map((tag) => (
								<button
									key={tag}
									onClick={() => toggleTag(tag)}
									className={cn(
										'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
										selectedTags.includes(tag)
											? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
											: 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
									)}
								>
									{tag}
								</button>
							))}
						</div>

						<textarea
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Optional: Other reasons..."
							className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all h-24 mb-6 resize-none"
						/>

						<button
							onClick={() => {
								onSubmit(reason, selectedTags);
								onClose();
							}}
							className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
						>
							<Send size={18} />
							Submit Feedback
						</button>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
};
