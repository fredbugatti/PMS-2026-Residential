'use client';

import { useState, useEffect } from 'react';
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
  totalSquareFeet: number | null;
  occupiedSquareFeet: number | null;
}

interface UnitForm {
  unitNumber: string;
  squareFeet: string;
  loadingDocks: string;
  driveInDoors: string;
  officeSquareFeet: string;
  clearHeight: string;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Property details (warehouse)
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    totalSquareFeet: '',
    leasableSquareFeet: '',
    totalLoadingDocks: '',
    totalDriveInDoors: '',
    clearHeight: '',
    parkingSpaces: '',
    yearBuilt: ''
  });

  // Created property ID (after step 1)
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);

  // Step 2: Spaces (warehouse)
  const [units, setUnits] = useState<UnitForm[]>([
    { unitNumber: 'Suite 100', squareFeet: '', loadingDocks: '', driveInDoors: '', officeSquareFeet: '', clearHeight: '' }
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
      totalSquareFeet: '',
      leasableSquareFeet: '',
      totalLoadingDocks: '',
      totalDriveInDoors: '',
      clearHeight: '',
      parkingSpaces: '',
      yearBuilt: ''
    });
    setUnits([{ unitNumber: 'Suite 100', squareFeet: '', loadingDocks: '', driveInDoors: '', officeSquareFeet: '', clearHeight: '' }]);
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
        body: JSON.stringify({
          name: propertyForm.name,
          address: propertyForm.address,
          city: propertyForm.city,
          state: propertyForm.state,
          zipCode: propertyForm.zipCode,
          propertyType: 'WAREHOUSE',
          totalSquareFeet: propertyForm.totalSquareFeet ? parseInt(propertyForm.totalSquareFeet) : null,
          leasableSquareFeet: propertyForm.leasableSquareFeet ? parseInt(propertyForm.leasableSquareFeet) : null,
          totalLoadingDocks: propertyForm.totalLoadingDocks ? parseInt(propertyForm.totalLoadingDocks) : null,
          totalDriveInDoors: propertyForm.totalDriveInDoors ? parseInt(propertyForm.totalDriveInDoors) : null,
          clearHeight: propertyForm.clearHeight ? parseFloat(propertyForm.clearHeight) : null,
          parkingSpaces: propertyForm.parkingSpaces ? parseInt(propertyForm.parkingSpaces) : null,
          yearBuilt: propertyForm.yearBuilt ? parseInt(propertyForm.yearBuilt) : null
        })
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
    const nextNumber = (units.length + 1) * 100;
    setUnits([...units, {
      unitNumber: `Suite ${nextNumber}`,
      squareFeet: '',
      loadingDocks: '',
      driveInDoors: '',
      officeSquareFeet: '',
      clearHeight: ''
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
      // Create all spaces (warehouse units)
      for (const unit of units) {
        if (!unit.unitNumber.trim()) continue;

        const res = await fetch('/api/units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId: createdPropertyId,
            unitNumber: unit.unitNumber,
            squareFeet: unit.squareFeet ? parseInt(unit.squareFeet) : null,
            loadingDocks: unit.loadingDocks ? parseInt(unit.loadingDocks) : null,
            driveInDoors: unit.driveInDoors ? parseInt(unit.driveInDoors) : null,
            officeSquareFeet: unit.officeSquareFeet ? parseInt(unit.officeSquareFeet) : null,
            clearHeight: unit.clearHeight ? parseFloat(unit.clearHeight) : null,
            status: 'VACANT'
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Failed to create space ${unit.unitNumber}`);
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
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Warehouse Properties</h1>
              <p className="text-sm text-slate-600 mt-1">Manage your warehouse buildings and spaces</p>
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="px-3 sm:px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm sm:text-base whitespace-nowrap"
            >
              + Warehouse
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {properties.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl sm:text-3xl">🏭</span>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">
              No warehouses yet
            </h3>
            <p className="text-slate-500 mb-6 text-sm sm:text-base">
              Get started by adding your first warehouse property
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              Add Warehouse
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {properties.map((property) => (
              <div
                key={property.id}
                onClick={() => window.location.href = `/properties/${property.id}`}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🏭</span>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{property.name}</h3>
                      </div>
                      {property.address && (
                        <p className="text-xs sm:text-sm text-slate-600 truncate">
                          {property.address}
                          {property.city && `, ${property.city}`}
                          {property.state && `, ${property.state}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Square Footage Info */}
                    {property.totalSquareFeet && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Total Sq Ft</span>
                        <span className="font-semibold text-slate-900">{property.totalSquareFeet.toLocaleString()} sq ft</span>
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600 text-xs sm:text-sm">Occupancy</span>
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm">{property.occupancyRate}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            property.occupancyRate >= 90 ? 'bg-green-500' :
                            property.occupancyRate >= 70 ? 'bg-amber-500' :
                            property.occupancyRate >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${property.occupancyRate}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {property.occupiedUnits} / {property.totalUnits} spaces occupied
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                      <span className="text-xs sm:text-sm text-slate-600">Monthly Revenue</span>
                      <span className="text-base sm:text-lg font-bold text-green-600">
                        {formatCurrency(property.monthlyRevenue)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-3">
                  <span className="text-sm font-medium text-amber-600">
                    View Details →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warehouse Setup Wizard */}
      {showWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Progress Header */}
            <div className="bg-amber-50 px-4 sm:px-6 py-4 border-b border-amber-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {wizardStep === 1 && 'Warehouse Details'}
                  {wizardStep === 2 && 'Add Spaces'}
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
                          ? 'bg-amber-600 text-white'
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
                <span>Warehouse</span>
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

              {/* Step 1: Warehouse Details */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Warehouse Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={propertyForm.name}
                      onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base sm:text-lg"
                      placeholder="Industrial Park Building A"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={propertyForm.address}
                      onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                      placeholder="123 Commerce Drive"
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
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                        placeholder="Houston"
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
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                        placeholder="TX"
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
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                        placeholder="77001"
                      />
                    </div>
                  </div>

                  {/* Warehouse-Specific Fields */}
                  <div className="pt-4 border-t border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Building Specifications</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Total Sq Ft
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={propertyForm.totalSquareFeet}
                          onChange={(e) => setPropertyForm({ ...propertyForm, totalSquareFeet: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                          placeholder="100000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Leasable Sq Ft
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={propertyForm.leasableSquareFeet}
                          onChange={(e) => setPropertyForm({ ...propertyForm, leasableSquareFeet: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                          placeholder="95000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Clear Height (ft)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={propertyForm.clearHeight}
                          onChange={(e) => setPropertyForm({ ...propertyForm, clearHeight: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                          placeholder="28"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Loading Docks
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={propertyForm.totalLoadingDocks}
                          onChange={(e) => setPropertyForm({ ...propertyForm, totalLoadingDocks: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                          placeholder="8"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Drive-In Doors
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={propertyForm.totalDriveInDoors}
                          onChange={(e) => setPropertyForm({ ...propertyForm, totalDriveInDoors: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                          placeholder="4"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Parking Spaces
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={propertyForm.parkingSpaces}
                          onChange={(e) => setPropertyForm({ ...propertyForm, parkingSpaces: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                          placeholder="50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Year Built
                        </label>
                        <input
                          type="number"
                          min="1900"
                          max="2100"
                          value={propertyForm.yearBuilt}
                          onChange={(e) => setPropertyForm({ ...propertyForm, yearBuilt: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                          placeholder="2005"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Add Spaces */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <p className="text-slate-600 mb-4 text-sm sm:text-base">
                    Add leasable spaces to your warehouse. You can add more later.
                  </p>

                  {units.map((unit, index) => (
                    <div key={index} className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-slate-900 text-sm sm:text-base">
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

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-xs text-slate-500 mb-1">Space Name</label>
                          <input
                            type="text"
                            value={unit.unitNumber}
                            onChange={(e) => updateUnit(index, 'unitNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder="Suite 100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Square Feet *</label>
                          <input
                            type="number"
                            min="0"
                            value={unit.squareFeet}
                            onChange={(e) => updateUnit(index, 'squareFeet', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder="25000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Loading Docks</label>
                          <input
                            type="number"
                            min="0"
                            value={unit.loadingDocks}
                            onChange={(e) => updateUnit(index, 'loadingDocks', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder="2"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Drive-In Doors</label>
                          <input
                            type="number"
                            min="0"
                            value={unit.driveInDoors}
                            onChange={(e) => updateUnit(index, 'driveInDoors', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Office Sq Ft</label>
                          <input
                            type="number"
                            min="0"
                            value={unit.officeSquareFeet}
                            onChange={(e) => updateUnit(index, 'officeSquareFeet', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder="2000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Clear Height (ft)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={unit.clearHeight}
                            onChange={(e) => updateUnit(index, 'clearHeight', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder="28"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addUnit}
                    className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-600 hover:border-amber-400 hover:text-amber-600 rounded-xl transition-colors font-medium text-sm sm:text-base"
                  >
                    + Add Another Space
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
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                    Warehouse Created!
                  </h3>
                  <p className="text-slate-600 mb-2 text-sm sm:text-base">
                    <strong>{propertyForm.name}</strong> has been set up with <strong>{units.length} {units.length !== 1 ? 'spaces' : 'space'}</strong>.
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500">
                    You can now add business tenants and leases from the property page.
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
                    className="px-6 py-3 sm:py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="px-6 py-3 sm:py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                    Back to Warehouses
                  </button>
                  <button
                    onClick={handleViewProperty}
                    className="px-6 py-3 sm:py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                  >
                    View Warehouse
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
