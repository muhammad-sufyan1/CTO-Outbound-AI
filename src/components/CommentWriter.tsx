import React, { useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { generateContent } from '../lib/gemini';
import { COMMENT_PROMPT, PERSONAS } from '../lib/prompts';
import Markdown from 'react-markdown';
import { useUsageTracker } from '../lib/useUsageTracker';

type PersonaKey = keyof typeof PERSONAS;

export default function CommentWriter() {
  const [persona, setPersona] = useState<PersonaKey>('cto');
  const [postContent, setPostContent] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { trackUsage, checkLimit } = useUsageTracker();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkLimit('comment')) return;
    
    setIsLoading(true);
    setOutput('');
    
    try {
      const prompt = COMMENT_PROMPT
        .replace('{persona}', PERSONAS[persona])
        .replace('{postContent}', postContent);
      const result = await generateContent(prompt);
      setOutput(result);
    } catch (error) {
      setOutput(`**Fallback Generation Activated (API Error)**\n\nGreat insights! I completely agree with your point about [Topic]. In my experience, focusing on [Key Aspect] really helps drive better results. Thanks for sharing!`);
    } finally {
      trackUsage('comment');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">LinkedIn Comment Writer</h2>
          <p className="text-neutral-500 mt-1">Generate insightful comments to position yourself as an expert.</p>
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
            <label className="block text-sm font-medium text-neutral-700 mb-1">LinkedIn Post Content *</label>
            <textarea
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[250px] text-sm"
              placeholder="Paste the full text of the LinkedIn post you want to comment on..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !postContent}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <MessageCircle size={18} />}
            {isLoading ? 'Generating...' : 'Generate Comment'}
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
