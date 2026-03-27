import React, { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { generateContent } from '../lib/gemini';
import { CONNECTION_NOTE_PROMPT, PERSONAS } from '../lib/prompts';
import Markdown from 'react-markdown';
import { useUsageTracker } from '../lib/useUsageTracker';

type PersonaKey = keyof typeof PERSONAS;

export default function ConnectionNoteWriter() {
  const [persona, setPersona] = useState<PersonaKey>('cto');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [context, setContext] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { trackUsage } = useUsageTracker();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setOutput('');
    
    try {
      const prompt = CONNECTION_NOTE_PROMPT
        .replace('{persona}', PERSONAS[persona])
        .replace('{role}', role)
        .replace('{company}', company)
        .replace('{context}', context || 'None provided');
      
      const result = await generateContent(prompt);
      setOutput(result);
      trackUsage('connection');
    } catch (error) {
      setOutput(`**Fallback Generation Activated (API Error)**\n\nHi [Name],\n\nI'm looking to connect with leaders in [Industry]. I saw your profile and would love to add you to my network to follow your updates.\n\nBest,\n[Your Name]`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Connection Note Writer</h2>
          <p className="text-neutral-500 mt-1">Generate short, effective LinkedIn connection requests.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleGenerate} className="space-y-4 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Prospect Role *</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="e.g., VP of Engineering, CEO"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Company *</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="e.g., Acme Corp"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Optional Context</label>
            <textarea
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] text-sm"
              placeholder="Shared groups, recent news, or specific reason for connecting..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !role || !company}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
            {isLoading ? 'Generating...' : 'Generate Note'}
          </button>
        </form>

        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col h-full min-h-[400px]">
          <h3 className="text-sm font-medium text-neutral-700 mb-4 border-b border-neutral-100 pb-2">Generated Output</h3>
          <div className="flex-1 overflow-y-auto prose prose-sm max-w-none prose-neutral">
            {output ? (
              <Markdown>{output}</Markdown>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400 italic text-sm">
                Output will appear here...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
