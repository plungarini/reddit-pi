import { History as HistoryIcon, Home as HomeIcon, Settings as PrefsIcon, Info as StatusIcon } from 'lucide-react';
import { useState } from 'react';
import { Feed } from './components/Feed';
import { History } from './components/History';
import { Preferences } from './components/Preferences';
import { Status } from './components/Status';
import { cn } from './lib/utils';

const App = () => {
	const [activeTab, setActiveTab] = useState('home');

	const renderContent = () => {
		switch (activeTab) {
			case 'home':
				return <Feed />;
			case 'history':
				return <History />;
			case 'prefs':
				return <Preferences />;
			case 'status':
				return <Status />;
			default:
				return <Feed />;
		}
	};

	const navItems = [
		{ id: 'home', icon: HomeIcon, label: 'Feed' },
		{ id: 'history', icon: HistoryIcon, label: 'History' },
		{ id: 'prefs', icon: PrefsIcon, label: 'Affinities' },
		{ id: 'status', icon: StatusIcon, label: 'Status' },
	];

	return (
		<div className="pb-20 mx-auto max-w-lg min-h-screen text-white border-zinc-900 shadow-2xl bg-zinc-950 border-x shadow-orange-500/5">
			<main className="min-h-screen">{renderContent()}</main>

			<nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg border-t border-zinc-900 backdrop-blur-xl -translate-x-1/2 bg-zinc-950/80 pb-safe">
				<div className="flex justify-around items-center h-16">
					{navItems.map((item) => (
						<button
							key={item.id}
							onClick={() => setActiveTab(item.id)}
							className={cn(
								'flex flex-col items-center justify-center space-y-1 w-full h-full transition-all active:scale-90 relative',
								activeTab === item.id ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-400',
							)}
						>
							<item.icon size={20} className={cn('transition-transform', activeTab === item.id && 'scale-110')} />
							<span className="text-[10px] uppercase font-black tracking-widest">{item.label}</span>
							{activeTab === item.id && (
								<div className="absolute top-0 w-8 h-0.5 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
							)}
						</button>
					))}
				</div>
			</nav>
		</div>
	);
};

export default App;
