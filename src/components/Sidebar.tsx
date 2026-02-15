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
import { cn } from '@/lib/utils';

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

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={cn(
        'fixed lg:static inset-y-0 left-0 z-50',
        'flex flex-col h-full bg-slate-900 text-white w-64',
        'transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <Link href="/" className="block" onClick={handleNavClick}>
              <h1 className="text-xl font-bold">Sanprinon</h1>
              <p className="text-xs text-slate-400 mt-1">Property Management</p>
            </Link>
            <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Theme</span>
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setTheme('light')}
                className={cn('p-1.5 rounded transition-colors', theme === 'light' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}
                title="Light mode"
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={cn('p-1.5 rounded transition-colors', theme === 'system' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}
                title="System"
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn('p-1.5 rounded transition-colors', theme === 'dark' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}
                title="Dark mode"
              >
                <Moon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500">&copy; 2026 Sanprinon PMS</p>
        </div>
      </div>
    </>
  );
}
