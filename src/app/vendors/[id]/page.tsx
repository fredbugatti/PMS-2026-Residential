'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Vendor {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  specialties: string[];
  paymentTerms: string | null;
  taxId: string | null;
  notes: string | null;
  active: boolean;
  totalPaid: number;
  totalUnpaid: number;
  workOrders: Array<{
    id: string;
    createdAt: string;
    title: string;
    status: string;
    priority: string;
    actualCost: number | null;
    paymentStatus: string;
    property: {
      id: string;
      name: string;
    };
    unit: {
      id: string;
      unitNumber: string;
    };
  }>;
}

export default function VendorDetail() {
  const params = useParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendor();
  }, [params.id]);

  const fetchVendor = async () => {
    try {
      const res = await fetch(`/api/vendors/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch vendor');
      const data = await res.json();
      setVendor(data);
    } catch (error) {
      console.error('Failed to fetch vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-yellow-100 text-yellow-800';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading vendor...</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-900 font-medium mb-2">Vendor not found</div>
          <Link href="/vendors" className="text-blue-600 hover:text-blue-800">
            ← Back to Vendors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/vendors" className="text-gray-600 hover:text-gray-900">
                ← Back
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
                {vendor.company && (
                  <p className="text-gray-600 mt-1">{vendor.company}</p>
                )}
              </div>
            </div>
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
              vendor.active
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {vendor.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Work Orders</div>
            <div className="text-3xl font-bold text-gray-900">{vendor.workOrders.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Paid</div>
            <div className="text-3xl font-bold text-green-600">${vendor.totalPaid.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Unpaid</div>
            <div className="text-3xl font-bold text-orange-600">${vendor.totalUnpaid.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Work Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Work Orders</h2>
              </div>
              <div className="overflow-x-auto">
                {vendor.workOrders.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No work orders assigned to this vendor yet.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Work Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Property/Unit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {vendor.workOrders.map((wo) => (
                        <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <Link
                              href={`/maintenance/${wo.id}`}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {wo.title}
                            </Link>
                            <div className="text-xs text-gray-500">
                              {new Date(wo.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="text-gray-900">{wo.property.name}</div>
                            <div className="text-xs text-gray-500">Unit {wo.unit.unitNumber}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(wo.status)}`}>
                              {wo.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(wo.priority)}`}>
                              {wo.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            {wo.actualCost ? (
                              <span className="font-medium text-gray-900">
                                ${Number(wo.actualCost).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              wo.paymentStatus === 'PAID'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {wo.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact</h2>
              <dl className="space-y-3">
                {vendor.email && (
                  <div>
                    <dt className="text-xs text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">
                      <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:text-blue-800">
                        {vendor.email}
                      </a>
                    </dd>
                  </div>
                )}
                {vendor.phone && (
                  <div>
                    <dt className="text-xs text-gray-500">Phone</dt>
                    <dd className="text-sm text-gray-900">
                      <a href={`tel:${vendor.phone}`} className="text-blue-600 hover:text-blue-800">
                        {vendor.phone}
                      </a>
                    </dd>
                  </div>
                )}
                {(vendor.address || vendor.city || vendor.state) && (
                  <div>
                    <dt className="text-xs text-gray-500">Address</dt>
                    <dd className="text-sm text-gray-900">
                      {vendor.address && <div>{vendor.address}</div>}
                      {(vendor.city || vendor.state || vendor.zipCode) && (
                        <div>
                          {vendor.city}{vendor.city && vendor.state && ', '}{vendor.state} {vendor.zipCode}
                        </div>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Specialties */}
            {vendor.specialties.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Specialties</h2>
                <div className="flex flex-wrap gap-2">
                  {vendor.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="inline-flex px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-lg"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
              <dl className="space-y-3">
                {vendor.paymentTerms && (
                  <div>
                    <dt className="text-xs text-gray-500">Payment Terms</dt>
                    <dd className="text-sm text-gray-900">{vendor.paymentTerms.replace('_', ' ')}</dd>
                  </div>
                )}
                {vendor.taxId && (
                  <div>
                    <dt className="text-xs text-gray-500">Tax ID</dt>
                    <dd className="text-sm text-gray-900">{vendor.taxId}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Notes */}
            {vendor.notes && (
              <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
