import { RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Post } from '../../types';
import { DislikeModal } from './DislikeModal';
import { PostCard } from './PostCard';

export const Feed: React.FC = () => {
	const [posts, setPosts] = useState<Post[]>([]);
	const [totalCandidates, setTotalCandidates] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [dislikeTarget, setDislikeTarget] = useState<Post | null>(null);

	const fetchFeed = async () => {
		try {
			const res = await fetch('/api/current-batch');
			const data = await res.json();
			if (data && data.posts) {
				const sorted = [...data.posts].sort((a, b) => {
					if (a.interaction && !b.interaction) return 1;
					if (!a.interaction && b.interaction) return -1;
					return 0;
				});
				setPosts(sorted);
				setTotalCandidates(data.totalCandidates || null);
			}
		} catch (err) {
			console.error('Failed to fetch feed:', err);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchFeed();
	}, []);

	// ... (handlers like handleLike, handleDislikeConfirm)
	const handleLike = async (id: string) => {
		setPosts((prev) => {
			const post = prev.find((p) => p.id === id);
			if (!post) return prev;
			const updatedPost = { ...post, interaction: 'like' as const };
			const others = prev.filter((p) => p.id !== id);
			return [...others, updatedPost];
		});
		await fetch(`/api/posts/${id}/like`, { method: 'POST' });
	};

	const handleDislikeInitiate = (id: string) => {
		const post = posts.find((p) => p.id === id);
		if (post) setDislikeTarget(post);
	};

	const handleDislikeConfirm = async (reason: string, tags: string[]) => {
		if (!dislikeTarget) return;

		const id = dislikeTarget.id;
		setPosts((prev) => {
			const post = prev.find((p) => p.id === id);
			if (!post) return prev;
			const updatedPost = { ...post, interaction: 'dislike' as const, dislikeReason: reason, dislikeTags: tags };
			const others = prev.filter((p) => p.id !== id);
			return [...others, updatedPost];
		});

		await fetch(`/api/posts/${id}/dislike`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ reason, tags }),
		});

		setDislikeTarget(null);
	};

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
				<RefreshCw className="animate-spin mb-4" size={32} />
				<p className="font-bold tracking-tight">Finding the best of Reddit...</p>
			</div>
		);
	}

	const headerActions = document.getElementById('header-actions');

	return (
		<div className="p-4">
			{headerActions &&
				createPortal(
					<button
						onClick={() => {
							setRefreshing(true);
							fetchFeed();
						}}
						className="p-1 text-zinc-500 hover:text-orange-500 transition-colors"
					>
						<RefreshCw className={refreshing ? 'animate-spin' : ''} size={20} />
					</button>,
					headerActions,
				)}

			{posts.length > 0 && (
				<div className="mb-6 flex items-center gap-2">
					<span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900 px-2 rounded">
						Showing {posts.length} of {totalCandidates || '?'} candidates
					</span>
				</div>
			)}

			{posts.length === 0 ? (
				<div className="bg-zinc-900/50 rounded-2xl p-12 text-center text-zinc-500 border border-zinc-900 border-dashed">
					<p className="mb-2 font-bold">No recommendations yet.</p>
					<p className="text-[10px] uppercase tracking-widest font-black opacity-50">Checking every 6 hours</p>
				</div>
			) : (
				<div className="space-y-2">
					{posts.map((post) => (
						<PostCard key={post.id} post={post} onLike={handleLike} onDislike={handleDislikeInitiate} />
					))}
				</div>
			)}

			<DislikeModal
				isOpen={!!dislikeTarget}
				onClose={() => setDislikeTarget(null)}
				postTitle={dislikeTarget?.title || ''}
				onSubmit={handleDislikeConfirm}
			/>
		</div>
	);
};
