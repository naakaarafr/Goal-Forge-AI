'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/api/useAuthQueries';
import { useGoals, useUpdateGoal } from '@/hooks/api/useGoals';
import { useAppStore } from '@/store';
import { useQoQTrends } from '@/hooks/api/useAnalytics';
import { 
  CheckCircle2, Clock, TrendingUp, Sparkles, 
  AlertTriangle, ArrowRight, ClipboardCheck,
  Target, Zap, Plus, ArrowUpRight, Bell, Sparkle, Calendar, Activity
} from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress/ProgressBar';
import { RadialProgress } from '@/components/ui/progress/RadialProgress';
import { QuarterlyComparisonChart } from '@/components/analytics/QuarterlyComparisonChart';
import { useQuarters } from '@/hooks/api/useQuarters';
import { QuarterTimeline } from '@/components/ui/progress/QuarterTimeline';


function getDynamicAIInsight(goals: any[], quarter: string, achievementPct: number): string {
  if (!goals || goals.length === 0) {
    return `Welcome to GoalForge AI! You haven't added any goals for ${quarter} yet. We recommend starting by adding a goal in a core strategic thrust area (e.g., Revenue Growth) to align with your organization's key pillars.`;
  }

  const sortedByProgress = [...goals].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
  const highestProgressGoal = sortedByProgress[0];
  const lowestProgressGoal = sortedByProgress[sortedByProgress.length - 1];
  const mostWeightedGoal = [...goals].sort((a, b) => (b.weightage ?? 0) - (a.weightage ?? 0))[0];

  const hasCompleted = goals.some(g => g.progress === 100);
  const completedCount = goals.filter(g => g.progress === 100).length;

  if (achievementPct >= 80) {
    return `Outstanding performance! Your strategic achievement stands at ${achievementPct}%. With ${completedCount} completed goals, you are in the top tier of execution. We recommend documenting key learnings from "${highestProgressGoal.title}" to share with your team.`;
  }

  if (hasCompleted) {
    return `Great momentum! Having completed "${highestProgressGoal.title}", your overall achievement is at ${achievementPct}%. To keep this velocity, prioritize "${lowestProgressGoal.title}" (currently at ${lowestProgressGoal.progress}%) which represents your largest remaining gap.`;
  }

  if (mostWeightedGoal && mostWeightedGoal.progress < 30) {
    return `Focus priority detected: Your most critical initiative, "${mostWeightedGoal.title}" (${mostWeightedGoal.weightage}% weightage), is currently at ${mostWeightedGoal.progress}% progress. Aligning daily tasks to this area will have the highest leverage impact on your ${quarter} performance index.`;
  }

  return `Strategic alignment lookahead: You are driving ${goals.length} active initiatives in ${quarter}. With "${highestProgressGoal.title}" leading at ${highestProgressGoal.progress}% progress, consider allocating focus to accelerate "${lowestProgressGoal.title}" (${lowestProgressGoal.progress}%) to close the loop.`;
}

export default function EmployeeDashboardPage() {
  const { data: user } = useCurrentUser();
  const filters = useAppStore(state => state.filters);
  const addNotification = useAppStore(state => state.addNotification);
  const updateGoalMutation = useUpdateGoal();
  
  const { data: quarters, isLoading: quartersLoading } = useQuarters();
  const selectedQuarter = React.useMemo(() => {
    if (!quarters) return null;
    return quarters.find(q => q.label === filters.quarter) || quarters.find(q => q.state === 'active') || quarters[0];
  }, [quarters, filters.quarter]);

  const { data: goalsData } = useGoals({ 
    quarter: filters.quarter, 
    scope: 'personal'
  });
  
  // Live QoQ trends
  const { data: qoqData, isLoading: qoqLoading } = useQoQTrends(true); // personal trends
  
  const chartData = React.useMemo(() => {
    if (!qoqData || qoqData.length === 0) {
      return [];
    }
    return qoqData.map((item: any) => ({
      quarter: item.quarter,
      planned: 100,
      actual: Math.round(item.avg_progress)
    }));
  }, [qoqData]);

  const goals = Array.isArray(goalsData) ? (goalsData.length > 0 ? goalsData : null) : goalsData?.items || null;
  const goalList = Array.isArray(goals) ? goals : [];
  
  const totalGoals = goalList.length;
  const completedGoalsCount = goalList.filter((g: any) => g.progress === 100).length;
  const inProgressGoalsCount = goalList.filter((g: any) => g.progress < 100).length;

  // Weighted Average Progress
  const totalWeightage = goalList.reduce((sum: number, g: any) => sum + (g.weightage || 0), 0);
  const weightedProgressSum = goalList.reduce((sum: number, g: any) => sum + ((g.progress || 0) * (g.weightage || 0)), 0);
  const achievementPct = totalWeightage > 0 ? Math.round(weightedProgressSum / totalWeightage) : 0;

  // Deadlines and stagnant alert calculations
  const deadlines = goalList
    .filter((g: any) => g.target_date)
    .sort((a: any, b: any) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
    .slice(0, 3)
    .map((g: any) => {
      const dateObj = new Date(g.target_date);
      const day = String(dateObj.getDate());
      const month = dateObj.toLocaleString('default', { month: 'short' });
      const isPastOrSoon = new Date(g.target_date).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000;
      const risk = (g.progress ?? 0) < 50 && isPastOrSoon;
      return {
        day,
        month,
        title: g.title,
        risk,
        progress: g.progress ?? 0,
      };
    });

  const handleIncrementProgress = async (goal: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentProgress = goal.progress || 0;
    if (currentProgress >= 100) return;
    const newProgress = Math.min(currentProgress + 10, 100);
    const targetVal = goal.target_value || 100;
    const newCurrentVal = Math.round((newProgress / 100) * targetVal);

    try {
      await updateGoalMutation.mutateAsync({
        id: goal.id,
        data: {
          progress: newProgress,
          current_value: newCurrentVal
        }
      });
      addNotification({
        type: 'success',
        title: 'Progress Updated',
        message: `Successfully set progress of "${goal.title}" to ${newProgress}%.`
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update progress.'
      });
    }
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* Premium Workspace Greeting Header */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-blue-50/50 to-transparent rounded-r-3xl -z-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {user?.role || 'Employee'} Portal
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Active: {filters.quarter}
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
              Personal Workspace: {user?.full_name || 'Demo Employee'}
            </h2>
            <p className="text-sm text-slate-500 font-medium max-w-xl">
              Track achievements, manage quarterly objectives, align metrics with organizational thrust areas, and run audits.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Link 
              href="/employee/goals/new"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Goal
            </Link>
            <Link 
              href="/employee/ai"
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition-all"
            >
              <Sparkle className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" /> Ask Copilot
            </Link>
          </div>
        </div>
      </section>

      {/* Active Quarterly Timeline Tracker */}
      <QuarterTimeline quarter={selectedQuarter} isLoading={quartersLoading} />

      {/* Primary KPI OKR Tracker */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Completed Initiatives card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Execution Index</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">Initiatives Finished</h3>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-4xl font-black text-slate-900">{completedGoalsCount}</span>
            <span className="text-sm font-bold text-slate-400">/ {totalGoals} Completed</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-5">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${totalGoals > 0 ? (completedGoalsCount / totalGoals) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Active In Progress card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Pipeline</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">In Progress</h3>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-2xl text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-4xl font-black text-slate-900">{inProgressGoalsCount}</span>
            <span className="text-sm font-bold text-slate-400">Active Objectives</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-5">
            <div 
              className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${totalGoals > 0 ? (inProgressGoalsCount / totalGoals) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Strategic Weighted Index card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alignment Score</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">Strategic Index</h3>
            </div>
            <div className="bg-blue-50 p-2.5 rounded-2xl text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex justify-between items-end mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">{achievementPct}%</span>
              <span className="text-xs text-blue-600 font-bold ml-1">Overall</span>
            </div>
            <RadialProgress progress={achievementPct} size={56} strokeWidth={5} showText={false} />
          </div>
        </div>

      </section>

      {/* Analytical Trends & Performance Charts */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900">Personal Performance Breakdown</h3>
            <p className="text-xs text-slate-400">Target metrics against actual achievement velocity over historical quarters</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/50 rounded-xl text-[10px] font-bold text-slate-600">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Personal Index Enabled</span>
          </div>
        </div>
        {qoqLoading ? (
          <div className="w-full h-80 bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-bold">
            Compiling analytical reports...
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-80 bg-slate-50 rounded-2xl flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200">
            <Activity className="w-10 h-10 text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No quarterly data available</p>
            <p className="text-xs text-slate-400 mt-1">Submit goal sheets and log check-ins to build historical QoQ curves.</p>
          </div>
        ) : (
          <QuarterlyComparisonChart data={chartData} />
        )}
      </section>

      {/* Bento Grid: Active Goals Hub & AI Strategic Panel */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Goals Hub with Quick Progress Updates */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900">Active Initiatives</h3>
              <p className="text-xs text-slate-400">Directly adjust progress or click to manage details</p>
            </div>
            <Link 
              href="/employee/goals" 
              className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-0.5"
            >
              Goal Manager <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          <div className="p-6 flex-1 flex flex-col gap-6">
            {goalList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                <Target className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No active goals found</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">Get started by creating your first initiative for {filters.quarter}.</p>
              </div>
            ) : (
              goalList.slice(0, 3).map((goal: any) => {
                const isCompleted = goal.progress >= 100;
                return (
                  <div 
                    key={goal.id} 
                    className="p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/50 hover:border-slate-200 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {goal.title}
                        </h4>
                      </div>
                      <div className="w-full max-w-md">
                        <ProgressBar progress={goal.progress || 0} uom={goal.uom} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={(e) => handleIncrementProgress(goal, e)}
                        disabled={isCompleted || updateGoalMutation.isPending}
                        className="flex items-center gap-1 bg-slate-100 hover:bg-blue-600 hover:text-white disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-700 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> 10%
                      </button>
                      <Link
                        href={`/employee/goals/${goal.id}/edit`}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-colors"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Strategic Panel & Upcoming Deadlines */}
        <div className="flex flex-col gap-6">
          
          {/* Glassmorphic AI Insights panel */}
          <div className="bg-slate-900 rounded-3xl p-6 relative overflow-hidden shadow-xl text-white">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
            
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Sparkles className="text-amber-400 w-5 h-5 fill-current" />
              <h3 className="text-md font-black text-white tracking-tight">AI Strategic Companion</h3>
            </div>
            
            <p className="text-xs text-slate-300 mb-6 leading-relaxed relative z-10 font-medium min-h-[72px]">
              {goalList.length === 0 ? (
                <span>Add active goals for {filters.quarter} to generate personalized strategic advice and alignment audits.</span>
              ) : (
                <span>{getDynamicAIInsight(goalList, filters.quarter, achievementPct)}</span>
              )}
            </p>
            
            <Link 
              href="/employee/ai" 
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center w-full gap-2 relative z-10"
            >
              Open AI Chat Assistant <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stagnant Goals & Upcoming Deadlines Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex-1 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-md font-black text-slate-800 mb-4">Deadlines & Alert Center</h3>
              {goalList.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">Clear timeline</p>
                  <p className="text-[10px] text-slate-400">Set target dates on your goals to track progress risk profiles.</p>
                </div>
              ) : deadlines.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">All objectives aligned</p>
                  <p className="text-[10px] text-slate-400">No active goals have target deadlines set for this quarter.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {deadlines.map((item: any, i: number) => (
                    <li 
                      key={i} 
                      className="flex gap-4 p-2 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent"
                    >
                      <div 
                        className={`${
                          item.risk 
                            ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                            : 'bg-slate-100 text-slate-500'
                        } rounded-xl p-2 h-fit flex flex-col items-center justify-center min-w-[48px]`}
                      >
                        <span className="text-[8px] font-black uppercase tracking-tighter">{item.month}</span>
                        <span className="text-lg font-black">{item.day}</span>
                      </div>
                      <div className="flex flex-col justify-center">
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{item.title}</h4>
                        <p className={`text-[10px] font-semibold ${item.risk ? 'text-rose-500' : 'text-slate-400'}`}>
                          {item.risk ? '⚠️ Risk: High Deadline Proximity' : `Progress: ${item.progress}%`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>

      </section>

    </div>
  );
}
