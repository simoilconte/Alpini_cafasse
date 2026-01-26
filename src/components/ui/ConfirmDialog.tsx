/**
 * ConfirmDialog Component
 * 
 * Reusable confirmation dialog for destructive or important actions.
 * Modal overlay with animation, accessible (focus trap, escape to close).
 * 
 * Requirements:
 * - Req 12.5: Dialog di conferma per eliminazioni
 */

import { useEffect, useRef, useCallback } from 'react';

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Callback when confirm is clicked */
  onConfirm: () => void;
  /** Callback when cancel is clicked or dialog is dismissed */
  onCancel: () => void;
  /** Visual variant for the confirm button */
  variant?: 'danger' | 'warning' | 'info';
  /** Whether the confirm action is in progress */
  isLoading?: boolean;
}

/**
 * ConfirmDialog - Modal confirmation dialog
 * 
 * Features:
 * - Modal overlay with backdrop
 * - Accessible: focus trap, escape to close, aria attributes
 * - Mobile-friendly responsive design
 * - Loading state support
 * - Three variants: danger (red), warning (yellow), info (blue)
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  onConfirm,
  onCancel,
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Handle escape key to close dialog
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && !isLoading) {
      onCancel();
    }
  }, [onCancel, isLoading]);

  // Focus trap - keep focus within dialog
  const handleTabKey = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const focusableElements = dialogRef.current?.querySelectorAll(
      'button:not([disabled])'
    );
    
    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  // Setup event listeners and focus management
  useEffect(() => {
    if (isOpen) {
      // Add event listeners
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keydown', handleTabKey);
      
      // Focus the cancel button by default (safer option)
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 0);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleTabKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown, handleTabKey]);

  // Don't render if not open
  if (!isOpen) return null;

  // Variant styles for confirm button
  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
  };

  // Variant styles for icon
  const iconStyles = {
    danger: 'text-red-600 bg-red-100',
    warning: 'text-yellow-600 bg-yellow-100',
    info: 'text-blue-600 bg-blue-100',
  };

  // Icon based on variant
  const renderIcon = () => {
    if (variant === 'danger') {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    if (variant === 'warning') {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200"
        onClick={!isLoading ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* Dialog positioning */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-4">
        {/* Dialog panel */}
        <div
          ref={dialogRef}
          className="relative bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        >
          <div className="p-6">
            {/* Icon and content */}
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconStyles[variant]}`}>
                {renderIcon()}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3
                  id="confirm-dialog-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  {title}
                </h3>
                <p
                  id="confirm-dialog-description"
                  className="mt-2 text-sm text-slate-600"
                >
                  {message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${variantStyles[variant]}`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Elaborazione...</span>
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
