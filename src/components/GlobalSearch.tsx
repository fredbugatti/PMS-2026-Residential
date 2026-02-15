'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, DollarSign, FileText, User, Wrench, TrendingUp } from 'lucide-react';

interface SearchResult {
  type: 'tenant' | 'property' | 'transaction' | 'workorder';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const iconMap: Record<string, typeof User> = {
  user: User,
  building: Building2,
  dollar: DollarSign,
  document: FileText,
  wrench: Wrench,
};

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // This would need to be handled by parent
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].href);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, selectedIndex, router, onClose]);

  const handleResultClick = (result: SearchResult) => {
    router.push(result.href);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-end sm:items-start justify-center pt-0 sm:pt-[12vh] px-0 sm:px-4">
        <div className="relative w-full max-w-xl bg-white rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center border-b border-slate-200">
            <div className="pl-4 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tenants, warehouses, transactions..."
              className="flex-1 px-4 py-4 text-base bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            {loading && (
              <div className="pr-4">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 mr-2 text-xs text-slate-500 bg-slate-100 rounded"
            >
              ESC
            </button>
          </div>

          {/* Results */}
          {/* Drag handle for mobile */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>

          <div className="max-h-[70vh] sm:max-h-[60vh] overflow-y-auto">
            {query && !loading && results.length === 0 && (
              <div className="px-4 py-8 text-center text-slate-500">
                <p className="text-sm">No results found for &quot;{query}&quot;</p>
                <p className="text-xs mt-1">Try searching for a tenant name, warehouse, or transaction</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex-shrink-0 text-slate-500">
                      {(() => {
                        const IconComponent = iconMap[result.icon];
                        return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
                      })()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {result.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {result.subtitle}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      result.type === 'tenant' ? 'bg-green-100 text-green-700' :
                      result.type === 'property' ? 'bg-blue-100 text-blue-700' :
                      result.type === 'transaction' ? 'bg-purple-100 text-purple-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {result.type}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Actions when no query */}
            {!query && (
              <div className="p-4">
                <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">Quick Actions</p>
                <div className="space-y-1">
                  <button
                    onClick={() => { router.push('/properties'); onClose(); }}
                    className="w-full px-3 py-3 sm:py-2 flex items-center gap-3 text-left rounded-lg hover:bg-slate-50"
                  >
                    <Building2 className="h-5 w-5 text-slate-500" />
                    <span className="text-sm text-slate-700">View Warehouses</span>
                  </button>
                  <button
                    onClick={() => { router.push('/leases'); onClose(); }}
                    className="w-full px-3 py-3 sm:py-2 flex items-center gap-3 text-left rounded-lg hover:bg-slate-50"
                  >
                    <FileText className="h-5 w-5 text-slate-500" />
                    <span className="text-sm text-slate-700">View Leases</span>
                  </button>
                  <button
                    onClick={() => { router.push('/maintenance'); onClose(); }}
                    className="w-full px-3 py-3 sm:py-2 flex items-center gap-3 text-left rounded-lg hover:bg-slate-50"
                  >
                    <Wrench className="h-5 w-5 text-slate-500" />
                    <span className="text-sm text-slate-700">View Maintenance</span>
                  </button>
                  <button
                    onClick={() => { router.push('/reports'); onClose(); }}
                    className="w-full px-3 py-3 sm:py-2 flex items-center gap-3 text-left rounded-lg hover:bg-slate-50"
                  >
                    <TrendingUp className="h-5 w-5 text-slate-500" />
                    <span className="text-sm text-slate-700">View Reports</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-4 py-2 hidden sm:flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">esc</kbd>
              close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to manage search state
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  };
}
