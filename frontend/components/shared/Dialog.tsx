'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';
import { X, AlertTriangle, Info, CheckCircle2, Loader2 } from 'lucide-react';

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;

  title: string;
  description?: string;

  /** Semantic intent of the confirm action */
  intent?: 'danger' | 'warning' | 'primary';

  /** Label for the confirm button */
  confirmLabel?: string;
  cancelLabel?: string;

  /** Show spinner on confirm button while loading */
  isLoading?: boolean;

  /** Extra body content (e.g. a justification textarea) */
  children?: React.ReactNode;
}

const intentStyles = {
  danger:  { icon: AlertTriangle, iconCls: 'text-rose-600',   iconBg: 'bg-rose-100',   btn: 'bg-rose-600 hover:bg-rose-700 text-white' },
  warning: { icon: AlertTriangle, iconCls: 'text-amber-600',  iconBg: 'bg-amber-100',  btn: 'bg-amber-600 hover:bg-amber-700 text-white' },
  primary: { icon: Info,          iconCls: 'text-indigo-600', iconBg: 'bg-indigo-100', btn: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
};

/**
 * ConfirmDialog — reusable confirmation modal with intent styling.
 *
 * @example
 * <ConfirmDialog
 *   open={isOpen}
 *   onClose={() => setOpen(false)}
 *   onConfirm={handleDelete}
 *   intent="danger"
 *   title="Delete Goal?"
 *   description="This cannot be undone."
 *   confirmLabel="Delete"
 *   isLoading={mutation.isPending}
 * />
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  intent = 'primary',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading,
  children,
}: ConfirmDialogProps) {
  if (!open) return null;

  const { icon: Icon, iconCls, iconBg, btn } = intentStyles[intent];

  const handleConfirm = async () => {
    await onConfirm();
  };

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 pb-0">
          <div className="flex items-start gap-4">
            <div className={twMerge('p-2.5 rounded-2xl flex-shrink-0', iconBg)}>
              <Icon className={twMerge('w-5 h-5', iconCls)} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{title}</h3>
              {description && <p className="text-sm text-slate-500 font-semibold mt-1 leading-relaxed">{description}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Optional extra body */}
        {children && <div className="px-6 pt-4">{children}</div>}

        {/* Action buttons */}
        <div className="flex gap-3 p-6 pt-5">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 border border-slate-200 text-slate-600 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={twMerge(
              'flex-1 flex items-center justify-center gap-2 font-black text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-40',
              btn
            )}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── InfoDialog ───────────────────────────────────────────────────────────────

export interface InfoDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Max width tailwind class */
  maxWidth?: string;
  closeLabel?: string;
}

/**
 * InfoDialog — generic modal shell for detail views, forms, or rich content.
 *
 * @example
 * <InfoDialog open={showDetail} onClose={() => setShow(false)} title="Goal Details">
 *   <GoalDetailPanel goal={selected} />
 * </InfoDialog>
 */
export function InfoDialog({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  closeLabel = 'Close',
}: InfoDialogProps) {
  if (!open) return null;

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className={twMerge('bg-white rounded-3xl shadow-2xl w-full border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]', maxWidth)}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full border border-slate-200 text-slate-600 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
