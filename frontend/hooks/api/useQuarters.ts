import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';

export enum QuarterState {
  PLANNING = "planning",
  ACTIVE = "active",
  REVIEW = "review",
  CLOSED = "closed",
}

export interface Quarter {
  id: string;
  label: string;
  state: QuarterState;
  start_date: string;
  end_date: string;
  is_immutable: boolean;
}

export function useQuarters() {
  return useQuery({
    queryKey: queryKeys.quarters.lists(),
    queryFn: async () => {
      return api.get<Quarter[]>('quarters/');
    },
  });
}

export function useActiveQuarter() {
  const { data: quarters } = useQuarters();
  return quarters?.find(q => q.state === QuarterState.ACTIVE) || quarters?.[0];
}
