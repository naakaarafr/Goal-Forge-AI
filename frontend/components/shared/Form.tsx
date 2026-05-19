'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, AlertCircle } from 'lucide-react';

// ─── FormSection ─────────────────────────────────────────────────────────────

/**
 * FormSection — groups a cluster of related fields with a heading and optional description.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={twMerge('space-y-4', className)}>
      {(title || description) && (
        <div className="pb-1 border-b border-slate-100">
          {title && <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">{title}</h4>}
          {description && <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── FormError ────────────────────────────────────────────────────────────────

/**
 * FormError — inline error banner for form-level errors.
 */
export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="font-semibold">{message}</span>
    </div>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Icon shown inside the input (left) */
  icon?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
}

/**
 * FormField — Labelled text input with optional icon, hint, and error state.
 *
 * @example
 * <FormField
 *   label="Email Address"
 *   type="email"
 *   placeholder="you@example.com"
 *   icon={<Mail className="w-4 h-4" />}
 *   required
 *   error={errors.email}
 *   value={email}
 *   onChange={e => setEmail(e.target.value)}
 * />
 */
export function FormField({
  label,
  error,
  hint,
  required,
  icon,
  containerClassName,
  labelClassName,
  className,
  ...inputProps
}: FormFieldProps) {
  const id = inputProps.id ?? label.toLowerCase().replace(/\s+/g, '-');
  const hasError = !!error;

  return (
    <div className={twMerge('space-y-1.5', containerClassName)}>
      <label
        htmlFor={id}
        className={twMerge('block text-xs font-black text-slate-600 uppercase tracking-widest', labelClassName)}
      >
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>

      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          {...inputProps}
          className={twMerge(
            'w-full border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2',
            icon && 'pl-10',
            hasError
              ? 'border-rose-300 bg-rose-50 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-slate-200 bg-slate-50 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-300',
            inputProps.disabled && 'opacity-60 cursor-not-allowed bg-slate-100',
            className
          )}
        />
      </div>

      {hint && !error && <p className="text-[10px] text-slate-400 font-semibold">{hint}</p>}
      {error && <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

// ─── FormTextarea ─────────────────────────────────────────────────────────────

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  containerClassName?: string;
  /** Character counter: show remaining when near limit */
  maxLength?: number;
}

/**
 * FormTextarea — Labelled multi-line textarea with character counter and error state.
 */
export function FormTextarea({
  label,
  error,
  hint,
  required,
  containerClassName,
  className,
  maxLength,
  value,
  ...textareaProps
}: FormTextareaProps) {
  const id = textareaProps.id ?? label.toLowerCase().replace(/\s+/g, '-');
  const hasError = !!error;
  const charCount = typeof value === 'string' ? value.length : 0;
  const isNearLimit = maxLength && charCount >= maxLength * 0.8;

  return (
    <div className={twMerge('space-y-1.5', containerClassName)}>
      <div className="flex justify-between items-center">
        <label
          htmlFor={id}
          className="block text-xs font-black text-slate-600 uppercase tracking-widest"
        >
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        {maxLength && (
          <span className={twMerge('text-[10px] font-bold', isNearLimit ? 'text-amber-600' : 'text-slate-400')}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>

      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        {...textareaProps}
        className={twMerge(
          'w-full border rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 resize-none transition-all focus:outline-none focus:ring-2',
          hasError
            ? 'border-rose-300 bg-rose-50 focus:ring-rose-500/20 focus:border-rose-500'
            : 'border-slate-200 bg-slate-50 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-300',
          textareaProps.disabled && 'opacity-60 cursor-not-allowed bg-slate-100',
          className
        )}
      />

      {hint && !error && <p className="text-[10px] text-slate-400 font-semibold">{hint}</p>}
      {error && <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

// ─── FormSelect ───────────────────────────────────────────────────────────────

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  containerClassName?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

/**
 * FormSelect — Labelled select with styled chevron and error state.
 *
 * @example
 * <FormSelect
 *   label="Performance Rating"
 *   required
 *   value={rating}
 *   onChange={e => setRating(e.target.value)}
 *   options={[
 *     { value: 'exceeds_expectations', label: 'Exceeds Expectations' },
 *     { value: 'meets_expectations',  label: 'Meets Expectations' },
 *     { value: 'needs_improvement',   label: 'Needs Improvement' },
 *   ]}
 * />
 */
export function FormSelect({
  label,
  error,
  hint,
  required,
  containerClassName,
  className,
  options,
  placeholder,
  ...selectProps
}: FormSelectProps) {
  const id = selectProps.id ?? label.toLowerCase().replace(/\s+/g, '-');
  const hasError = !!error;

  return (
    <div className={twMerge('space-y-1.5', containerClassName)}>
      <label
        htmlFor={id}
        className="block text-xs font-black text-slate-600 uppercase tracking-widest"
      >
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>

      <div className="relative">
        <select
          id={id}
          {...selectProps}
          className={twMerge(
            'w-full appearance-none border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 pr-10 transition-all focus:outline-none focus:ring-2 cursor-pointer',
            hasError
              ? 'border-rose-300 bg-rose-50 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-slate-200 bg-slate-50 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-300',
            selectProps.disabled && 'opacity-60 cursor-not-allowed bg-slate-100',
            className
          )}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>

      {hint && !error && <p className="text-[10px] text-slate-400 font-semibold">{hint}</p>}
      {error && <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}
