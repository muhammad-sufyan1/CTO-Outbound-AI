import React, { useState, useEffect } from 'react';
import { Loader2, CalendarDays, PenTool, CheckCircle2, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { generateContent, generateJsonContent } from '../lib/gemini';
import { POST_PLANNER_PROMPT, POST_GENERATOR_PROMPT, PERSONAS } from '../lib/prompts';
import Markdown from 'react-markdown';
import { useUsageTracker } from '../lib/useUsageTracker';

interface PostPlan {
  day: number;
  title: string;
  description: string;
  goal: string;
}

interface SavedPlan {
  generatedAt: number;
  plan: PostPlan[];
}

type PersonaKey = keyof typeof PERSONAS;

export default function PostPlanner() {
  const [persona, setPersona] = useState<PersonaKey>('cto');
  const [plan, setPlan] = useState<PostPlan[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  
  const [selectedPost, setSelectedPost] = useState<PostPlan | null>(null);
  const [generatedPost, setGeneratedPost] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { trackUsage } = useUsageTracker();

  useEffect(() => {
    const saved = localStorage.getItem(`linkedin_post_plan_${persona}`);
    if (saved) {
      try {
        const parsed: SavedPlan = JSON.parse(saved);
        const ageInMs = Date.now() - parsed.generatedAt;
        const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
        
        if (ageInDays < 30) {
          setPlan(parsed.plan);
          setDaysRemaining(Math.ceil(30 - ageInDays));
        } else {
          // Plan expired
          localStorage.removeItem(`linkedin_post_plan_${persona}`);
          setPlan([]);
          setDaysRemaining(null);
        }
      } catch (e) {
        console.error("Failed to parse saved plan", e);
        setPlan([]);
        setDaysRemaining(null);
      }
    } else {
      setPlan([]);
      setDaysRemaining(null);
    }
    setSelectedPost(null);
    setGeneratedPost('');
  }, [persona]);

  const handleGeneratePlan = async (forceRegenerate = false) => {
    if (!forceRegenerate && plan.length > 0) {
      const confirm = window.confirm("This will overwrite your current 30-day plan for this persona. Are you sure?");
      if (!confirm) return;
    }

    setIsPlanning(true);
    setSelectedPost(null);
    setGeneratedPost('');
    
    try {
      const prompt = POST_PLANNER_PROMPT.replace('{persona}', PERSONAS[persona]);
      const result = await generateJsonContent(prompt);
      if (Array.isArray(result)) {
        setPlan(result);
        setDaysRemaining(30);
        localStorage.setItem(`linkedin_post_plan_${persona}`, JSON.stringify({
          generatedAt: Date.now(),
          plan: result
        }));
        trackUsage('post');
      } else {
        throw new Error("Failed to parse plan");
      }
    } catch (error) {
      console.error(error);
      const fallbackPlan: PostPlan[] = Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        title: `Fallback Topic for Day ${i + 1}`,
        description: "This is a fallback topic generated because the API request failed. You can use this as a placeholder.",
        goal: "Engagement"
      }));
      setPlan(fallbackPlan);
      setDaysRemaining(30);
      localStorage.setItem(`linkedin_post_plan_${persona}`, JSON.stringify({
        generatedAt: Date.now(),
        plan: fallbackPlan
      }));
    } finally {
      setIsPlanning(false);
    }
  };

  const handleGeneratePost = async (post: PostPlan) => {
    setSelectedPost(post);
    setIsGenerating(true);
    setGeneratedPost('');
    
    try {
      const prompt = POST_GENERATOR_PROMPT
        .replace('{persona}', PERSONAS[persona])
        .replace('{title}', post.title)
        .replace('{description}', post.description)
        .replace('{goal}', post.goal);
      
      const result = await generateContent(prompt);
      setGeneratedPost(result);
      trackUsage('post');
    } catch (error) {
      setGeneratedPost(`**Fallback Generation Activated (API Error)**\n\nHere is a quick thought on ${post.title}:\n\nIn today's fast-paced environment, focusing on ${post.goal} is more critical than ever. We've found that by implementing strong foundational practices, teams can significantly improve their output and morale.\n\nWhat are your thoughts on this? Let me know in the comments below! 👇\n\n#Leadership #Growth #Innovation`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">LinkedIn Post Planner</h2>
          <p className="text-neutral-500 mt-1">
            {daysRemaining !== null 
              ? `Your active 30-day content calendar. Expires in ${daysRemaining} days.` 
              : 'Plan 30 days of content and generate posts on demand.'}
          </p>
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
          <button
            onClick={() => handleGeneratePlan(false)}
            disabled={isPlanning}
            className="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isPlanning ? <Loader2 className="animate-spin" size={18} /> : (plan.length > 0 ? <RefreshCw size={18} /> : <CalendarDays size={18} />)}
            {isPlanning ? 'Planning...' : plan.length > 0 ? 'Regenerate Plan' : 'Generate 30-Day Plan'}
          </button>
        </div>
      </div>

      {plan.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Calendar Grid */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center gap-2">
              <CalendarIcon size={18} className="text-neutral-600" />
              <h3 className="font-medium text-neutral-800">Content Calendar</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {plan.map((item) => (
                  <div 
                    key={item.day}
                    className={`relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col min-h-[140px] ${
                      selectedPost?.day === item.day 
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-sm' 
                        : 'border-neutral-200 hover:border-blue-300 hover:bg-neutral-50 bg-white shadow-sm'
                    }`}
                    onClick={() => handleGeneratePost(item)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${selectedPost?.day === item.day ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-700'}`}>
                        Day {item.day}
                      </span>
                      <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-neutral-100">
                        {item.goal}
                      </span>
                    </div>
                    <h4 className="font-semibold text-neutral-900 text-sm leading-snug mb-2">{item.title}</h4>
                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed flex-1">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Post Generator Output */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
            {selectedPost ? (
              <>
                <div className="p-4 border-b border-neutral-200 bg-neutral-50/50">
                  <h3 className="font-medium text-neutral-800 flex items-center gap-2">
                    <PenTool size={16} className="text-blue-600" />
                    Drafting: Day {selectedPost.day}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">{selectedPost.title}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none prose-neutral">
                  {isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-3">
                      <Loader2 className="animate-spin text-blue-600" size={32} />
                      <p>Writing your post...</p>
                    </div>
                  ) : generatedPost ? (
                    <Markdown>{generatedPost}</Markdown>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
                <CheckCircle2 size={48} className="text-neutral-200 mb-4" />
                <p>Select a day from your calendar to generate the full post content.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 border-dashed p-12 text-center">
          <CalendarDays size={48} className="mx-auto text-neutral-300 mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No Plan Generated Yet</h3>
          <p className="text-neutral-500 max-w-md mx-auto">
            Click the button above to generate a strategic 30-day LinkedIn content calendar tailored for the selected persona.
          </p>
        </div>
      )}
    </div>
  );
}
