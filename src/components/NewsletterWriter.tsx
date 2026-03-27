import React, { useState } from 'react';
import { Loader2, Newspaper, Lightbulb, List, FileText } from 'lucide-react';
import { generateContent, generateJsonContent } from '../lib/gemini';
import { 
  NEWSLETTER_PROMPT, 
  NEWSLETTER_TOPICS_PROMPT,
  NEWSLETTER_OUTLINE_PROMPT,
  PERSONAS 
} from '../lib/prompts';
import Markdown from 'react-markdown';
import { useUsageTracker } from '../lib/useUsageTracker';

type SubTab = 'topics' | 'outline' | 'writer';
type PersonaKey = keyof typeof PERSONAS;

interface TopicIdea {
  week: number;
  title: string;
  description: string;
}

export default function NewsletterWriter() {
  const [activeTab, setActiveTab] = useState<SubTab>('topics');
  const [persona, setPersona] = useState<PersonaKey>('cto');

  // Topics State
  const [topics, setTopics] = useState<TopicIdea[]>([]);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);

  // Outline State
  const [outlineTopic, setOutlineTopic] = useState('');
  const [outlineOutput, setOutlineOutput] = useState('');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

  // Writer State
  const [topic, setTopic] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { trackUsage } = useUsageTracker();

  const handleGenerateTopics = async () => {
    setIsGeneratingTopics(true);
    setTopics([]);
    try {
      const prompt = NEWSLETTER_TOPICS_PROMPT.replace('{persona}', PERSONAS[persona]);
      const result = await generateJsonContent(prompt);
      setTopics(result);
      trackUsage('newsletter');
    } catch (error) {
      console.error(error);
      setTopics([
        { week: 1, title: 'The Future of Tech Leadership', description: 'Exploring how AI and automation are changing the role of the modern CTO.' },
        { week: 2, title: 'Building Scalable Architectures', description: 'Best practices for designing systems that can handle rapid growth.' },
        { week: 3, title: 'Managing Remote Engineering Teams', description: 'Strategies for keeping distributed teams engaged and productive.' },
        { week: 4, title: 'Security in the Cloud Era', description: 'Key considerations for protecting your data in a cloud-first world.' }
      ]);
    } finally {
      setIsGeneratingTopics(false);
    }
  };

  const handleGenerateOutline = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingOutline(true);
    setOutlineOutput('');
    try {
      const prompt = NEWSLETTER_OUTLINE_PROMPT
        .replace('{persona}', PERSONAS[persona])
        .replace('{topic}', outlineTopic);
      const result = await generateContent(prompt);
      setOutlineOutput(result);
      trackUsage('newsletter');
    } catch (error) {
      setOutlineOutput(`**Fallback Generation Activated (API Error)**\n\n# Outline for: ${outlineTopic}\n\n## 1. Introduction\n- Hook the reader with a compelling statistic or story.\n- State the main problem or opportunity.\n\n## 2. The Core Issue\n- Dive deeper into why this matters right now.\n- Provide examples of companies struggling or succeeding.\n\n## 3. Actionable Strategies\n- Strategy A: Implementation details.\n- Strategy B: Key benefits.\n- Strategy C: Common pitfalls to avoid.\n\n## 4. Conclusion\n- Summarize the main takeaways.\n- Call to action (e.g., "Subscribe for more insights").`);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setOutput('');
    try {
      const prompt = NEWSLETTER_PROMPT
        .replace('{persona}', PERSONAS[persona])
        .replace('{topic}', topic);
      const result = await generateContent(prompt);
      setOutput(result);
      trackUsage('newsletter');
    } catch (error) {
      setOutput(`**Fallback Generation Activated (API Error)**\n\n# ${topic}\n\nWelcome to this week's edition of the newsletter. Today, we're diving into a topic that's top of mind for many leaders in our industry.\n\n## The Changing Landscape\n\nOver the past few years, we've seen a massive shift in how organizations approach their technology stack. The focus has moved from simply keeping the lights on to driving real business value through innovation.\n\n## Key Takeaways\n\n1. **Embrace Agility:** The ability to pivot quickly is no longer a luxury; it's a necessity.\n2. **Invest in People:** Your technology is only as good as the team building and maintaining it.\n3. **Focus on Security:** As threats evolve, so must our defenses.\n\nI'd love to hear your thoughts on this. Reply to this email or leave a comment below!\n\nUntil next time,\n[Your Name]`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">LinkedIn Newsletter Writer</h2>
          <p className="text-neutral-500 mt-1">Plan, outline, and write authoritative newsletter articles.</p>
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

      {/* Sub-navigation */}
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveTab('topics')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'topics' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lightbulb size={16} />
            Monthly Topics
          </div>
        </button>
        <button
          onClick={() => setActiveTab('outline')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'outline' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <List size={16} />
            Outline Generator
          </div>
        </button>
        <button
          onClick={() => setActiveTab('writer')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'writer' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText size={16} />
            Article Writer
          </div>
        </button>
      </div>

      {/* Topics Tab */}
      {activeTab === 'topics' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div>
              <h3 className="text-lg font-medium text-neutral-900">Monthly Newsletter Topics</h3>
              <p className="text-sm text-neutral-500">Generate 4 weekly newsletter topics for the selected persona.</p>
            </div>
            <button
              onClick={handleGenerateTopics}
              disabled={isGeneratingTopics}
              className="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingTopics ? <Loader2 className="animate-spin" size={18} /> : <Lightbulb size={18} />}
              {isGeneratingTopics ? 'Generating...' : 'Generate Topics'}
            </button>
          </div>

          {topics.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topics.map((topic, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                      Week {topic.week}
                    </span>
                  </div>
                  <h4 className="font-semibold text-neutral-900 mb-2">{topic.title}</h4>
                  <p className="text-sm text-neutral-600 flex-1">{topic.description}</p>
                  <button 
                    onClick={() => {
                      setOutlineTopic(topic.title);
                      setTopic(topic.title);
                      setActiveTab('outline');
                    }}
                    className="mt-4 text-sm text-blue-600 font-medium hover:text-blue-700 text-left"
                  >
                    Use this topic →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Outline Tab */}
      {activeTab === 'outline' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={handleGenerateOutline} className="space-y-4 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Newsletter Topic / Theme *</label>
              <textarea
                required
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] text-sm"
                placeholder="e.g., Why legacy payroll systems are costing you money..."
                value={outlineTopic}
                onChange={(e) => setOutlineTopic(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isGeneratingOutline || !outlineTopic}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingOutline ? <Loader2 className="animate-spin" size={18} /> : <List size={18} />}
              {isGeneratingOutline ? 'Drafting Outline...' : 'Generate Outline'}
            </button>
          </form>

          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col h-full min-h-[500px]">
            <h3 className="text-sm font-medium text-neutral-700 mb-4 border-b border-neutral-100 pb-2">Generated Outline</h3>
            <div className="flex-1 overflow-y-auto prose prose-sm max-w-none prose-neutral">
              {outlineOutput ? (
                <Markdown>{outlineOutput}</Markdown>
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-400 italic text-sm">
                  Your outline will appear here...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Writer Tab */}
      {activeTab === 'writer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={handleGenerate} className="space-y-4 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Newsletter Topic / Outline *</label>
              <textarea
                required
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] text-sm"
                placeholder="Paste your topic or the generated outline here to write the full article..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !topic}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Newspaper size={18} />}
              {isLoading ? 'Drafting Article...' : 'Generate Full Article'}
            </button>
          </form>

          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col h-full min-h-[500px]">
            <h3 className="text-sm font-medium text-neutral-700 mb-4 border-b border-neutral-100 pb-2">Generated Article</h3>
            <div className="flex-1 overflow-y-auto prose prose-sm max-w-none prose-neutral">
              {output ? (
                <Markdown>{output}</Markdown>
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-400 italic text-sm">
                  Your newsletter will appear here...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
