import React, { useState, useEffect } from 'react';
import { Loader2, CalendarDays, PenTool, CheckCircle2, RefreshCw, Calendar as CalendarIcon, Check } from 'lucide-react';
import { generateContent, generateJsonContent } from '../lib/gemini';
import { POST_PLANNER_PROMPT, POST_GENERATOR_PROMPT, PERSONAS } from '../lib/prompts';
import Markdown from 'react-markdown';
import { useUsageTracker } from '../lib/useUsageTracker';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';

interface PostPlan {
  id?: string;
  day: number;
  title: string;
  description: string;
  goal: string;
  scheduledTime?: string;
  status: 'planned' | 'posted';
}

type PersonaKey = keyof typeof PERSONAS;

export default function PostPlanner() {
  const [persona, setPersona] = useState<PersonaKey>('cto');
  const [plan, setPlan] = useState<PostPlan[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  
  const [selectedPost, setSelectedPost] = useState<PostPlan | null>(null);
  const [generatedPost, setGeneratedPost] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { trackUsage, checkLimit } = useUsageTracker();

  useEffect(() => {
    setPlan([]);
    setSelectedPost(null);
    setGeneratedPost('');
    fetchPlan();
  }, [persona]);

  const fetchPlan = async () => {
    setIsLoadingPlan(true);
    try {
      if (!auth.currentUser) return;
      
      const q = query(
        collection(db, 'topics'), 
        where('uid', '==', auth.currentUser.uid),
        where('persona', '==', persona),
        where('module', '==', 'posts')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedPlan: PostPlan[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedPlan.push({
          id: doc.id,
          day: data.day || 0, // Fallback if old data
          title: data.title,
          description: data.description,
          goal: data.goal || 'Engagement',
          scheduledTime: data.scheduledDate,
          status: data.status as 'planned' | 'posted'
        });
      });
      
      // Sort by day
      fetchedPlan.sort((a, b) => a.day - b.day);
      setPlan(fetchedPlan);
    } catch (error) {
      console.error("Error fetching plan:", error);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const handleGeneratePlan = async (forceRegenerate = false) => {
    if (!checkLimit('post')) return;
    
    if (!forceRegenerate && plan.length > 0) {
      const confirm = window.confirm("This will overwrite your current plan for this persona. Are you sure?");
      if (!confirm) return;
    }

    if (!auth.currentUser) {
      alert("You must be logged in to save plans.");
      return;
    }

    setIsPlanning(true);
    setSelectedPost(null);
    setGeneratedPost('');
    
    try {
      // Delete old plan for this persona
      const q = query(
        collection(db, 'topics'), 
        where('uid', '==', auth.currentUser.uid),
        where('persona', '==', persona),
        where('module', '==', 'posts')
      );
      const querySnapshot = await getDocs(q);
      for (const d of querySnapshot.docs) {
        await deleteDoc(doc(db, 'topics', d.id));
      }

      const prompt = POST_PLANNER_PROMPT.replace('{persona}', PERSONAS[persona]);
      const result = await generateJsonContent(prompt);
      
      if (Array.isArray(result)) {
        const newPlan: PostPlan[] = [];
        for (const item of result) {
          const docRef = await addDoc(collection(db, 'topics'), {
            uid: auth.currentUser.uid,
            persona: persona,
            module: 'posts',
            title: item.title,
            description: item.description,
            goal: item.goal || 'Engagement',
            scheduledDate: item.scheduledTime || '',
            status: 'planned',
            day: item.day || 0,
            createdAt: new Date().toISOString()
          });
          
          newPlan.push({
            id: docRef.id,
            day: item.day || 0,
            title: item.title,
            description: item.description,
            goal: item.goal || 'Engagement',
            scheduledTime: item.scheduledTime || '',
            status: 'planned'
          });
        }
        
        newPlan.sort((a, b) => a.day - b.day);
        setPlan(newPlan);
        trackUsage('post');
      } else {
        throw new Error("Failed to parse plan");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate plan. Please try again.");
    } finally {
      setIsPlanning(false);
    }
  };

  const handleGeneratePost = async (post: PostPlan) => {
    if (!checkLimit('post')) return;
    
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
    } catch (error) {
      setGeneratedPost(`**Fallback Generation Activated (API Error)**\n\nHere is a quick thought on ${post.title}:\n\nIn today's fast-paced environment, focusing on ${post.goal} is more critical than ever. We've found that by implementing strong foundational practices, teams can significantly improve their output and morale.\n\nWhat are your thoughts on this? Let me know in the comments below! 👇\n\n#Leadership #Growth #Innovation`);
    } finally {
      trackUsage('post');
      setIsGenerating(false);
    }
  };

  const togglePostStatus = async (post: PostPlan, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering handleGeneratePost
    if (!post.id) return;

    const newStatus = post.status === 'planned' ? 'posted' : 'planned';
    
    try {
      await updateDoc(doc(db, 'topics', post.id), {
        status: newStatus
      });
      
      setPlan(plan.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
      
      if (selectedPost?.id === post.id) {
        setSelectedPost({ ...selectedPost, status: newStatus });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">LinkedIn Post Planner</h2>
          <p className="text-neutral-500 mt-1">
            Plan 30 days of content and generate posts on demand.
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
            disabled={isPlanning || isLoadingPlan}
            className="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isPlanning ? <Loader2 className="animate-spin" size={18} /> : (plan.length > 0 ? <RefreshCw size={18} /> : <CalendarDays size={18} />)}
            {isPlanning ? 'Planning...' : plan.length > 0 ? 'Regenerate Plan' : 'Generate 30-Day Plan'}
          </button>
        </div>
      </div>

      {isLoadingPlan ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : plan.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Calendar Grid */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} className="text-neutral-600" />
                <h3 className="font-medium text-neutral-800">Content Calendar</h3>
              </div>
              <span className="text-xs font-medium text-neutral-500 bg-white px-2 py-1 rounded-md border border-neutral-200">
                {plan.filter(p => p.status === 'posted').length} / {plan.length} Posted
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {plan.map((item) => (
                  <div 
                    key={item.id || item.day}
                    className={`relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col min-h-[160px] ${
                      selectedPost?.id === item.id 
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-sm' 
                        : item.status === 'posted'
                          ? 'border-neutral-200 bg-neutral-50/50 opacity-75'
                          : 'border-neutral-200 hover:border-blue-300 hover:bg-neutral-50 bg-white shadow-sm'
                    }`}
                    onClick={() => handleGeneratePost(item)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${selectedPost?.id === item.id ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-700'}`}>
                        Day {item.day}
                      </span>
                      <button 
                        onClick={(e) => togglePostStatus(item, e)}
                        className={`p-1 rounded-full transition-colors ${item.status === 'posted' ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'}`}
                        title={item.status === 'posted' ? 'Mark as planned' : 'Mark as posted'}
                      >
                        <Check size={14} className={item.status === 'posted' ? 'opacity-100' : 'opacity-50'} />
                      </button>
                    </div>
                    <h4 className={`font-semibold text-sm leading-snug mb-2 ${item.status === 'posted' ? 'text-neutral-600 line-through' : 'text-neutral-900'}`}>{item.title}</h4>
                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed flex-1">{item.description}</p>
                    {item.scheduledTime && (
                      <div className="mt-3 text-[10px] font-medium text-neutral-500 bg-white/80 px-2 py-1 rounded border border-neutral-100 inline-block w-fit">
                        🕒 {item.scheduledTime}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Post Generator Output */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
            {selectedPost ? (
              <>
                <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-neutral-800 flex items-center gap-2">
                      <PenTool size={16} className="text-blue-600" />
                      Drafting: Day {selectedPost.day}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">{selectedPost.title}</p>
                  </div>
                  {selectedPost.status === 'posted' && (
                    <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1">
                      <Check size={12} /> Posted
                    </span>
                  )}
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
            Click the button above to generate a strategic content calendar tailored for the selected persona.
          </p>
        </div>
      )}
    </div>
  );
}
