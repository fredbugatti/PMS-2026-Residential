'use client';

import { useState, useEffect } from 'react';

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
    zipCode: ''
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
      zipCode: ''
    });
    setUnits([{ unitNumber: '1', bedrooms: '', bathrooms: '', squareFeet: '', rent: '' }]);
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Properties</h1>
              <p className="text-sm text-gray-600 mt-1">Manage your rental properties and units</p>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl sm:text-3xl">🏠</span>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              No properties yet
            </h3>
            <p className="text-gray-500 mb-6 text-sm sm:text-base">
              Get started by adding your first property
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Property
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {properties.map((property) => (
              <div
                key={property.id}
                onClick={() => window.location.href = `/properties/${property.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">{property.name}</h3>
                      {property.address && (
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          {property.address}
                          {property.city && `, ${property.city}`}
                          {property.state && `, ${property.state}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 text-xs sm:text-sm">Occupancy</span>
                        <span className="font-semibold text-gray-900 text-xs sm:text-sm">{property.occupancyRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            property.occupancyRate >= 90 ? 'bg-green-500' :
                            property.occupancyRate >= 70 ? 'bg-blue-500' :
                            property.occupancyRate >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${property.occupancyRate}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {property.occupiedUnits} / {property.totalUnits} units occupied
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-xs sm:text-sm text-gray-600">Monthly Revenue</span>
                      <span className="text-base sm:text-lg font-bold text-green-600">
                        {formatCurrency(property.monthlyRevenue)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 bg-gray-50 px-4 sm:px-6 py-3">
                  <span className="text-sm font-medium text-blue-600">
                    View Details →
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
            <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  {wizardStep === 1 && 'Property Details'}
                  {wizardStep === 2 && 'Add Units'}
                  {wizardStep === 3 && 'Setup Complete'}
                </h2>
                <button
                  onClick={() => {
                    setShowWizard(false);
                    resetWizard();
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
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
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {wizardStep > step ? (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : step}
                    </div>
                    {step < 3 && (
                      <div className={`flex-1 h-1 mx-1 sm:mx-2 rounded ${
                        wizardStep > step ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Property</span>
                <span>Units</span>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={propertyForm.name}
                      onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-lg"
                      placeholder="Sunset Apartments"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={propertyForm.address}
                      onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={propertyForm.city}
                        onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        placeholder="Los Angeles"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={propertyForm.state}
                        onChange={(e) => setPropertyForm({ ...propertyForm, state: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        placeholder="CA"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP
                      </label>
                      <input
                        type="text"
                        value={propertyForm.zipCode}
                        onChange={(e) => setPropertyForm({ ...propertyForm, zipCode: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        placeholder="90001"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Add Units */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">
                    Add units to your property. You can add more later.
                  </p>

                  {units.map((unit, index) => (
                    <div key={index} className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-900 text-sm sm:text-base">
                          Unit {index + 1}
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
                          <label className="block text-xs text-gray-500 mb-1">Unit #</label>
                          <input
                            type="text"
                            value={unit.unitNumber}
                            onChange={(e) => updateUnit(index, 'unitNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="1A"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Beds</label>
                          <input
                            type="number"
                            min="0"
                            value={unit.bedrooms}
                            onChange={(e) => updateUnit(index, 'bedrooms', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="2"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Baths</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={unit.bathrooms}
                            onChange={(e) => updateUnit(index, 'bathrooms', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="1"
                          />
                        </div>
                        <div className="hidden sm:block">
                          <label className="block text-xs text-gray-500 mb-1">Sq Ft</label>
                          <input
                            type="number"
                            min="0"
                            value={unit.squareFeet}
                            onChange={(e) => updateUnit(index, 'squareFeet', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="850"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Rent</label>
                          <input
                            type="number"
                            min="0"
                            value={unit.rent}
                            onChange={(e) => updateUnit(index, 'rent', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="1500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addUnit}
                    className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 rounded-xl transition-colors font-medium text-sm sm:text-base"
                  >
                    + Add Another Unit
                  </button>
                </div>
              )}

              {/* Step 3: Complete */}
              {wizardStep === 3 && (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    Property Created!
                  </h3>
                  <p className="text-gray-600 mb-2 text-sm sm:text-base">
                    <strong>{propertyForm.name}</strong> has been set up with <strong>{units.length} {units.length !== 1 ? 'units' : 'unit'}</strong>.
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    You can now add tenants and leases from the property page.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
              {wizardStep === 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWizard(false);
                      resetWizard();
                    }}
                    className="px-6 py-3 sm:py-2 text-gray-700 hover:text-gray-900 font-medium border border-gray-300 rounded-lg sm:border-0"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateProperty}
                    disabled={!propertyForm.name.trim() || submitting}
                    className="px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating...' : 'Next: Add Units'}
                  </button>
                </>
              )}

              {wizardStep === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    disabled={submitting}
                    className="px-6 py-3 sm:py-2 text-gray-700 hover:text-gray-900 font-medium border border-gray-300 rounded-lg sm:border-0"
                  >
                    Skip for Now
                  </button>
                  <button
                    onClick={handleCreateUnits}
                    disabled={submitting || !units.some(u => u.unitNumber.trim())}
                    className="px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating Units...' : `Create ${units.length} ${units.length !== 1 ? 'Units' : 'Unit'}`}
                  </button>
                </>
              )}

              {wizardStep === 3 && (
                <>
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="px-6 py-3 sm:py-2 text-gray-700 hover:text-gray-900 font-medium border border-gray-300 rounded-lg sm:border-0"
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
