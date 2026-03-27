import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { generateContent } from '../lib/gemini';
import { INMAIL_PROMPT, PERSONAS } from '../lib/prompts';
import Markdown from 'react-markdown';
import { useUsageTracker } from '../lib/useUsageTracker';

type PersonaKey = keyof typeof PERSONAS;

export default function InMailWriter() {
  const [persona, setPersona] = useState<PersonaKey>('cto');
  const [profileData, setProfileData] = useState('');
  const [companyInfo, setCompanyInfo] = useState('');
  const [context, setContext] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { trackUsage } = useUsageTracker();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setOutput('');
    
    try {
      const prompt = INMAIL_PROMPT
        .replace('{persona}', PERSONAS[persona])
        .replace('{profileData}', profileData)
        .replace('{companyInfo}', companyInfo)
        .replace('{context}', context || 'None provided');
      
      const result = await generateContent(prompt);
      setOutput(result);
      trackUsage('inmail');
    } catch (error) {
      setOutput(`**Fallback Generation Activated (API Error)**\n\nHi [Name],\n\nI noticed your work at [Company] and wanted to connect. We help companies in your space streamline operations and drive growth.\n\nWould you be open to a brief chat next week?\n\nBest,\n[Your Name]`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">LinkedIn InMail Writer</h2>
          <p className="text-neutral-500 mt-1">Generate highly personalized, high-converting InMails.</p>
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
            <label className="block text-sm font-medium text-neutral-700 mb-1">Prospect Profile Data *</label>
            <textarea
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] text-sm"
              placeholder="Paste LinkedIn profile summary, headline, experience..."
              value={profileData}
              onChange={(e) => setProfileData(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Company Info *</label>
            <textarea
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] text-sm"
              placeholder="Company name, industry, size, recent news..."
              value={companyInfo}
              onChange={(e) => setCompanyInfo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Optional Context / Recent Activity</label>
            <textarea
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] text-sm"
              placeholder="Recent posts, mutual connections, specific triggers..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !profileData || !companyInfo}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {isLoading ? 'Generating...' : 'Generate InMail'}
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
