'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { Image, FileText, Edit3, BarChart3, Paperclip, FolderOpen, Star, FileIcon } from 'lucide-react';

type TabType = 'library' | 'templates';

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  category: string | null;
  tags: string[];
  description: string | null;
  uploadedBy: string;
  isFavorite: boolean;
  createdAt: string;
  property?: { id: string; name: string } | null;
  lease?: { id: string; tenantName: string; unitName: string } | null;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  templateContent: string;
  mergeFields: string[];
  fileType: string;
  isSystem: boolean;
}

interface Property {
  id: string;
  name: string;
}

interface Lease {
  id: string;
  tenantName: string;
  unitName: string;
}

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [loading, setLoading] = useState(true);

  // Library state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    category: '',
    description: '',
    tags: '',
    propertyId: '',
    leaseId: ''
  });

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateCategory, setTemplateCategory] = useState('ALL');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    category: 'OTHER',
    templateContent: '',
    mergeFields: '',
    fileType: 'pdf'
  });

  // Drag state
  const [isDragging, setIsDragging] = useState(false);

  const categoryLabels: Record<string, string> = {
    LEASE_AGREEMENT: 'Lease Agreement',
    RECEIPT: 'Receipt',
    INVOICE: 'Invoice',
    MAINTENANCE_AUTHORIZATION: 'Maintenance',
    NOTICE_TO_VACATE: 'Notice to Vacate',
    RENT_INCREASE_NOTICE: 'Rent Increase',
    OTHER: 'Other'
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes, propsRes, leasesRes, templatesRes] = await Promise.all([
        fetch('/api/library'),
        fetch('/api/properties'),
        fetch('/api/leases'),
        fetch('/api/templates?activeOnly=true')
      ]);

      if (docsRes.ok) setDocuments(await docsRes.json());
      if (propsRes.ok) setProperties(await propsRes.json());
      if (leasesRes.ok) setLeases(await leasesRes.json());
      if (templatesRes.ok) setTemplates(await templatesRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string): ReactNode => {
    if (mimeType.startsWith('image/')) return <Image className="h-6 w-6 text-purple-600" />;
    if (mimeType.includes('pdf')) return <FileText className="h-6 w-6 text-red-600" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <Edit3 className="h-6 w-6 text-blue-600" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <BarChart3 className="h-6 w-6 text-green-600" />;
    return <Paperclip className="h-6 w-6 text-slate-500" />;
  };

  // File upload handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setUploadForm(prev => ({ ...prev, file: files[0] }));
      setShowUploadModal(true);
    }
  }, []);

  const handleUpload = async () => {
    if (!uploadForm.file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      if (uploadForm.category) formData.append('category', uploadForm.category);
      if (uploadForm.description) formData.append('description', uploadForm.description);
      if (uploadForm.tags) formData.append('tags', uploadForm.tags);
      if (uploadForm.propertyId) formData.append('propertyId', uploadForm.propertyId);
      if (uploadForm.leaseId) formData.append('leaseId', uploadForm.leaseId);
      formData.append('uploadedBy', 'Property Manager');

      const res = await fetch('/api/library', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to upload');

      await fetchData();
      setShowUploadModal(false);
      setUploadForm({ file: null, category: '', description: '', tags: '', propertyId: '', leaseId: '' });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!confirm(`Delete "${doc.fileName}"?`)) return;
    try {
      await fetch(`/api/library/${doc.id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const toggleFavorite = async (doc: Document) => {
    try {
      await fetch(`/api/library/${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !doc.isFavorite })
      });
      fetchData();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Template handlers
  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.templateContent) {
      alert('Name and content are required');
      return;
    }

    try {
      setUploading(true);
      const payload = {
        ...templateForm,
        mergeFields: templateForm.mergeFields.split(',').map(f => f.trim()).filter(f => f),
        createdBy: 'Property Manager'
      };

      const url = selectedTemplate ? `/api/templates/${selectedTemplate.id}` : '/api/templates';
      const method = selectedTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save template');

      await fetchData();
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      setTemplateForm({ name: '', description: '', category: 'OTHER', templateContent: '', mergeFields: '', fileType: 'pdf' });
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save template');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (template.isSystem) {
      alert('System templates cannot be deleted');
      return;
    }
    if (!confirm(`Delete "${template.name}"?`)) return;
    try {
      await fetch(`/api/templates/${template.id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const filteredDocuments = categoryFilter
    ? documents.filter(d => d.category === categoryFilter)
    : documents;

  const filteredTemplates = templateCategory === 'ALL'
    ? templates
    : templates.filter(t => t.category === templateCategory);

  const templateCategories = Array.from(new Set(templates.map(t => t.category)));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
              <p className="text-sm text-slate-600 mt-1">Manage files and templates</p>
            </div>
            <div className="flex gap-3">
              {activeTab === 'library' && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Upload Document
                </button>
              )}
              {activeTab === 'templates' && (
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setTemplateForm({ name: '', description: '', category: 'OTHER', templateContent: '', mergeFields: '', fileType: 'pdf' });
                    setShowTemplateModal(true);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  Create Template
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('library')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'library'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              My Documents ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Templates ({templates.length})
            </button>
          </div>
        </div>

        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <div className="mb-2"><FolderOpen className="h-10 w-10 text-slate-400" /></div>
              <p className="text-slate-600">Drag & drop files here, or click Upload</p>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">All Categories</option>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <span className="text-sm text-slate-500">{filteredDocuments.length} documents</span>
            </div>

            {/* Documents Grid */}
            {filteredDocuments.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="mb-3"><FolderOpen className="h-12 w-12 text-slate-400" /></div>
                <h3 className="text-lg font-semibold text-slate-900">No documents yet</h3>
                <p className="text-slate-600 mt-1">Upload your first document to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map(doc => (
                  <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getFileIcon(doc.mimeType)}</span>
                        <div className="min-w-0">
                          <h4 className="font-medium text-slate-900 truncate">{doc.fileName}</h4>
                          <p className="text-xs text-slate-500">{formatFileSize(doc.fileSize)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFavorite(doc)}
                        className={`text-xl ${doc.isFavorite ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-500'}`}
                      >
                        <Star className={doc.isFavorite ? "h-5 w-5 fill-yellow-500 text-yellow-500" : "h-5 w-5"} />
                      </button>
                    </div>

                    {doc.category && (
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded mb-2">
                        {categoryLabels[doc.category] || doc.category}
                      </span>
                    )}

                    {doc.description && (
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">{doc.description}</p>
                    )}

                    <div className="flex gap-2 mt-3">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm text-center hover:bg-blue-700"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTemplateCategory('ALL')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  templateCategory === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({templates.length})
              </button>
              {templateCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setTemplateCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    templateCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {categoryLabels[cat] || cat}
                </button>
              ))}
            </div>

            {/* Templates Grid */}
            {filteredTemplates.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="mb-3"><FileIcon className="h-12 w-12 text-slate-400" /></div>
                <h3 className="text-lg font-semibold text-slate-900">No templates</h3>
                <p className="text-slate-600 mt-1">Create your first template</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => (
                  <div key={template.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-slate-900">{template.name}</h4>
                        <p className="text-xs text-slate-500">{categoryLabels[template.category] || template.category}</p>
                      </div>
                      {template.isSystem && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">System</span>
                      )}
                    </div>

                    {template.description && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{template.description}</p>
                    )}

                    {template.mergeFields.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {template.mergeFields.slice(0, 3).map(f => (
                          <span key={f} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">{f}</span>
                        ))}
                        {template.mergeFields.length > 3 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">+{template.mergeFields.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <a
                        href={`/documents/generate?templateId=${template.id}`}
                        className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm text-center hover:bg-green-700"
                      >
                        Generate
                      </a>
                      {!template.isSystem && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedTemplate(template);
                              setTemplateForm({
                                name: template.name,
                                description: template.description || '',
                                category: template.category,
                                templateContent: template.templateContent,
                                mergeFields: template.mergeFields.join(', '),
                                fileType: template.fileType
                              });
                              setShowTemplateModal(true);
                            }}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-sm hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template)}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Upload Document</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">File</label>
                <input
                  type="file"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
                {uploadForm.file && (
                  <p className="text-sm text-slate-600 mt-1">{uploadForm.file.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select category...</option>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Property</label>
                <select
                  value={uploadForm.propertyId}
                  onChange={(e) => setUploadForm({ ...uploadForm, propertyId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">None</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lease</label>
                <select
                  value={uploadForm.leaseId}
                  onChange={(e) => setUploadForm({ ...uploadForm, leaseId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">None</option>
                  {leases.map(l => (
                    <option key={l.id} value={l.id}>{l.tenantName} - {l.unitName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadForm.file || uploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-slate-300"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {selectedTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content (HTML) *</label>
                <textarea
                  value={templateForm.templateContent}
                  onChange={(e) => setTemplateForm({ ...templateForm, templateContent: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm"
                  rows={10}
                  placeholder="<div>Use {{fieldName}} for merge fields</div>"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Merge Fields (comma-separated)</label>
                <input
                  type="text"
                  value={templateForm.mergeFields}
                  onChange={(e) => setTemplateForm({ ...templateForm, mergeFields: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="tenantName, propertyAddress, monthlyRent"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => { setShowTemplateModal(false); setSelectedTemplate(null); }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg disabled:bg-slate-300"
              >
                {uploading ? 'Saving...' : selectedTemplate ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
