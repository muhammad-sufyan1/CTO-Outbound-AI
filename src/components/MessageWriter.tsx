import React, { useState, useEffect } from 'react';
import { Loader2, Send, UserPlus, History, Trash2, MessageSquare } from 'lucide-react';
import { generateContent } from '../lib/gemini';
import { MESSAGE_WRITER_PROMPT, PERSONAS } from '../lib/prompts';
import Markdown from 'react-markdown';
import { useUsageTracker } from '../lib/useUsageTracker';

type PersonaKey = keyof typeof PERSONAS;
type Stage = 'Initial Message' | 'Follow-up 1' | 'Follow-up 2' | 'Follow-up 3' | 'Delete';

interface Message {
  stage: Stage;
  content: string;
  date: string;
}

interface Prospect {
  id: string;
  name: string;
  role: string;
  company: string;
  context: string;
  stage: Stage;
  messages: Message[];
}

export default function MessageWriter() {
  const [persona, setPersona] = useState<PersonaKey>('cto');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { trackUsage } = useUsageTracker();

  // New prospect form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newContext, setNewContext] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('linkedin_prospects');
    if (saved) {
      try {
        setProspects(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse prospects', e);
      }
    }
  }, []);

  const saveProspects = (updated: Prospect[]) => {
    setProspects(updated);
    localStorage.setItem('linkedin_prospects', JSON.stringify(updated));
  };

  const handleAddProspect = (e: React.FormEvent) => {
    e.preventDefault();
    const newProspect: Prospect = {
      id: Date.now().toString(),
      name: newName,
      role: newRole,
      company: newCompany,
      context: newContext,
      stage: 'Initial Message',
      messages: [],
    };
    saveProspects([newProspect, ...prospects]);
    setNewName('');
    setNewRole('');
    setNewCompany('');
    setNewContext('');
    setSelectedProspectId(newProspect.id);
  };

  const handleDeleteProspect = (id: string) => {
    saveProspects(prospects.filter(p => p.id !== id));
    if (selectedProspectId === id) setSelectedProspectId(null);
  };

  const selectedProspect = prospects.find(p => p.id === selectedProspectId);

  const handleGenerateMessage = async () => {
    if (!selectedProspect) return;
    
    setIsGenerating(true);
    try {
      const previousMessages = selectedProspect.messages
        .map(m => `[${m.stage}]: ${m.content}`)
        .join('\n\n');

      const prompt = MESSAGE_WRITER_PROMPT
        .replace('{persona}', PERSONAS[persona])
        .replace('{stage}', selectedProspect.stage)
        .replace('{name}', selectedProspect.name)
        .replace('{role}', selectedProspect.role)
        .replace('{company}', selectedProspect.company)
        .replace('{context}', selectedProspect.context || 'None')
        .replace('{previousMessages}', previousMessages || 'None');

      const result = await generateContent(prompt);
      
      const newMessage: Message = {
        stage: selectedProspect.stage,
        content: result,
        date: new Date().toISOString(),
      };

      let nextStage: Stage = 'Initial Message';
      if (selectedProspect.stage === 'Initial Message') nextStage = 'Follow-up 1';
      else if (selectedProspect.stage === 'Follow-up 1') nextStage = 'Follow-up 2';
      else if (selectedProspect.stage === 'Follow-up 2') nextStage = 'Follow-up 3';
      else if (selectedProspect.stage === 'Follow-up 3') nextStage = 'Delete';

      const updatedProspect = {
        ...selectedProspect,
        stage: nextStage,
        messages: [...selectedProspect.messages, newMessage],
      };

      saveProspects(prospects.map(p => p.id === updatedProspect.id ? updatedProspect : p));
      trackUsage('message');
    } catch (error) {
      const fallbackMessage: Message = {
        stage: selectedProspect.stage,
        content: `**Fallback Generation Activated (API Error)**\n\nHi ${selectedProspect.name},\n\nJust following up on my previous message. Let me know if you have a few minutes to connect this week.\n\nBest,\n[Your Name]`,
        date: new Date().toISOString(),
      };
      
      let nextStage: Stage = 'Initial Message';
      if (selectedProspect.stage === 'Initial Message') nextStage = 'Follow-up 1';
      else if (selectedProspect.stage === 'Follow-up 1') nextStage = 'Follow-up 2';
      else if (selectedProspect.stage === 'Follow-up 2') nextStage = 'Follow-up 3';
      else if (selectedProspect.stage === 'Follow-up 3') nextStage = 'Delete';

      const updatedProspect = {
        ...selectedProspect,
        stage: nextStage,
        messages: [...selectedProspect.messages, fallbackMessage],
      };
      saveProspects(prospects.map(p => p.id === updatedProspect.id ? updatedProspect : p));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Message Writer (CRM)</h2>
          <p className="text-neutral-500 mt-1">Prospect-based storage and conversation tracking (Initial + 3 Follow-ups).</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            value={persona}
            onChange={(e) => setPersona(e.target.value as PersonaKey)}
          >
            <option value="bdm">BDM (PayProNext Focus)</option>
            <option value="cto">CTO (Software Dev Focus)</option>
            <option value="swe">Senior SWE (IoT/AI Focus)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: Prospect List & Add Form */}
        <div className="lg:col-span-4 space-y-6">
          <form onSubmit={handleAddProspect} className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
            <h3 className="font-medium text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-2">
              <UserPlus size={18} className="text-blue-600" />
              Add New Prospect
            </h3>
            <div className="space-y-3">
              <input required type="text" placeholder="Name *" className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm" value={newName} onChange={e => setNewName(e.target.value)} />
              <input required type="text" placeholder="Role *" className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm" value={newRole} onChange={e => setNewRole(e.target.value)} />
              <input required type="text" placeholder="Company *" className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm" value={newCompany} onChange={e => setNewCompany(e.target.value)} />
              <textarea placeholder="Context / Notes (Optional)" className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm min-h-[80px]" value={newContext} onChange={e => setNewContext(e.target.value)} />
              <button type="submit" className="w-full bg-neutral-900 text-white py-2 rounded-md text-sm font-medium hover:bg-neutral-800 transition-colors">
                Save Prospect
              </button>
            </div>
          </form>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col max-h-[500px]">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
              <h3 className="font-medium text-neutral-800 flex items-center gap-2">
                <History size={18} className="text-neutral-600" />
                Prospects
              </h3>
              <span className="text-xs bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full">{prospects.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {prospects.length === 0 ? (
                <div className="p-4 text-center text-sm text-neutral-500 italic">No prospects added yet.</div>
              ) : (
                prospects.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedProspectId(p.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${selectedProspectId === p.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-neutral-50'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-sm text-neutral-900">{p.name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.stage === 'Delete' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {p.stage}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 truncate">{p.role} @ {p.company}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Conversation Thread */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col h-[calc(100vh-12rem)] min-h-[600px]">
          {selectedProspect ? (
            <>
              <div className="p-5 border-b border-neutral-200 flex justify-between items-start bg-neutral-50/50">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">{selectedProspect.name}</h3>
                  <p className="text-sm text-neutral-600">{selectedProspect.role} at {selectedProspect.company}</p>
                  {selectedProspect.context && <p className="text-xs text-neutral-500 mt-2 bg-white p-2 rounded border border-neutral-200">Context: {selectedProspect.context}</p>}
                </div>
                <button onClick={() => handleDeleteProspect(selectedProspect.id)} className="text-neutral-400 hover:text-red-600 transition-colors p-2" title="Delete Prospect">
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-50/30">
                {selectedProspect.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-center">
                    <MessageSquare size={48} className="text-neutral-200 mb-4" />
                    <p>No messages generated yet.</p>
                    <p className="text-sm mt-1">Click below to draft the Initial Message.</p>
                  </div>
                ) : (
                  selectedProspect.messages.map((msg, idx) => (
                    <div key={idx} className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-neutral-100 px-4 py-2 border-b border-neutral-200 flex justify-between items-center">
                        <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">{msg.stage}</span>
                        <span className="text-xs text-neutral-500">{new Date(msg.date).toLocaleDateString()}</span>
                      </div>
                      <div className="p-4 prose prose-sm max-w-none prose-neutral">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                  ))
                )}
                {isGenerating && (
                  <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm flex items-center justify-center gap-3 text-blue-600">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="font-medium">Drafting {selectedProspect.stage}...</span>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-neutral-200 bg-white">
                {selectedProspect.stage === 'Delete' ? (
                  <div className="text-center p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
                    <p className="font-medium">No response after 3 follow-ups.</p>
                    <p className="text-sm mt-1">Recommendation: Mark for deletion and move on.</p>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateMessage}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Send size={18} />
                    Generate {selectedProspect.stage}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
              <UserPlus size={48} className="text-neutral-200 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">Select or Add a Prospect</h3>
              <p className="text-sm max-w-sm">Manage your outreach pipeline by adding a prospect on the left to start generating a conversation thread.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
