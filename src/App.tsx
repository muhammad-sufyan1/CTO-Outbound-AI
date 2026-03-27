/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Mail, 
  FileText, 
  CalendarDays, 
  UserPlus,
  LayoutDashboard,
  Newspaper,
  Globe,
  Activity,
  LogOut
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginAnonymously, logout } from './lib/firebase';
import InMailWriter from './components/InMailWriter';
import CommentWriter from './components/CommentWriter';
import ConnectionNoteWriter from './components/ConnectionNoteWriter';
import EmailWriter from './components/EmailWriter';
import PostPlanner from './components/PostPlanner';
import NewsletterWriter from './components/NewsletterWriter';
import CommunityWriter from './components/CommunityWriter';
import MessageWriter from './components/MessageWriter';
import { useUsageTracker, WIDGET_LIMITS } from './lib/useUsageTracker';

type Tab = 'inmail' | 'comment' | 'connection' | 'email' | 'message' | 'post' | 'newsletter' | 'community';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('inmail');
  const { stats } = useUsageTracker();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        await loginAnonymously();
      }
    });
    return () => unsubscribe();
  }, []);

  const tabs = [
    { id: 'inmail', label: 'InMail Writer', icon: MessageSquare, limit: WIDGET_LIMITS.inmail },
    { id: 'comment', label: 'Comment Writer', icon: FileText, limit: WIDGET_LIMITS.comment },
    { id: 'connection', label: 'Connection Note', icon: UserPlus, limit: WIDGET_LIMITS.connection },
    { id: 'email', label: 'Email Writer', icon: Mail, limit: WIDGET_LIMITS.email },
    { id: 'message', label: 'Message Writer (CRM)', icon: MessageSquare, limit: WIDGET_LIMITS.message },
    { id: 'post', label: 'Post Planner', icon: CalendarDays, limit: WIDGET_LIMITS.post },
    { id: 'newsletter', label: 'Newsletter', icon: Newspaper, limit: WIDGET_LIMITS.newsletter },
    { id: 'community', label: 'Reddit & Quora', icon: Globe, limit: WIDGET_LIMITS.community },
  ];

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-neutral-50">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col">
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <LayoutDashboard size={20} />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">Outbound AI</h1>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const usageCount = stats.counts[tab.id] || 0;
            const usagePercent = Math.min(100, (usageCount / tab.limit) * 100);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`w-full flex flex-col gap-1 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <Icon size={18} className={isActive ? 'text-blue-600' : 'text-neutral-400'} />
                  <span className="flex-1 text-left">{tab.label}</span>
                  <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-neutral-200 text-neutral-500">
                    {usageCount}/{tab.limit}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-1 mt-1 overflow-hidden">
                  <div 
                    className={`h-1 rounded-full ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-blue-500'}`} 
                    style={{ width: `${usagePercent}%` }}
                  ></div>
                </div>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-neutral-200 text-xs text-neutral-500 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-neutral-600 font-medium">
            <Activity size={14} />
            Daily Checkpoint
          </div>
          <p>Optimize your outreach. Prioritize Emails and Messages for highest impact.</p>
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
            <span className="truncate max-w-[140px]" title={user?.email || 'Anonymous User'}>{user?.email || 'Anonymous User'}</span>
            <button onClick={logout} className="text-neutral-400 hover:text-red-500" title="Reset Data (Sign Out)">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          <div className={activeTab === 'inmail' ? 'block' : 'hidden'}><InMailWriter /></div>
          <div className={activeTab === 'comment' ? 'block' : 'hidden'}><CommentWriter /></div>
          <div className={activeTab === 'connection' ? 'block' : 'hidden'}><ConnectionNoteWriter /></div>
          <div className={activeTab === 'email' ? 'block' : 'hidden'}><EmailWriter /></div>
          <div className={activeTab === 'message' ? 'block' : 'hidden'}><MessageWriter /></div>
          <div className={activeTab === 'post' ? 'block' : 'hidden'}><PostPlanner /></div>
          <div className={activeTab === 'newsletter' ? 'block' : 'hidden'}><NewsletterWriter /></div>
          <div className={activeTab === 'community' ? 'block' : 'hidden'}><CommunityWriter /></div>
        </div>
      </main>
    </div>
  );
}
