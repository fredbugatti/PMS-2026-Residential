'use client';

import Link from 'next/link';
import { BarChart3, FileText, ShieldCheck } from 'lucide-react';
import { ReactNode } from 'react';

const settingsLinks: { title: string; description: string; href: string; icon: ReactNode; color: string }[] = [
  {
    title: 'Chart of Accounts',
    description: 'Manage accounting categories for income and expenses',
    href: '/settings/chart-of-accounts',
    icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
    color: 'bg-blue-100',
  },
  {
    title: 'Document Templates',
    description: 'Create and manage reusable document templates',
    href: '/settings/templates',
    icon: <FileText className="h-6 w-6 text-green-600" />,
    color: 'bg-green-100',
  },
  {
    title: 'Admin',
    description: 'System administration, cron jobs, and database tools',
    href: '/admin',
    icon: <ShieldCheck className="h-6 w-6 text-slate-600" />,
    color: 'bg-slate-100',
  },
];

export default function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600 mt-1">
          Configure your property management system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-colors group"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg ${link.color} flex items-center justify-center`}>
                {link.icon}
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {link.title}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {link.description}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
