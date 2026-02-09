'use client';

import { useState } from 'react';

export default function MigratePage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/migrate');
      const data = await res.json();
      setStatus(data);
    } catch (error: any) {
      setStatus({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('Are you sure you want to run the database migration?')) {
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/migrate', {
        method: 'POST'
      });
      const data = await res.json();
      setResult(data);

      // Refresh status after migration
      if (data.success) {
        setTimeout(checkStatus, 1000);
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Database Migration
          </h1>
          <p className="text-gray-600 mb-8">
            This page allows you to apply the Payment and InvoiceSequence tables migration.
          </p>

          {/* Status Check */}
          <div className="mb-8">
            <button
              onClick={checkStatus}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Checking...' : 'Check Migration Status'}
            </button>

            {status && (
              <div className={`mt-4 p-4 rounded-lg ${
                status.success
                  ? (status.migrationApplied ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200')
                  : 'bg-red-50 border border-red-200'
              }`}>
                <h3 className="font-bold mb-2">
                  {status.success ? 'Status Check Complete' : 'Error'}
                </h3>
                {status.success ? (
                  <div>
                    <p className="text-sm mb-2">
                      <strong>Migration Applied:</strong> {status.migrationApplied ? '✅ Yes' : '❌ No'}
                    </p>
                    <p className="text-sm mb-1"><strong>Tables:</strong></p>
                    <ul className="text-sm ml-4">
                      <li>invoice_sequence: {status.tables?.invoice_sequence ? '✅' : '❌'}</li>
                      <li>payments: {status.tables?.payments ? '✅' : '❌'}</li>
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-red-700">{status.error}</p>
                )}
              </div>
            )}
          </div>

          {/* Run Migration */}
          <div className="mb-8">
            <button
              onClick={runMigration}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Running...' : 'Run Migration'}
            </button>

            {result && (
              <div className={`mt-4 p-4 rounded-lg ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <h3 className="font-bold mb-2">
                  {result.success ? '✅ Success!' : '❌ Error'}
                </h3>
                <p className="text-sm mb-2">{result.message}</p>
                {result.alreadyApplied && (
                  <p className="text-sm text-gray-600">
                    Migration was already applied. No changes needed.
                  </p>
                )}
                {result.tablesCreated && (
                  <div className="text-sm">
                    <p className="font-semibold mb-1">Tables created:</p>
                    <ul className="ml-4">
                      {result.tablesCreated.map((table: string) => (
                        <li key={table}>• {table}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.error && (
                  <div className="text-sm text-red-700">
                    <p><strong>Error:</strong> {result.error}</p>
                    {result.hint && <p className="mt-2"><strong>Hint:</strong> {result.hint}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-900 mb-2">Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1 ml-4">
              <li>1. Click "Check Migration Status" to see if tables exist</li>
              <li>2. If migration not applied, click "Run Migration"</li>
              <li>3. Wait for success message</li>
              <li>4. Go back to dashboard - error should be gone!</li>
            </ol>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <a
              href="/"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
