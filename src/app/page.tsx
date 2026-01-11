'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Stats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  activeLeases: number;
  totalOwed: number;
  openWorkOrders: number;
  monthlyRevenue: number;
}

interface PendingCharges {
  count: number;
  totalAmount: number;
}

interface PendingRentIncreases {
  count: number;
  totalIncrease: number;
}

interface Lease {
  id: string;
  tenantName: string;
  unitName: string;
  propertyName: string;
  monthlyRentAmount: number;
  endDate: string;
  status: string;
}

interface Property {
  id: string;
  name: string;
  units: { id: string; unitNumber: string }[];
}

interface RecentActivity {
  id: string;
  type: 'payment' | 'charge' | 'workorder' | 'lease';
  description: string;
  amount?: number;
  date: string;
  status?: string;
}

interface Vendor {
  id: string;
  name: string;
  company: string | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProperties: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    activeLeases: 0,
    totalOwed: 0,
    openWorkOrders: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [pendingCharges, setPendingCharges] = useState<PendingCharges>({ count: 0, totalAmount: 0 });
  const [postingCharges, setPostingCharges] = useState(false);
  const [pendingRentIncreases, setPendingRentIncreases] = useState<PendingRentIncreases>({ count: 0, totalIncrease: 0 });
  const [applyingIncreases, setApplyingIncreases] = useState(false);
  const [expiringLeases, setExpiringLeases] = useState<Lease[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Quick action modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    leaseId: '',
    amount: '',
    paymentMethod: 'CHECK',
    referenceNumber: '',
    notes: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Charge form
  const [chargeForm, setChargeForm] = useState({
    leaseId: '',
    amount: '',
    description: '',
    accountCode: '4000'
  });
  const [submittingCharge, setSubmittingCharge] = useState(false);

  // Work order form
  const [workOrderForm, setWorkOrderForm] = useState({
    propertyId: '',
    unitId: '',
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    vendorId: ''
  });
  const [submittingWorkOrder, setSubmittingWorkOrder] = useState(false);
  const [workOrderPhotos, setWorkOrderPhotos] = useState<File[]>([]);
  const [workOrderPhotoPreviewUrls, setWorkOrderPhotoPreviewUrls] = useState<string[]>([]);

  // Cron status
  const [cronStatus, setCronStatus] = useState<{
    status: 'ok' | 'warning' | 'pending';
    message: string;
    pendingCharges: { count: number; amount: number };
  } | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [propertiesRes, leasesRes, balancesRes, workOrdersRes, vendorsRes, ledgerRes, monthlyChargesRes] = await Promise.all([
        fetch('/api/properties?includeUnits=true'),
        fetch('/api/leases'),
        fetch('/api/reports/tenant-balances'),
        fetch('/api/work-orders'),
        fetch('/api/vendors?active=true'),
        fetch('/api/ledger?limit=10'),
        fetch('/api/scheduled-charges?summary=true')
      ]);

      const propertiesData = propertiesRes.ok ? await propertiesRes.json() : [];
      const leasesData = leasesRes.ok ? await leasesRes.json() : [];
      const balancesData = balancesRes.ok ? await balancesRes.json() : { tenants: [] };
      const workOrdersData = workOrdersRes.ok ? await workOrdersRes.json() : [];
      const vendorsData = vendorsRes.ok ? await vendorsRes.json() : [];
      const ledgerData = ledgerRes.ok ? await ledgerRes.json() : [];
      const monthlyChargesData = monthlyChargesRes.ok ? await monthlyChargesRes.json() : { totalMonthly: 0 };

      setProperties(propertiesData);
      const activeLeases = leasesData.filter((l: any) => l.status === 'ACTIVE');
      setLeases(activeLeases);
      setVendors(vendorsData);

      const totalUnits = propertiesData.reduce((sum: number, p: any) => sum + (p.units?.length || 0), 0);
      const occupiedUnits = activeLeases.length;
      const totalOwed = balancesData.tenants?.filter((t: any) => t.balance > 0).reduce((sum: number, t: any) => sum + t.balance, 0) || 0;
      // Monthly revenue now includes ALL recurring charges (rent + parking + pet fees + etc)
      const monthlyRevenue = monthlyChargesData.totalMonthly || 0;
      const openWorkOrders = workOrdersData.filter((wo: any) => wo.status === 'OPEN' || wo.status === 'IN_PROGRESS').length;

      setStats({
        totalProperties: propertiesData.length,
        totalUnits,
        occupiedUnits,
        activeLeases: activeLeases.length,
        totalOwed,
        openWorkOrders,
        monthlyRevenue
      });

      // Find leases expiring in next 60 days
      const now = new Date();
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const expiring = activeLeases.filter((l: any) => {
        const endDate = new Date(l.endDate);
        return endDate >= now && endDate <= sixtyDaysFromNow;
      }).sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
      setExpiringLeases(expiring.slice(0, 5));

      // Build recent activity from ledger entries
      const activities: RecentActivity[] = ledgerData.slice(0, 8).map((entry: any) => ({
        id: entry.id,
        type: entry.debitCredit === 'CR' && entry.accountCode === '1200' ? 'payment' : 'charge',
        description: entry.description,
        amount: Number(entry.amount),
        date: entry.entryDate,
        status: entry.status
      }));
      setRecentActivity(activities);

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCharges = async () => {
    try {
      const res = await fetch('/api/scheduled-charges/pending');
      if (res.ok) {
        const data = await res.json();
        setPendingCharges(data);
      }
    } catch (error) {
      console.error('Failed to fetch pending charges:', error);
    }
  };

  const fetchPendingRentIncreases = async () => {
    try {
      const res = await fetch('/api/rent-increases/pending');
      if (res.ok) {
        const data = await res.json();
        setPendingRentIncreases(data);
      }
    } catch (error) {
      console.error('Failed to fetch pending rent increases:', error);
    }
  };

  const fetchCronStatus = async () => {
    try {
      const res = await fetch('/api/cron/status');
      if (res.ok) {
        const data = await res.json();
        setCronStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch cron status:', error);
    }
  };

  useEffect(() => {
    fetchPendingCharges();
    fetchPendingRentIncreases();
    fetchCronStatus();
  }, []);

  const handlePostAllCharges = async () => {
    if (!confirm(`Post ${pendingCharges.count} scheduled charges totaling ${formatCurrency(pendingCharges.totalAmount)}?`)) {
      return;
    }

    setPostingCharges(true);
    try {
      const res = await fetch('/api/scheduled-charges/post-due', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post charges');
      }

      const result = await res.json();
      alert(`Posted ${result.summary.posted} charges, skipped ${result.summary.skipped}, errors: ${result.summary.errors}`);

      fetchAllData();
      fetchPendingCharges();
      fetchCronStatus();
    } catch (error: any) {
      console.error('Failed to post charges:', error);
      alert(error.message || 'Failed to post charges');
    } finally {
      setPostingCharges(false);
    }
  };

  const handleApplyRentIncreases = async () => {
    if (!confirm(`Apply ${pendingRentIncreases.count} rent increase(s)?`)) {
      return;
    }

    setApplyingIncreases(true);
    try {
      const res = await fetch('/api/rent-increases/apply-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to apply rent increases');
      }

      const result = await res.json();
      alert(`Applied ${result.applied.length} rent increase(s). ${result.errors.length > 0 ? `Errors: ${result.errors.length}` : ''}`);

      fetchAllData();
      fetchPendingRentIncreases();
    } catch (error: any) {
      console.error('Failed to apply rent increases:', error);
      alert(error.message || 'Failed to apply rent increases');
    } finally {
      setApplyingIncreases(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.leaseId || !paymentForm.amount) {
      alert('Please select a tenant and enter amount');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: paymentForm.leaseId,
          amount: parseFloat(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          referenceNumber: paymentForm.referenceNumber || undefined,
          notes: paymentForm.notes || undefined,
          entryDate: new Date().toISOString().split('T')[0]
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record payment');
      }

      alert('Payment recorded successfully!');
      setShowPaymentModal(false);
      setPaymentForm({ leaseId: '', amount: '', paymentMethod: 'CHECK', referenceNumber: '', notes: '' });
      fetchAllData();
    } catch (error: any) {
      alert(error.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleAddCharge = async () => {
    if (!chargeForm.leaseId || !chargeForm.amount || !chargeForm.description) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmittingCharge(true);
    try {
      const res = await fetch('/api/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: chargeForm.leaseId,
          amount: parseFloat(chargeForm.amount),
          description: chargeForm.description,
          accountCode: chargeForm.accountCode,
          entryDate: new Date().toISOString().split('T')[0]
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add charge');
      }

      alert('Charge added successfully!');
      setShowChargeModal(false);
      setChargeForm({ leaseId: '', amount: '', description: '', accountCode: '4000' });
      fetchAllData();
    } catch (error: any) {
      alert(error.message || 'Failed to add charge');
    } finally {
      setSubmittingCharge(false);
    }
  };

  const handleWorkOrderPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalFiles = workOrderPhotos.length + newFiles.length;

    if (totalFiles > 5) {
      alert('Maximum 5 photos allowed');
      return;
    }

    // Create preview URLs
    const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));

    setWorkOrderPhotos(prev => [...prev, ...newFiles]);
    setWorkOrderPhotoPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeWorkOrderPhoto = (index: number) => {
    URL.revokeObjectURL(workOrderPhotoPreviewUrls[index]);
    setWorkOrderPhotos(prev => prev.filter((_, i) => i !== index));
    setWorkOrderPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateWorkOrder = async () => {
    if (!workOrderForm.propertyId || !workOrderForm.unitId || !workOrderForm.title || !workOrderForm.description) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmittingWorkOrder(true);
    try {
      // First create the work order
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...workOrderForm,
          reportedBy: 'Property Manager',
          vendorId: workOrderForm.vendorId || null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create work order');
      }

      const workOrder = await res.json();

      // If there are photos, upload them
      if (workOrderPhotos.length > 0) {
        const formData = new FormData();
        formData.append('workOrderId', workOrder.id);
        workOrderPhotos.forEach(photo => {
          formData.append('photos', photo);
        });

        const uploadRes = await fetch('/api/work-orders/upload', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          console.error('Failed to upload photos, but work order was created');
        }
      }

      // Clear preview URLs
      workOrderPhotoPreviewUrls.forEach(url => URL.revokeObjectURL(url));

      alert('Work order created successfully!');
      setShowWorkOrderModal(false);
      setWorkOrderForm({ propertyId: '', unitId: '', title: '', description: '', category: 'GENERAL', priority: 'MEDIUM', vendorId: '' });
      setWorkOrderPhotos([]);
      setWorkOrderPhotoPreviewUrls([]);
      fetchAllData();
    } catch (error: any) {
      alert(error.message || 'Failed to create work order');
    } finally {
      setSubmittingWorkOrder(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysUntil = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const occupancyRate = stats.totalUnits > 0
    ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100)
    : 0;

  const selectedProperty = properties.find(p => p.id === workOrderForm.propertyId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Property management overview</p>
            </div>
            {/* Quick Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <span>+</span> Payment
              </button>
              <button
                onClick={() => setShowChargeModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <span>+</span> Charge
              </button>
              <button
                onClick={() => setShowWorkOrderModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <span>+</span> Work Order
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Properties</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalProperties}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.totalUnits} units total</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Occupancy</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{occupancyRate}%</p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{stats.occupiedUnits}/{stats.totalUnits} units</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Monthly Revenue</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(stats.monthlyRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">all recurring charges</p>
          </div>

          <Link href="/reports" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600">Outstanding</p>
            <p className={`text-3xl font-bold mt-1 ${stats.totalOwed > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatCurrency(stats.totalOwed)}
            </p>
            <p className="text-xs text-gray-500 mt-1">total owed - click to view</p>
          </Link>
        </div>

        {/* Alerts Section */}
        {(cronStatus?.status === 'warning' || pendingCharges.count > 0 || pendingRentIncreases.count > 0) && (
          <div className="mb-8 space-y-3">
            {/* Cron Warning - Most Important */}
            {cronStatus?.status === 'warning' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-medium text-red-800">Auto-posting Issue Detected</p>
                      <p className="text-sm text-red-600">{cronStatus.message}</p>
                    </div>
                  </div>
                  {cronStatus.pendingCharges.count > 0 && (
                    <button
                      onClick={handlePostAllCharges}
                      disabled={postingCharges}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {postingCharges ? 'Posting...' : 'Post Now'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {pendingRentIncreases.count > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📈</span>
                    <div>
                      <p className="font-medium text-green-800">{pendingRentIncreases.count} Rent Increase(s) Due</p>
                      <p className="text-sm text-green-600">+{formatCurrency(pendingRentIncreases.totalIncrease)}/month increase</p>
                    </div>
                  </div>
                  <button
                    onClick={handleApplyRentIncreases}
                    disabled={applyingIncreases}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applyingIncreases ? 'Applying...' : 'Apply All'}
                  </button>
                </div>
              </div>
            )}

            {pendingCharges.count > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📅</span>
                    <div>
                      <p className="font-medium text-blue-800">{pendingCharges.count} Scheduled Charges Ready</p>
                      <p className="text-sm text-blue-600">Total: {formatCurrency(pendingCharges.totalAmount)}</p>
                    </div>
                  </div>
                  <button
                    onClick={handlePostAllCharges}
                    disabled={postingCharges}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {postingCharges ? 'Posting...' : 'Post All Charges'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Navigation Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Navigation */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Link href="/properties" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl mb-3 group-hover:bg-blue-200 transition-colors">
                  🏢
                </div>
                <h3 className="font-semibold text-gray-900">Properties</h3>
                <p className="text-sm text-gray-600">{stats.totalProperties} properties</p>
              </Link>

              <Link href="/leases" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl mb-3 group-hover:bg-green-200 transition-colors">
                  📄
                </div>
                <h3 className="font-semibold text-gray-900">Leases</h3>
                <p className="text-sm text-gray-600">{stats.activeLeases} active</p>
              </Link>

              <Link href="/maintenance" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 transition-colors ${
                  stats.openWorkOrders > 0 ? 'bg-orange-100 group-hover:bg-orange-200' : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  🔧
                </div>
                <h3 className="font-semibold text-gray-900">Maintenance</h3>
                <p className={`text-sm ${stats.openWorkOrders > 0 ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                  {stats.openWorkOrders} open
                </p>
              </Link>

              <Link href="/accounting" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl mb-3 group-hover:bg-purple-200 transition-colors">
                  💰
                </div>
                <h3 className="font-semibold text-gray-900">Accounting</h3>
                <p className="text-sm text-gray-600">Ledger & balances</p>
              </Link>

              <Link href="/reports" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-xl mb-3 group-hover:bg-indigo-200 transition-colors">
                  📈
                </div>
                <h3 className="font-semibold text-gray-900">Reports</h3>
                <p className="text-sm text-gray-600">P&L & balances</p>
              </Link>

              <Link href="/vendors" className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center text-xl mb-3 group-hover:bg-teal-200 transition-colors">
                  👷
                </div>
                <h3 className="font-semibold text-gray-900">Vendors</h3>
                <p className="text-sm text-gray-600">Contractors</p>
              </Link>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {recentActivity.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No recent activity</div>
                ) : (
                  recentActivity.map(activity => (
                    <div key={activity.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          activity.type === 'payment' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {activity.type === 'payment' ? '💵' : '📝'}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 line-clamp-1">{activity.description}</p>
                          <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
                        </div>
                      </div>
                      {activity.amount && (
                        <span className={`text-sm font-medium ${
                          activity.type === 'payment' ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {activity.type === 'payment' ? '+' : ''}{formatCurrency(activity.amount)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
              <Link href="/accounting" className="block p-3 text-center text-sm text-blue-600 hover:bg-gray-50 border-t border-gray-100">
                View All Transactions
              </Link>
            </div>
          </div>

          {/* Right Column - Alerts & Expiring Leases */}
          <div className="space-y-6">
            {/* Needs Attention */}
            {(stats.totalOwed > 0 || stats.openWorkOrders > 0) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">Needs Attention</h2>
                </div>
                <div className="p-4 space-y-3">
                  {stats.totalOwed > 0 && (
                    <Link href="/reports" className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                      <span className="text-xl">💸</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-800">{formatCurrency(stats.totalOwed)} Outstanding</p>
                        <p className="text-xs text-red-600">View unpaid balances</p>
                      </div>
                    </Link>
                  )}
                  {stats.openWorkOrders > 0 && (
                    <Link href="/maintenance" className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                      <span className="text-xl">🔧</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-orange-800">{stats.openWorkOrders} Open Work Orders</p>
                        <p className="text-xs text-orange-600">View maintenance requests</p>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Expiring Leases */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Expiring Soon</h2>
                <p className="text-xs text-gray-500">Next 60 days</p>
              </div>
              <div className="divide-y divide-gray-100">
                {expiringLeases.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No leases expiring soon</div>
                ) : (
                  expiringLeases.map(lease => {
                    const daysUntil = getDaysUntil(lease.endDate);
                    return (
                      <Link
                        key={lease.id}
                        href={`/leases/${lease.id}`}
                        className="block p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{lease.tenantName}</p>
                            <p className="text-xs text-gray-500">{lease.unitName}</p>
                          </div>
                          <div className={`text-right ${daysUntil <= 14 ? 'text-red-600' : daysUntil <= 30 ? 'text-orange-600' : 'text-gray-600'}`}>
                            <p className="text-sm font-medium">{daysUntil} days</p>
                            <p className="text-xs">{formatDate(lease.endDate)}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
              <Link href="/leases" className="block p-3 text-center text-sm text-blue-600 hover:bg-gray-50 border-t border-gray-100">
                View All Leases
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
                <select
                  value={paymentForm.leaseId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, leaseId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select tenant...</option>
                  {leases.map(lease => (
                    <option key={lease.id} value={lease.id}>{lease.tenantName} - {lease.unitName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="CHECK">Check</option>
                  <option value="CASH">Cash</option>
                  <option value="ACH">ACH/Bank Transfer</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="MONEY_ORDER">Money Order</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference # (optional)</label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Check number, confirmation, etc."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={submittingPayment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submittingPayment ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Charge</h2>
              <button onClick={() => setShowChargeModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
                <select
                  value={chargeForm.leaseId}
                  onChange={(e) => setChargeForm({ ...chargeForm, leaseId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select tenant...</option>
                  {leases.map(lease => (
                    <option key={lease.id} value={lease.id}>{lease.tenantName} - {lease.unitName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  value={chargeForm.amount}
                  onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Late fee, utility charge, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Charge Type</label>
                <select
                  value={chargeForm.accountCode}
                  onChange={(e) => setChargeForm({ ...chargeForm, accountCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="4000">Rent</option>
                  <option value="4100">Late Fee</option>
                  <option value="4300">Parking</option>
                  <option value="4400">Pet Fee</option>
                  <option value="4500">Utility Reimbursement</option>
                  <option value="4900">Other Income</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowChargeModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCharge}
                disabled={submittingCharge}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingCharge ? 'Adding...' : 'Add Charge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Work Order Modal */}
      {showWorkOrderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create Work Order</h2>
              <button onClick={() => setShowWorkOrderModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
                <select
                  value={workOrderForm.propertyId}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, propertyId: e.target.value, unitId: '' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select property...</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {selectedProperty && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                  <select
                    value={workOrderForm.unitId}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, unitId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select unit...</option>
                    {selectedProperty.units?.map(u => (
                      <option key={u.id} value={u.id}>{u.unitNumber}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={workOrderForm.title}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Brief description of issue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={workOrderForm.description}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Detailed description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={workOrderForm.category}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="GENERAL">General</option>
                    <option value="PLUMBING">Plumbing</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="HVAC">HVAC</option>
                    <option value="APPLIANCE">Appliance</option>
                    <option value="STRUCTURAL">Structural</option>
                    <option value="PEST_CONTROL">Pest Control</option>
                    <option value="LANDSCAPING">Landscaping</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={workOrderForm.priority}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Vendor (optional)</label>
                <select
                  value={workOrderForm.vendorId}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, vendorId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select vendor...</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}{v.company ? ` (${v.company})` : ''}</option>
                  ))}
                </select>
              </div>
              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photos (optional)</label>
                <div className="space-y-3">
                  {workOrderPhotoPreviewUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {workOrderPhotoPreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => removeWorkOrderPhoto(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {workOrderPhotos.length < 5 && (
                    <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleWorkOrderPhotoSelect}
                        className="hidden"
                      />
                      <span className="text-sm text-gray-600">
                        + Add Photos ({workOrderPhotos.length}/5)
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowWorkOrderModal(false);
                  workOrderPhotoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
                  setWorkOrderPhotos([]);
                  setWorkOrderPhotoPreviewUrls([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkOrder}
                disabled={submittingWorkOrder}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {submittingWorkOrder ? 'Creating...' : 'Create Work Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
