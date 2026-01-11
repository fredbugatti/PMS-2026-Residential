'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface TenantPortalData {
  lease: {
    id: string;
    tenantName: string;
    tenantEmail: string | null;
    tenantPhone: string | null;
  };
  property: {
    id: string;
    name: string;
  };
  unit: {
    id: string;
    unitNumber: string;
  };
}

export default function TenantMaintenanceRequest() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [data, setData] = useState<TenantPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    permissionToEnter: false,
    preferredContactMethod: 'email'
  });

  useEffect(() => {
    fetchPortalData();
  }, [token]);

  const fetchPortalData = async () => {
    try {
      const res = await fetch(`/api/tenant/${token}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to load portal');
      }
      const portalData = await res.json();
      setData(portalData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Limit to 5 photos
    const remainingSlots = 5 - uploadedPhotos.length;
    if (remainingSlots <= 0) {
      alert('Maximum 5 photos allowed');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    if (!data) return;

    setSubmitting(true);

    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: data.property.id,
          unitId: data.unit.id,
          leaseId: data.lease.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          reportedBy: data.lease.tenantName,
          reportedEmail: data.lease.tenantEmail,
          photos: uploadedPhotos,
          internalNotes: `Permission to enter: ${formData.permissionToEnter ? 'Yes' : 'No'}. Preferred contact: ${formData.preferredContactMethod}.`
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit request');
      }

      setSuccess(true);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600 font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error || 'Invalid portal link'}</p>
          <p className="text-sm text-gray-500">Please contact your property manager for assistance.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Your maintenance request has been received. Our team will review it and get back to you soon.
          </p>
          <Link
            href={`/tenant/${token}`}
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-md hover:shadow-lg"
          >
            Return to Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/tenant/${token}`}
              className="text-white/80 hover:text-white transition-colors"
            >
              ← Back to Portal
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-4">Submit Maintenance Request</h1>
          <p className="text-blue-100 mt-1">
            {data.property.name} • Unit {data.unit.unitNumber}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="space-y-6">
            {/* Issue Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What's the issue? <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Leaky faucet in bathroom, AC not cooling"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { value: 'PLUMBING', label: 'Plumbing', icon: '🚿' },
                  { value: 'ELECTRICAL', label: 'Electrical', icon: '💡' },
                  { value: 'HVAC', label: 'HVAC', icon: '❄️' },
                  { value: 'APPLIANCE', label: 'Appliance', icon: '🔌' },
                  { value: 'GENERAL', label: 'General', icon: '🔧' },
                  { value: 'OTHER', label: 'Other', icon: '📋' }
                ].map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      formData.category === cat.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="text-2xl mb-1">{cat.icon}</div>
                    <div className="text-sm font-medium">{cat.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How urgent is this? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'LOW', label: 'Low', desc: 'When convenient', color: 'green' },
                  { value: 'MEDIUM', label: 'Medium', desc: 'This week', color: 'yellow' },
                  { value: 'HIGH', label: 'High', desc: 'Within 24-48 hrs', color: 'orange' },
                  { value: 'EMERGENCY', label: 'Emergency', desc: 'Immediate', color: 'red' }
                ].map((pri) => (
                  <button
                    key={pri.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: pri.value })}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      formData.priority === pri.value
                        ? pri.color === 'green' ? 'border-green-500 bg-green-50 text-green-700'
                        : pri.color === 'yellow' ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : pri.color === 'orange' ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{pri.label}</div>
                    <div className="text-xs mt-1 opacity-80">{pri.desc}</div>
                  </button>
                ))}
              </div>
              {formData.priority === 'EMERGENCY' && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  <strong>Emergency:</strong> For life-threatening situations (fire, gas leak, flooding), please also call 911 and your property manager directly.
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe the issue <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Please provide as much detail as possible. When did it start? Where exactly is the problem? Have you tried anything to fix it?"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Photos (optional)
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Photos help us understand the issue better. Maximum 5 photos, 5MB each.
              </p>

              <div className="space-y-4">
                {uploadedPhotos.length < 5 && (
                  <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <div className="text-center">
                      <div className="text-3xl mb-2">📷</div>
                      <div className="text-sm text-gray-600">Click to add photos</div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {uploadedPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shadow-md hover:bg-red-700 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Permission to Enter */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.permissionToEnter}
                  onChange={(e) => setFormData({ ...formData, permissionToEnter: e.target.checked })}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Permission to enter</div>
                  <div className="text-sm text-gray-600">
                    I grant permission for maintenance staff to enter my unit if I'm not home.
                  </div>
                </div>
              </label>
            </div>

            {/* Preferred Contact Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How should we contact you?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contact"
                    value="email"
                    checked={formData.preferredContactMethod === 'email'}
                    onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contact"
                    value="phone"
                    checked={formData.preferredContactMethod === 'phone'}
                    onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Phone</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contact"
                    value="text"
                    checked={formData.preferredContactMethod === 'text'}
                    onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Text</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Need immediate assistance? Contact your property manager directly.</p>
        </div>
      </div>
    </div>
  );
}
