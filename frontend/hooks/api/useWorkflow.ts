import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Goal } from './useGoals';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApprovalHistoryEntry {
  id: string;
  goal_id: string;
  actor_id: string;
  from_status: string;
  to_status: string;
  comment?: string;
  created_at: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetch all SUBMITTED goals pending approval for the logged-in manager.
 */
export function usePendingApprovals() {
  return useQuery<Goal[]>({
    queryKey: ['workflow', 'pending'],
    queryFn: () => api.get<Goal[]>('workflow/pending/'),
    staleTime: 30 * 1000,
    retry: false,
  });
}

/**
 * Approve a submitted goal (SUBMITTED → APPROVED + locked).
 */
export function useApproveGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, comment }: { goalId: string; comment?: string }) =>
      api.post<Goal>(`workflow/${goalId}/approve`, { comment: comment || null }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', 'pending'] });
    },
  });
}

/**
 * Return a goal for rework (SUBMITTED → DRAFT). Comment is required.
 */
export function useReworkGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, comment }: { goalId: string; comment: string }) =>
      api.post<Goal>(`workflow/${goalId}/rework`, { comment }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', 'pending'] });
    },
  });
}

/**
 * Fetch approval history timeline for a specific goal.
 */
export function useGoalHistory(goalId: string | null) {
  return useQuery<ApprovalHistoryEntry[]>({
    queryKey: ['workflow', 'history', goalId],
    queryFn: () => api.get<ApprovalHistoryEntry[]>(`workflow/${goalId}/history/`),
    enabled: !!goalId,
    staleTime: 60 * 1000,
  });
}

/**
 * Manager inline-edit: update weightage and/or target_value during review.
 */
export function useManagerUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId,
      weightage,
      target_value,
    }: {
      goalId: string;
      weightage?: number;
      target_value?: number;
    }) =>
      api.patch<Goal>(`workflow/${goalId}/manager-review/`, {
        weightage,
        target_value,
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', 'pending'] });
    },
  });
}
