'use client';

import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { PropertiesListSkeleton } from '@/components/Skeleton';

interface Property {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  monthlyRevenue: number;
}

interface UnitForm {
  unitNumber: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  rent: string;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Property details
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    propertyType: 'WAREHOUSE',
    totalSquareFeet: ''
  });

  // Created property ID (after step 1)
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);

  // Step 2: Units
  const [units, setUnits] = useState<UnitForm[]>([
    { unitNumber: '1', bedrooms: '', bathrooms: '', squareFeet: '', rent: '' }
  ]);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties');
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setPropertyForm({
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      propertyType: 'WAREHOUSE'
    });
    setUnits([{ unitNumber: 'Bay 1', bedrooms: '0', bathrooms: '0', squareFeet: '', rent: '' }]);
    setCreatedPropertyId(null);
    setError('');
  };

  const handleCreateProperty = async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyForm)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create property');
      }

      setCreatedPropertyId(data.property.id);
      setWizardStep(2);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addUnit = () => {
    const nextNumber = units.length + 1;
    setUnits([...units, {
      unitNumber: nextNumber.toString(),
      bedrooms: '',
      bathrooms: '',
      squareFeet: '',
      rent: ''
    }]);
  };

  const removeUnit = (index: number) => {
    if (units.length > 1) {
      setUnits(units.filter((_, i) => i !== index));
    }
  };

  const updateUnit = (index: number, field: keyof UnitForm, value: string) => {
    const updated = [...units];
    updated[index][field] = value;
    setUnits(updated);
  };

  const handleCreateUnits = async () => {
    if (!createdPropertyId) return;

    setSubmitting(true);
    setError('');

    try {
      // Create all units
      for (const unit of units) {
        if (!unit.unitNumber.trim()) continue;

        const res = await fetch('/api/units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId: createdPropertyId,
            unitNumber: unit.unitNumber,
            bedrooms: unit.bedrooms ? parseInt(unit.bedrooms) : null,
            bathrooms: unit.bathrooms ? parseFloat(unit.bathrooms) : null,
            squareFeet: unit.squareFeet ? parseInt(unit.squareFeet) : null,
            status: 'VACANT'
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Failed to create unit ${unit.unitNumber}`);
        }
      }

      // Move to completion step
      setWizardStep(3);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    setShowWizard(false);
    resetWizard();
    fetchProperties();
  };

  const handleViewProperty = () => {
    if (createdPropertyId) {
      window.location.href = `/properties/${createdPropertyId}`;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return <PropertiesListSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Properties</h1>
              <p className="text-sm text-gray-600 mt-1">Manage your warehouse properties and spaces</p>
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base whitespace-nowrap"
            >
              + Property
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {properties.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl sm:text-3xl">🏭</span>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">
              No properties yet
            </h3>
            <p className="text-gray-500 mb-6 text-sm sm:text-base">
              Get started by adding your first warehouse property
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Property
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div
                key={property.id}
                onClick={() => window.location.href = `/properties/${property.id}`}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 cursor-pointer"
              >
                {/* Gradient Overlay */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-3xl group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-500"></div>

                <div className="relative p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🏭</span>
                        <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full uppercase tracking-wide">
                          Warehouse
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1 truncate group-hover:text-blue-600 transition-colors">{property.name}</h3>
                      {property.address && (
                        <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {property.address}
                          {property.city && `, ${property.city}`}
                          {property.state && `, ${property.state}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-4">
                    {/* Occupancy */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Occupancy Rate</span>
                        <span className={`text-sm font-bold ${
                          property.occupancyRate >= 90 ? 'text-green-600' :
                          property.occupancyRate >= 70 ? 'text-blue-600' :
                          property.occupancyRate >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>{property.occupancyRate}%</span>
                      </div>
                      <div className="relative w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                            property.occupancyRate >= 90 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                            property.occupancyRate >= 70 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                            property.occupancyRate >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            'bg-gradient-to-r from-red-500 to-pink-500'
                          }`}
                          style={{ width: `${property.occupancyRate}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                        </svg>
                        {property.occupiedUnits} of {property.totalUnits} spaces occupied
                      </p>
                    </div>

                    {/* Revenue */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly Revenue</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                          {formatCurrency(property.monthlyRevenue)}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-xl">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 group-hover:from-blue-100 group-hover:to-purple-100 transition-all duration-300">
                  <span className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                    View Details
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Property Setup Wizard */}
      {showWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Progress Header */}
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {wizardStep === 1 && 'Property Details'}
                  {wizardStep === 2 && 'Add Spaces'}
                  {wizardStep === 3 && 'Setup Complete'}
                </h2>
                <button
                  onClick={() => {
                    setShowWizard(false);
                    resetWizard();
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                      wizardStep > step
                        ? 'bg-green-500 text-white'
                        : wizardStep === step
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                    }`}>
                      {wizardStep > step ? (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : step}
                    </div>
                    {step < 3 && (
                      <div className={`flex-1 h-1 mx-1 sm:mx-2 rounded ${
                        wizardStep > step ? 'bg-green-500' : 'bg-slate-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>Property</span>
                <span>Spaces</span>
                <span>Done</span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Step 1: Property Details */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Property Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={propertyForm.name}
                      onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-lg"
                      placeholder="Industrial Park West"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property Type *
                    </label>
                    <select
                      required
                      value={propertyForm.propertyType}
                      onChange={(e) => setPropertyForm({ ...propertyForm, propertyType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    >
                      <option value="WAREHOUSE">Warehouse</option>
                      <option value="INDUSTRIAL">Industrial</option>
                      <option value="COMMERCIAL">Commercial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={propertyForm.address}
                      onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={propertyForm.city}
                        onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        placeholder="Los Angeles"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={propertyForm.state}
                        onChange={(e) => setPropertyForm({ ...propertyForm, state: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        placeholder="CA"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        ZIP
                      </label>
                      <input
                        type="text"
                        value={propertyForm.zipCode}
                        onChange={(e) => setPropertyForm({ ...propertyForm, zipCode: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        placeholder="90001"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Total Square Footage
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={propertyForm.totalSquareFeet}
                      onChange={(e) => setPropertyForm({ ...propertyForm, totalSquareFeet: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="e.g. 200000"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Total building square footage for tracking space allocation across units.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Add Spaces */}
              {wizardStep === 2 && (() => {
                const totalSF = propertyForm.totalSquareFeet ? parseInt(propertyForm.totalSquareFeet) : 0;
                const allocatedSF = units.reduce((sum, u) => sum + (u.squareFeet ? parseInt(u.squareFeet) : 0), 0);
                const remainingSF = totalSF - allocatedSF;
                const allocationPct = totalSF > 0 ? Math.min((allocatedSF / totalSF) * 100, 100) : 0;
                return (
                <div className="space-y-4">
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">
                    Add warehouse spaces to your property. You can add more later.
                  </p>

                  {totalSF > 0 && (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-slate-700">Space Allocation</span>
                        <span className="text-slate-600">
                          {allocatedSF.toLocaleString()} / {totalSF.toLocaleString()} sq ft
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
                        <div
                          className={`h-3 rounded-full transition-all ${remainingSF < 0 ? 'bg-red-500' : 'bg-blue-600'}`}
                          style={{ width: `${Math.min(allocationPct, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Allocated: {allocationPct.toFixed(1)}%</span>
                        <span className={remainingSF < 0 ? 'text-red-600 font-medium' : ''}>
                          {remainingSF >= 0 ? `${remainingSF.toLocaleString()} sq ft remaining` : `${Math.abs(remainingSF).toLocaleString()} sq ft over-allocated`}
                        </span>
                      </div>
                    </div>
                  )}

                  {units.map((unit, index) => (
                    <div key={index} className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-900 text-sm sm:text-base">
                          Space {index + 1}
                        </span>
                        {units.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeUnit(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                        <div className="col-span-3 sm:col-span-1">
                          <label className="block text-xs text-gray-500 mb-1">Space/Bay #</label>
                          <input
                            type="text"
                            value={unit.unitNumber}
                            onChange={(e) => updateUnit(index, 'unitNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="Bay 1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Docks</label>
                          <input
                            type="number"
                            min="0"
                            value={unit.bedrooms}
                            onChange={(e) => updateUnit(index, 'bedrooms', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Offices</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={unit.bathrooms}
                            onChange={(e) => updateUnit(index, 'bathrooms', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div className="hidden sm:block">
                          <label className="block text-xs text-slate-500 mb-1">Sq Ft</label>
                          <input
                            type="number"
                            min="0"
                            value={unit.squareFeet}
                            onChange={(e) => updateUnit(index, 'squareFeet', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="5000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Rent</label>
                          <input
                            type="number"
                            min="0"
                            value={unit.rent}
                            onChange={(e) => updateUnit(index, 'rent', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="4500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addUnit}
                    className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 rounded-xl transition-colors font-medium text-sm sm:text-base"
                  >
                    + Add Another Space
                  </button>
                </div>
                );
              })()}

              {/* Step 3: Complete */}
              {wizardStep === 3 && (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                    Property Created!
                  </h3>
                  <p className="text-slate-600 mb-2 text-sm sm:text-base">
                    <strong>{propertyForm.name}</strong> has been set up with <strong>{units.length} {units.length !== 1 ? 'units' : 'unit'}</strong>.
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500">
                    You can now add tenants and leases from the property page.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
              {wizardStep === 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWizard(false);
                      resetWizard();
                    }}
                    className="px-6 py-3 sm:py-2 text-slate-700 hover:text-slate-900 font-medium border border-slate-300 rounded-lg sm:border-0"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateProperty}
                    disabled={!propertyForm.name.trim() || submitting}
                    className="px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating...' : 'Next: Add Spaces'}
                  </button>
                </>
              )}

              {wizardStep === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    disabled={submitting}
                    className="px-6 py-3 sm:py-2 text-slate-700 hover:text-slate-900 font-medium border border-slate-300 rounded-lg sm:border-0"
                  >
                    Skip for Now
                  </button>
                  <button
                    onClick={handleCreateUnits}
                    disabled={submitting || !units.some(u => u.unitNumber.trim())}
                    className="px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating Spaces...' : `Create ${units.length} ${units.length !== 1 ? 'Spaces' : 'Space'}`}
                  </button>
                </>
              )}

              {wizardStep === 3 && (
                <>
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="px-6 py-3 sm:py-2 text-slate-700 hover:text-slate-900 font-medium border border-slate-300 rounded-lg sm:border-0"
                  >
                    Back to Properties
                  </button>
                  <button
                    onClick={handleViewProperty}
                    className="px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    View Property
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
