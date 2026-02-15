'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wrench, DollarSign, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';
import { DashboardSkeleton } from '@/components/Skeleton';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useToast } from '@/components/Toast';

interface Stats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  activeLeases: number;
  totalOwed: number;
  tenantsOwing: number;
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
  balance: number;
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

interface FinancialSnapshot {
  income: number;
  expenses: number;
  netIncome: number;
  profitMargin: number;
}

export default function Dashboard() {
  const { showSuccess, showError, showWarning } = useToast();
  const [stats, setStats] = useState<Stats>({
    totalProperties: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    activeLeases: 0,
    totalOwed: 0,
    tenantsOwing: 0,
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
  const [financialSnapshot, setFinancialSnapshot] = useState<FinancialSnapshot>({
    income: 0,
    expenses: 0,
    netIncome: 0,
    profitMargin: 0
  });

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
  const [tenantSearch, setTenantSearch] = useState('');

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

  const fetchAllData = useCallback(async () => {
    try {
      // Get current month date range for P&L
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const [propertiesRes, leasesRes, balancesRes, workOrdersRes, vendorsRes, ledgerRes, monthlyChargesRes, pnlRes] = await Promise.all([
        fetch('/api/properties?includeUnits=true'),
        fetch('/api/leases'),
        fetch('/api/reports/tenant-balances'),
        fetch('/api/work-orders'),
        fetch('/api/vendors?active=true'),
        fetch('/api/ledger?limit=10'),
        fetch('/api/scheduled-charges?summary=true'),
        fetch(`/api/reports/profit-loss?startDate=${monthStart}&endDate=${monthEnd}`)
      ]);

      const propertiesData = propertiesRes.ok ? await propertiesRes.json() : [];
      const leasesData = leasesRes.ok ? await leasesRes.json() : [];
      const balancesData = balancesRes.ok ? await balancesRes.json() : { tenants: [] };
      const workOrdersData = workOrdersRes.ok ? await workOrdersRes.json() : [];
      const vendorsData = vendorsRes.ok ? await vendorsRes.json() : [];
      const ledgerJson = ledgerRes.ok ? await ledgerRes.json() : [];
      const ledgerData = Array.isArray(ledgerJson) ? ledgerJson : (ledgerJson.data || []);
      const monthlyChargesData = monthlyChargesRes.ok ? await monthlyChargesRes.json() : { totalMonthly: 0 };
      const pnlData = pnlRes.ok ? await pnlRes.json() : null;

      // Update financial snapshot
      if (pnlData) {
        setFinancialSnapshot({
          income: pnlData.income?.total || 0,
          expenses: pnlData.expenses?.total || 0,
          netIncome: pnlData.summary?.netOperatingIncome || 0,
          profitMargin: pnlData.summary?.profitMargin || 0
        });
      }

      setProperties(propertiesData);
      // Merge balance data with leases and sort by balance (highest first)
      const balanceMap = new Map(
        (balancesData.tenants || []).map((t: any) => [t.leaseId, t.balance])
      );
      const activeLeases = leasesData
        .filter((l: any) => l.status === 'ACTIVE')
        .map((l: any) => ({ ...l, balance: balanceMap.get(l.id) || 0 }))
        .sort((a: any, b: any) => b.balance - a.balance);
      setLeases(activeLeases);
      setVendors(vendorsData);

      const totalUnits = propertiesData.reduce((sum: number, p: any) => sum + (p.units?.length || 0), 0);
      const occupiedUnits = activeLeases.length;
      const tenantsWithBalance = balancesData.tenants?.filter((t: any) => t.balance > 0) || [];
      const totalOwed = tenantsWithBalance.reduce((sum: number, t: any) => sum + t.balance, 0);
      const tenantsOwing = tenantsWithBalance.length;
      // Monthly revenue now includes ALL recurring charges (rent + parking + pet fees + etc)
      const monthlyRevenue = monthlyChargesData.totalMonthly || 0;
      const openWorkOrders = workOrdersData.filter((wo: any) => wo.status === 'OPEN' || wo.status === 'IN_PROGRESS').length;

      setStats({
        totalProperties: propertiesData.length,
        totalUnits,
        occupiedUnits,
        activeLeases: activeLeases.length,
        totalOwed,
        tenantsOwing,
        openWorkOrders,
        monthlyRevenue
      });

      // Find leases expiring in next 60 days
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
  }, []);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchAllData(),
      fetchPendingCharges(),
      fetchPendingRentIncreases(),
      fetchCronStatus()
    ]);
  }, [fetchAllData]);

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
      if (result.summary.errors > 0) {
        showWarning(`Posted ${result.summary.posted} charges, skipped ${result.summary.skipped}, errors: ${result.summary.errors}`);
      } else {
        showSuccess(`Posted ${result.summary.posted} charges successfully`);
      }

      fetchAllData();
      fetchPendingCharges();
      fetchCronStatus();
    } catch (error: any) {
      console.error('Failed to post charges:', error);
      showError(error.message || 'Failed to post charges');
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
      if (result.errors.length > 0) {
        showWarning(`Applied ${result.applied.length} rent increase(s) with ${result.errors.length} error(s)`);
      } else {
        showSuccess(`Applied ${result.applied.length} rent increase(s) successfully`);
      }

      fetchAllData();
      fetchPendingRentIncreases();
    } catch (error: any) {
      console.error('Failed to apply rent increases:', error);
      showError(error.message || 'Failed to apply rent increases');
    } finally {
      setApplyingIncreases(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.leaseId || !paymentForm.amount) {
      showWarning('Please select a tenant and enter amount');
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    const selectedLease = leases.find(l => l.id === paymentForm.leaseId);

    // Confirmation dialog
    const confirmMessage = `Record payment of $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} from ${selectedLease?.tenantName || 'tenant'}?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    // Optimistic update - update UI immediately
    setShowPaymentModal(false);
    setStats(prev => ({
      ...prev,
      totalOwed: Math.max(0, prev.totalOwed - amount)
    }));

    // Add optimistic activity entry
    const optimisticActivity: RecentActivity = {
      id: `temp-${Date.now()}`,
      type: 'payment',
      description: `Payment from ${selectedLease?.tenantName || 'Tenant'}`,
      amount,
      date: new Date().toISOString(),
      status: 'POSTED'
    };
    setRecentActivity(prev => [optimisticActivity, ...prev.slice(0, 7)]);

    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: paymentForm.leaseId,
          amount,
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

      showSuccess('Payment recorded successfully!');
      setPaymentForm({ leaseId: '', amount: '', paymentMethod: 'CHECK', referenceNumber: '', notes: '' });
      // Refresh to get real data
      fetchAllData();
    } catch (error: any) {
      showError(error.message || 'Failed to record payment');
      // Rollback on error
      fetchAllData();
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleAddCharge = async () => {
    if (!chargeForm.leaseId || !chargeForm.amount || !chargeForm.description) {
      showWarning('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(chargeForm.amount);
    const selectedLease = leases.find(l => l.id === chargeForm.leaseId);

    // Confirmation dialog
    const confirmMessage = `Add charge of $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} to ${selectedLease?.tenantName || 'tenant'} for "${chargeForm.description}"?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    // Optimistic update - update UI immediately
    setShowChargeModal(false);
    setStats(prev => ({
      ...prev,
      totalOwed: prev.totalOwed + amount
    }));

    // Add optimistic activity entry
    const optimisticActivity: RecentActivity = {
      id: `temp-${Date.now()}`,
      type: 'charge',
      description: `${chargeForm.description} - ${selectedLease?.tenantName || 'Tenant'}`,
      amount,
      date: new Date().toISOString(),
      status: 'POSTED'
    };
    setRecentActivity(prev => [optimisticActivity, ...prev.slice(0, 7)]);

    setSubmittingCharge(true);
    try {
      const res = await fetch('/api/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: chargeForm.leaseId,
          amount,
          description: chargeForm.description,
          accountCode: chargeForm.accountCode,
          entryDate: new Date().toISOString().split('T')[0]
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add charge');
      }

      showSuccess('Charge added successfully!');
      setChargeForm({ leaseId: '', amount: '', description: '', accountCode: '4000' });
      // Refresh to get real data
      fetchAllData();
    } catch (error: any) {
      showError(error.message || 'Failed to add charge');
      // Rollback on error
      fetchAllData();
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
      showWarning('Maximum 5 photos allowed');
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
      showWarning('Please fill in all required fields');
      return;
    }

    // Optimistic update - update UI immediately
    setShowWorkOrderModal(false);
    setStats(prev => ({
      ...prev,
      openWorkOrders: prev.openWorkOrders + 1
    }));

    // Clear preview URLs and form
    workOrderPhotoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    const photosToUpload = [...workOrderPhotos];
    setWorkOrderPhotos([]);
    setWorkOrderPhotoPreviewUrls([]);
    const formToSubmit = { ...workOrderForm };
    setWorkOrderForm({ propertyId: '', unitId: '', title: '', description: '', category: 'GENERAL', priority: 'MEDIUM', vendorId: '' });

    setSubmittingWorkOrder(true);
    try {
      // First create the work order
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formToSubmit,
          reportedBy: 'Property Manager',
          vendorId: formToSubmit.vendorId || null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create work order');
      }

      const workOrder = await res.json();

      // If there are photos, upload them
      if (photosToUpload.length > 0) {
        const formData = new FormData();
        formData.append('workOrderId', workOrder.id);
        photosToUpload.forEach(photo => {
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

      showSuccess('Work order created successfully!');
      // Refresh to get real data
      fetchAllData();
    } catch (error: any) {
      showError(error.message || 'Failed to create work order');
      // Rollback on error
      fetchAllData();
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
    return <DashboardSkeleton />;
  }

  // Who Owes - top 5 tenants with outstanding balances
  const tenantsWhoOwe = leases
    .filter(l => l.balance > 0)
    .slice(0, 5);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">Property management overview</p>
            </div>
            {/* Quick Action Buttons */}
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2 whitespace-nowrap flex-shrink-0 shadow-sm"
              >
                <DollarSign className="h-4 w-4" /> Payment
              </button>
              <button
                onClick={() => setShowChargeModal(true)}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-2 whitespace-nowrap flex-shrink-0 shadow-sm"
              >
                + Charge
              </button>
              <button
                onClick={() => setShowWorkOrderModal(true)}
                className="px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-semibold flex items-center gap-2 whitespace-nowrap flex-shrink-0 shadow-sm"
              >
                <Wrench className="h-4 w-4" /> Work Order
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Link href="/properties" className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
            <p className="text-xs sm:text-sm text-slate-600">Units</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{stats.totalUnits}</p>
            <p className="text-xs text-blue-500 mt-1">{stats.totalProperties} properties →</p>
          </Link>

          <Link href="/leases" className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md hover:border-green-300 transition-all cursor-pointer">
            <p className="text-xs sm:text-sm text-slate-600">Occupied</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">{stats.occupiedUnits}</p>
            <p className="text-xs text-green-500 mt-1">{occupancyRate}% full →</p>
          </Link>

          <Link href="/reports?tab=pnl" className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md hover:border-green-300 transition-all cursor-pointer">
            <p className="text-xs sm:text-sm text-slate-600">Lease/Month</p>
            <p className="text-xl sm:text-3xl font-bold text-green-600 mt-1">{formatCurrency(stats.monthlyRevenue)}</p>
            <p className="text-xs text-slate-500 mt-1">expected income →</p>
          </Link>

          <Link href="/reports?tab=aging" className={`bg-white rounded-xl p-4 sm:p-5 shadow-sm border hover:shadow-md transition-all cursor-pointer ${stats.totalOwed > 0 ? 'border-red-200 hover:border-red-300' : 'border-slate-200 hover:border-slate-300'}`}>
            <p className="text-xs sm:text-sm text-slate-600">Owed</p>
            <p className={`text-xl sm:text-3xl font-bold mt-1 ${stats.totalOwed > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {formatCurrency(stats.totalOwed)}
            </p>
            <p className={`text-xs mt-1 ${stats.tenantsOwing > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {stats.tenantsOwing > 0 ? `${stats.tenantsOwing} unpaid →` : 'all paid'}
            </p>
          </Link>
        </div>

        {/* Alerts Section */}
        {(cronStatus?.status === 'warning' || pendingCharges.count > 0 || pendingRentIncreases.count > 0) && (
          <div className="mb-6 sm:mb-8 space-y-3">
            {/* Cron Warning - Most Important */}
            {cronStatus?.status === 'warning' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5" />
                    <div>
                      <p className="font-medium text-red-800 text-sm sm:text-base">Auto-posting Issue Detected</p>
                      <p className="text-xs sm:text-sm text-red-600">{cronStatus.message}</p>
                    </div>
                  </div>
                  {cronStatus.pendingCharges.count > 0 && (
                    <button
                      onClick={handlePostAllCharges}
                      disabled={postingCharges}
                      className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {postingCharges ? 'Posting...' : 'Post Now'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {pendingRentIncreases.count > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <Link href="/rent-increases" className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
                    <TrendingUp className="h-5 w-5" />
                    <div>
                      <p className="font-medium text-green-800 text-sm sm:text-base">{pendingRentIncreases.count} Rent Increase(s) Due</p>
                      <p className="text-xs sm:text-sm text-green-600">+{formatCurrency(pendingRentIncreases.totalIncrease)}/month increase →</p>
                    </div>
                  </Link>
                  <button
                    onClick={handleApplyRentIncreases}
                    disabled={applyingIncreases}
                    className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applyingIncreases ? 'Applying...' : 'Apply All'}
                  </button>
                </div>
              </div>
            )}

            {pendingCharges.count > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <Link href="/leases" className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
                    <Calendar className="h-5 w-5" />
                    <div>
                      <p className="font-medium text-blue-800 text-sm sm:text-base">{pendingCharges.count} Scheduled Charges Ready</p>
                      <p className="text-xs sm:text-sm text-blue-600">Total: {formatCurrency(pendingCharges.totalAmount)} →</p>
                    </div>
                  </Link>
                  <button
                    onClick={handlePostAllCharges}
                    disabled={postingCharges}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {postingCharges ? 'Posting...' : 'Post All Charges'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Who Owes - Top 5 */}
        {tenantsWhoOwe.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 sm:mb-8">
            <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Who Owes</h2>
                <p className="text-xs text-slate-500">Outstanding balances</p>
              </div>
              <Link href="/reports?tab=aging" className="text-xs text-blue-600 hover:underline">
                View All →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {tenantsWhoOwe.map(lease => (
                <Link
                  key={lease.id}
                  href={`/leases/${lease.id}`}
                  className="flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{lease.tenantName}</p>
                    <p className="text-xs text-slate-500">{lease.unitName}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-semibold text-red-600">{formatCurrency(lease.balance)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Expiring Leases - Simple List */}
        {expiringLeases.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Expiring Soon</h2>
                <p className="text-xs text-slate-500">Next 60 days</p>
              </div>
              <Link href="/leases" className="text-xs text-blue-600 hover:underline">
                View All →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {expiringLeases.slice(0, 5).map(lease => {
                const daysUntil = getDaysUntil(lease.endDate);
                return (
                  <Link
                    key={lease.id}
                    href={`/leases/${lease.id}`}
                    className="flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{lease.tenantName}</p>
                      <p className="text-xs text-slate-500">{lease.unitName}</p>
                    </div>
                    <div className={`text-right ml-3 px-2 py-1 rounded-full text-xs font-medium ${
                      daysUntil <= 14 ? 'bg-red-100 text-red-700' :
                      daysUntil <= 30 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {daysUntil} days
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Record Payment</h2>
              <button onClick={() => { setShowPaymentModal(false); setTenantSearch(''); }} className="text-slate-500 hover:text-slate-700 text-2xl p-1">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tenant *</label>
                <input
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="Search tenant name..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2"
                  autoFocus
                />
                <select
                  value={paymentForm.leaseId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, leaseId: e.target.value, amount: '' })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
                  size={Math.min(6, leases.filter(l => l.tenantName.toLowerCase().includes(tenantSearch.toLowerCase())).length + 1)}
                >
                  <option value="">Select tenant...</option>
                  {leases
                    .filter(lease => lease.tenantName.toLowerCase().includes(tenantSearch.toLowerCase()) ||
                                     lease.unitName.toLowerCase().includes(tenantSearch.toLowerCase()))
                    .map(lease => (
                    <option key={lease.id} value={lease.id}>
                      {lease.tenantName} - {lease.unitName} {lease.balance > 0 ? `($${lease.balance.toLocaleString()} due)` : '(paid up)'}
                    </option>
                  ))}
                </select>
              </div>
              {paymentForm.leaseId && (() => {
                const selectedLease = leases.find(l => l.id === paymentForm.leaseId);
                if (!selectedLease) return null;
                return selectedLease.balance > 0 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-800">Balance due: <strong>${selectedLease.balance.toLocaleString()}</strong></span>
                      <button
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, amount: selectedLease.balance.toFixed(2) })}
                        className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                      >
                        Pay Full Balance
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <span className="text-sm text-green-800">This tenant is paid up!</span>
                  </div>
                );
              })()}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
                >
                  <option value="CHECK">Check</option>
                  <option value="CASH">Cash</option>
                  <option value="ACH">ACH/Bank Transfer</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="MONEY_ORDER">Money Order</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              {(paymentForm.paymentMethod === 'CHECK' || paymentForm.paymentMethod === 'MONEY_ORDER') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {paymentForm.paymentMethod === 'CHECK' ? 'Check #' : 'Money Order #'} (optional)
                  </label>
                  <input
                    type="text"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
                    placeholder={paymentForm.paymentMethod === 'CHECK' ? 'Check number' : 'Money order number'}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              <button
                onClick={() => { setShowPaymentModal(false); setTenantSearch(''); }}
                className="flex-1 px-4 py-3 sm:py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => { handleRecordPayment(); setTenantSearch(''); }}
                disabled={submittingPayment}
                className="flex-1 px-4 py-3 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {submittingPayment ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Add Charge</h2>
              <button onClick={() => setShowChargeModal(false)} className="text-slate-500 hover:text-slate-700 text-2xl p-1">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tenant *</label>
                <select
                  value={chargeForm.leaseId}
                  onChange={(e) => setChargeForm({ ...chargeForm, leaseId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
                  autoFocus
                >
                  <option value="">Select tenant...</option>
                  {leases.map(lease => (
                    <option key={lease.id} value={lease.id}>{lease.tenantName} - {lease.unitName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                <input
                  type="number"
                  value={chargeForm.amount}
                  onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
                  placeholder="Late fee, utility charge, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Charge Type</label>
                <select
                  value={chargeForm.accountCode}
                  onChange={(e) => setChargeForm({ ...chargeForm, accountCode: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
                >
                  <option value="4000">Lease Payment</option>
                  <option value="4100">Late Fee</option>
                  <option value="4300">Parking</option>
                  <option value="4400">Pet Fee</option>
                  <option value="4500">Utility Reimbursement</option>
                  <option value="4900">Other Income</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              <button
                onClick={() => setShowChargeModal(false)}
                className="flex-1 px-4 py-3 sm:py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCharge}
                disabled={submittingCharge}
                className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {submittingCharge ? 'Adding...' : 'Add Charge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Work Order Modal */}
      {showWorkOrderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Create Work Order</h2>
              <button onClick={() => setShowWorkOrderModal(false)} className="text-slate-500 hover:text-slate-700 text-2xl p-1">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Property *</label>
                <select
                  value={workOrderForm.propertyId}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, propertyId: e.target.value, unitId: '' })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
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
                    value={workOrderForm.unitId}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, unitId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
                  >
                    <option value="">Select unit...</option>
                    {selectedProperty.units?.map(u => (
                      <option key={u.id} value={u.id}>{u.unitNumber}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={workOrderForm.title}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
                  placeholder="Brief description of issue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <textarea
                  value={workOrderForm.description}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
                  rows={3}
                  placeholder="Detailed description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={workOrderForm.category}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, category: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={workOrderForm.priority}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, priority: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign Vendor (optional)</label>
                <select
                  value={workOrderForm.vendorId}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, vendorId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base"
                >
                  <option value="">Select vendor...</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}{v.company ? ` (${v.company})` : ''}</option>
                  ))}
                </select>
              </div>
              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Photos (optional)</label>
                <div className="space-y-3">
                  {workOrderPhotoPreviewUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {workOrderPhotoPreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg border border-slate-300"
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
                    <label className="flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-3 cursor-pointer hover:border-slate-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleWorkOrderPhotoSelect}
                        className="hidden"
                      />
                      <span className="text-sm text-slate-600">
                        + Add Photos ({workOrderPhotos.length}/5)
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              <button
                onClick={() => {
                  setShowWorkOrderModal(false);
                  workOrderPhotoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
                  setWorkOrderPhotos([]);
                  setWorkOrderPhotoPreviewUrls([]);
                }}
                className="flex-1 px-4 py-3 sm:py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkOrder}
                disabled={submittingWorkOrder}
                className="flex-1 px-4 py-3 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
              >
                {submittingWorkOrder ? 'Creating...' : 'Create Work Order'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </PullToRefresh>
  );
}
