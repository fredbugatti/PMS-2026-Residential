'use client';

import Link from 'next/link';

const settingsLinks = [
  {
    title: 'Chart of Accounts',
    description: 'Manage accounting categories for income and expenses',
    href: '/settings/chart-of-accounts',
    icon: '📊',
    color: 'bg-blue-100 dark:bg-blue-900',
  },
  {
    title: 'Document Templates',
    description: 'Create and manage reusable document templates',
    href: '/settings/templates',
    icon: '📄',
    color: 'bg-green-100 dark:bg-green-900',
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Configure your property management system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg ${link.color} flex items-center justify-center text-2xl`}>
                {link.icon}
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {link.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {link.description}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
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
