import { RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { Post } from '../../types';
import { DislikeModal } from './DislikeModal';
import { PostCard } from './PostCard';

export const Feed: React.FC = () => {
	const [posts, setPosts] = useState<Post[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [dislikeTarget, setDislikeTarget] = useState<Post | null>(null);

	const fetchFeed = async () => {
		try {
			const res = await fetch('/api/current-batch');
			const data = await res.json();
			if (data && data.posts) {
				setPosts(data.posts);
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

	const handleLike = async (id: string) => {
		setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, interaction: 'like' } : p)));
		await fetch(`/api/posts/${id}/like`, { method: 'POST' });
	};

	const handleDislikeInitiate = (id: string) => {
		const post = posts.find((p) => p.id === id);
		if (post) setDislikeTarget(post);
	};

	const handleDislikeConfirm = async (reason: string, tags: string[]) => {
		if (!dislikeTarget) return;

		const id = dislikeTarget.id;
		setPosts((prev) =>
			prev.map((p) => (p.id === id ? { ...p, interaction: 'dislike', dislikeReason: reason, dislikeTags: tags } : p)),
		);

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

	return (
		<div className="p-4">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-black tracking-tight underline decoration-orange-500 decoration-4 underline-offset-4">
					Feed
				</h1>
				<button
					onClick={() => {
						setRefreshing(true);
						fetchFeed();
					}}
					className="p-2 text-zinc-500 hover:text-orange-500 transition-colors"
				>
					<RefreshCw className={refreshing ? 'animate-spin' : ''} size={20} />
				</button>
			</div>

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
