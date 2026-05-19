/**
 * @file components/shared/index.ts
 * @description Central barrel export for all shared enterprise UI components.
 * Import everything from '@/components/shared' for clean tree-shaking.
 */

// ─── KPI Cards ───────────────────────────────────────────────────────────────
export { KpiCard, KpiCardGrid } from './KpiCard';
export type { KpiCardProps } from './KpiCard';

// ─── Tables ──────────────────────────────────────────────────────────────────
export { DataTable } from './DataTable';
export type { DataTableColumn, DataTableProps } from './DataTable';

// ─── Dialogs ─────────────────────────────────────────────────────────────────
export { ConfirmDialog, InfoDialog } from './Dialog';
export type { ConfirmDialogProps, InfoDialogProps } from './Dialog';

// ─── Forms ───────────────────────────────────────────────────────────────────
export { FormField, FormTextarea, FormSelect, FormError, FormSection } from './Form';
export type { FormFieldProps, FormTextareaProps, FormSelectProps } from './Form';

// ─── Analytics Widgets ───────────────────────────────────────────────────────
export { StatBadge, DistributionBar, HealthBuckets, SectionHeader } from './AnalyticsWidgets';
export type { StatBadgeProps, DistributionBarProps, HealthBucketsProps } from './AnalyticsWidgets';

// ─── Empty / Loading States ──────────────────────────────────────────────────
export { EmptyState, ErrorState, LoadingState, SkeletonBlock } from './StateViews';
export type { EmptyStateProps } from './StateViews';

// ─── Page Headers ────────────────────────────────────────────────────────────
export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';
