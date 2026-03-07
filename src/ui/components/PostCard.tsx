import { motion } from 'framer-motion';
import { Clock, ExternalLink, MessageSquare, ThumbsDown, ThumbsUp, User } from 'lucide-react';
import React from 'react';
import type { Post } from '../../types';
import { cn } from '../lib/utils';

interface PostCardProps {
	post: Post;
	onLike: (id: string) => void;
	onDislike: (id: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onLike, onDislike }) => {
	const isLiked = post.interaction === 'like';
	const isDisliked = post.interaction === 'dislike';

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className={cn(
				'bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-4 transition-all',
				isLiked && 'border-green-500/50 bg-green-500/5',
				isDisliked && 'border-red-500/50 bg-red-500/5 opacity-50',
			)}
		>
			<div className="p-4">
				<div className="flex items-center justify-between mb-2">
					<span className="text-orange-500 text-xs font-bold uppercase tracking-wider">r/{post.subreddit}</span>
					<div className="flex items-center gap-3 text-zinc-500 text-[10px]">
						<span className="flex items-center gap-1">
							<User size={10} /> {post.author}
						</span>
						<span className="flex items-center gap-1">
							<Clock size={10} /> {new Date(post.createdUtc * 1000).toLocaleDateString()}
						</span>
					</div>
				</div>

				<h3 className="text-lg font-semibold leading-tight mb-3 selection:bg-orange-500/30">{post.title}</h3>

				{post.llmSummary && (
					<div className="bg-orange-500/5 border-l-2 border-orange-500 p-3 mb-4 rounded-r-lg">
						<p className="text-sm text-zinc-300 italic">“{post.llmSummary}”</p>
					</div>
				)}

				<div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
					<span className="flex items-center gap-1">
						<ThumbsUp size={12} className="text-orange-500" /> {post.score.toLocaleString()}
					</span>
					<span className="flex items-center gap-1">
						<MessageSquare size={12} /> {post.numComments.toLocaleString()}
					</span>
					<div className="ml-auto bg-zinc-800 px-2 py-1 rounded text-[10px] font-mono">
						Match: {Math.round(post.ourScore * 100)}%
					</div>
				</div>

				<div className="flex gap-2">
					<button
						onClick={() => onLike(post.id)}
						disabled={isDisliked}
						className={cn(
							'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all active:scale-95',
							isLiked
								? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
								: 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
						)}
					>
						<ThumbsUp size={18} />
						Like
					</button>
					<button
						onClick={() => onDislike(post.id)}
						disabled={isLiked}
						className={cn(
							'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all active:scale-95',
							isDisliked
								? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
								: 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
						)}
					>
						<ThumbsDown size={18} />
						Dislike
					</button>
					<a
						href={`https://reddit.com${post.permalink}`}
						target="_blank"
						rel="noopener noreferrer"
						className="w-12 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 transition-colors"
					>
						<ExternalLink size={18} />
					</a>
				</div>
			</div>
		</motion.div>
	);
};
