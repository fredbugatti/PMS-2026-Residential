'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface WorkOrder {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  reportedBy: string;
  reportedEmail: string | null;
  assignedTo: string | null;
  vendorId: string | null;
  vendor: {
    id: string;
    name: string;
    company: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  estimatedCost: number | null;
  actualCost: number | null;
  paidBy: string | null;
  paymentStatus: string;
  invoiceNumber: string | null;
  paidDate: string | null;
  scheduledDate: string | null;
  completedDate: string | null;
  photos: string[];
  internalNotes: string | null;
  property: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
  };
  unit: {
    id: string;
    unitNumber: string;
    bedrooms: number | null;
    bathrooms: number | null;
  };
  lease: {
    id: string;
    tenantName: string;
    tenantEmail: string | null;
    tenantPhone: string | null;
  } | null;
  updates: Array<{
    id: string;
    createdAt: string;
    status: string;
    note: string;
    updatedBy: string;
  }>;
}

export default function WorkOrderDetail() {
  const params = useParams();
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  useEffect(() => {
    fetchWorkOrder();
  }, [params.id]);

  const fetchWorkOrder = async () => {
    try {
      const res = await fetch(`/api/work-orders/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch work order');
      const data = await res.json();
      setWorkOrder(data);
    } catch (error) {
      console.error('Failed to fetch work order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!workOrder || !confirm(`Change status to ${newStatus}?`)) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/work-orders/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          updateNote: `Status changed to ${newStatus}`,
          updatedBy: 'Property Manager'
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }

      await fetchWorkOrder();
      setShowStatusDropdown(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!workOrder) return;

    const actualCost = prompt('Enter actual cost (or leave blank):');
    if (actualCost === null) return; // User cancelled

    const paidBy = confirm('Did the OWNER pay? (Cancel for TENANT)') ? 'OWNER' : 'TENANT';

    setUpdating(true);
    try {
      const res = await fetch(`/api/work-orders/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          actualCost: actualCost || null,
          paidBy: actualCost ? paidBy : null,
          completedDate: new Date().toISOString(),
          updateNote: 'Work order completed',
          updatedBy: 'Property Manager'
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete work order');
      }

      await fetchWorkOrder();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!workOrder) return;

    const invoiceNumber = prompt('Enter invoice number:');
    if (invoiceNumber === null) return; // User cancelled

    if (!confirm('Mark this work order as PAID? This will create accounting ledger entries.')) {
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/work-orders/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'PAID',
          invoiceNumber: invoiceNumber || null,
          updateNote: 'Payment marked as paid',
          updatedBy: 'Property Manager'
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to mark as paid');
      }

      await fetchWorkOrder();
      alert('Work order marked as PAID. Ledger entries have been created.');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-yellow-100 text-yellow-800';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY': return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading work order...</div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Work Order Not Found</h2>
          <Link href="/maintenance/workflow" className="text-blue-600 hover:text-blue-800">
            ← Back to Maintenance
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/maintenance/workflow" className="text-slate-600 hover:text-slate-900">
                ← Back
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">{workOrder.title}</h1>
                  <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getPriorityColor(workOrder.priority)}`}>
                    {workOrder.priority}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">
                  {workOrder.property.name} • Unit {workOrder.unit.unitNumber}
                </p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                disabled={updating}
                className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(workOrder.status)} hover:opacity-80 transition-opacity`}
              >
                {workOrder.status.replace('_', ' ')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showStatusDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                    {['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        disabled={workOrder.status === status}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                          {status.replace('_', ' ')}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Description</h2>
              <p className="text-slate-700 whitespace-pre-wrap">{workOrder.description}</p>
            </div>

            {/* Internal Notes */}
            {workOrder.internalNotes && (
              <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Internal Notes</h2>
                <p className="text-slate-700 whitespace-pre-wrap">{workOrder.internalNotes}</p>
              </div>
            )}

            {/* Photos */}
            {workOrder.photos && workOrder.photos.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {workOrder.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Work order photo ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Activity Timeline</h2>
              <div className="space-y-4">
                {/* Creation */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-900 font-medium">Work order created</div>
                    <div className="text-xs text-slate-500">{formatDate(workOrder.createdAt)}</div>
                  </div>
                </div>

                {/* Updates */}
                {workOrder.updates.map((update) => (
                  <div key={update.id} className="flex gap-4">
                    <div className="flex-shrink-0 w-2 h-2 bg-slate-400 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-900">{update.note}</div>
                      <div className="text-xs text-slate-500">
                        {update.updatedBy} • {formatDate(update.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Completion */}
                {workOrder.completedDate && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-900 font-medium">Work completed</div>
                      <div className="text-xs text-slate-500">{formatDate(workOrder.completedDate)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            {(workOrder.status !== 'COMPLETED' && workOrder.status !== 'CANCELLED') || (workOrder.status === 'COMPLETED' && workOrder.paymentStatus !== 'PAID') ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  {workOrder.status !== 'COMPLETED' && workOrder.status !== 'CANCELLED' && (
                    <button
                      onClick={handleMarkComplete}
                      disabled={updating}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      Mark Complete
                    </button>
                  )}
                  {workOrder.status === 'COMPLETED' && workOrder.actualCost && workOrder.paidBy && workOrder.paymentStatus !== 'PAID' && (
                    <button
                      onClick={handleMarkPaid}
                      disabled={updating}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Details */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Details</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-slate-500">Category</dt>
                  <dd className="text-sm text-slate-900 font-medium">{workOrder.category}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Reported By</dt>
                  <dd className="text-sm text-slate-900">{workOrder.reportedBy}</dd>
                  {workOrder.reportedEmail && (
                    <dd className="text-xs text-slate-500">{workOrder.reportedEmail}</dd>
                  )}
                </div>
                {workOrder.assignedTo && (
                  <div>
                    <dt className="text-xs text-slate-500">Assigned To</dt>
                    <dd className="text-sm text-slate-900">{workOrder.assignedTo}</dd>
                  </div>
                )}
                {workOrder.vendor && (
                  <div>
                    <dt className="text-xs text-slate-500">Vendor</dt>
                    <dd className="text-sm text-slate-900 font-medium">
                      <Link href={`/vendors/${workOrder.vendor.id}`} className="text-blue-600 hover:text-blue-800">
                        {workOrder.vendor.name}
                      </Link>
                    </dd>
                    {workOrder.vendor.company && (
                      <dd className="text-xs text-slate-500">{workOrder.vendor.company}</dd>
                    )}
                    {workOrder.vendor.phone && (
                      <dd className="text-xs text-slate-500">{workOrder.vendor.phone}</dd>
                    )}
                  </div>
                )}
                {workOrder.scheduledDate && (
                  <div>
                    <dt className="text-xs text-slate-500">Scheduled Date</dt>
                    <dd className="text-sm text-slate-900">{formatDateOnly(workOrder.scheduledDate)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Cost Information */}
            {(workOrder.estimatedCost || workOrder.actualCost) && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Cost</h2>
                <dl className="space-y-3">
                  {workOrder.estimatedCost && (
                    <div>
                      <dt className="text-xs text-slate-500">Estimated Cost</dt>
                      <dd className="text-sm text-slate-900">${Number(workOrder.estimatedCost).toFixed(2)}</dd>
                    </div>
                  )}
                  {workOrder.actualCost && (
                    <div>
                      <dt className="text-xs text-slate-500">Actual Cost</dt>
                      <dd className="text-lg font-bold text-slate-900">${Number(workOrder.actualCost).toFixed(2)}</dd>
                    </div>
                  )}
                  {workOrder.paidBy && (
                    <div>
                      <dt className="text-xs text-slate-500">Paid By</dt>
                      <dd className="text-sm text-slate-900">{workOrder.paidBy}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-slate-500">Payment Status</dt>
                    <dd className="text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        workOrder.paymentStatus === 'PAID'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {workOrder.paymentStatus}
                      </span>
                    </dd>
                  </div>
                  {workOrder.invoiceNumber && (
                    <div>
                      <dt className="text-xs text-slate-500">Invoice Number</dt>
                      <dd className="text-sm text-slate-900">{workOrder.invoiceNumber}</dd>
                    </div>
                  )}
                  {workOrder.paidDate && (
                    <div>
                      <dt className="text-xs text-slate-500">Paid Date</dt>
                      <dd className="text-sm text-slate-900">{formatDateOnly(workOrder.paidDate)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Property/Unit Info */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Location</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-slate-500">Property</dt>
                  <dd className="text-sm text-slate-900">
                    <Link href={`/properties/${workOrder.property.id}`} className="text-blue-600 hover:text-blue-800">
                      {workOrder.property.name}
                    </Link>
                  </dd>
                  {workOrder.property.address && (
                    <dd className="text-xs text-slate-500">
                      {workOrder.property.address}
                      {workOrder.property.city && `, ${workOrder.property.city}`}
                      {workOrder.property.state && `, ${workOrder.property.state}`}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Unit</dt>
                  <dd className="text-sm text-slate-900">Unit {workOrder.unit.unitNumber}</dd>
                  {(workOrder.unit.bedrooms || workOrder.unit.bathrooms) && (
                    <dd className="text-xs text-slate-500">
                      {workOrder.unit.bedrooms && `${workOrder.unit.bedrooms} bed`}
                      {workOrder.unit.bedrooms && workOrder.unit.bathrooms && ' • '}
                      {workOrder.unit.bathrooms && `${workOrder.unit.bathrooms} bath`}
                    </dd>
                  )}
                </div>
                {workOrder.lease && (
                  <div>
                    <dt className="text-xs text-slate-500">Current Tenant</dt>
                    <dd className="text-sm text-slate-900">
                      <Link href={`/leases/${workOrder.lease.id}`} className="text-blue-600 hover:text-blue-800">
                        {workOrder.lease.tenantName}
                      </Link>
                    </dd>
                    {workOrder.lease.tenantPhone && (
                      <dd className="text-xs text-slate-500">{workOrder.lease.tenantPhone}</dd>
                    )}
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
