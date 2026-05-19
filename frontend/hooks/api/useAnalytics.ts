import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ManagerStats {
  pending_approvals: number;
  team_avg_progress: number;
  submission_rate: number;
  total_subordinates: number;
  top_thrust_area?: string;
}

export interface DashboardSummary {
  total_goals: number;
  avg_progress: number;
  total_users: number;
  status_distribution: Record<string, number>;
  department_completion: Array<{ name: string; avg_progress: number }>;
}

export interface QoQTrend {
  quarter: string;
  avg_progress: number;
}

export function useManagerStats(quarter?: string, enabled: boolean = true) {
  return useQuery<ManagerStats>({
    queryKey: ['analytics', 'manager', quarter],
    queryFn: () => {
      const url = quarter ? `analytics/manager/?quarter=${quarter}` : 'analytics/manager/';
      return api.get<ManagerStats>(url);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });
}


export function useDashboardSummary(refresh = false) {
  return useQuery<DashboardSummary>({
    queryKey: ['analytics', 'summary', refresh],
    queryFn: () => api.get<DashboardSummary>(`analytics/summary/?refresh=${refresh}`),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useQoQTrends(enabled: boolean = true) {
  return useQuery<QoQTrend[]>({
    queryKey: ['analytics', 'qoq'],
    queryFn: async () => {
      const res = await api.get<QoQTrend[]>('analytics/trends/qoq');
      return res;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled,
  });
}

export interface CompletionSummaryParams {
  quarter: string;
  days_overdue?: number;
  force_refresh?: boolean;
}

export interface OverdueCheckin {
  goal_id: string;
  goal_title: string;
  owner_name: string;
  owner_email: string;
  days_since_last_checkin: number;
  last_checkin_value: number | null;
  last_checkin_date: string | null;
}

export interface EmployeeStats {
  user_id: string;
  full_name: string;
  email: string;
  department_name: string | null;
  total_goals: number;
  completed_goals: number;
  average_progress: number;
  last_active: string | null;
}

export interface ManagerStatsComparison {
  user_id: string;
  full_name: string;
  email: string;
  subordinate_count: number;
  total_goals: number;
  average_team_progress: number;
  pending_approvals: number;
}

export interface CompletionSummaryData {
  total_goals: number;
  completed_goals: number;
  overall_avg_progress: number;
  weighted_strategic_achievement: number;
  overall_completion_rate: number;
  status_distribution: Record<string, number>;
  tracking_status_distribution: Record<string, number>;
  overdue_checkins: OverdueCheckin[];
  employee_stats: EmployeeStats[];
  manager_stats: ManagerStatsComparison[];
  quarter: string;
  last_updated: string;
}

export function useCompletionSummary(params: CompletionSummaryParams, enabled: boolean = true) {
  return useQuery<CompletionSummaryData>({
    queryKey: ['analytics', 'completion', params.quarter, params.days_overdue, params.force_refresh],
    queryFn: () => {
      const days = params.days_overdue ?? 7;
      const refresh = params.force_refresh ? '&force_refresh=true' : '';
      return api.get<CompletionSummaryData>(
        `completion/summary?quarter=${params.quarter}&days_overdue=${days}${refresh}`
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });
}


// ---------------------------------------------------------------------------
// Heatmap configuration – driven entirely from the backend
// ---------------------------------------------------------------------------

export interface HeatmapColorBand {
  min_progress: number;
  max_progress: number;
  tile_class: string;  // full Tailwind class string for the tile
  bg_class: string;    // single bg-* class for the legend swatch
  label: string;
}

export interface HeatmapConfig {
  default_days_overdue: number;
  days_overdue_min: number;
  days_overdue_max: number;
  page_title: string;
  page_subtitle: string;
  matrix_title: string;
  matrix_subtitle: string;
  department_section_title: string;
  department_section_subtitle: string;
  overdue_section_title: string;
  overdue_section_subtitle: string;
  manager_section_title: string;
  manager_section_subtitle: string;
  color_bands: HeatmapColorBand[];
}

export function useHeatmapConfig() {
  return useQuery<HeatmapConfig>({
    queryKey: ['completion', 'config'],
    queryFn: () => api.get<HeatmapConfig>('completion/config'),
    staleTime: Infinity, // config rarely changes – cache indefinitely
  });
}

/**
 * Given a progress value (0–100) and the backend color bands,
 * returns the full tile_class string for that band.
 */
export function getTileClass(progress: number, bands: HeatmapColorBand[]): string {
  const band = bands.find(b => progress >= b.min_progress && progress <= b.max_progress);
  return band?.tile_class ?? bands[bands.length - 1]?.tile_class ?? '';
}
