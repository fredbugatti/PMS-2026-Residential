'use client';

import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { GlobalSearch, useGlobalSearch } from './GlobalSearch';
import { Menu, Search, User, ChevronRight } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const search = useGlobalSearch();

  const isTenantPortal = pathname.startsWith('/tenant/');
  if (isTenantPortal) {
    return <>{children}</>;
  }

  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Dashboard', path: '/' }];
    let currentPath = '';
    paths.forEach((segment) => {
      currentPath += `/${segment}`;
      if (segment.match(/^[a-f0-9-]{36}$/i)) return;
      let name = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      if (segment === 'workflow') name = 'Workflow';
      breadcrumbs.push({ name, path: currentPath });
    });
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-50">
      <aside className="hidden lg:flex w-64 shrink-0 border-r bg-slate-900 border-slate-800">
        <Sidebar isOpen={true} />
      </aside>

      <div className="lg:hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur px-4 h-16 flex items-center gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </button>

          <div className="flex-1 max-w-md">
            <button
              onClick={search.open}
              className="w-full flex items-center gap-2 px-3 h-9 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400 hover:border-slate-300 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>Search tenants, properties...</span>
              <kbd className="hidden sm:inline-flex ml-auto text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-900">Property Manager</p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <User className="h-5 w-5 text-white" />
            </div>
          </div>
        </header>

        {pathname !== '/' && (
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5">
            <nav className="flex items-center space-x-1 text-xs sm:text-sm overflow-x-auto">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="flex items-center flex-shrink-0">
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 mx-1 text-slate-400" />
                  )}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-slate-900 font-medium">{crumb.name}</span>
                  ) : (
                    <Link
                      href={crumb.path}
                      className="text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      {crumb.name}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto min-h-0 bg-slate-50">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <GlobalSearch isOpen={search.isOpen} onClose={search.close} />
    </div>
  );
}
