import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';

/** 
 * The globally active quarter for the platform. 
 * In a real app, this might come from a config or backend.
 */
export const ACTIVE_QUARTER = "2024-Q3";

/** Computes the current strategic quarter. Defaults to ACTIVE_QUARTER for demo consistency. */
function getCurrentQuarter(): string {
  // We can eventually make this dynamic, but for now we align with the 2024-Q3 demo data
  return ACTIVE_QUARTER;
}

// Types
export enum GoalStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  APPROVED = "approved",
  REJECTED = "rejected",
  LOCKED = "locked",
}

export enum GoalPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum UoMType {
  NUMERIC = "numeric",
  PERCENTAGE = "percentage",
  TIMELINE = "timeline",
  ZERO_BASED = "zero_based",
}

export enum TrackingStatus {
  NOT_STARTED = "not_started",
  ON_TRACK = "on_track",
  COMPLETED = "completed",
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  thrust_area: string;
  uom: UoMType;
  priority: GoalPriority;
  weightage: number;
  quarter: string;
  target_date?: string;
  target_value: number;
  current_value: number;
  status: GoalStatus;
  progress: number;
  is_locked: boolean;
  parent_id?: string;
}

interface FetchGoalsParams {
  page?: number;
  limit?: number;
  status?: string;
}

interface GoalsResponse {
  items: Goal[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

/**
 * 1. Standard Query (with parameters)
 * Fetches a list of goals with caching and deduplication.
 */
export function useGoals(params: FetchGoalsParams & { quarter?: string; scope?: 'personal' | 'team' } = {}) {
  const quarter = params.quarter || getCurrentQuarter();
  return useQuery({
    queryKey: queryKeys.goals.list({ ...params, quarter }),
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        quarter,
        ...(params.status ? { status: params.status } : {}),
        ...(params.scope ? { scope: params.scope } : {})
      });
      
      return api.get<any>(`goals/?${queryParams.toString()}`);
    },
    staleTime: 5 * 60 * 1000, 
    retry: 1,
  });
}

/**
 * 1b. Single Goal Query
 * Fetches a single goal by ID for edit flows.
 */
export function useGetGoal(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.goals.detail(id) : ['goals', 'none'],
    queryFn: async () => {
      return api.get<Goal>(`goals/${id}`);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 2. Infinite Query
 * Ideal for feed-style or infinite scroll implementations.
 */
export function useInfiniteGoals(quarter = getCurrentQuarter(), limit = 10) {
  return useInfiniteQuery({
    queryKey: queryKeys.goals.lists(),
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      return api.get<any>(`goals/?quarter=${quarter}`);
    },
    getNextPageParam: (lastPage: any, allPages: any) => {
      // If the backend provides pagination metadata, use it
      if (lastPage.has_more) {
        return lastPage.page + 1;
      }
      // If backend returns a raw array, calculate based on length
      if (Array.isArray(lastPage) && lastPage.length === limit) {
        return allPages.length + 1;
      }
      return undefined;
    },
  });
}

/**
 * 3. Mutation Hook with Optimistic Updates
 * Instantly updates the UI while the request processes in the background.
 */
export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newGoal: Partial<Goal>) => {
      return api.post<Goal>('goals/', newGoal);
    },
    // ON MUTATE: Fired before the mutation function is executed
    onMutate: async (newGoal) => {
      // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.lists() });

      // 2. Snapshot the previous value
      const previousGoals = queryClient.getQueryData(queryKeys.goals.list({}));

      // 3. Optimistically update the cache with a fake ID
      queryClient.setQueryData(queryKeys.goals.list({}), (old: any) => {
        const optimisticGoal = { ...newGoal, id: `temp-${Date.now()}` };
        if (Array.isArray(old)) {
          return [optimisticGoal, ...old];
        } else if (old?.items) {
          return { ...old, items: [optimisticGoal, ...old.items] };
        }
        return old;
      });

      // 4. Return the context with the snapshotted value
      return { previousGoals };
    },
    // ON ERROR: Roll back to the previous snapshot if the API call fails
    onError: (err, newGoal, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.list({}), context.previousGoals);
      }
    },
    // ON SETTLED: Always refetch after error or success to ensure backend sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.lists() });
    },
  });
}

/**
 * 4. Update Goal Mutation
 * Used for debounced auto-saving or explicit updates.
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Goal> }) => {
      return api.patch<Goal>(`goals/${id}`, data);
    },
    onSettled: () => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.lists() });
    },
  });
}

/**
 * 4.1 Delete Goal Mutation
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`goals/${id}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.lists() });
    },
  });
}

/**
 * 5. Submit Goals Mutation
 * Submits and locks all goals for the given quarter.
 */
export function useSubmitGoals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quarter: string) => {
      return api.post(`goals/submit?quarter=${quarter}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.lists() });
    },
  });
}
/**
 * 6. Push Goal Mutation
 * Pushes a goal to all subordinates.
 */
export function usePushGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, weightage }: { id: string; weightage: number }) => {
      return api.post(`sharing/push/${id}`, { weightage });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.lists() });
    },
  });
}
