import { History as HistoryIcon, Home as HomeIcon, Settings as PrefsIcon, Info as StatusIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Feed } from './components/Feed';
import { History } from './components/History';
import { Preferences } from './components/Preferences';
import { Status } from './components/Status';
import { cn } from './lib/utils';

const TABS = {
	home: { id: 'home', icon: HomeIcon, label: 'Feed', component: Feed },
	history: { id: 'history', icon: HistoryIcon, label: 'History', component: History },
	prefs: { id: 'prefs', icon: PrefsIcon, label: 'Affinities', component: Preferences },
	status: { id: 'status', icon: StatusIcon, label: 'Status', component: Status },
};

const App = () => {
	const [activeTab, setActiveTab] = useState<keyof typeof TABS>('home');
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTo(0, 0);
		}
	}, [activeTab]);

	const navItems = Object.values(TABS);
	const ActiveView = TABS[activeTab].component;

	return (
		<div className="mx-auto max-w-lg min-h-screen text-white border-zinc-900 shadow-2xl bg-zinc-950 border-x shadow-orange-500/5 flex flex-col h-screen overflow-hidden">
			{/* Dynamic Fixed Header */}
			<header className="z-40 px-6 h-16 border-b bg-zinc-950/80 backdrop-blur-xl border-zinc-800/60 flex items-center shrink-0">
				<div className="flex items-center justify-between w-full">
					<h2 className="text-xl font-black uppercase tracking-tighter text-orange-500 italic leading-none">
						{TABS[activeTab].label}
					</h2>
					<div id="header-actions" className="flex items-center h-full" />
				</div>
			</header>

			{/* Scrollable Content Area */}
			<main ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-24">
				<ActiveView />
			</main>

			{/* Navigation */}
			<nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg border-t border-zinc-900 backdrop-blur-xl -translate-x-1/2 bg-zinc-950/80 pb-safe">
				<div className="flex justify-around items-center h-16">
					{navItems.map((item) => (
						<button
							key={item.id}
							onClick={() => setActiveTab(item.id as any)}
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
