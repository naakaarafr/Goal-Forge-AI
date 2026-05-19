import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
  department_name: string | null;
  total_goals: number;
  avg_progress: number;
  submission_status: string;
  last_checkin_date: string | null;
}

export interface GoalSummary {
  id: string;
  title: string;
  weightage: number;
  progress: number;
  status: string;
  target_date: string | null;
}

export interface ManagerFeedback {
  id: string;
  employee_id: string;
  manager_id: string;
  quarter: string;
  performance_rating: 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement';
  strengths: string;
  development_areas: string;
  discussion_summary: string | null;
  is_finalized: boolean;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeQuarterlySummary {
  employee_id: string;
  full_name: string | null;
  quarter: string;
  total_goals: number;
  total_weightage: number;
  weighted_achievement_score: number;
  goals: GoalSummary[];
  feedback: ManagerFeedback | null;
}

export interface DiscussionEvent {
  id: string;
  type: 'checkin' | 'comment' | 'approval' | 'feedback';
  goal_title: string;
  author_name: string;
  timestamp: string;
  details: any;
}

export function useTeamMembers(quarter: string | null, enabled: boolean = true) {
  return useQuery<TeamMember[]>({
    queryKey: ['manager', 'team', quarter],
    queryFn: () => {
      const url = quarter ? `manager/team?quarter=${quarter}` : 'manager/team';
      return api.get<TeamMember[]>(url);
    },
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!quarter,
  });
}

export function useEmployeeSummary(employeeId: string | null, quarter: string | null, enabled: boolean = true) {
  return useQuery<EmployeeQuarterlySummary>({
    queryKey: ['manager', 'team', employeeId, 'summary', quarter],
    queryFn: () => api.get<EmployeeQuarterlySummary>(`manager/team/${employeeId}/summary?quarter=${quarter}`),
    staleTime: 2 * 60 * 1000,
    enabled: enabled && !!employeeId && !!quarter,
  });
}

export function useDiscussionHistory(employeeId: string | null, quarter: string | null, enabled: boolean = true) {
  return useQuery<DiscussionEvent[]>({
    queryKey: ['manager', 'team', employeeId, 'discussion', quarter],
    queryFn: () => api.get<DiscussionEvent[]>(`manager/team/${employeeId}/discussion-history?quarter=${quarter}`),
    staleTime: 2 * 60 * 1000,
    enabled: enabled && !!employeeId && !!quarter,
  });
}

export interface FeedbackSubmitPayload {
  employee_id: string;
  quarter: string;
  performance_rating: 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement';
  strengths: string;
  development_areas: string;
  discussion_summary?: string;
  is_finalized: boolean;
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  return useMutation<
    ManagerFeedback, 
    Error, 
    { employeeId: string; payload: FeedbackSubmitPayload },
    { previousSummary: EmployeeQuarterlySummary | undefined }
  >({
    mutationFn: ({ employeeId, payload }) => 
      api.post<ManagerFeedback>(`manager/team/${employeeId}/feedback`, payload),
    onMutate: async ({ employeeId, payload }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['manager', 'team', employeeId, 'summary'] });
      
      // Snapshot previous value
      const previousSummary = queryClient.getQueryData<EmployeeQuarterlySummary>(['manager', 'team', employeeId, 'summary', payload.quarter]);
      
      // Optimistically update
      if (previousSummary) {
        queryClient.setQueryData<EmployeeQuarterlySummary>(['manager', 'team', employeeId, 'summary', payload.quarter], {
          ...previousSummary,
          feedback: {
            id: previousSummary.feedback?.id || 'temp-id',
            employee_id: employeeId,
            manager_id: previousSummary.feedback?.manager_id || 'current-manager',
            quarter: payload.quarter,
            performance_rating: payload.performance_rating,
            strengths: payload.strengths,
            development_areas: payload.development_areas,
            discussion_summary: payload.discussion_summary || null,
            is_finalized: payload.is_finalized,
            finalized_at: payload.is_finalized ? new Date().toISOString() : null,
            created_at: previousSummary.feedback?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        });
      }
      
      return { previousSummary };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousSummary) {
        queryClient.setQueryData(
          ['manager', 'team', variables.employeeId, 'summary', variables.payload.quarter], 
          context.previousSummary
        );
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'team'] });
      queryClient.invalidateQueries({ queryKey: ['manager', 'team', variables.employeeId, 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['manager', 'team', variables.employeeId, 'discussion'] });
    },
  });
}

export interface AddTeamMemberPayload {
  email: string;
  full_name: string;
  password: string;
  role: 'employee' | 'manager';
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, AddTeamMemberPayload>({
    mutationFn: (payload) => api.post<any>('manager/team/member', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'team'] });
    },
  });
}

export interface AssignableEmployee {
  id: string;
  email: string;
  full_name: string | null;
}

export function useAssignableEmployees() {
  return useQuery<AssignableEmployee[]>({
    queryKey: ['manager', 'assignable-employees'],
    queryFn: () => api.get<AssignableEmployee[]>('manager/assignable-employees'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssignTeamMember() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { employee_id: string }>({
    mutationFn: (payload) => api.post<any>('manager/team/member/assign', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'team'] });
      queryClient.invalidateQueries({ queryKey: ['manager', 'assignable-employees'] });
    },
  });
}
