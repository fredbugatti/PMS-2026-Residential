'use client';

import React from 'react';

// Base skeleton with animation
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`}
    />
  );
}

// Skeleton for stat cards on dashboard
export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-700">
      <Skeleton className="h-3 sm:h-4 w-20 mb-2" />
      <Skeleton className="h-8 sm:h-10 w-16 mb-1" />
      <Skeleton className="h-3 w-24 mt-1" />
    </div>
  );
}

// Skeleton for navigation cards
export function NavCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-700">
      <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg mb-2 sm:mb-3" />
      <Skeleton className="h-4 w-20 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

// Skeleton for activity list items
export function ActivityItemSkeleton() {
  return (
    <div className="p-3 sm:p-4 flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-3 flex-1">
        <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-3 sm:h-4 w-3/4 mb-1" />
          <Skeleton className="h-2 sm:h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-16 ml-2" />
    </div>
  );
}

// Skeleton for property cards
export function PropertyCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex-1">
            <Skeleton className="h-5 sm:h-6 w-32 mb-2" />
            <Skeleton className="h-3 sm:h-4 w-48" />
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-2 w-24 mt-1" />
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 sm:h-6 w-20" />
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 sm:px-6 py-3">
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

// Skeleton for lease table rows
export function LeaseRowSkeleton() {
  return (
    <tr className="border-b border-slate-200 dark:border-slate-700">
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-28" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-6 w-16 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-24" />
      </td>
    </tr>
  );
}

// Skeleton for lease cards (mobile)
export function LeaseCardSkeleton() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <Skeleton className="h-2 w-12 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div>
          <Skeleton className="h-2 w-12 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for work order kanban cards
export function WorkOrderCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-2/3 mb-3" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

// Skeleton for alert/attention cards
export function AlertSkeleton() {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded" />
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}

// Skeleton for expiring lease items
export function ExpiringLeaseSkeleton() {
  return (
    <div className="p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-28 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="text-right ml-2">
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for report table rows
export function ReportRowSkeleton() {
  return (
    <tr className="border-b border-slate-200 dark:border-slate-700">
      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
    </tr>
  );
}

// Dashboard skeleton - full page loading state
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-6 sm:h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Quick Navigation */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <NavCardSkeleton />
              <NavCardSkeleton />
              <NavCardSkeleton />
              <NavCardSkeleton />
              <NavCardSkeleton />
              <NavCardSkeleton />
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700">
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="divide-y divide-slate-100">
                <ActivityItemSkeleton />
                <ActivityItemSkeleton />
                <ActivityItemSkeleton />
                <ActivityItemSkeleton />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-6">
            {/* Needs Attention */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700">
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="p-3 sm:p-4 space-y-3">
                <AlertSkeleton />
                <AlertSkeleton />
              </div>
            </div>

            {/* Expiring Leases */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700">
                <Skeleton className="h-5 w-28 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="divide-y divide-slate-100">
                <ExpiringLeaseSkeleton />
                <ExpiringLeaseSkeleton />
                <ExpiringLeaseSkeleton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Properties list skeleton
export function PropertiesListSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 sm:h-8 w-28 mb-2" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
        </div>
      </div>
    </div>
  );
}

// Leases page skeleton
export function LeasesPageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 sm:h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Mobile cards */}
        <div className="md:hidden bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-200">
          <LeaseCardSkeleton />
          <LeaseCardSkeleton />
          <LeaseCardSkeleton />
          <LeaseCardSkeleton />
        </div>
        {/* Desktop table */}
        <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-16" /></th>
                <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-20" /></th>
                <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-12" /></th>
                <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-16" /></th>
                <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-12" /></th>
                <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-16" /></th>
              </tr>
            </thead>
            <tbody>
              <LeaseRowSkeleton />
              <LeaseRowSkeleton />
              <LeaseRowSkeleton />
              <LeaseRowSkeleton />
              <LeaseRowSkeleton />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Maintenance page skeleton
export function MaintenancePageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 sm:h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-44" />
            </div>
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Kanban columns */}
          {['Open', 'In Progress', 'Completed'].map((col) => (
            <div key={col} className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              <div className="space-y-3">
                <WorkOrderCardSkeleton />
                <WorkOrderCardSkeleton />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Reports page skeleton
export function ReportsPageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-6 sm:h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-16" /></th>
                <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-20" /></th>
                <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-16" /></th>
                <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-16" /></th>
                <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-16" /></th>
              </tr>
            </thead>
            <tbody>
              <ReportRowSkeleton />
              <ReportRowSkeleton />
              <ReportRowSkeleton />
              <ReportRowSkeleton />
              <ReportRowSkeleton />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
