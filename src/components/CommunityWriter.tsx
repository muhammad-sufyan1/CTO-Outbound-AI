import React, { useState } from 'react';
import { Loader2, Globe, MessageCircle, FileText, Lightbulb } from 'lucide-react';
import { generateContent, generateJsonContent } from '../lib/gemini';
import { 
  COMMUNITY_TOPICS_PROMPT, 
  COMMUNITY_ANSWER_PROMPT, 
  COMMUNITY_COMMENT_PROMPT,
  PERSONAS
} from '../lib/prompts';
import Markdown from 'react-markdown';
import { useUsageTracker } from '../lib/useUsageTracker';

type SubTab = 'topics' | 'answer' | 'comment';
type PersonaKey = keyof typeof PERSONAS;

interface TopicIdea {
  platform: string;
  topic: string;
  angle: string;
}

export default function CommunityWriter() {
  const [activeTab, setActiveTab] = useState<SubTab>('topics');
  const [persona, setPersona] = useState<PersonaKey>('cto');
  
  // Topics State
  const [topics, setTopics] = useState<TopicIdea[]>([]);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);

  // Answer State
  const [question, setQuestion] = useState('');
  const [answerOutput, setAnswerOutput] = useState('');
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);

  // Comment State
  const [postContent, setPostContent] = useState('');
  const [commentOutput, setCommentOutput] = useState('');
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);
  const { trackUsage } = useUsageTracker();

  const handleGenerateTopics = async () => {
    setIsGeneratingTopics(true);
    setTopics([]);
    try {
      const prompt = COMMUNITY_TOPICS_PROMPT.replace('{persona}', PERSONAS[persona]);
      const result = await generateJsonContent(prompt);
      setTopics(result);
      trackUsage('community');
    } catch (error) {
      console.error(error);
      setTopics([
        { platform: 'Reddit', topic: 'How to scale a web application from 1k to 100k users', angle: 'A technical deep-dive into database optimization and caching strategies.' },
        { platform: 'Quora', topic: 'What is the biggest mistake CTOs make?', angle: 'Focusing on technology over people and business alignment.' },
        { platform: 'Medium', topic: 'The true cost of technical debt', angle: 'How to quantify and manage technical debt before it slows down development.' }
      ]);
    } finally {
      setIsGeneratingTopics(false);
    }
  };

  const handleGenerateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingAnswer(true);
    setAnswerOutput('');
    try {
      const prompt = COMMUNITY_ANSWER_PROMPT
        .replace('{persona}', PERSONAS[persona])
        .replace('{question}', question);
      const result = await generateContent(prompt);
      setAnswerOutput(result);
      trackUsage('community');
    } catch (error) {
      setAnswerOutput(`**Fallback Generation Activated (API Error)**\n\nThat's a great question. Based on my experience, the key to solving this is breaking it down into three main areas:\n\n1. **Architecture:** Ensure your foundation is solid. Consider using microservices if the application demands it, but don't over-engineer early on.\n2. **Process:** Implement robust CI/CD pipelines. Automation is your best friend when trying to move fast without breaking things.\n3. **People:** Empower your team to make decisions. A culture of ownership leads to better code and faster resolution of issues.\n\nI've seen companies struggle when they ignore any of these pillars. Focus on getting the basics right first.`);
    } finally {
      setIsGeneratingAnswer(false);
    }
  };

  const handleGenerateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingComment(true);
    setCommentOutput('');
    try {
      const prompt = COMMUNITY_COMMENT_PROMPT
        .replace('{persona}', PERSONAS[persona])
        .replace('{post}', postContent);
      const result = await generateContent(prompt);
      setCommentOutput(result);
      trackUsage('community');
    } catch (error) {
      setCommentOutput(`**Fallback Generation Activated (API Error)**\n\nI completely agree with your take on this. It's often overlooked how much impact [Specific Point] can have on the overall success of a project. I've found that addressing it early saves a lot of headaches down the road. Thanks for sharing this perspective!`);
    } finally {
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
                      {topic.platform}
                    </span>
                  </div>
                  <h4 className="font-semibold text-neutral-900 mb-2">{topic.topic}</h4>
                  <p className="text-sm text-neutral-600 flex-1">{topic.angle}</p>
                </div>
              ))}
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
