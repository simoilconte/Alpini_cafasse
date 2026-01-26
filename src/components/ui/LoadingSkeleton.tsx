/**
 * LoadingSkeleton Component
 * 
 * Reusable skeleton loading component for displaying loading states.
 * Provides visual feedback while data is being fetched.
 * 
 * Requirements:
 * - Req 12.5: Loading skeleton during caricamenti
 */

import React from 'react';

interface LoadingSkeletonProps {
  /** Type of skeleton to render */
  variant?: 'text' | 'card' | 'table-row' | 'avatar' | 'button';
  /** Number of skeleton items to render */
  count?: number;
  /** Custom className for additional styling */
  className?: string;
  /** Width of the skeleton (for text variant) */
  width?: string;
  /** Height of the skeleton */
  height?: string;
}

/**
 * Base skeleton element with animation
 */
function SkeletonBase({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded ${className}`}
      style={style}
    />
  );
}

/**
 * Text skeleton - single line of text
 */
function TextSkeleton({ width = '100%', height = '1rem' }: { width?: string; height?: string }) {
  return <SkeletonBase className="h-4" style={{ width, height }} />;
}

/**
 * Card skeleton - for member cards on mobile
 */
function CardSkeleton() {
  return (
    <div className="card space-y-3">
      {/* Header with name and badge */}
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <SkeletonBase className="h-5 w-3/4" />
          <SkeletonBase className="h-4 w-1/2" />
        </div>
        <SkeletonBase className="h-6 w-20 rounded-full" />
      </div>
      
      {/* Contact info */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <SkeletonBase className="h-4 w-2/3" />
        <SkeletonBase className="h-4 w-1/2" />
      </div>
      
      {/* Status badges */}
      <div className="flex gap-2 pt-2">
        <SkeletonBase className="h-6 w-16 rounded-full" />
        <SkeletonBase className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Table row skeleton - for desktop table view
 */
function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3">
        <SkeletonBase className="h-4 w-32" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBase className="h-4 w-32" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBase className="h-4 w-40" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBase className="h-4 w-32" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBase className="h-6 w-20 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBase className="h-6 w-16 rounded-full" />
      </td>
    </tr>
  );
}

/**
 * Avatar skeleton - circular placeholder
 */
function AvatarSkeleton({ size = '2.5rem' }: { size?: string }) {
  return <SkeletonBase className="rounded-full" style={{ width: size, height: size }} />;
}

/**
 * Button skeleton
 */
function ButtonSkeleton({ width = '6rem', height = '2.5rem' }: { width?: string; height?: string }) {
  return <SkeletonBase className="rounded-lg" style={{ width, height }} />;
}

/**
 * Main LoadingSkeleton component
 */
export function LoadingSkeleton({
  variant = 'text',
  count = 1,
  className = '',
  width,
  height,
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  const renderSkeleton = (key: number) => {
    switch (variant) {
      case 'card':
        return <CardSkeleton key={key} />;
      case 'table-row':
        return <TableRowSkeleton key={key} />;
      case 'avatar':
        return <AvatarSkeleton key={key} size={width || height} />;
      case 'button':
        return <ButtonSkeleton key={key} width={width} height={height} />;
      case 'text':
      default:
        return <TextSkeleton key={key} width={width} height={height} />;
    }
  };

  if (variant === 'table-row') {
    return <>{items.map(renderSkeleton)}</>;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map(renderSkeleton)}
    </div>
  );
}

/**
 * MemberListSkeleton - Complete skeleton for member list page
 * Shows appropriate skeleton based on screen size
 */
export function MemberListSkeleton() {
  return (
    <>
      {/* Mobile skeleton (cards) */}
      <div className="md:hidden space-y-3">
        <LoadingSkeleton variant="card" count={5} />
      </div>
      
      {/* Desktop skeleton (table) */}
      <div className="hidden md:block">
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <SkeletonBase className="h-4 w-16" />
                </th>
                <th className="px-4 py-3 text-left">
                  <SkeletonBase className="h-4 w-20" />
                </th>
                <th className="px-4 py-3 text-left">
                  <SkeletonBase className="h-4 w-28" />
                </th>
                <th className="px-4 py-3 text-left">
                  <SkeletonBase className="h-4 w-16" />
                </th>
                <th className="px-4 py-3 text-left">
                  <SkeletonBase className="h-4 w-12" />
                </th>
                <th className="px-4 py-3 text-left">
                  <SkeletonBase className="h-4 w-12" />
                </th>
              </tr>
            </thead>
            <tbody>
              <LoadingSkeleton variant="table-row" count={8} />
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default LoadingSkeleton;
