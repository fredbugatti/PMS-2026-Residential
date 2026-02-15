'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import {
  Home,
  DollarSign,
  BookOpen,
  BarChart3,
  Receipt,
  FileText,
  Building2,
  ScrollText,
  Wrench,
  HardHat,
  FolderOpen,
  Settings,
  ShieldCheck,
  Sun,
  Monitor,
  Moon,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navigation = [
  { name: 'Dashboard', path: '/', icon: Home },
  { name: 'Properties', path: '/properties', icon: Building2 },
  { name: 'Leases', path: '/leases', icon: ScrollText },
  { name: 'Balances', path: '/accounting', icon: DollarSign },
  { name: 'Ledger', path: '/ledger', icon: BookOpen },
  { name: 'Expenses', path: '/expenses', icon: Receipt },
  { name: 'Bills Due', path: '/bills-due', icon: FileText },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Maintenance', path: '/maintenance', icon: Wrench },
  { name: 'Vendors', path: '/vendors', icon: HardHat },
  { name: 'Documents', path: '/documents', icon: FolderOpen },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Admin', path: '/admin', icon: ShieldCheck },
];

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const handleNavClick = () => {
    if (onClose) onClose();
  };

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
        flex flex-col h-full bg-slate-900 text-white w-64
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo/Brand */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <Link href="/" className="block" onClick={handleNavClick}>
              <h1 className="text-xl font-bold">Sanprinon</h1>
              <p className="text-xs text-slate-400 mt-1">Property Management</p>
            </Link>
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const active = item.path === '/'
              ? pathname === '/'
              : pathname === item.path || pathname.startsWith(item.path + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <div className="px-4 py-3 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Theme</span>
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded ${theme === 'light' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Light mode"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-1.5 rounded ${theme === 'system' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                title="System preference"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded ${theme === 'dark' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Dark mode"
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500">© 2026 Sanprinon PMS</p>
        </div>
      </div>
    </>
  );
}
