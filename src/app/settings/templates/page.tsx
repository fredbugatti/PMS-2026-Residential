'use client';

import { useState, useEffect } from 'react';

interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  templateContent: string;
  mergeFields: string[];
  fileType: string;
  active: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: 'LEASE_AGREEMENT', label: 'Lease Agreement' },
  { value: 'LEASE_AMENDMENT', label: 'Lease Amendment' },
  { value: 'NOTICE_TO_VACATE', label: 'Notice to Vacate' },
  { value: 'RENT_INCREASE_NOTICE', label: 'Rent Increase Notice' },
  { value: 'LEASE_RENEWAL', label: 'Lease Renewal' },
  { value: 'MOVE_IN_CHECKLIST', label: 'Move-In Checklist' },
  { value: 'MOVE_OUT_CHECKLIST', label: 'Move-Out Checklist' },
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'VIOLATION_NOTICE', label: 'Violation Notice' },
  { value: 'LATE_RENT_NOTICE', label: 'Late Rent Notice' },
  { value: 'THREE_DAY_NOTICE', label: '3-Day Notice' },
  { value: 'EVICTION_NOTICE', label: 'Eviction Notice' },
  { value: 'MAINTENANCE_AUTHORIZATION', label: 'Maintenance Authorization' },
  { value: 'PET_ADDENDUM', label: 'Pet Addendum' },
  { value: 'PARKING_AGREEMENT', label: 'Parking Agreement' },
  { value: 'OTHER', label: 'Other' },
];

const MERGE_FIELDS = [
  { field: '{{tenantName}}', description: 'Tenant full name' },
  { field: '{{tenantEmail}}', description: 'Tenant email address' },
  { field: '{{tenantPhone}}', description: 'Tenant phone number' },
  { field: '{{propertyName}}', description: 'Property name' },
  { field: '{{propertyAddress}}', description: 'Full property address' },
  { field: '{{unitNumber}}', description: 'Unit number' },
  { field: '{{rentAmount}}', description: 'Monthly rent amount' },
  { field: '{{leaseStartDate}}', description: 'Lease start date' },
  { field: '{{leaseEndDate}}', description: 'Lease end date' },
  { field: '{{securityDeposit}}', description: 'Security deposit amount' },
  { field: '{{currentDate}}', description: 'Today\'s date' },
  { field: '{{balanceDue}}', description: 'Current balance due' },
  { field: '{{lateFeeAmount}}', description: 'Late fee amount' },
  { field: '{{companyName}}', description: 'Property management company' },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [showMergeFields, setShowMergeFields] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'OTHER' as string,
    templateContent: '',
    active: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Extract merge fields from content
      const mergeFieldRegex = /\{\{(\w+)\}\}/g;
      const matches = formData.templateContent.match(mergeFieldRegex) || [];
      const mergeFields = [...new Set(matches)];

      const url = editingTemplate
        ? `/api/templates/${editingTemplate.id}`
        : '/api/templates';

      const res = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          mergeFields,
          createdBy: 'system',
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save template');
      }

      await fetchTemplates();
      closeModal();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template: DocumentTemplate) => {
    if (template.isSystem) {
      alert('Cannot delete system templates');
      return;
    }

    if (!confirm(`Delete template "${template.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleToggleActive = async (template: DocumentTemplate) => {
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: !template.active,
        }),
      });

      if (res.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to toggle template:', error);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      category: 'OTHER',
      templateContent: '',
      active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      templateContent: template.templateContent,
      active: template.active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setShowMergeFields(false);
  };

  const insertMergeField = (field: string) => {
    setFormData(prev => ({
      ...prev,
      templateContent: prev.templateContent + field,
    }));
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const getCategoryColor = (category: string) => {
    if (category.includes('NOTICE') || category.includes('EVICTION')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
    if (category.includes('LEASE')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
    if (category.includes('CHECKLIST')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
  };

  const filteredTemplates = filter === 'all'
    ? templates
    : templates.filter(t => t.category === filter);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Document Templates</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create and manage reusable document templates with merge fields
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Add Template
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          <option value="all">All Categories ({templates.length})</option>
          {CATEGORIES.map(cat => {
            const count = templates.filter(t => t.category === cat.value).length;
            return count > 0 ? (
              <option key={cat.value} value={cat.value}>
                {cat.label} ({count})
              </option>
            ) : null;
          })}
        </select>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 ${
              !template.active ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(template.category)}`}>
                {getCategoryLabel(template.category)}
              </span>
              {template.isSystem && (
                <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  System
                </span>
              )}
            </div>

            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{template.name}</h3>
            {template.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                {template.description}
              </p>
            )}

            <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {template.mergeFields.length} merge fields
              {!template.active && <span className="ml-2 text-red-500">(Inactive)</span>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openEditModal(template)}
                className="flex-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
              >
                Edit
              </button>
              {!template.isSystem && (
                <>
                  <button
                    onClick={() => handleToggleActive(template)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors border ${
                      template.active
                        ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                        : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-800'
                    }`}
                  >
                    {template.active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400">No templates found</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create your first template
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h3>
              <button
                onClick={() => setShowMergeFields(!showMergeFields)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showMergeFields ? 'Hide' : 'Show'} Merge Fields
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Standard Lease Agreement"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this template"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Merge Fields Panel */}
                {showMergeFields && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Available Merge Fields (click to insert)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {MERGE_FIELDS.map(({ field, description }) => (
                        <button
                          key={field}
                          type="button"
                          onClick={() => insertMergeField(field)}
                          className="px-2 py-1 text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                          title={description}
                        >
                          {field}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Template Content (HTML)
                  </label>
                  <textarea
                    value={formData.templateContent}
                    onChange={(e) => setFormData({ ...formData, templateContent: e.target.value })}
                    placeholder="Enter your template content with merge fields like {{tenantName}}..."
                    rows={12}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm"
                    required
                  />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="active" className="text-sm text-slate-700 dark:text-slate-300">
                    Active
                  </label>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || (editingTemplate?.isSystem && !formData.active)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
