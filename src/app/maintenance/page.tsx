'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MaintenancePageSkeleton } from '@/components/Skeleton';

interface WorkOrderUpdate {
  id: string;
  createdAt: string;
  status: string;
  note: string;
  updatedBy: string;
}

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  paymentStatus: string;
  reportedBy: string;
  reportedEmail: string | null;
  actualCost: number | null;
  estimatedCost: number | null;
  paidBy: string | null;
  invoiceNumber: string | null;
  paidDate: string | null;
  scheduledDate: string | null;
  completedDate: string | null;
  photos: string[];
  internalNotes: string | null;
  vendor: { id: string; name: string; company: string | null } | null;
  createdAt: string;
  updatedAt: string;
  property: { id: string; name: string };
  unit: { id: string; unitNumber: string } | null;
  lease: { id: string; tenantName: string } | null;
  updates?: WorkOrderUpdate[];
}

interface Vendor {
  id: string;
  name: string;
  company: string | null;
}

interface Property {
  id: string;
  name: string;
  units: { id: string; unitNumber: string }[];
}

function MaintenanceContent() {
  const searchParams = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [editingCost, setEditingCost] = useState<string | null>(null);
  const [costForm, setCostForm] = useState({ actualCost: '', paidBy: 'OWNER' });

  // Create work order modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    propertyId: '',
    unitId: '',
    reportedBy: 'Property Manager'
  });
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Photo viewer modal
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Detail/Edit modal
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<WorkOrder>>({});
  const [newUpdateNote, setNewUpdateNote] = useState('');
  const [addingUpdate, setAddingUpdate] = useState(false);

  // Quick vendor creation
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    specialties: [] as string[]
  });
  const [creatingVendor, setCreatingVendor] = useState(false);

  const openPhotoViewer = (photos: string[], startIndex: number = 0) => {
    setViewerPhotos(photos);
    setCurrentPhotoIndex(startIndex);
    setPhotoViewerOpen(true);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % viewerPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + viewerPhotos.length) % viewerPhotos.length);
  };

  // Keyboard navigation for photo viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!photoViewerOpen) return;
      if (e.key === 'Escape') setPhotoViewerOpen(false);
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photoViewerOpen, viewerPhotos.length]);

  useEffect(() => {
    fetchData();
  }, []);

  // Handle URL parameter to auto-open work order detail
  useEffect(() => {
    const workOrderId = searchParams.get('workOrder');
    if (workOrderId && workOrders.length > 0 && !showDetailModal) {
      const wo = workOrders.find(w => w.id === workOrderId);
      if (wo) {
        openDetailModal(wo);
      } else {
        // Work order might be cancelled/not in list, fetch directly
        fetch(`/api/work-orders/${workOrderId}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              setSelectedWorkOrder(data);
              setEditForm(data);
              setShowDetailModal(true);
              setIsEditing(false);
              setNewUpdateNote('');
            }
          })
          .catch(console.error);
      }
    }
  }, [searchParams, workOrders, showDetailModal]);

  const fetchData = async () => {
    try {
      const [woRes, vendorRes, propRes] = await Promise.all([
        fetch('/api/work-orders'),
        fetch('/api/vendors?active=true'),
        fetch('/api/properties?includeUnits=true')
      ]);

      if (woRes.ok) {
        const data = await woRes.json();
        setWorkOrders(data.filter((wo: WorkOrder) => wo.status !== 'CANCELLED'));
      }
      if (vendorRes.ok) setVendors(await vendorRes.json());
      if (propRes.ok) setProperties(await propRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateWorkOrder = async (id: string, updates: any) => {
    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchData();
      return true;
    } catch (error) {
      console.error('Update failed:', error);
      alert('Update failed');
      return false;
    }
  };

  const openDetailModal = async (wo: WorkOrder) => {
    // Fetch work order with updates
    try {
      const res = await fetch(`/api/work-orders/${wo.id}`);
      if (res.ok) {
        const fullWo = await res.json();
        setSelectedWorkOrder(fullWo);
        setEditForm(fullWo);
      } else {
        setSelectedWorkOrder(wo);
        setEditForm(wo);
      }
    } catch {
      setSelectedWorkOrder(wo);
      setEditForm(wo);
    }
    setShowDetailModal(true);
    setIsEditing(false);
    setNewUpdateNote('');
  };

  const handleSaveEdit = async () => {
    if (!selectedWorkOrder) return;
    const success = await updateWorkOrder(selectedWorkOrder.id, {
      title: editForm.title,
      description: editForm.description,
      category: editForm.category,
      priority: editForm.priority,
      internalNotes: editForm.internalNotes,
      estimatedCost: editForm.estimatedCost,
      scheduledDate: editForm.scheduledDate
    });
    if (success) {
      setIsEditing(false);
      // Refresh the selected work order
      const res = await fetch(`/api/work-orders/${selectedWorkOrder.id}`);
      if (res.ok) {
        const updated = await res.json();
        setSelectedWorkOrder(updated);
        setEditForm(updated);
      }
    }
  };

  const handleDeleteWorkOrder = async () => {
    if (!selectedWorkOrder) return;
    if (!confirm(`Are you sure you want to delete work order "${selectedWorkOrder.title}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/work-orders/${selectedWorkOrder.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchData();
      setShowDetailModal(false);
      setSelectedWorkOrder(null);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete work order');
    }
  };

  const handleAddUpdate = async () => {
    if (!selectedWorkOrder || !newUpdateNote.trim()) return;
    setAddingUpdate(true);
    try {
      const res = await fetch(`/api/work-orders/${selectedWorkOrder.id}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: newUpdateNote,
          status: selectedWorkOrder.status,
          updatedBy: 'Property Manager'
        })
      });
      if (!res.ok) throw new Error('Failed to add update');

      // Refresh work order data
      const woRes = await fetch(`/api/work-orders/${selectedWorkOrder.id}`);
      if (woRes.ok) {
        const updated = await woRes.json();
        setSelectedWorkOrder(updated);
      }
      setNewUpdateNote('');
    } catch (error) {
      console.error('Failed to add update:', error);
      alert('Failed to add update');
    } finally {
      setAddingUpdate(false);
    }
  };

  const handleCreateVendor = async () => {
    if (!vendorForm.name.trim()) {
      alert('Vendor name is required');
      return;
    }

    setCreatingVendor(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorForm)
      });

      if (!res.ok) throw new Error('Failed to create vendor');

      const newVendor = await res.json();
      setVendors(prev => [...prev, newVendor]);
      setShowVendorModal(false);
      setVendorForm({ name: '', company: '', email: '', phone: '', specialties: [] });
      alert(`Vendor "${newVendor.name}" created successfully!`);
    } catch (error) {
      console.error('Failed to create vendor:', error);
      alert('Failed to create vendor');
    } finally {
      setCreatingVendor(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedPhotos.length > 5) {
      alert('Maximum 5 photos allowed');
      return;
    }

    // Validate file types
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      alert('Only image files are allowed');
    }

    setSelectedPhotos(prev => [...prev, ...validFiles]);

    // Create preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setPhotoPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (selectedPhotos.length === 0) return [];

    const formData = new FormData();
    selectedPhotos.forEach(photo => formData.append('photos', photo));

    const res = await fetch('/api/work-orders/upload', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error('Failed to upload photos');
    const data = await res.json();
    return data.urls;
  };

  const handleCreateWorkOrder = async () => {
    if (!createForm.title || !createForm.propertyId || !createForm.unitId) {
      alert('Title, property, and unit are required');
      return;
    }

    try {
      setUploadingPhotos(true);

      // Upload photos first if any
      let photoUrls: string[] = [];
      if (selectedPhotos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createForm, photos: photoUrls })
      });
      if (!res.ok) throw new Error('Failed to create');
      await fetchData();
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        category: 'GENERAL',
        priority: 'MEDIUM',
        propertyId: '',
        unitId: '',
        reportedBy: 'Property Manager'
      });
      // Clear photos
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
      setSelectedPhotos([]);
      setPhotoPreviewUrls([]);
    } catch (error) {
      console.error('Create failed:', error);
      alert('Failed to create work order');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleAssignVendor = async (workOrderId: string, vendorId: string) => {
    const success = await updateWorkOrder(workOrderId, { vendorId, status: 'ASSIGNED' });
    if (success) setExpandedCard(null);
  };

  const handleStatusChange = async (workOrderId: string, newStatus: string) => {
    await updateWorkOrder(workOrderId, { status: newStatus });
  };

  const handleSaveCost = async (workOrderId: string) => {
    if (!costForm.actualCost) {
      alert('Please enter actual cost');
      return;
    }
    const success = await updateWorkOrder(workOrderId, {
      actualCost: parseFloat(costForm.actualCost),
      paidBy: costForm.paidBy,
      status: 'COMPLETED'
    });
    if (success) {
      setEditingCost(null);
      setCostForm({ actualCost: '', paidBy: 'OWNER' });
    }
  };

  const handleMarkPaid = async (workOrderId: string) => {
    const invoiceNumber = prompt('Enter invoice/receipt number:');
    if (invoiceNumber === null) return;
    if (!confirm('Mark as PAID?')) return;
    await updateWorkOrder(workOrderId, { paymentStatus: 'PAID', invoiceNumber: invoiceNumber || null });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-white';
      case 'LOW': return 'bg-green-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const groupedOrders = {
    new: workOrders.filter(wo => wo.status === 'OPEN'),
    assigned: workOrders.filter(wo => wo.status === 'ASSIGNED'),
    inProgress: workOrders.filter(wo => wo.status === 'IN_PROGRESS'),
    completed: workOrders.filter(wo => wo.status === 'COMPLETED')
  };

  const selectedProperty = properties.find(p => p.id === createForm.propertyId);

  if (loading) {
    return <MaintenancePageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Maintenance</h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">Track work orders from request to payment</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium w-full sm:w-auto"
            >
              + New Request
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Workflow Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Column 1: New */}
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h2 className="font-semibold text-slate-900 text-sm">
                New Requests
                <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
                  {groupedOrders.new.length}
                </span>
              </h2>
            </div>
            {groupedOrders.new.map(wo => (
              <div key={wo.id} className="bg-white rounded-lg border border-yellow-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetailModal(wo)}>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(wo.priority)}`}>
                  {wo.priority}
                </span>
                <h3 className="font-medium text-slate-900 text-sm mt-2">{wo.title}</h3>
                <p className="text-xs text-slate-600">{wo.property.name}{wo.unit ? ` - Unit ${wo.unit.unitNumber}` : ''}</p>
                {wo.invoiceNumber && <p className="text-xs text-slate-400 mt-1">{wo.invoiceNumber}</p>}
                {wo.photos?.length > 0 && (
                  <div className="flex gap-1 mt-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); openPhotoViewer(wo.photos, 0); }}>
                    {wo.photos.slice(0, 3).map((photo, i) => (
                      <img key={i} src={photo} alt="" className="w-8 h-8 object-cover rounded hover:opacity-80 transition-opacity" />
                    ))}
                    {wo.photos.length > 3 && <span className="text-xs text-slate-400 self-center">+{wo.photos.length - 3}</span>}
                  </div>
                )}

                {expandedCard === wo.id ? (
                  <div className="mt-3 pt-3 border-t border-slate-200" onClick={(e) => e.stopPropagation()}>
                    <select
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setShowVendorModal(true);
                          e.target.value = '';
                        } else if (e.target.value) {
                          handleAssignVendor(wo.id, e.target.value);
                        }
                      }}
                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 mb-2"
                    >
                      <option value="">Select vendor...</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}{v.company ? ` (${v.company})` : ''}</option>
                      ))}
                      <option value="__new__">+ Create New Vendor</option>
                    </select>
                    <button onClick={() => setExpandedCard(null)} className="text-xs text-slate-500">Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedCard(wo.id); }}
                    className="mt-3 w-full text-xs bg-yellow-600 text-white px-3 py-1.5 rounded hover:bg-yellow-700"
                  >
                    Assign Vendor
                  </button>
                )}
              </div>
            ))}
            {groupedOrders.new.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">No new requests</div>
            )}
          </div>

          {/* Column 2: Assigned */}
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h2 className="font-semibold text-slate-900 text-sm">
                Assigned
                <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                  {groupedOrders.assigned.length}
                </span>
              </h2>
            </div>
            {groupedOrders.assigned.map(wo => (
              <div key={wo.id} className="bg-white rounded-lg border border-blue-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetailModal(wo)}>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(wo.priority)}`}>
                  {wo.priority}
                </span>
                <h3 className="font-medium text-slate-900 text-sm mt-2">{wo.title}</h3>
                <p className="text-xs text-slate-600">{wo.property.name}{wo.unit ? ` - Unit ${wo.unit.unitNumber}` : ''}</p>
                {wo.invoiceNumber && <p className="text-xs text-slate-400">{wo.invoiceNumber}</p>}
                {wo.vendor && <p className="text-xs text-blue-600 font-medium mt-1">{wo.vendor.name}</p>}
                <button
                  onClick={(e) => { e.stopPropagation(); handleStatusChange(wo.id, 'IN_PROGRESS'); }}
                  className="mt-3 w-full text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
                >
                  Start Work
                </button>
              </div>
            ))}
            {groupedOrders.assigned.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">No assigned work</div>
            )}
          </div>

          {/* Column 3: In Progress */}
          <div className="space-y-3">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <h2 className="font-semibold text-slate-900 text-sm">
                In Progress
                <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                  {groupedOrders.inProgress.length}
                </span>
              </h2>
            </div>
            {groupedOrders.inProgress.map(wo => (
              <div key={wo.id} className="bg-white rounded-lg border border-purple-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetailModal(wo)}>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(wo.priority)}`}>
                  {wo.priority}
                </span>
                <h3 className="font-medium text-slate-900 text-sm mt-2">{wo.title}</h3>
                <p className="text-xs text-slate-600">{wo.property.name}{wo.unit ? ` - Unit ${wo.unit.unitNumber}` : ''}</p>
                {wo.invoiceNumber && <p className="text-xs text-slate-400">{wo.invoiceNumber}</p>}
                {wo.vendor && <p className="text-xs text-purple-600 font-medium mt-1">{wo.vendor.name}</p>}

                {editingCost === wo.id ? (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      step="0.01"
                      value={costForm.actualCost}
                      onChange={(e) => setCostForm({ ...costForm, actualCost: e.target.value })}
                      placeholder="Cost"
                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5"
                    />
                    <select
                      value={costForm.paidBy}
                      onChange={(e) => setCostForm({ ...costForm, paidBy: e.target.value })}
                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="OWNER">Owner pays</option>
                      <option value="TENANT">Tenant pays</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveCost(wo.id)}
                        className="flex-1 text-xs bg-purple-600 text-white px-3 py-1.5 rounded"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => { setEditingCost(null); setCostForm({ actualCost: '', paidBy: 'OWNER' }); }}
                        className="text-xs text-slate-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingCost(wo.id); }}
                    className="mt-3 w-full text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            ))}
            {groupedOrders.inProgress.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">No work in progress</div>
            )}
          </div>

          {/* Column 4: Ready for Payment */}
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h2 className="font-semibold text-slate-900 text-sm">
                Ready for Payment
                <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                  {groupedOrders.completed.filter(wo => wo.paymentStatus === 'UNPAID').length}
                </span>
              </h2>
            </div>
            {groupedOrders.completed.filter(wo => wo.paymentStatus === 'UNPAID').map(wo => (
              <div key={wo.id} className="bg-white rounded-lg border border-green-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetailModal(wo)}>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(wo.priority)}`}>
                  {wo.priority}
                </span>
                <h3 className="font-medium text-slate-900 text-sm mt-2">{wo.title}</h3>
                <p className="text-xs text-slate-600">{wo.property.name}{wo.unit ? ` - Unit ${wo.unit.unitNumber}` : ''}</p>
                {wo.invoiceNumber && <p className="text-xs text-slate-400">{wo.invoiceNumber}</p>}
                {wo.vendor && <p className="text-xs text-green-600 font-medium mt-1">{wo.vendor.name}</p>}
                {wo.actualCost && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Amount:</span>
                      <span className="font-bold">${Number(wo.actualCost).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-slate-600">Paid by:</span>
                      <span>{wo.paidBy}</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleMarkPaid(wo.id); }}
                  className="mt-3 w-full text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
                >
                  Record Payment
                </button>
              </div>
            ))}
            {groupedOrders.completed.filter(wo => wo.paymentStatus === 'UNPAID').length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">No pending payments</div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-xl">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">New Maintenance Request</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
                  setSelectedPhotos([]);
                  setPhotoPreviewUrls([]);
                }}
                className="sm:hidden p-2 -mr-2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm sm:py-2"
                  placeholder="e.g., Leaky faucet in bathroom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm sm:py-2"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm sm:py-2"
                  >
                    <option value="GENERAL">General</option>
                    <option value="PLUMBING">Plumbing</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="HVAC">HVAC</option>
                    <option value="APPLIANCE">Appliance</option>
                    <option value="STRUCTURAL">Structural</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm sm:py-2"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Property *</label>
                <select
                  value={createForm.propertyId}
                  onChange={(e) => setCreateForm({ ...createForm, propertyId: e.target.value, unitId: '' })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm sm:py-2"
                >
                  <option value="">Select property...</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {selectedProperty && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit *</label>
                  <select
                    value={createForm.unitId}
                    onChange={(e) => setCreateForm({ ...createForm, unitId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm sm:py-2"
                  >
                    <option value="">Select unit...</option>
                    {selectedProperty.units?.map(u => (
                      <option key={u.id} value={u.id}>{u.unitNumber}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Photo Upload Section */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Photos (optional)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="cursor-pointer flex flex-col items-center justify-center text-slate-500 hover:text-slate-700"
                  >
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">Click to upload photos</span>
                    <span className="text-xs text-slate-400 mt-1">Max 5 photos, 5MB each</span>
                  </label>
                </div>
                {/* Photo Previews */}
                {photoPreviewUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {photoPreviewUrls.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-slate-200 flex flex-col-reverse sm:flex-row gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
                  setSelectedPhotos([]);
                  setPhotoPreviewUrls([]);
                }}
                className="flex-1 px-4 py-3 sm:py-2 border border-slate-300 rounded-lg text-sm font-medium"
                disabled={uploadingPhotos}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkOrder}
                disabled={uploadingPhotos}
                className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 text-sm font-medium"
              >
                {uploadingPhotos ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {photoViewerOpen && viewerPhotos.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setPhotoViewerOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setPhotoViewerOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-slate-300 z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous button */}
          {viewerPhotos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-slate-300 bg-black bg-opacity-50 rounded-full p-2"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Main image */}
          <div
            className="max-w-4xl max-h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewerPhotos[currentPhotoIndex]}
              alt={`Photo ${currentPhotoIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>

          {/* Next button */}
          {viewerPhotos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-slate-300 bg-black bg-opacity-50 rounded-full p-2"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Photo counter and thumbnails */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
            <p className="text-white text-sm mb-2">
              {currentPhotoIndex + 1} / {viewerPhotos.length}
            </p>
            {viewerPhotos.length > 1 && (
              <div className="flex gap-2 justify-center">
                {viewerPhotos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(index); }}
                    className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                      index === currentPhotoIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail/Edit Modal */}
      {showDetailModal && selectedWorkOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white p-4 sm:p-6 border-b border-slate-200 flex justify-between items-start z-10 rounded-t-xl">
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(selectedWorkOrder.priority)}`}>
                    {selectedWorkOrder.priority}
                  </span>
                  <span className="text-xs text-slate-400 truncate">{selectedWorkOrder.invoiceNumber}</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="text-lg sm:text-xl font-bold text-slate-900 border border-slate-300 rounded px-2 py-1 w-full"
                  />
                ) : (
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">{selectedWorkOrder.title}</h2>
                )}
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  {selectedWorkOrder.property.name}{selectedWorkOrder.unit ? ` - Unit ${selectedWorkOrder.unit.unitNumber}` : ''}
                </p>
              </div>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedWorkOrder(null); setIsEditing(false); }}
                className="text-slate-400 hover:text-slate-600 p-1 -mr-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
              {/* Status and Details Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs text-slate-500 block">Status</label>
                  <span className={`text-sm font-medium ${
                    selectedWorkOrder.status === 'COMPLETED' ? 'text-green-600' :
                    selectedWorkOrder.status === 'IN_PROGRESS' ? 'text-purple-600' :
                    selectedWorkOrder.status === 'ASSIGNED' ? 'text-blue-600' : 'text-yellow-600'
                  }`}>{selectedWorkOrder.status.replace('_', ' ')}</span>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block">Category</label>
                  {isEditing ? (
                    <select
                      value={editForm.category || ''}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="text-sm border border-slate-300 rounded px-2 py-1 w-full"
                    >
                      <option value="GENERAL">General</option>
                      <option value="PLUMBING">Plumbing</option>
                      <option value="ELECTRICAL">Electrical</option>
                      <option value="HVAC">HVAC</option>
                      <option value="APPLIANCE">Appliance</option>
                    </select>
                  ) : (
                    <span className="text-sm font-medium">{selectedWorkOrder.category}</span>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500 block">Priority</label>
                  {isEditing ? (
                    <select
                      value={editForm.priority || ''}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                      className="text-sm border border-slate-300 rounded px-2 py-1 w-full"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="EMERGENCY">Emergency</option>
                    </select>
                  ) : (
                    <span className="text-sm font-medium">{selectedWorkOrder.priority}</span>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500 block">Created</label>
                  <span className="text-sm font-medium">{new Date(selectedWorkOrder.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Description</label>
                {isEditing ? (
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                    {selectedWorkOrder.description || 'No description provided'}
                  </p>
                )}
              </div>

              {/* Photos */}
              {selectedWorkOrder.photos?.length > 0 && (
                <div>
                  <label className="text-xs text-slate-500 block mb-2">Photos</label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedWorkOrder.photos.map((photo, i) => (
                      <img
                        key={i}
                        src={photo}
                        alt=""
                        className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openPhotoViewer(selectedWorkOrder.photos, i)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Assignment & Cost Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 bg-slate-50 rounded-lg p-3 sm:p-4">
                <div>
                  <label className="text-xs text-slate-500 block">Reported By</label>
                  <span className="text-sm font-medium">{selectedWorkOrder.reportedBy}</span>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block">Vendor</label>
                  <span className="text-sm font-medium">{selectedWorkOrder.vendor?.name || 'Not assigned'}</span>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block">Scheduled Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.scheduledDate?.split('T')[0] || ''}
                      onChange={(e) => setEditForm({ ...editForm, scheduledDate: e.target.value })}
                      className="text-sm border border-slate-300 rounded px-2 py-1 w-full"
                    />
                  ) : (
                    <span className="text-sm font-medium">
                      {selectedWorkOrder.scheduledDate ? new Date(selectedWorkOrder.scheduledDate).toLocaleDateString() : 'Not scheduled'}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500 block">Estimated Cost</label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.estimatedCost || ''}
                      onChange={(e) => setEditForm({ ...editForm, estimatedCost: parseFloat(e.target.value) || null })}
                      className="text-sm border border-slate-300 rounded px-2 py-1 w-full"
                      placeholder="0.00"
                    />
                  ) : (
                    <span className="text-sm font-medium">
                      {selectedWorkOrder.estimatedCost ? `$${Number(selectedWorkOrder.estimatedCost).toFixed(2)}` : 'Not set'}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500 block">Actual Cost</label>
                  <span className="text-sm font-medium">
                    {selectedWorkOrder.actualCost ? `$${Number(selectedWorkOrder.actualCost).toFixed(2)}` : 'Not set'}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block">Payment</label>
                  <span className={`text-sm font-medium ${
                    selectedWorkOrder.paymentStatus === 'PAID' ? 'text-green-600' : 'text-slate-600'
                  }`}>
                    {selectedWorkOrder.paymentStatus}{selectedWorkOrder.paidBy ? ` (${selectedWorkOrder.paidBy})` : ''}
                  </span>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Internal Notes</label>
                {isEditing ? (
                  <textarea
                    value={editForm.internalNotes || ''}
                    onChange={(e) => setEditForm({ ...editForm, internalNotes: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Add internal notes..."
                  />
                ) : (
                  <p className="text-sm text-slate-700 bg-yellow-50 rounded-lg p-3 italic">
                    {selectedWorkOrder.internalNotes || 'No internal notes'}
                  </p>
                )}
              </div>

              {/* Updates Timeline */}
              <div>
                <label className="text-xs text-slate-500 block mb-2">Activity & Updates</label>

                {/* Add Update Form */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newUpdateNote}
                    onChange={(e) => setNewUpdateNote(e.target.value)}
                    placeholder="Add a note or update..."
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUpdate()}
                  />
                  <button
                    onClick={handleAddUpdate}
                    disabled={addingUpdate || !newUpdateNote.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addingUpdate ? '...' : 'Add'}
                  </button>
                </div>

                {/* Timeline */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedWorkOrder.updates && selectedWorkOrder.updates.length > 0 ? (
                    selectedWorkOrder.updates.map((update) => (
                      <div key={update.id} className="flex gap-3 border-l-2 border-slate-200 pl-4 py-1">
                        <div className="flex-1">
                          <p className="text-sm text-slate-800">{update.note}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {update.updatedBy} • {new Date(update.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 italic">No updates yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-slate-50 p-3 sm:p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
              <button
                onClick={handleDeleteWorkOrder}
                className="order-2 sm:order-1 px-4 py-2.5 sm:py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
              >
                Delete
              </button>
              <div className="order-1 sm:order-2 flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => { setIsEditing(false); setEditForm(selectedWorkOrder); }}
                      className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Vendor Creation Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-xl">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Create New Vendor</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Add a new vendor to your list</p>
              </div>
              <button
                onClick={() => {
                  setShowVendorModal(false);
                  setVendorForm({ name: '', company: '', email: '', phone: '', specialties: [] });
                }}
                className="sm:hidden p-2 -mr-2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm sm:py-2"
                  placeholder="e.g., John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                <input
                  type="text"
                  value={vendorForm.company}
                  onChange={(e) => setVendorForm({ ...vendorForm, company: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm sm:py-2"
                  placeholder="e.g., ABC Plumbing LLC"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm sm:py-2"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm sm:py-2"
                    placeholder="vendor@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Specialties</label>
                <div className="flex flex-wrap gap-2">
                  {['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'GENERAL'].map(specialty => (
                    <button
                      key={specialty}
                      type="button"
                      onClick={() => {
                        setVendorForm(prev => ({
                          ...prev,
                          specialties: prev.specialties.includes(specialty)
                            ? prev.specialties.filter(s => s !== specialty)
                            : [...prev.specialties, specialty]
                        }));
                      }}
                      className={`px-3 py-1.5 sm:py-1 text-xs rounded-full border transition-colors ${
                        vendorForm.specialties.includes(specialty)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                      }`}
                    >
                      {specialty}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-slate-200 flex flex-col-reverse sm:flex-row gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowVendorModal(false);
                  setVendorForm({ name: '', company: '', email: '', phone: '', specialties: [] });
                }}
                className="flex-1 px-4 py-3 sm:py-2 border border-slate-300 rounded-lg text-sm font-medium"
                disabled={creatingVendor}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVendor}
                disabled={creatingVendor || !vendorForm.name.trim()}
                className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 text-sm font-medium"
              >
                {creatingVendor ? 'Creating...' : 'Create Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    }>
      <MaintenanceContent />
    </Suspense>
  );
}
