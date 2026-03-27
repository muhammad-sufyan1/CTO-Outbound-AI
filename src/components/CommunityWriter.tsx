import React, { useState, useEffect } from 'react';
import { Loader2, Globe, MessageCircle, FileText, Lightbulb, Check } from 'lucide-react';
import { generateContent, generateJsonContent } from '../lib/gemini';
import { 
  COMMUNITY_TOPICS_PROMPT, 
  COMMUNITY_ANSWER_PROMPT, 
  COMMUNITY_COMMENT_PROMPT,
  PERSONAS
} from '../lib/prompts';
import Markdown from 'react-markdown';
import { useUsageTracker } from '../lib/useUsageTracker';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';

type SubTab = 'topics' | 'answer' | 'comment';
type PersonaKey = keyof typeof PERSONAS;

interface TopicIdea {
  id?: string;
  platform: string;
  topic: string;
  angle: string;
  scheduledTime?: string;
  status: 'planned' | 'posted';
}

export default function CommunityWriter() {
  const [activeTab, setActiveTab] = useState<SubTab>('topics');
  const [persona, setPersona] = useState<PersonaKey>('cto');
  
  // Topics State
  const [topics, setTopics] = useState<TopicIdea[]>([]);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);

  // Answer State
  const [question, setQuestion] = useState('');
  const [answerOutput, setAnswerOutput] = useState('');
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);

  // Comment State
  const [postContent, setPostContent] = useState('');
  const [commentOutput, setCommentOutput] = useState('');
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);
  const { trackUsage, checkLimit } = useUsageTracker();

  useEffect(() => {
    setTopics([]);
    setQuestion('');
    setAnswerOutput('');
    setPostContent('');
    setCommentOutput('');
    fetchTopics();
  }, [persona]);

  const fetchTopics = async () => {
    setIsLoadingTopics(true);
    try {
      if (!auth.currentUser) return;
      
      const q = query(
        collection(db, 'topics'), 
        where('uid', '==', auth.currentUser.uid),
        where('persona', '==', persona),
        where('module', '==', 'community')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedTopics: TopicIdea[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedTopics.push({
          id: doc.id,
          platform: data.platform || 'General',
          topic: data.title, // mapped to title in db
          angle: data.description, // mapped to description in db
          scheduledTime: data.scheduledDate,
          status: data.status as 'planned' | 'posted'
        });
      });
      
      setTopics(fetchedTopics);
    } catch (error) {
      console.error("Error fetching topics:", error);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const handleGenerateTopics = async () => {
    if (!checkLimit('community')) return;
    
    if (topics.length > 0) {
      const confirm = window.confirm("This will overwrite your current community topics for this persona. Are you sure?");
      if (!confirm) return;
    }

    if (!auth.currentUser) {
      alert("You must be logged in to save topics.");
      return;
    }

    setIsGeneratingTopics(true);
    
    try {
      // Delete old topics for this persona
      const q = query(
        collection(db, 'topics'), 
        where('uid', '==', auth.currentUser.uid),
        where('persona', '==', persona),
        where('module', '==', 'community')
      );
      const querySnapshot = await getDocs(q);
      for (const d of querySnapshot.docs) {
        await deleteDoc(doc(db, 'topics', d.id));
      }

      const prompt = COMMUNITY_TOPICS_PROMPT.replace('{persona}', PERSONAS[persona]);
      const result = await generateJsonContent(prompt);
      
      if (Array.isArray(result)) {
        const newTopics: TopicIdea[] = [];
        for (const item of result) {
          const docRef = await addDoc(collection(db, 'topics'), {
            uid: auth.currentUser.uid,
            persona: persona,
            module: 'community',
            title: item.topic, // map topic to title
            description: item.angle, // map angle to description
            platform: item.platform,
            scheduledDate: item.scheduledTime || '',
            status: 'planned',
            createdAt: new Date().toISOString()
          });
          
          newTopics.push({
            id: docRef.id,
            platform: item.platform,
            topic: item.topic,
            angle: item.angle,
            scheduledTime: item.scheduledTime || '',
            status: 'planned'
          });
        }
        
        setTopics(newTopics);
        trackUsage('community');
      } else {
        throw new Error("Failed to parse topics array");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate topics. Please try again.");
    } finally {
      setIsGeneratingTopics(false);
    }
  };

  const toggleTopicStatus = async (topic: TopicIdea) => {
    if (!topic.id) return;

    const newStatus = topic.status === 'planned' ? 'posted' : 'planned';
    
    try {
      await updateDoc(doc(db, 'topics', topic.id), {
        status: newStatus
      });
      
      setTopics(topics.map(t => t.id === topic.id ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleGenerateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkLimit('community')) return;
    
    setIsGeneratingAnswer(true);
    setAnswerOutput('');
    try {
      const prompt = COMMUNITY_ANSWER_PROMPT
        .replace('{persona}', PERSONAS[persona])
        .replace('{question}', question);
      const result = await generateContent(prompt);
      setAnswerOutput(result);
    } catch (error) {
      setAnswerOutput(`**Fallback Generation Activated (API Error)**\n\nThat's a great question. Based on my experience, the key to solving this is breaking it down into three main areas:\n\n1. **Architecture:** Ensure your foundation is solid. Consider using microservices if the application demands it, but don't over-engineer early on.\n2. **Process:** Implement robust CI/CD pipelines. Automation is your best friend when trying to move fast without breaking things.\n3. **People:** Empower your team to make decisions. A culture of ownership leads to better code and faster resolution of issues.\n\nI've seen companies struggle when they ignore any of these pillars. Focus on getting the basics right first.`);
    } finally {
      trackUsage('community');
      setIsGeneratingAnswer(false);
    }
  };

  const handleGenerateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkLimit('community')) return;
    
    setIsGeneratingComment(true);
    setCommentOutput('');
    try {
      const prompt = COMMUNITY_COMMENT_PROMPT
        .replace('{persona}', PERSONAS[persona])
        .replace('{post}', postContent);
      const result = await generateContent(prompt);
      setCommentOutput(result);
    } catch (error) {
      setCommentOutput(`**Fallback Generation Activated (API Error)**\n\nI completely agree with your take on this. It's often overlooked how much impact [Specific Point] can have on the overall success of a project. I've found that addressing it early saves a lot of headaches down the road. Thanks for sharing this perspective!`);
    } finally {
      trackUsage('community');
      setIsGeneratingComment(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Reddit & Quora Community Writer</h2>
          <p className="text-neutral-500 mt-1">Build authority and rank your profile with high-quality answers and comments.</p>
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
            Topic Ideas
          </div>
        </button>
        <button
          onClick={() => setActiveTab('answer')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'answer' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText size={16} />
            Answer Writer
          </div>
        </button>
        <button
          onClick={() => setActiveTab('comment')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'comment' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageCircle size={16} />
            Comment Writer
          </div>
        </button>
      </div>

      {/* Topics Tab */}
      {activeTab === 'topics' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div>
              <h3 className="text-lg font-medium text-neutral-900">Monthly Topic Ideas</h3>
              <p className="text-sm text-neutral-500">Generate 10 high-traffic topics to write about this month.</p>
            </div>
            <button
              onClick={handleGenerateTopics}
              disabled={isGeneratingTopics || isLoadingTopics}
              className="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingTopics ? <Loader2 className="animate-spin" size={18} /> : <Lightbulb size={18} />}
              {isGeneratingTopics ? 'Generating...' : topics.length > 0 ? 'Regenerate Topics' : 'Generate Topics'}
            </button>
          </div>

          {isLoadingTopics ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : topics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topics.map((topic, idx) => (
                <div key={topic.id || idx} className={`bg-white p-5 rounded-xl border transition-all flex flex-col ${topic.status === 'posted' ? 'border-neutral-200 bg-neutral-50/50 opacity-75' : 'border-neutral-200 shadow-sm hover:border-blue-300'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                      {topic.platform}
                    </span>
                    <button 
                      onClick={() => toggleTopicStatus(topic)}
                      className={`p-1 rounded-full transition-colors ${topic.status === 'posted' ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'}`}
                      title={topic.status === 'posted' ? 'Mark as planned' : 'Mark as posted'}
                    >
                      <Check size={14} className={topic.status === 'posted' ? 'opacity-100' : 'opacity-50'} />
                    </button>
                  </div>
                  <h4 className={`font-semibold mb-2 ${topic.status === 'posted' ? 'text-neutral-600 line-through' : 'text-neutral-900'}`}>{topic.topic}</h4>
                  <p className="text-sm text-neutral-600 flex-1">{topic.angle}</p>
                  
                  {topic.scheduledTime && (
                    <div className="mt-3 text-[10px] font-medium text-neutral-500 bg-white/80 px-2 py-1 rounded border border-neutral-100 inline-block w-fit">
                      🕒 {topic.scheduledTime}
                    </div>
                  )}
                  
                  <button 
                    onClick={() => {
                      setQuestion(topic.topic);
                      setActiveTab('answer');
                    }}
                    className="mt-4 text-sm text-blue-600 font-medium hover:text-blue-700 text-left w-fit"
                  >
                    Draft answer for this →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-200 border-dashed p-12 text-center">
              <Lightbulb size={48} className="mx-auto text-neutral-300 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">No Topics Generated</h3>
              <p className="text-neutral-500 max-w-md mx-auto">
                Click the button above to generate high-traffic topics for community platforms.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Answer Tab */}
      {activeTab === 'answer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={handleGenerateAnswer} className="space-y-4 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Question from Reddit/Quora *</label>
              <textarea
                required
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] text-sm"
                placeholder="Paste the question you want to answer..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isGeneratingAnswer || !question}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingAnswer ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
              {isGeneratingAnswer ? 'Drafting Answer...' : 'Generate Answer'}
            </button>
          </form>

          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col h-full min-h-[500px]">
            <h3 className="text-sm font-medium text-neutral-700 mb-4 border-b border-neutral-100 pb-2">Generated Answer</h3>
            <div className="flex-1 overflow-y-auto prose prose-sm max-w-none prose-neutral">
              {answerOutput ? (
                <Markdown>{answerOutput}</Markdown>
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-400 italic text-sm">
                  Your answer will appear here...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comment Tab */}
      {activeTab === 'comment' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={handleGenerateComment} className="space-y-4 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Original Post / Context *</label>
              <textarea
                required
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] text-sm"
                placeholder="Paste the post you want to comment on..."
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isGeneratingComment || !postContent}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingComment ? <Loader2 className="animate-spin" size={18} /> : <MessageCircle size={18} />}
              {isGeneratingComment ? 'Drafting Comment...' : 'Generate Comment'}
            </button>
          </form>

          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col h-full min-h-[500px]">
            <h3 className="text-sm font-medium text-neutral-700 mb-4 border-b border-neutral-100 pb-2">Generated Comment</h3>
            <div className="flex-1 overflow-y-auto prose prose-sm max-w-none prose-neutral">
              {commentOutput ? (
                <div className="whitespace-pre-wrap text-sm text-neutral-800">{commentOutput}</div>
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-400 italic text-sm">
                  Your comment will appear here...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
