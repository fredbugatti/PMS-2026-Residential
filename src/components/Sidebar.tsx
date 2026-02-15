'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BarChart3,
  Receipt,
  Building2,
  ScrollText,
  Wrench,
  HardHat,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type NavItem = { name: string; path: string; icon: typeof Home } | 'divider';

const navigation: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: Home },
  { name: 'Properties', path: '/properties', icon: Building2 },
  { name: 'Leases', path: '/leases', icon: ScrollText },
  'divider',
  { name: 'Expenses', path: '/expenses', icon: Receipt },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  'divider',
  { name: 'Maintenance', path: '/maintenance', icon: Wrench },
  { name: 'Vendors', path: '/vendors', icon: HardHat },
  'divider',
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

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
          {navigation.map((item, index) => {
            if (item === 'divider') {
              return <div key={`div-${index}`} className="h-px bg-slate-800 my-3" />;
            }
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

        <div className="p-4 border-t border-slate-800 safe-bottom">
          <p className="text-xs text-slate-500">&copy; 2026 Sanprinon PMS</p>
        </div>
      </div>
    </>
  );
}
