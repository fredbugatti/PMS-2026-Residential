'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const isGroupActive = (paths: string[]) => {
    return paths.some(path => pathname.startsWith(path));
  };

  // Simplified navigation structure
  const mainNavItems = [
    { name: 'Dashboard', path: '/', icon: '📊' },
  ];

  const groupedNavItems = [
    {
      name: 'Money',
      icon: '💰',
      id: 'money',
      paths: ['/accounting', '/ledger', '/invoices', '/reports', '/expenses', '/bills-due'],
      items: [
        { name: 'Balances', path: '/accounting', icon: '💵' },
        { name: 'Invoices', path: '/invoices', icon: '📄' },
        { name: 'Ledger', path: '/ledger', icon: '📒' },
        { name: 'Reports', path: '/reports', icon: '📈' },
        { name: 'Expenses', path: '/expenses', icon: '💸' },
        { name: 'Bills Due', path: '/bills-due', icon: '📋' },
      ]
    },
    {
      name: 'Warehouse',
      icon: '🏭',
      id: 'warehouse',
      paths: ['/properties', '/leases'],
      items: [
        { name: 'Properties', path: '/properties', icon: '🏭' },
        { name: 'Leases', path: '/leases', icon: '📋' },
      ]
    },
    {
      name: 'Maintenance',
      icon: '🔧',
      id: 'maintenance',
      paths: ['/maintenance', '/vendors'],
      items: [
        { name: 'Work Orders', path: '/maintenance', icon: '🔧' },
        { name: 'Vendors', path: '/vendors', icon: '👷' },
      ]
    },
    {
      name: 'More',
      icon: '⚙️',
      id: 'more',
      paths: ['/documents', '/settings', '/admin'],
      items: [
        { name: 'Documents', path: '/documents', icon: '📁' },
        { name: 'Settings', path: '/settings', icon: '⚙️' },
        { name: 'Admin', path: '/admin', icon: '🛠️' },
      ]
    },
  ];

  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroup(expandedGroup === groupId ? null : groupId);
  };

  // Auto-expand active group
  const activeGroupId = groupedNavItems.find(g => isGroupActive(g.paths))?.id;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        flex flex-col h-full bg-gray-900 text-white w-64
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo/Brand */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3" onClick={handleNavClick}>
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">
                S
              </div>
              <div>
                <div className="font-bold text-lg">Sanprinon</div>
                <div className="text-xs text-gray-400">Warehouse Management</div>
              </div>
            </Link>
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {/* Dashboard - always visible */}
            {mainNavItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}

            {/* Grouped navigation */}
            {groupedNavItems.map((group) => {
              const isExpanded = expandedGroup === group.id || activeGroupId === group.id;
              const groupIsActive = isGroupActive(group.paths);

              return (
                <div key={group.id}>
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg transition-colors ${
                      groupIsActive
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{group.icon}</span>
                      <span className="font-medium">{group.name}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded items */}
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-4">
                      {group.items.map((item) => (
                        <Link
                          key={item.path}
                          href={item.path}
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                            isActive(item.path)
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span>{item.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Theme Toggle */}
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Theme</span>
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded ${theme === 'light' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                title="Light mode"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-1.5 rounded ${theme === 'system' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                title="System preference"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded ${theme === 'dark' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                title="Dark mode"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center font-medium">
              PM
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">Property Manager</div>
              <div className="text-xs text-gray-400">Admin</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
