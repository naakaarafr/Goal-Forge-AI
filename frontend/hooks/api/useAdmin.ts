import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Quarter {
  id: string;
  label: string;
  state: 'planning' | 'active' | 'review' | 'closed';
  start_date: string;
  end_date: string;
  is_immutable: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  manager_id: string | null;
  department_id: string | null;
}

export function useQuartersAdmin() {
  return useQuery<Quarter[]>({
    queryKey: ['admin', 'quarters'],
    queryFn: () => api.get<Quarter[]>('admin/quarters'),
  });
}

export function useUpdateQuarter() {
  const queryClient = useQueryClient();
  return useMutation<Quarter, Error, { id: string; state?: string; is_immutable?: boolean }>({
    mutationFn: ({ id, ...data }) => api.patch<Quarter>(`admin/quarters/${id}/state`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'quarters'] });
    },
  });
}

export function useUsersAdmin() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<AdminUser[]>('admin/users'),
  });
}

export function useReassignManager() {
  const queryClient = useQueryClient();
  return useMutation<AdminUser, Error, { userId: string; managerId: string | null }>({
    mutationFn: ({ userId, managerId }) => 
      api.patch<AdminUser>(`admin/users/${userId}/manager`, { manager_id: managerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useUnlockGoal() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { goalId: string; reason: string }>({
    mutationFn: ({ goalId, reason }) => api.post(`admin/goals/${goalId}/unlock`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'escalations'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export interface AuditLogsFilterParams {
  entity_name?: string;
  entity_id?: string;
  actor_id?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  size?: number;
}

export function useAuditLogs(params?: AuditLogsFilterParams) {
  return useQuery<any[]>({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: () => api.get<any[]>('audit/', { params }),
  });
}

export function useEscalations() {
  return useQuery<any[]>({
    queryKey: ['admin', 'escalations'],
    queryFn: () => api.get<any[]>('admin/escalations'),
  });
}

// ─── Dynamic System Settings ───────────────────────────────────────────────
export interface SystemSettings {
  orgName: string;
  domainRestriction: string;
  defaultCurrency: string;
  autoProvision: boolean;
  maxGoals: string;
  minWeightage: string;
  requireManagerLock: boolean;
  enableSelfEvaluation: boolean;
  lateCheckinDays: string;
  escalationDays: string;
  autoPingManager: boolean;
  webhookUrl: string;
  aiModel: string;
  aiTemperature: number;
  aiSystemPrompt: string;
  enableEntraId: boolean;
  clientId: string;
  tenantId: string;
}

export function useSettingsAdmin() {
  return useQuery<SystemSettings>({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.get<SystemSettings>('admin/settings'),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation<SystemSettings, Error, SystemSettings>({
    mutationFn: (data) => api.put<SystemSettings>('admin/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
  });
}
