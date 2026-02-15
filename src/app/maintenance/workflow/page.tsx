'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  paymentStatus: string;
  reportedBy: string;
  actualCost: number | null;
  paidBy: string | null;
  invoiceNumber: string | null;
  paidDate: string | null;
  vendor: {
    id: string;
    name: string;
    company: string | null;
  } | null;
  createdAt: string;
  property: {
    id: string;
    name: string;
  };
  unit: {
    id: string;
    unitNumber: string;
  };
  lease: {
    id: string;
    tenantName: string;
  } | null;
}

interface Vendor {
  id: string;
  name: string;
  company: string | null;
}

export default function MaintenanceWorkflow() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [editingCost, setEditingCost] = useState<string | null>(null);
  const [costForm, setCostForm] = useState({ actualCost: '', paidBy: 'OWNER' });

  useEffect(() => {
    fetchWorkOrders();
    fetchVendors();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const res = await fetch('/api/work-orders');
      if (res.ok) {
        const data = await res.json();
        // Filter out CANCELLED work orders for workflow view
        const activeWorkOrders = data.filter((wo: WorkOrder) => wo.status !== 'CANCELLED');
        setWorkOrders(activeWorkOrders);
      }
    } catch (error) {
      console.error('Failed to fetch work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/vendors?active=true');
      if (res.ok) {
        const data = await res.json();
        setVendors(data);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
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

      await fetchWorkOrders();
      return true;
    } catch (error) {
      console.error('Update failed:', error);
      alert('Update failed');
      return false;
    }
  };

  const handleAssignVendor = async (workOrderId: string, vendorId: string) => {
    const success = await updateWorkOrder(workOrderId, {
      vendorId,
      status: 'ASSIGNED'
    });
    if (success) {
      setExpandedCard(null);
      // No need for alert, the card will move to the next column
    }
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
      // Card will automatically move to "Ready for Payment" column
    }
  };

  const handleMarkPaid = async (workOrderId: string) => {
    const invoiceNumber = prompt('Enter invoice/receipt number:');
    if (invoiceNumber === null) return;

    if (!confirm('Mark as PAID? This will create accounting ledger entries.')) {
      return;
    }

    await updateWorkOrder(workOrderId, {
      paymentStatus: 'PAID',
      invoiceNumber: invoiceNumber || null
    });
    // Card will automatically move to "Recently Paid" section
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Maintenance Workflow</h1>
              <p className="text-slate-600 mt-1">Simplified step-by-step process</p>
            </div>
            <Link
              href="/maintenance/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Request
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workflow Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* Column 1: New Requests */}
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h2 className="font-semibold text-slate-900 text-sm">
                1. New Requests
                <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                  {groupedOrders.new.length}
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-1">Assign to vendor</p>
            </div>

            <div className="space-y-3">
              {groupedOrders.new.map((wo) => (
                <div key={wo.id} className="bg-white rounded-lg border-2 border-yellow-200 shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(wo.priority)}`}>
                            {wo.priority}
                          </span>
                        </div>
                        <h3 className="font-medium text-slate-900 text-sm">{wo.title}</h3>
                        <p className="text-xs text-slate-600 mt-1">{wo.property.name} - Unit {wo.unit.unitNumber}</p>
                      </div>
                    </div>

                    {expandedCard === wo.id ? (
                      <div className="mt-3 space-y-3 pt-3 border-t border-slate-200">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Assign Vendor
                          </label>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignVendor(wo.id, e.target.value);
                                setExpandedCard(null);
                              }
                            }}
                            className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                          >
                            <option value="">Select vendor...</option>
                            {vendors.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name} {v.company && `(${v.company})`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => setExpandedCard(null)}
                          className="text-xs text-slate-600 hover:text-slate-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setExpandedCard(wo.id)}
                        className="mt-3 w-full text-xs bg-yellow-600 text-white px-3 py-1.5 rounded hover:bg-yellow-700 transition-colors"
                      >
                        Assign Vendor →
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {groupedOrders.new.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500">
                  No new requests
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Assigned */}
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h2 className="font-semibold text-slate-900 text-sm">
                2. Assigned
                <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                  {groupedOrders.assigned.length}
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-1">Start work</p>
            </div>

            <div className="space-y-3">
              {groupedOrders.assigned.map((wo) => (
                <div key={wo.id} className="bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(wo.priority)}`}>
                            {wo.priority}
                          </span>
                        </div>
                        <h3 className="font-medium text-slate-900 text-sm">{wo.title}</h3>
                        <p className="text-xs text-slate-600 mt-1">{wo.property.name} - Unit {wo.unit.unitNumber}</p>
                        {wo.vendor && (
                          <p className="text-xs text-blue-600 mt-1 font-medium">
                            {wo.vendor.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleStatusChange(wo.id, 'IN_PROGRESS')}
                      className="mt-3 w-full text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
                    >
                      Start Work →
                    </button>
                  </div>
                </div>
              ))}

              {groupedOrders.assigned.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500">
                  No assigned work
                </div>
              )}
            </div>
          </div>

          {/* Column 3: In Progress */}
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <h2 className="font-semibold text-slate-900 text-sm">
                3. In Progress
                <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                  {groupedOrders.inProgress.length}
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-1">Complete & add cost</p>
            </div>

            <div className="space-y-3">
              {groupedOrders.inProgress.map((wo) => (
                <div key={wo.id} className="bg-white rounded-lg border-2 border-purple-200 shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(wo.priority)}`}>
                            {wo.priority}
                          </span>
                        </div>
                        <h3 className="font-medium text-slate-900 text-sm">{wo.title}</h3>
                        <p className="text-xs text-slate-600 mt-1">{wo.property.name} - Unit {wo.unit.unitNumber}</p>
                        {wo.vendor && (
                          <p className="text-xs text-purple-600 mt-1 font-medium">
                            {wo.vendor.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {editingCost === wo.id ? (
                      <div className="mt-3 space-y-2 pt-3 border-t border-slate-200">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Actual Cost
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={costForm.actualCost}
                            onChange={(e) => setCostForm({ ...costForm, actualCost: e.target.value })}
                            placeholder="0.00"
                            className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Paid By
                          </label>
                          <select
                            value={costForm.paidBy}
                            onChange={(e) => setCostForm({ ...costForm, paidBy: e.target.value })}
                            className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                          >
                            <option value="OWNER">Owner</option>
                            <option value="TENANT">Tenant</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveCost(wo.id)}
                            className="flex-1 text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700"
                          >
                            Save & Complete
                          </button>
                          <button
                            onClick={() => {
                              setEditingCost(null);
                              setCostForm({ actualCost: '', paidBy: 'OWNER' });
                            }}
                            className="text-xs text-slate-600 hover:text-slate-800 px-2"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingCost(wo.id);
                          setCostForm({
                            actualCost: wo.actualCost?.toString() || '',
                            paidBy: wo.paidBy || 'OWNER'
                          });
                        }}
                        className="mt-3 w-full text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 transition-colors"
                      >
                        Mark Complete →
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {groupedOrders.inProgress.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500">
                  No work in progress
                </div>
              )}
            </div>
          </div>

          {/* Column 4: Completed (Ready for Payment) */}
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h2 className="font-semibold text-slate-900 text-sm">
                4. Ready for Payment
                <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                  {groupedOrders.completed.filter(wo => wo.paymentStatus === 'UNPAID').length}
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-1">Record payment</p>
            </div>

            <div className="space-y-3">
              {groupedOrders.completed
                .filter(wo => wo.paymentStatus === 'UNPAID')
                .map((wo) => (
                  <div key={wo.id} className="bg-white rounded-lg border-2 border-green-200 shadow-sm">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(wo.priority)}`}>
                              {wo.priority}
                            </span>
                          </div>
                          <h3 className="font-medium text-slate-900 text-sm">{wo.title}</h3>
                          <p className="text-xs text-slate-600 mt-1">{wo.property.name} - Unit {wo.unit.unitNumber}</p>
                          {wo.vendor && (
                            <p className="text-xs text-green-600 mt-1 font-medium">
                              {wo.vendor.name}
                            </p>
                          )}
                          {wo.actualCost && (
                            <div className="mt-2 pt-2 border-t border-slate-200">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600">Amount:</span>
                                <span className="font-bold text-slate-900">${Number(wo.actualCost).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-xs mt-1">
                                <span className="text-slate-600">Paid by:</span>
                                <span className="font-medium text-slate-900">{wo.paidBy}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleMarkPaid(wo.id)}
                        className="mt-3 w-full text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors font-medium"
                      >
                        Record Payment ✓
                      </button>
                    </div>
                  </div>
                ))}

              {groupedOrders.completed.filter(wo => wo.paymentStatus === 'UNPAID').length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500">
                  No pending payments
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recently Paid */}
        {groupedOrders.completed.filter(wo => wo.paymentStatus === 'PAID').length > 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">Recently Paid</h2>
              </div>
              <div className="divide-y divide-slate-200">
                {groupedOrders.completed
                  .filter(wo => wo.paymentStatus === 'PAID')
                  .slice(0, 5)
                  .map((wo) => (
                    <div key={wo.id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-slate-900 text-sm">{wo.title}</h3>
                          <p className="text-xs text-slate-600">
                            {wo.property.name} - Unit {wo.unit.unitNumber}
                          </p>
                          {wo.vendor && (
                            <p className="text-xs text-slate-600 mt-1">
                              Vendor: {wo.vendor.name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-900">
                            ${Number(wo.actualCost).toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {wo.paidDate && new Date(wo.paidDate).toLocaleDateString()}
                          </div>
                          <span className="inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            PAID
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
