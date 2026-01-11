'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  templateContent: string;
  mergeFields: string[];
  fileType: string;
}

interface Lease {
  id: string;
  tenantName: string;
  unitName: string;
  propertyName: string | null;
}

export default function GenerateDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');

  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [selectedLeaseId, setSelectedLeaseId] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [mergeData, setMergeData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Load template and leases
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
    loadLeases();
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/templates/${id}`);
      if (!response.ok) throw new Error('Failed to load template');
      const data = await response.json();
      setTemplate(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLeases = async () => {
    try {
      const response = await fetch('/api/leases');
      if (!response.ok) throw new Error('Failed to load leases');
      const data = await response.json();
      setLeases(data.filter((l: Lease) => l.id)); // Only active leases
    } catch (err: any) {
      console.error('Failed to load leases:', err);
    }
  };

  const handleGenerate = async () => {
    if (!selectedLeaseId || !template) {
      setError('Please select a lease');
      return;
    }

    try {
      setGenerating(true);
      setError('');

      const response = await fetch('/api/templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          leaseId: selectedLeaseId,
          mergeData: mergeData
        })
      });

      if (!response.ok) throw new Error('Failed to generate document');

      const data = await response.json();
      setGeneratedContent(data.content);
      setMergeData(data.mergeData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template?.name || 'document'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading template...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Template Not Found</h2>
            <p className="text-gray-600 mb-6">The requested template could not be found.</p>
            <button
              onClick={() => router.push('/documents')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Templates
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Generate Document</h1>
              <p className="text-gray-600">
                Template: <span className="font-semibold">{template.name}</span>
              </p>
            </div>
            <button
              onClick={() => router.push('/documents')}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Templates
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Configuration */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Configuration</h2>

              {/* Template Info */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-blue-700">{template.description}</p>
                )}
              </div>

              {/* Lease Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Lease
                </label>
                <select
                  value={selectedLeaseId}
                  onChange={(e) => setSelectedLeaseId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a lease...</option>
                  {leases.map(lease => (
                    <option key={lease.id} value={lease.id}>
                      {lease.tenantName} - {lease.unitName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!selectedLeaseId || generating}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  !selectedLeaseId || generating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {generating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  'Generate Document'
                )}
              </button>

              {/* Merge Fields Info */}
              {template.mergeFields.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Available Merge Fields</h3>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {template.mergeFields.map(field => (
                      <div
                        key={field}
                        className="px-3 py-2 bg-gray-50 rounded text-sm text-gray-700 border border-gray-200"
                      >
                        {`{{${field}}}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Preview Header */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Document Preview</h2>
                  {generatedContent && (
                    <div className="flex gap-2">
                      <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        🖨️ Print
                      </button>
                      <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        💾 Download
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Content */}
              <div className="p-8 min-h-[600px]">
                {generatedContent ? (
                  <div
                    className="prose max-w-none print:text-black"
                    dangerouslySetInnerHTML={{ __html: generatedContent }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-20">
                    <div className="text-6xl mb-4">📄</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Document Generated</h3>
                    <p className="text-gray-600">
                      Select a lease and click "Generate Document" to preview the document.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .prose, .prose * {
            visibility: visible;
          }
          .prose {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
