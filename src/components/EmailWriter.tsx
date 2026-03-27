import React, { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { generateContent } from '../lib/gemini';
import { EMAIL_PROMPTS, PERSONAS } from '../lib/prompts';
import Markdown from 'react-markdown';
import { useUsageTracker } from '../lib/useUsageTracker';

type EmailType = keyof typeof EMAIL_PROMPTS;
type PersonaKey = keyof typeof PERSONAS;

export default function EmailWriter() {
  const [persona, setPersona] = useState<PersonaKey>('cto');
  const [emailType, setEmailType] = useState<EmailType>('payProNext');
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');
  const [state, setState] = useState('');
  const [url, setUrl] = useState('');
  const [context, setContext] = useState('');
  
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { trackUsage, checkLimit } = useUsageTracker();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkLimit('email')) return;
    
    setIsLoading(true);
    setOutput('');
    
    try {
      let prompt = EMAIL_PROMPTS[emailType]
        .replace('{company}', company)
        .replace('{industry}', industry);

      if (emailType !== 'payProNext') {
        prompt = prompt.replace('{persona}', PERSONAS[persona]);
      }

      if (emailType === 'payProNext') {
        prompt = prompt.replace('{size}', size).replace('{state}', state || 'Not specified');
      } else if (emailType === 'websiteDev' || emailType === 'websiteRedesign') {
        prompt = prompt.replace('{url}', url || 'Not specified');
      } else if (emailType === 'softwareAi') {
        prompt = prompt.replace('{context}', context || 'Not specified');
      }
      
      const result = await generateContent(prompt);
      setOutput(result);
    } catch (error) {
      setOutput(`**Fallback Generation Activated (API Error)**\n\n**Subject:** Quick question about your operations at [Company]\n\nHi [Name],\n\nI noticed [Company] has been growing recently. Often, companies at your stage struggle with scaling their internal systems effectively.\n\nWe specialize in helping businesses like yours optimize their processes and reduce overhead by up to 30%.\n\nWould you be open to a 10-minute chat next Tuesday to see if there's a fit?\n\nBest,\n[Your Name]`);
    } finally {
      trackUsage('email');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Cold Email Writer</h2>
          <p className="text-neutral-500 mt-1">Generate highly relevant cold emails for specific services.</p>
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
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email Campaign Type</label>
            <select
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              value={emailType}
              onChange={(e) => setEmailType(e.target.value as EmailType)}
            >
              <option value="payProNext">PayProNext (US Payroll)</option>
              <option value="websiteDev">Website Development</option>
              <option value="softwareAi">Software Dev with AI</option>
              <option value="websiteRedesign">Website Redesign</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Target Company Name *</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Industry *</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>

          {emailType === 'payProNext' && (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Employee Count / Size *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">State (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
            </>
          )}

          {(emailType === 'websiteDev' || emailType === 'websiteRedesign') && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Website URL (Optional)</label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          {emailType === 'softwareAi' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Optional Context</label>
              <textarea
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[80px]"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Specific inefficiencies, current tech stack..."
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !company || !industry || (emailType === 'payProNext' && !size)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
            {isLoading ? 'Generating...' : 'Generate Email'}
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
