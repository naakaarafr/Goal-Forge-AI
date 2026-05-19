'use client';

import React from 'react';
import { useCurrentUser } from '@/hooks/api/useAuthQueries';
import { useAppStore } from '@/store';
import { useQuarters } from '@/hooks/api/useQuarters';
import { useGoals } from '@/hooks/api/useGoals';
import { useAchievements } from '@/hooks/api/useAchievements';
import { 
  Bell, CheckCircle2, ClipboardCheck, AlertTriangle, 
  MessageSquare, Star, Trash2, ArrowRight, BadgeAlert, Loader2
} from 'lucide-react';
import Link from 'next/link';

interface MockAlert {
  id: string;
  type: 'approval' | 'feedback' | 'system' | 'audit';
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
}

export default function EmployeeNotificationsPage() {
  const { data: user } = useCurrentUser();
  const filters = useAppStore(state => state.filters);
  const setFilter = useAppStore(state => state.setFilter);
  const addNotification = useAppStore(state => state.addNotification);
  
  const { data: quarters, isLoading: quartersLoading } = useQuarters();

  // Automatically default the selected quarter filter on load
  React.useEffect(() => {
    if (quarters && quarters.length > 0 && !filters.quarter) {
      const activeQ = quarters.find(q => q.state === 'active') || quarters[0];
      if (activeQ) {
        setFilter('quarter', activeQ.label);
      }
    }
  }, [quarters, filters.quarter, setFilter]);

  const activeQuarter = quarters?.find(q => q.label === filters.quarter) || quarters?.find(q => q.state === 'active') || quarters?.[0];
  const currentQuarterLabel = filters.quarter || activeQuarter?.label || '2026-Q1';

  const { data: goalsData, isLoading: goalsLoading } = useGoals({ quarter: filters.quarter });
  const { data: achievementsData, isLoading: achievementsLoading } = useAchievements(activeQuarter?.id || null);

  const [readAlerts, setReadAlerts] = React.useState<Record<string, boolean>>({});
  const [deletedAlerts, setDeletedAlerts] = React.useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'unread' | 'updates'>('all');

  const goalsList = React.useMemo(() => {
    if (!goalsData) return [];
    return Array.isArray(goalsData) ? goalsData : goalsData.items || [];
  }, [goalsData]);

  const achievementsList = React.useMemo(() => {
    if (!achievementsData) return [];
    return Array.isArray(achievementsData) ? achievementsData : [];
  }, [achievementsData]);

  const alerts = React.useMemo(() => {
    const list: MockAlert[] = [];

    // 1. Quarters and state-based notices
    if (activeQuarter) {
      if (activeQuarter.state === 'active') {
        list.push({
          id: 'quarter-active',
          type: 'system',
          title: 'Active Quarter Notification',
          message: `The quarter ${activeQuarter.label} is currently ACTIVE. Keep logging achievements against your active targets!`,
          time: 'Active now',
          read: !!readAlerts['quarter-active'],
          actionUrl: '/employee/achievements',
          actionText: 'Log Achievements'
        });
      } else if (activeQuarter.state === 'review') {
        list.push({
          id: 'quarter-review',
          type: 'system',
          title: 'Quarter Review Window Open',
          message: `The review window for ${activeQuarter.label} is currently OPEN. Please ensure all achievements are submitted for final evaluation.`,
          time: 'Review phase',
          read: !!readAlerts['quarter-review'],
          actionUrl: '/employee/achievements',
          actionText: 'Submit Achievements'
        });
      }
    }

    // 2. Goal states
    goalsList.forEach((goal: any) => {
      if (goal.status === 'approved' || goal.status === 'locked') {
        list.push({
          id: `goal-approved-${goal.id}`,
          type: 'approval',
          title: 'Goal Approved by Manager',
          message: `Your goal "${goal.title}" has been successfully approved and locked for ${goal.quarter}.`,
          time: 'Active',
          read: !!readAlerts[`goal-approved-${goal.id}`],
          actionUrl: '/employee/goals',
          actionText: 'View Goals'
        });
      } else if (goal.status === 'rejected') {
        list.push({
          id: `goal-rejected-${goal.id}`,
          type: 'system',
          title: 'Goal Returned for Rework',
          message: `Your manager returned the goal "${goal.title}" for rework. Please adjust weightages/targets.`,
          time: 'Rework needed',
          read: !!readAlerts[`goal-rejected-${goal.id}`],
          actionUrl: '/employee/goals',
          actionText: 'Rework Goal'
        });
      } else if (goal.status === 'submitted') {
        list.push({
          id: `goal-submitted-${goal.id}`,
          type: 'system',
          title: 'Goal Pending Approval',
          message: `Your goal "${goal.title}" has been submitted and is currently awaiting manager review.`,
          time: 'Pending review',
          read: !!readAlerts[`goal-submitted-${goal.id}`],
          actionUrl: '/employee/goals',
          actionText: 'View Goal Status'
        });
      }
    });

    // 3. Manager feedback
    achievementsList.forEach((ach: any) => {
      if (ach.manager_feedback) {
        const goal = goalsList.find((g: any) => g.id === ach.goal_id);
        const goalTitle = goal ? goal.title : 'Objective';
        list.push({
          id: `feedback-${ach.id}`,
          type: 'feedback',
          title: 'New Feedback Added',
          message: `Your manager left a comment: "${ach.manager_feedback}" on your achievement check-in for "${goalTitle}".`,
          time: 'Feedback received',
          read: !!readAlerts[`feedback-${ach.id}`],
          actionUrl: '/employee/achievements',
          actionText: 'Read Comments'
        });
      }
    });

    // 4. Compliance check
    const totalWeight = goalsList.reduce((sum: number, g: any) => sum + (g.weightage || 0), 0);
    if (goalsList.length > 0) {
      if (totalWeight === 100) {
        list.push({
          id: 'audit-pass',
          type: 'audit',
          title: 'Workspace Integrity Passed',
          message: `System audit successful. Your personal workspace metrics are in 100% compliance for ${currentQuarterLabel}.`,
          time: 'Compliance clear',
          read: true // default read
        });
      } else {
        list.push({
          id: 'audit-fail',
          type: 'system',
          title: 'Workspace Compliance Alert',
          message: `Total goal weightage is currently at ${totalWeight}%. It must be exactly 100% for submissions.`,
          time: 'Adjustment required',
          read: !!readAlerts['audit-fail'],
          actionUrl: '/employee/goals',
          actionText: 'Adjust Weightages'
        });
      }
    }

    // Filter out deleted alerts
    return list.filter((a: any) => !deletedAlerts[a.id]);
  }, [activeQuarter, goalsList, achievementsList, readAlerts, deletedAlerts, currentQuarterLabel]);

  const handleMarkAllRead = () => {
    const updatedReads = { ...readAlerts };
    alerts.forEach((a: any) => {
      updatedReads[a.id] = true;
    });
    setReadAlerts(updatedReads);
    addNotification({
      type: 'success',
      title: 'Inbox Cleared',
      message: 'Marked all notifications as read.'
    });
  };

  const handleToggleRead = (id: string) => {
    setReadAlerts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDeleteAlert = (id: string) => {
    setDeletedAlerts(prev => ({
      ...prev,
      [id]: true
    }));
    addNotification({
      type: 'info',
      title: 'Notification Removed',
      message: 'The alert was successfully deleted.'
    });
  };

  const filteredAlerts = React.useMemo(() => {
    if (activeFilter === 'unread') {
      return alerts.filter(a => !a.read);
    }
    if (activeFilter === 'updates') {
      return alerts.filter(a => a.type === 'approval' || a.type === 'feedback');
    }
    return alerts;
  }, [alerts, activeFilter]);

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="space-y-8 pb-10">
      
      {/* Page Header */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-rose-50/40 to-transparent rounded-r-3xl -z-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Notification Inbox
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="text-xs text-slate-400 font-semibold">{unreadCount} Unread Alerts</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
              Enterprise Alert Center
            </h2>
            <p className="text-sm text-slate-500 font-medium max-w-xl">
              Track feedback loops, manager updates, goal submissions, and systemic auditing logs immediately.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Mark All as Read
            </button>
          )}
        </div>
      </section>

      {/* Filters Hub */}
      <section className="flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/20">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeFilter === 'all' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setActiveFilter('unread')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeFilter === 'unread' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setActiveFilter('updates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeFilter === 'updates' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Manager Updates
        </button>
      </section>

      {/* Notifications List Container */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
        
        {filteredAlerts.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <BadgeAlert className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">All caught up!</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">No alerts match your selected inbox view filter criteria.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            return (
              <div 
                key={alert.id}
                className={`p-6 transition-all hover:bg-slate-50/50 flex gap-4 items-start ${
                  !alert.read ? 'bg-rose-50/10 border-l-4 border-l-rose-500' : 'border-l-4 border-l-transparent'
                }`}
              >
                
                {/* Styled icon badge based on alert type */}
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                  alert.type === 'approval' ? 'bg-emerald-50 text-emerald-600' :
                  alert.type === 'feedback' ? 'bg-blue-50 text-blue-600' :
                  alert.type === 'audit' ? 'bg-indigo-50 text-indigo-600' :
                  'bg-amber-50 text-amber-600'
                }`}>
                  {alert.type === 'approval' && <ClipboardCheck className="w-4.5 h-4.5" />}
                  {alert.type === 'feedback' && <MessageSquare className="w-4.5 h-4.5" />}
                  {alert.type === 'audit' && <Star className="w-4.5 h-4.5" />}
                  {alert.type === 'system' && <AlertTriangle className="w-4.5 h-4.5" />}
                </div>

                {/* Content body */}
                <div className="flex-1 space-y-1.5 font-semibold">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      {alert.title}
                      {!alert.read && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></span>
                      )}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{alert.time}</span>
                  </div>
                  
                  <p className="text-xs text-slate-500 leading-normal font-semibold max-w-2xl">{alert.message}</p>
                  
                  {/* Embedded action triggers */}
                  {alert.actionUrl && alert.actionText && (
                    <div className="pt-2">
                      <Link 
                        href={alert.actionUrl}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold"
                      >
                        {alert.actionText} <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0 self-center">
                  <button
                    onClick={() => handleToggleRead(alert.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors text-[10px] font-black uppercase tracking-wider"
                  >
                    {alert.read ? 'Unread' : 'Read'}
                  </button>
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })
        )}

      </section>

    </div>
  );
}
