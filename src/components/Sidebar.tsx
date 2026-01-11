'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Properties', path: '/properties', icon: '🏢' },
    { name: 'Leases', path: '/leases', icon: '📄' },
    { name: 'Maintenance', path: '/maintenance', icon: '🔧' },
    { name: 'Vendors', path: '/vendors', icon: '👷' },
    { name: 'Accounting', path: '/accounting', icon: '💰' },
    { name: 'Reports', path: '/reports', icon: '📈' },
    { name: 'Documents', path: '/documents', icon: '📁' },
    { name: 'Admin', path: '/admin', icon: '⚙️' },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">
            S
          </div>
          <div>
            <div className="font-bold text-lg">Sanprinon</div>
            <div className="text-xs text-gray-400">Property Management</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
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
        </div>
      </nav>

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
  );
}
