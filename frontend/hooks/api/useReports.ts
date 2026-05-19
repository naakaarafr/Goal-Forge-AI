import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface ReportFilterConfig {
  quarter?: string;
  departmentId?: string;
  managerId?: string;
  employeeId?: string;
  format: 'csv' | 'excel';
}

export function useExportAchievements() {
  return useMutation<void, Error, ReportFilterConfig>({
    mutationFn: async (filters) => {
      const queryParams = new URLSearchParams();
      if (filters.quarter) queryParams.append('quarter', filters.quarter);
      if (filters.departmentId) queryParams.append('department_id', filters.departmentId);
      if (filters.managerId) queryParams.append('manager_id', filters.managerId);
      if (filters.employeeId) queryParams.append('employee_id', filters.employeeId);

      const endpoint = `reports/achievements/${filters.format}`;
      const url = `${endpoint}?${queryParams.toString()}`;

      const response = await apiClient.get(url, {
        responseType: 'blob',
      });

      // Convert response stream to a blob
      const blob = response.data as Blob;
      
      // Determine filename from content disposition or fallback
      let filename = `achievements_export.${filters.format === 'excel' ? 'xlsx' : 'csv'}`;
      const disposition = response.headers['content-disposition'];
      if (disposition && typeof disposition === 'string' && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      // Trigger browser download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    }
  });
}
