'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Image, FileText, Edit3, BarChart3, Video, Paperclip, ClipboardList, Upload, FolderOpen, Star, Building2, Trash2 } from 'lucide-react';

interface DocumentLibraryItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  category: string | null;
  tags: string[];
  description: string | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  property: { id: string; name: string } | null;
  lease: { id: string; tenantName: string; unitName: string } | null;
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

export default function DocumentLibraryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentLibraryItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentLibraryItem | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    category: '',
    description: '',
    tags: '',
    propertyId: '',
    leaseId: ''
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    category: '',
    description: '',
    tags: '',
    propertyId: '',
    leaseId: '',
    isFavorite: false
  });

  // Category labels
  const categoryLabels: Record<string, string> = {
    LEASE_AGREEMENT: 'Lease Agreements',
    LEASE_AMENDMENT: 'Lease Amendments',
    NOTICE_TO_VACATE: 'Notice to Vacate',
    RENT_INCREASE_NOTICE: 'Rent Increase Notices',
    LEASE_RENEWAL: 'Lease Renewals',
    MOVE_IN_CHECKLIST: 'Move-In Checklists',
    MOVE_OUT_CHECKLIST: 'Move-Out Checklists',
    RECEIPT: 'Receipts',
    INVOICE: 'Invoices',
    VIOLATION_NOTICE: 'Violation Notices',
    LATE_RENT_NOTICE: 'Late Rent Notices',
    THREE_DAY_NOTICE: '3-Day Notices',
    EVICTION_NOTICE: 'Eviction Notices',
    MAINTENANCE_AUTHORIZATION: 'Maintenance Authorization',
    PET_ADDENDUM: 'Pet Addendums',
    PARKING_AGREEMENT: 'Parking Agreements',
    OTHER: 'Other Documents'
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedTag]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'ALL') {
        params.append('category', selectedCategory);
      }
      if (selectedTag) {
        params.append('tag', selectedTag);
      }

      const [docsRes, tagsRes, propsRes, leasesRes] = await Promise.all([
        fetch(`/api/library?${params}`),
        fetch('/api/library/tags'),
        fetch('/api/properties'),
        fetch('/api/leases')
      ]);

      const [docsData, tagsData, propsData, leasesData] = await Promise.all([
        docsRes.json(),
        tagsRes.json(),
        propsRes.json(),
        leasesRes.json()
      ]);

      setDocuments(docsData);
      setAllTags(tagsData);
      setProperties(propsData);
      setLeases(leasesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadForm({ ...uploadForm, file: e.dataTransfer.files[0] });
      setShowUploadModal(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm({ ...uploadForm, file: e.target.files[0] });
      setShowUploadModal(true);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) {
      setError('Please select a file');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', uploadForm.file);
      if (uploadForm.category) formData.append('category', uploadForm.category);
      if (uploadForm.description) formData.append('description', uploadForm.description);
      if (uploadForm.tags) formData.append('tags', uploadForm.tags);
      if (uploadForm.propertyId) formData.append('propertyId', uploadForm.propertyId);
      if (uploadForm.leaseId) formData.append('leaseId', uploadForm.leaseId);
      formData.append('uploadedBy', 'Property Manager');

      const response = await fetch('/api/library', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload document');
      }

      await loadData();
      setShowUploadModal(false);
      setUploadForm({
        file: null,
        category: '',
        description: '',
        tags: '',
        propertyId: '',
        leaseId: ''
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (doc: DocumentLibraryItem) => {
    setSelectedDocument(doc);
    setEditForm({
      category: doc.category || '',
      description: doc.description || '',
      tags: doc.tags.join(', '),
      propertyId: doc.property?.id || '',
      leaseId: doc.lease?.id || '',
      isFavorite: doc.isFavorite
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedDocument) return;

    try {
      setUploading(true);
      setError('');

      const tagsArray = editForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      const response = await fetch(`/api/library/${selectedDocument.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: editForm.category || null,
          description: editForm.description || null,
          tags: tagsArray,
          propertyId: editForm.propertyId || null,
          leaseId: editForm.leaseId || null,
          isFavorite: editForm.isFavorite
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update document');
      }

      await loadData();
      setShowEditModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: DocumentLibraryItem) => {
    if (!confirm(`Are you sure you want to delete "${doc.fileName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/library/${doc.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete document');
      }

      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleFavorite = async (doc: DocumentLibraryItem) => {
    try {
      await fetch(`/api/library/${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !doc.isFavorite })
      });
      await loadData();
    } catch (err: any) {
      setError(err.message);
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
    if (mimeType.startsWith('image/')) return <Image className="h-8 w-8 text-purple-600" />;
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-600" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <Edit3 className="h-8 w-8 text-blue-600" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <BarChart3 className="h-8 w-8 text-green-600" />;
    if (mimeType.includes('video')) return <Video className="h-8 w-8 text-pink-600" />;
    return <Paperclip className="h-8 w-8 text-slate-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading documents...</p>
            </div>
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
              <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-2">Document Library</h1>
              <p className="text-slate-600">
                Upload, organize, and manage your property management documents
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/documents')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Templates
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="text-3xl font-bold">{documents.length}</div>
              <div className="text-blue-100 mt-1">Total Documents</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="text-3xl font-bold">{allTags.length}</div>
              <div className="text-purple-100 mt-1">Unique Tags</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="text-3xl font-bold">{documents.filter(d => d.isFavorite).length}</div>
              <div className="text-green-100 mt-1">Favorites</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <div className="text-3xl font-bold">
                {formatFileSize(documents.reduce((acc, d) => acc + d.fileSize, 0))}
              </div>
              <div className="text-orange-100 mt-1">Total Size</div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Upload Drag & Drop Zone */}
        <div
          className={`mb-6 border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 bg-white hover:border-blue-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="mb-4"><Upload className="h-14 w-14 text-slate-400" /></div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Drag & Drop Files Here
          </h3>
          <p className="text-slate-600 mb-4">
            or click the button below to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Choose File
          </button>
          <p className="text-sm text-slate-500 mt-4">
            Maximum file size: 50MB
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Filters</h3>

          {/* Category Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({documents.length})
              </button>
              {Object.entries(categoryLabels).map(([key, label]) => {
                const count = documents.filter(d => d.category === key).length;
                if (count === 0) return null;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedCategory === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTag('')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedTag === ''
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Tags
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedTag === tag
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="mb-4"><FolderOpen className="h-14 w-14 text-slate-400" /></div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Documents Found</h3>
            <p className="text-slate-600">
              Upload your first document using the drag & drop zone above
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden border border-slate-200"
              >
                <div className="p-6">
                  {/* Document Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="mb-2">{getFileIcon(doc.mimeType)}</div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1 break-words">{doc.fileName}</h3>
                      <div className="text-sm text-slate-600">{formatFileSize(doc.fileSize)}</div>
                    </div>
                    <button
                      onClick={() => toggleFavorite(doc)}
                      className={`text-2xl ${doc.isFavorite ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-500'} transition-colors`}
                    >
                      <Star className={doc.isFavorite ? "h-5 w-5 fill-yellow-500 text-yellow-500" : "h-5 w-5"} />
                    </button>
                  </div>

                  {/* Category & Tags */}
                  <div className="mb-4">
                    {doc.category && (
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded mr-2 mb-2">
                        {categoryLabels[doc.category]}
                      </span>
                    )}
                    {doc.tags.map(tag => (
                      <span key={tag} className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded mr-2 mb-2">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Description */}
                  {doc.description && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  {/* Associations */}
                  {(doc.property || doc.lease) && (
                    <div className="mb-4 text-sm text-slate-600">
                      {doc.property && (
                        <div className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {doc.property.name}</div>
                      )}
                      {doc.lease && (
                        <div className="flex items-center gap-1"><FileText className="h-4 w-4" /> {doc.lease.tenantName} - {doc.lease.unitName}</div>
                      )}
                    </div>
                  )}

                  {/* Upload Info */}
                  <div className="text-xs text-slate-500 mb-4">
                    Uploaded by {doc.uploadedBy} on {new Date(doc.createdAt).toLocaleDateString()}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleEdit(doc)}
                      className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Upload Document</h2>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="text-slate-500 hover:text-slate-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="space-y-4">
                  {/* File Info */}
                  {uploadForm.file && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="font-medium text-slate-900">{uploadForm.file.name}</div>
                      <div className="text-sm text-slate-600">{formatFileSize(uploadForm.file.size)}</div>
                    </div>
                  )}

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Category (Optional)
                    </label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a category...</option>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Brief description of this document"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Tags (Optional, comma-separated)
                    </label>
                    <input
                      type="text"
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="important, reviewed, 2024"
                    />
                  </div>

                  {/* Property */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Associate with Property (Optional)
                    </label>
                    <select
                      value={uploadForm.propertyId}
                      onChange={(e) => setUploadForm({ ...uploadForm, propertyId: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">None</option>
                      {properties.map(prop => (
                        <option key={prop.id} value={prop.id}>{prop.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Lease */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Associate with Lease (Optional)
                    </label>
                    <select
                      value={uploadForm.leaseId}
                      onChange={(e) => setUploadForm({ ...uploadForm, leaseId: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">None</option>
                      {leases.map(lease => (
                        <option key={lease.id} value={lease.id}>
                          {lease.tenantName} - {lease.unitName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    uploading
                      ? 'bg-slate-400 text-white cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Edit Document</h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-slate-500 hover:text-slate-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="font-medium text-slate-900">{selectedDocument.fileName}</div>
                    <div className="text-sm text-slate-600">{formatFileSize(selectedDocument.fileSize)}</div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Category
                    </label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No category</option>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Brief description of this document"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={editForm.tags}
                      onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="important, reviewed, 2024"
                    />
                  </div>

                  {/* Property */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Property
                    </label>
                    <select
                      value={editForm.propertyId}
                      onChange={(e) => setEditForm({ ...editForm, propertyId: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">None</option>
                      {properties.map(prop => (
                        <option key={prop.id} value={prop.id}>{prop.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Lease */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Lease
                    </label>
                    <select
                      value={editForm.leaseId}
                      onChange={(e) => setEditForm({ ...editForm, leaseId: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">None</option>
                      {leases.map(lease => (
                        <option key={lease.id} value={lease.id}>
                          {lease.tenantName} - {lease.unitName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Favorite Toggle */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editForm.isFavorite}
                      onChange={(e) => setEditForm({ ...editForm, isFavorite: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-slate-700">
                      Mark as Favorite
                    </label>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={uploading}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    uploading
                      ? 'bg-slate-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {uploading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
