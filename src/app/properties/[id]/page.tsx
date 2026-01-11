'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Property {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  totalUnits: number | null;
  propertyType: string | null;
  notes: string | null;
  active: boolean;
  units: Unit[];
  leases: Lease[];
  libraryDocuments: PropertyDocument[];
}

interface PropertyDocument {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  category: string | null;
  tags: string[];
  description: string | null;
  createdAt: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  status: string;
  notes: string | null;
  leases: UnitLease[];
}

interface UnitLease {
  id: string;
  tenantName: string;
  scheduledCharges: { amount: number }[];
}

interface Lease {
  id: string;
  tenantName: string;
  unitName: string;
  startDate: string;
  endDate: string;
  status: string;
  scheduledCharges?: { amount: number }[];
}

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({
    unitNumber: '',
    bedrooms: '',
    bathrooms: '',
    squareFeet: '',
    status: 'VACANT',
    notes: ''
  });

  // Document upload state
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docForm, setDocForm] = useState({
    file: null as File | null,
    category: '',
    description: '',
    tags: ''
  });

  // Add Tenant & Lease wizard state
  const [showLeaseWizard, setShowLeaseWizard] = useState(false);
  const [leaseWizardStep, setLeaseWizardStep] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [leaseSubmitting, setLeaseSubmitting] = useState(false);
  const [leaseError, setLeaseError] = useState('');
  const [tenantForm, setTenantForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: ''
  });
  const [leaseForm, setLeaseForm] = useState({
    startDate: '',
    endDate: '',
    monthlyRent: '',
    securityDeposit: ''
  });
  const [createdLeaseId, setCreatedLeaseId] = useState<string | null>(null);

  const categoryLabels: Record<string, string> = {
    LEASE_AGREEMENT: 'Lease Agreement',
    RECEIPT: 'Receipt',
    INVOICE: 'Invoice',
    MAINTENANCE_AUTHORIZATION: 'Maintenance',
    OTHER: 'Other'
  };

  useEffect(() => {
    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}`);
      if (!res.ok) throw new Error('Failed to fetch property');
      const data = await res.json();
      setProperty(data);
    } catch (error) {
      console.error('Failed to fetch property:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCreateUnit = () => {
    setEditingUnit(null);
    setUnitForm({
      unitNumber: '',
      bedrooms: '',
      bathrooms: '',
      squareFeet: '',
      status: 'VACANT',
      notes: ''
    });
    setShowUnitModal(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitForm({
      unitNumber: unit.unitNumber,
      bedrooms: unit.bedrooms?.toString() || '',
      bathrooms: unit.bathrooms?.toString() || '',
      squareFeet: unit.squareFeet?.toString() || '',
      status: unit.status,
      notes: unit.notes || ''
    });
    setShowUnitModal(true);
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        propertyId,
        unitNumber: unitForm.unitNumber,
        bedrooms: unitForm.bedrooms ? parseInt(unitForm.bedrooms) : null,
        bathrooms: unitForm.bathrooms ? parseFloat(unitForm.bathrooms) : null,
        squareFeet: unitForm.squareFeet ? parseInt(unitForm.squareFeet) : null,
        status: unitForm.status,
        notes: unitForm.notes || null
      };

      const url = editingUnit
        ? `/api/units/${editingUnit.id}`
        : '/api/units';
      const method = editingUnit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save unit');
      }

      setShowUnitModal(false);
      fetchProperty();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;

    try {
      const res = await fetch(`/api/units/${unitId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete unit');
      }

      fetchProperty();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Add Tenant & Lease wizard functions
  const openLeaseWizard = (unit: Unit) => {
    setSelectedUnit(unit);
    setLeaseWizardStep(1);
    setTenantForm({ firstName: '', lastName: '', companyName: '', email: '', phone: '' });
    // Default to today and 1 year from now
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setLeaseForm({
      startDate: today.toISOString().split('T')[0],
      endDate: nextYear.toISOString().split('T')[0],
      monthlyRent: '',
      securityDeposit: ''
    });
    setLeaseError('');
    setCreatedLeaseId(null);
    setShowLeaseWizard(true);
  };

  const resetLeaseWizard = () => {
    setShowLeaseWizard(false);
    setSelectedUnit(null);
    setLeaseWizardStep(1);
    setTenantForm({ firstName: '', lastName: '', companyName: '', email: '', phone: '' });
    setLeaseForm({ startDate: '', endDate: '', monthlyRent: '', securityDeposit: '' });
    setLeaseError('');
    setCreatedLeaseId(null);
  };

  const handleCreateTenantAndLease = async () => {
    if (!selectedUnit || !property) return;

    setLeaseSubmitting(true);
    setLeaseError('');

    try {
      // Create lease with tenant info embedded
      // For commercial: companyName is primary, contact name is tenantName
      // For residential: just tenantName (first + last)
      const isCommercial = property.propertyType === 'COMMERCIAL';
      const tenantName = isCommercial
        ? `${tenantForm.firstName} ${tenantForm.lastName}`.trim() || tenantForm.companyName
        : `${tenantForm.firstName} ${tenantForm.lastName}`.trim();

      const leaseRes = await fetch('/api/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: tenantName,
          companyName: isCommercial ? tenantForm.companyName : null,
          tenantEmail: tenantForm.email || null,
          tenantPhone: tenantForm.phone || null,
          unitId: selectedUnit.id,
          unitName: selectedUnit.unitNumber,
          propertyId: property.id,
          propertyName: property.name,
          startDate: leaseForm.startDate,
          endDate: leaseForm.endDate,
          monthlyRentAmount: leaseForm.monthlyRent ? parseFloat(leaseForm.monthlyRent) : null,
          securityDepositAmount: leaseForm.securityDeposit ? parseFloat(leaseForm.securityDeposit) : null,
          status: 'ACTIVE'
        })
      });

      if (!leaseRes.ok) {
        const data = await leaseRes.json();
        throw new Error(data.error || 'Failed to create lease');
      }

      const lease = await leaseRes.json();
      setCreatedLeaseId(lease.id);
      setLeaseWizardStep(3);
      fetchProperty();
    } catch (error: any) {
      setLeaseError(error.message);
    } finally {
      setLeaseSubmitting(false);
    }
  };

  const getUnitStatusColor = (status: string) => {
    switch (status) {
      case 'VACANT': return 'bg-green-100 text-green-800';
      case 'OCCUPIED': return 'bg-blue-100 text-blue-800';
      case 'MAINTENANCE': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaseStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'ENDED': return 'bg-gray-100 text-gray-800';
      case 'TERMINATED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    return '📎';
  };

  const handleDocUpload = async () => {
    if (!docForm.file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', docForm.file);
      formData.append('propertyId', propertyId);
      if (docForm.category) formData.append('category', docForm.category);
      if (docForm.description) formData.append('description', docForm.description);
      if (docForm.tags) formData.append('tags', docForm.tags);
      formData.append('uploadedBy', 'Property Manager');

      const res = await fetch('/api/library', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to upload document');

      setShowDocModal(false);
      setDocForm({ file: null, category: '', description: '', tags: '' });
      fetchProperty();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Delete this document?')) return;

    try {
      const res = await fetch(`/api/library/${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      fetchProperty();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading property...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Property not found</p>
          <a href="/properties" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to Properties
          </a>
        </div>
      </div>
    );
  }

  const occupiedUnits = property.units.filter(u => u.leases.length > 0).length;
  const totalUnits = property.totalUnits || property.units.length;
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
  const monthlyRevenue = property.leases
    .filter(l => l.status === 'ACTIVE')
    .reduce((sum, l) => {
      const rentCharge = l.scheduledCharges?.[0];
      return sum + (rentCharge ? Number(rentCharge.amount) : 0);
    }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
              {property.address && (
                <p className="text-gray-600 mt-2">
                  {property.address}
                  {property.city && `, ${property.city}`}
                  {property.state && `, ${property.state}`}
                  {property.zipCode && ` ${property.zipCode}`}
                </p>
              )}
              {property.propertyType && (
                <p className="text-sm text-gray-500 mt-1">
                  Type: {property.propertyType}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Units</p>
            <p className="text-3xl font-bold text-gray-900">{totalUnits}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Occupied</p>
            <p className="text-3xl font-bold text-blue-600">{occupiedUnits}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Occupancy Rate</p>
            <p className="text-3xl font-bold text-gray-900">{occupancyRate.toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Monthly Revenue</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyRevenue)}</p>
          </div>
        </div>

        {/* Units Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Units</h2>
              <p className="text-sm text-gray-600 mt-1">{property.units.length} units in this property</p>
            </div>
            <button
              onClick={handleCreateUnit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Unit
            </button>
          </div>

          {property.units.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No units yet</p>
              <button
                onClick={handleCreateUnit}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first unit
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {property.propertyType === 'COMMERCIAL' ? 'Space' : 'Unit Number'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {property.propertyType === 'COMMERCIAL' ? 'Size' : 'Details'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {property.propertyType === 'COMMERCIAL' ? 'Company' : 'Tenant'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {property.propertyType === 'COMMERCIAL' ? 'Monthly' : 'Rent'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {property.units.map((unit) => (
                    <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{unit.unitNumber}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {property.propertyType === 'COMMERCIAL' ? (
                          /* Commercial: Just show square feet */
                          unit.squareFeet ? (
                            <div>{unit.squareFeet.toLocaleString()} sq ft</div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )
                        ) : (
                          /* Residential: Show beds/baths and sq ft */
                          <>
                            <div>
                              {unit.bedrooms && `${unit.bedrooms} bed`}
                              {unit.bedrooms && unit.bathrooms && ' • '}
                              {unit.bathrooms && `${unit.bathrooms} bath`}
                            </div>
                            {unit.squareFeet && (
                              <div className="text-gray-500">{unit.squareFeet.toLocaleString()} sq ft</div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {unit.leases.length > 0 ? (
                          <div>
                            {unit.leases[0].tenantName}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {unit.leases.length > 0 && unit.leases[0].scheduledCharges?.[0]
                          ? formatCurrency(Number(unit.leases[0].scheduledCharges[0].amount))
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getUnitStatusColor(unit.status)}`}>
                          {unit.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {unit.status === 'VACANT' && unit.leases.length === 0 && (
                            <button
                              onClick={() => openLeaseWizard(unit)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              {property.propertyType === 'COMMERCIAL' ? 'Add Company' : 'Add Tenant'}
                            </button>
                          )}
                          <button
                            onClick={() => handleEditUnit(unit)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUnit(unit.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Active Leases Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Active Leases</h2>
            <p className="text-sm text-gray-600 mt-1">
              {property.leases.filter(l => l.status === 'ACTIVE').length} active leases
            </p>
          </div>

          {property.leases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No leases yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Lease Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Monthly Rent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {property.leases.map((lease) => (
                    <tr key={lease.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{lease.tenantName}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {lease.unitName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(lease.scheduledCharges?.[0] ? Number(lease.scheduledCharges[0].amount) : null)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLeaseStatusColor(lease.status)}`}>
                          {lease.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => window.location.href = `/leases/${lease.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Property Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Property Documents</h2>
              <p className="text-sm text-gray-600 mt-1">
                Insurance, permits, inspections, photos, and other property files
              </p>
            </div>
            <button
              onClick={() => setShowDocModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Upload Document
            </button>
          </div>

          {!property.libraryDocuments || property.libraryDocuments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📁</div>
              <p className="text-gray-500 mb-4">No documents uploaded yet</p>
              <button
                onClick={() => setShowDocModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Upload your first document
              </button>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {property.libraryDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{getFileIcon(doc.mimeType)}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{doc.fileName}</h4>
                      <p className="text-sm text-gray-500">{formatFileSize(doc.fileSize)}</p>
                      {doc.category && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          {categoryLabels[doc.category] || doc.category}
                        </span>
                      )}
                      {doc.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{doc.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium text-center hover:bg-gray-200 transition-colors"
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Property Notes */}
        {property.notes && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{property.notes}</p>
          </div>
        )}
      </div>

      {/* Add Tenant & Lease Wizard */}
      {showLeaseWizard && selectedUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Progress Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900">
                  {leaseWizardStep === 1 && (property.propertyType === 'COMMERCIAL' ? 'Company Information' : 'Tenant Information')}
                  {leaseWizardStep === 2 && 'Lease Details'}
                  {leaseWizardStep === 3 && (property.propertyType === 'COMMERCIAL' ? 'Company Added!' : 'Tenant Added!')}
                </h2>
                <button
                  onClick={resetLeaseWizard}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Unit info */}
              <div className="text-sm text-gray-600 mb-3">
                Adding {property.propertyType === 'COMMERCIAL' ? 'company' : 'tenant'} to <span className="font-medium text-gray-900">{selectedUnit.unitNumber}</span>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      leaseWizardStep > step
                        ? 'bg-green-500 text-white'
                        : leaseWizardStep === step
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {leaseWizardStep > step ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : step}
                    </div>
                    {step < 3 && (
                      <div className={`flex-1 h-1 mx-2 rounded ${
                        leaseWizardStep > step ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{property.propertyType === 'COMMERCIAL' ? 'Company' : 'Tenant'}</span>
                <span>Lease</span>
                <span>Done</span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {leaseError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{leaseError}</p>
                </div>
              )}

              {/* Step 1: Tenant Info */}
              {leaseWizardStep === 1 && (
                <div className="space-y-4">
                  {property.propertyType === 'COMMERCIAL' ? (
                    /* Commercial: Company Name + Contact Name */
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={tenantForm.companyName}
                          onChange={(e) => setTenantForm({ ...tenantForm, companyName: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="ACME Logistics Inc"
                          autoFocus
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact First Name
                          </label>
                          <input
                            type="text"
                            value={tenantForm.firstName}
                            onChange={(e) => setTenantForm({ ...tenantForm, firstName: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="John"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Last Name
                          </label>
                          <input
                            type="text"
                            value={tenantForm.lastName}
                            onChange={(e) => setTenantForm({ ...tenantForm, lastName: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Smith"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Residential: First Name + Last Name */
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={tenantForm.firstName}
                          onChange={(e) => setTenantForm({ ...tenantForm, firstName: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="John"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={tenantForm.lastName}
                          onChange={(e) => setTenantForm({ ...tenantForm, lastName: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Smith"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={tenantForm.email}
                      onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={property.propertyType === 'COMMERCIAL' ? 'contact@company.com' : 'john.smith@email.com'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={tenantForm.phone}
                      onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Lease Details */}
              {leaseWizardStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={leaseForm.startDate}
                        onChange={(e) => setLeaseForm({ ...leaseForm, startDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={leaseForm.endDate}
                        onChange={(e) => setLeaseForm({ ...leaseForm, endDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Rent *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={leaseForm.monthlyRent}
                        onChange={(e) => setLeaseForm({ ...leaseForm, monthlyRent: e.target.value })}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="1500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Security Deposit
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={leaseForm.securityDeposit}
                        onChange={(e) => setLeaseForm({ ...leaseForm, securityDeposit: e.target.value })}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="1500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Complete */}
              {leaseWizardStep === 3 && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {property.propertyType === 'COMMERCIAL' ? 'Company Added!' : 'Tenant Added!'}
                  </h3>
                  <p className="text-gray-600 mb-2">
                    <strong>
                      {property.propertyType === 'COMMERCIAL'
                        ? tenantForm.companyName
                        : `${tenantForm.firstName} ${tenantForm.lastName}`}
                    </strong> has been added to <strong>{selectedUnit.unitNumber}</strong>.
                  </p>
                  <p className="text-sm text-gray-500">
                    Lease: {formatCurrency(parseFloat(leaseForm.monthlyRent))}/month
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
              {leaseWizardStep === 1 && (
                <>
                  <button
                    type="button"
                    onClick={resetLeaseWizard}
                    className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setLeaseWizardStep(2)}
                    disabled={property.propertyType === 'COMMERCIAL'
                      ? !tenantForm.companyName.trim()
                      : !tenantForm.firstName.trim() || !tenantForm.lastName.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next: Lease Details
                  </button>
                </>
              )}

              {leaseWizardStep === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => setLeaseWizardStep(1)}
                    className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateTenantAndLease}
                    disabled={leaseSubmitting || !leaseForm.startDate || !leaseForm.endDate || !leaseForm.monthlyRent}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {leaseSubmitting ? 'Creating...' : 'Create Lease'}
                  </button>
                </>
              )}

              {leaseWizardStep === 3 && (
                <>
                  <button
                    type="button"
                    onClick={resetLeaseWizard}
                    className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
                  >
                    Done
                  </button>
                  {createdLeaseId && (
                    <button
                      onClick={() => window.location.href = `/leases/${createdLeaseId}`}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      View Lease
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Upload Property Document</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                <input
                  type="file"
                  onChange={(e) => setDocForm({ ...docForm, file: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={docForm.category}
                  onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category...</option>
                  <option value="LEASE_AGREEMENT">Lease Agreement</option>
                  <option value="RECEIPT">Receipt</option>
                  <option value="INVOICE">Invoice</option>
                  <option value="MAINTENANCE_AUTHORIZATION">Maintenance</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={docForm.description}
                  onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={docForm.tags}
                  onChange={(e) => setDocForm({ ...docForm, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="insurance, 2024, important"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowDocModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleDocUpload}
                disabled={!docForm.file || uploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUnit
                  ? (property.propertyType === 'COMMERCIAL' ? 'Edit Space' : 'Edit Unit')
                  : (property.propertyType === 'COMMERCIAL' ? 'Add New Space' : 'Add New Unit')}
              </h2>
            </div>

            <form onSubmit={handleUnitSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {property.propertyType === 'COMMERCIAL' ? 'Space Name/Description *' : 'Unit Number *'}
                </label>
                <input
                  type="text"
                  required
                  value={unitForm.unitNumber}
                  onChange={(e) => setUnitForm({ ...unitForm, unitNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={property.propertyType === 'COMMERCIAL' ? '1st Floor - 5,000 SF' : '101'}
                />
              </div>

              {/* Residential: Beds, Baths, Sq Ft | Commercial: Just Sq Ft */}
              {property.propertyType === 'COMMERCIAL' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Square Feet
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={unitForm.squareFeet}
                    onChange={(e) => setUnitForm({ ...unitForm, squareFeet: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="5000"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={unitForm.bedrooms}
                      onChange={(e) => setUnitForm({ ...unitForm, bedrooms: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={unitForm.bathrooms}
                      onChange={(e) => setUnitForm({ ...unitForm, bathrooms: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Square Feet
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={unitForm.squareFeet}
                      onChange={(e) => setUnitForm({ ...unitForm, squareFeet: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="850"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  required
                  value={unitForm.status}
                  onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="VACANT">Vacant</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={unitForm.notes}
                  onChange={(e) => setUnitForm({ ...unitForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes about this unit..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingUnit ? 'Update Unit' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
