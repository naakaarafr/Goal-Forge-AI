'use client';

import React from 'react';
import { useCurrentUser } from '@/hooks/api/useAuthQueries';
import { useGoals, useCreateGoal } from '@/hooks/api/useGoals';
import { useAnalyzeGoal, useGenerateGoals } from '@/hooks/api/useAI';
import { useQuarters } from '@/hooks/api/useQuarters';
import { useAppStore } from '@/store';
import { RadialProgress } from '@/components/ui/progress/RadialProgress';
import { 
  Sparkles, Send, BrainCircuit, Target, ShieldCheck, 
  ArrowRight, RefreshCw, Zap, CheckCircle2, ChevronRight
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  refinedGoal?: string;
  suggestions?: any[];
  score?: number;
}

export default function EmployeeAIPage() {
  const { data: user } = useCurrentUser();
  const filters = useAppStore(state => state.filters);
  const setFilter = useAppStore(state => state.setFilter);
  const addNotification = useAppStore(state => state.addNotification);
  
  const { data: quarters } = useQuarters();

  // Automatically default the selected quarter filter on load
  React.useEffect(() => {
    if (quarters && quarters.length > 0 && !filters.quarter) {
      const activeQ = quarters.find(q => q.state === 'active') || quarters[0];
      if (activeQ) {
        setFilter('quarter', activeQ.label);
      }
    }
  }, [quarters, filters.quarter, setFilter]);

  const activeQ = quarters?.find(q => q.state === 'active') || quarters?.[0];
  const currentQuarterLabel = filters.quarter || activeQ?.label || '2026-Q1';

  const analyzeGoalMutation = useAnalyzeGoal();
  const generateGoalsMutation = useGenerateGoals();
  const createGoalMutation = useCreateGoal();

  const [inputMessage, setInputMessage] = React.useState('');
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your GoalForge AI Strategic Copilot. I can help you draft new SMART goals for ${currentQuarterLabel}, analyze your active objectives, and align them with corporate initiatives. Tap one of the suggestions below to get started!`
    }
  ]);
  const [isTyping, setIsTyping] = React.useState(false);

  const quickPrompts = [
    {
      label: `Draft ${currentQuarterLabel} Revenue Goal`,
      prompt: `Draft a new ${currentQuarterLabel} revenue and growth goal for an enterprise software engineer.`
    },
    {
      label: 'Audit Goal Quality',
      prompt: 'Audit the quality of this initiative: "Draft a new platform dashboard UI."'
    },
    {
      label: 'Boost Strategic Alignment',
      prompt: 'Suggest operational excellence goals to improve my team performance metrics.'
    }
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      let assistantMsg: ChatMessage;

      // Detect if the user wants to audit or generate goals
      const isAudit = textToSend.toLowerCase().includes('audit') || textToSend.toLowerCase().includes('initiative') || textToSend.toLowerCase().includes('quality');

      if (isAudit) {
        // Extract clean text to analyze
        const cleanText = textToSend.replace(/audit|initiative/gi, '').trim();
        const res = await analyzeGoalMutation.mutateAsync({
          title: cleanText || 'Enterprise Dashboard launch',
          thrust_area: 'Operational Excellence',
          quarter: currentQuarterLabel
        });

        assistantMsg = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: `I have performed a strategic audit on your goal. Here is my analysis:`,
          refinedGoal: res.refined_goal,
          suggestions: res.suggestions,
          score: res.clarity_score
        };
      } else {
        // Run goal generation
        const res = await generateGoalsMutation.mutateAsync({
          role: user?.role || 'employee',
          context: textToSend
        });

        // The endpoint returns a dict/array of generated goals
        const generatedList = Array.isArray(res) ? res : res.goals || [];
        const formattedGoals = generatedList.map((g: any, index: number) => {
          return `${index + 1}. **${g.title || g}**: ${g.description || 'Aligned metric target'}`;
        }).join('\n\n');

        assistantMsg = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: formattedGoals 
            ? `Here are suggested SMART goals drafted based on your criteria:\n\n${formattedGoals}`
            : `I have analyzed your request. I recommend adding a time-bound milestone: "Successfully complete ${currentQuarterLabel} integration modules with 100% test coverage."`
        };
      }

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `ai-err-${Date.now()}`,
        sender: 'assistant',
        text: 'I ran into an issue contacting the strategic core engine. Please check your query or try again!'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExportGoal = async (title: string) => {
    try {
      await createGoalMutation.mutateAsync({
        title,
        description: 'AI-refined strategic goal drafted in Copilot Workspace.',
        thrust_area: 'Operational Excellence',
        uom: 'percentage' as any,
        priority: 'medium' as any,
        weightage: 10,
        quarter: currentQuarterLabel,
        target_value: 100,
        current_value: 0,
        status: 'draft' as any
      });
      addNotification({
        type: 'success',
        title: 'Goal Saved',
        message: 'Successfully exported AI goal to your workspace drafts!'
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not export goal.'
      });
    }
  };

  return (
    <div className="space-y-8 pb-10 flex flex-col h-[calc(100vh-140px)]">
      
      {/* Page Header */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group flex-shrink-0">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-amber-50/40 to-transparent rounded-r-3xl -z-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Copilot Center
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="text-xs text-slate-400 font-semibold">GoalForge AI Engine</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
              AI Strategic Copilot
            </h2>
            <p className="text-sm text-slate-500 font-medium max-w-xl">
              Draft, refine, audit, and align goals with real-time feedback using our advanced AI-driven performance engine.
            </p>
          </div>
        </div>
      </section>

      {/* Main Chat Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* Quick Prompts Panel */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between h-full">
          <div>
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-indigo-600" /> Suggested Starters
            </h3>
            <div className="space-y-3">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={isTyping}
                  className="w-full text-left p-3.5 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all text-xs font-semibold text-slate-600 group flex items-start justify-between gap-2"
                >
                  <span className="group-hover:text-slate-900 line-clamp-2">{qp.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 mt-6 text-amber-800">
            <h4 className="text-xs font-black flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 fill-current text-amber-500" /> Real-time Auditing
            </h4>
            <p className="text-[10px] text-amber-700/90 leading-normal font-semibold">
              Type the word "audit" followed by any goal to trigger our multi-factor SMART compliance audit!
            </p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
          
          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => {
              const isAI = msg.sender === 'assistant';
              return (
                <div key={msg.id} className={`flex gap-4 ${isAI ? 'justify-start' : 'justify-end'}`}>
                  {isAI && (
                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0 text-amber-400">
                      <Sparkles className="w-4 h-4 fill-current" />
                    </div>
                  )}
                  
                  <div className={`max-w-xl p-4 rounded-2xl space-y-4 font-semibold text-sm ${
                    isAI 
                      ? 'bg-slate-50 text-slate-800' 
                      : 'bg-indigo-600 text-white shadow-md'
                  }`}>
                    
                    {/* Main text message */}
                    <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>
                    
                    {/* Quality scores from real audits */}
                    {msg.score !== undefined && (
                      <div className="flex items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-100">
                        <div className="flex-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goal Quality Index</span>
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-2xl font-black text-slate-900">{msg.score}%</span>
                            <span className="text-[10px] text-indigo-600 font-bold">SMART Rating</span>
                          </div>
                        </div>
                        <div className="w-10 h-10">
                          <RadialProgress progress={msg.score} size={40} strokeWidth={4} showText={false} />
                        </div>
                      </div>
                    )}

                    {/* Suggestions list from audits */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-black text-slate-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Actionable Recommendations:
                        </h4>
                        <div className="space-y-2">
                          {msg.suggestions.map((s, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 text-xs">
                              <h5 className="font-bold text-slate-900">{s.title}</h5>
                              <p className="text-slate-500 mt-1 font-semibold leading-normal">{s.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Refinement export option */}
                    {msg.refinedGoal && (
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-white space-y-3">
                        <div>
                          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Refined SMART Proposal</span>
                          <p className="text-xs font-medium text-slate-200 mt-1 italic">"{msg.refinedGoal}"</p>
                        </div>
                        <button
                          onClick={() => handleExportGoal(msg.refinedGoal!)}
                          disabled={createGoalMutation.isPending}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-1 w-fit"
                        >
                          Save Goal to Workspace <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400 animate-pulse">
                  <Sparkles className="w-4 h-4 fill-current" />
                </div>
                <div className="bg-slate-50 text-slate-400 text-xs font-bold px-4 py-3.5 rounded-2xl flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>GoalForge engine is auditing strategic alignment...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 flex items-center gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputMessage)}
              disabled={isTyping}
              placeholder="Ask Copilot or request an audit: 'Audit: launch microservice modules'"
              className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors"
            />
            <button
              onClick={() => handleSendMessage(inputMessage)}
              disabled={!inputMessage.trim() || isTyping}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white p-3 rounded-2xl active:scale-95 transition-all shadow-md flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
