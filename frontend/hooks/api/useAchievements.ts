import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';
import { TrackingStatus } from '@/hooks/api/useGoals';

export interface Achievement {
  id: string;
  goal_id: string;
  quarter_id: string;
  owner_id: string;
  planned_value: number;
  actual_value: number;
  status: TrackingStatus;
  employee_summary: string;
  manager_feedback?: string;
  score: number;
  is_submitted: boolean;
  version_id: number;
  finalized_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AchievementDraftInput {
  goal_id: string;
  quarter_id: string;
  actual_value: number;
  status: TrackingStatus;
  employee_summary: string;
  version_id?: number;
}

export function useAchievements(quarterId: string | null) {
  return useQuery({
    queryKey: queryKeys.achievements.list({ quarterId }),
    queryFn: async () => {
      if (!quarterId) return [];
      return api.get<Achievement[]>(`achievements/?quarter_id=${quarterId}`);
    },
    enabled: !!quarterId,
  });
}

export function useTeamAchievements(quarterId: string | null) {
  return useQuery({
    queryKey: queryKeys.achievements.list({ quarterId, type: 'team' }),
    queryFn: async () => {
      if (!quarterId) return [];
      return api.get<Achievement[]>(`achievements/team?quarter_id=${quarterId}`);
    },
    enabled: !!quarterId,
  });
}

/**
 * Hook for saving achievements (drafts).
 * Implements optimistic UI updates for instant feedback.
 */
export function useSaveAchievementDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AchievementDraftInput) => {
      return api.post<Achievement>('achievements/draft', data);
    },
    onMutate: async (newDraft) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.achievements.lists() });
      const previousAchievements = queryClient.getQueryData(queryKeys.achievements.list({ quarterId: newDraft.quarter_id }));

      queryClient.setQueryData(
        queryKeys.achievements.list({ quarterId: newDraft.quarter_id }),
        (old: Achievement[] | undefined) => {
          if (!old) return [];
          return old.map(a => 
            a.goal_id === newDraft.goal_id ? { ...a, ...newDraft } : a
          );
        }
      );

      return { previousAchievements, quarterId: newDraft.quarter_id };
    },
    onError: (err, newDraft, context) => {
      if (context?.previousAchievements) {
        queryClient.setQueryData(
          queryKeys.achievements.list({ quarterId: context.quarterId }),
          context.previousAchievements
        );
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements.lists() });
    },
  });
}

/**
 * Hook for final achievement submission.
 */
export function useSubmitAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.post<Achievement>(`achievements/${id}/submit`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements.lists() });
    },
  });
}
