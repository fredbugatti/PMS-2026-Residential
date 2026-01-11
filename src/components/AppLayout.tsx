'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  // Tenant portal pages should NOT show sidebar/breadcrumbs
  const isTenantPortal = pathname.startsWith('/tenant/');

  // For tenant portal, render children without admin layout
  if (isTenantPortal) {
    return <>{children}</>;
  }

  // Generate breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);

    const breadcrumbs = [{ name: 'Dashboard', path: '/' }];

    let currentPath = '';
    paths.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Skip IDs in breadcrumbs
      if (segment.match(/^[a-f0-9-]{36}$/i)) return;

      // Format segment name
      let name = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Special cases
      if (segment === 'workflow') name = 'Workflow';

      breadcrumbs.push({ name, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb Header */}
        {pathname !== '/' && (
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <nav className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="flex items-center">
                  {index > 0 && (
                    <svg
                      className="w-4 h-4 mx-2 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-gray-900 font-medium">{crumb.name}</span>
                  ) : (
                    <Link
                      href={crumb.path}
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {crumb.name}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
