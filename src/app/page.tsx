'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardSkeleton } from '@/components/Skeleton';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useToast } from '@/components/Toast';

interface Stats {
  totalProperties: number;
  totalSpaces: number;
  occupiedSpaces: number;
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
    totalSpaces: 0,
    occupiedSpaces: 0,
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
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<string | null>(null);

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

  // Quick create forms
  const [propertyForm, setPropertyForm] = useState({ name: '', address: '' });
  const [unitForm, setUnitForm] = useState({ propertyId: '', unitNumber: '', bedrooms: '1', bathrooms: '1', rent: '' });
  const [leaseForm, setLeaseForm] = useState({
    propertyId: '',
    unitId: '',
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    monthlyRent: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });
  const [expenseForm, setExpenseForm] = useState({
    accountCode: '5000',
    amount: '',
    description: '',
    entryDate: new Date().toISOString().split('T')[0]
  });
  const [vendorForm, setVendorForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    specialty: ''
  });
  const [submittingQuickCreate, setSubmittingQuickCreate] = useState(false);

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
      const ledgerData = ledgerRes.ok ? await ledgerRes.json() : [];
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
      const occupiedSpaces = activeLeases.length;
      const tenantsWithBalance = balancesData.tenants?.filter((t: any) => t.balance > 0) || [];
      const totalOwed = tenantsWithBalance.reduce((sum: number, t: any) => sum + t.balance, 0);
      const tenantsOwing = tenantsWithBalance.length;
      // Monthly revenue now includes ALL recurring charges (rent + parking + pet fees + etc)
      const monthlyRevenue = monthlyChargesData.totalMonthly || 0;
      const openWorkOrders = workOrdersData.filter((wo: any) => wo.status === 'OPEN' || wo.status === 'IN_PROGRESS').length;

      setStats({
        totalProperties: propertiesData.length,
        totalSpaces,
        occupiedSpaces,
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

  const handleQuickCreateProperty = async () => {
    if (!propertyForm.name) {
      showWarning('Please enter a property name');
      return;
    }

    setSubmittingQuickCreate(true);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyForm)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create property');
      }

      showSuccess('Property created! Now add a unit.');
      setPropertyForm({ name: '', address: '' });
      setQuickCreateType('unit');
      fetchAllData();
    } catch (error: any) {
      showError(error.message || 'Failed to create property');
    } finally {
      setSubmittingQuickCreate(false);
    }
  };

  const handleQuickCreateUnit = async () => {
    if (!unitForm.propertyId || !unitForm.unitNumber) {
      showWarning('Please select a property and enter a unit number');
      return;
    }

    setSubmittingQuickCreate(true);
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...unitForm,
          bedrooms: parseInt(unitForm.bedrooms) || 1,
          bathrooms: parseFloat(unitForm.bathrooms) || 1,
          marketRent: unitForm.rent ? parseFloat(unitForm.rent) : undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create unit');
      }

      showSuccess('Unit created! Now add a tenant.');
      setUnitForm({ propertyId: '', unitNumber: '', bedrooms: '1', bathrooms: '1', rent: '' });
      setQuickCreateType('lease');
      fetchAllData();
    } catch (error: any) {
      showError(error.message || 'Failed to create unit');
    } finally {
      setSubmittingQuickCreate(false);
    }
  };

  const handleQuickCreateLease = async () => {
    if (!leaseForm.unitId || !leaseForm.tenantName || !leaseForm.monthlyRent) {
      showWarning('Please fill in all required fields');
      return;
    }

    // Find the selected property and unit to get their names
    const selectedProperty = properties.find(p => p.id === leaseForm.propertyId);
    const selectedUnit = selectedProperty?.units.find(u => u.id === leaseForm.unitId);

    if (!selectedUnit) {
      showWarning('Please select a valid unit');
      return;
    }

    setSubmittingQuickCreate(true);
    try {
      const res = await fetch('/api/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: leaseForm.propertyId,
          unitId: leaseForm.unitId,
          unitName: selectedUnit.unitNumber,
          propertyName: selectedProperty?.name || null,
          tenantName: leaseForm.tenantName,
          tenantEmail: leaseForm.tenantEmail || undefined,
          tenantPhone: leaseForm.tenantPhone || undefined,
          monthlyRentAmount: parseFloat(leaseForm.monthlyRent),
          startDate: leaseForm.startDate,
          endDate: leaseForm.endDate
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create lease');
      }

      showSuccess('Lease created successfully!');
      setLeaseForm({
        propertyId: '',
        unitId: '',
        tenantName: '',
        tenantEmail: '',
        tenantPhone: '',
        monthlyRent: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
      });
      setShowQuickCreate(false);
      setQuickCreateType(null);
      fetchAllData();
    } catch (error: any) {
      showError(error.message || 'Failed to create lease');
    } finally {
      setSubmittingQuickCreate(false);
    }
  };

  const handleQuickCreateExpense = async () => {
    if (!expenseForm.amount || !expenseForm.description) {
      showWarning('Please enter an amount and description');
      return;
    }

    setSubmittingQuickCreate(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountCode: expenseForm.accountCode,
          amount: parseFloat(expenseForm.amount),
          description: expenseForm.description,
          entryDate: expenseForm.entryDate
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record expense');
      }

      showSuccess('Expense recorded successfully!');
      setExpenseForm({
        accountCode: '5000',
        amount: '',
        description: '',
        entryDate: new Date().toISOString().split('T')[0]
      });
      setShowQuickCreate(false);
      setQuickCreateType(null);
      fetchAllData();
    } catch (error: any) {
      showError(error.message || 'Failed to record expense');
    } finally {
      setSubmittingQuickCreate(false);
    }
  };

  const handleQuickCreateVendor = async () => {
    if (!vendorForm.name) {
      showWarning('Please enter a vendor name');
      return;
    }

    setSubmittingQuickCreate(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: vendorForm.name,
          company: vendorForm.company || undefined,
          email: vendorForm.email || undefined,
          phone: vendorForm.phone || undefined,
          specialty: vendorForm.specialty || undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create vendor');
      }

      showSuccess('Vendor created successfully!');
      setVendorForm({ name: '', company: '', email: '', phone: '', specialty: '' });
      setShowQuickCreate(false);
      setQuickCreateType(null);
      fetchAllData();
    } catch (error: any) {
      showError(error.message || 'Failed to create vendor');
    } finally {
      setSubmittingQuickCreate(false);
    }
  };

  const selectedLeaseProperty = properties.find(p => p.id === leaseForm.propertyId);

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
    ? Math.round((stats.occupiedSpaces / stats.totalUnits) * 100)
    : 0;

  const selectedProperty = properties.find(p => p.id === workOrderForm.propertyId);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Property management overview</p>
            </div>
            {/* Quick Action Buttons */}
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2 whitespace-nowrap flex-shrink-0 shadow-sm"
              >
                💵 Payment
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
                🔧 Work Order
              </button>
              <button
                onClick={() => {
                  setQuickCreateType('expense');
                  setShowQuickCreate(true);
                }}
                className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex items-center gap-2 whitespace-nowrap flex-shrink-0 shadow-sm"
              >
                − Expense
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Key Metrics - Modern Premium Design */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {/* Warehouse Spaces Card */}
          <Link href="/properties" className="group relative bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-750 rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-blue-100 dark:border-blue-900/50 transition-all duration-300 cursor-pointer overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">🏭</span>
                <span className="text-xs font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full">Total</span>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Warehouse Spaces</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stats.totalSpaces}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                {stats.totalProperties} warehouses
                <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </p>
            </div>
          </Link>

          {/* Occupied Spaces Card */}
          <Link href="/leases" className="group relative bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-gray-750 rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-green-100 dark:border-green-900/50 transition-all duration-300 cursor-pointer overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">✅</span>
                <span className="text-xs font-medium px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full">{occupancyRate}%</span>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Occupied Spaces</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent mb-2">{stats.occupiedSpaces}</p>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                {occupancyRate}% occupancy
                <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </p>
            </div>
          </Link>

          {/* Monthly Revenue Card */}
          <Link href="/reports?tab=pnl" className="group relative bg-gradient-to-br from-white to-emerald-50 dark:from-gray-800 dark:to-gray-750 rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-emerald-100 dark:border-emerald-900/50 transition-all duration-300 cursor-pointer overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">💰</span>
                <span className="text-xs font-medium px-2 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full">Monthly</span>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Expected Revenue</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent mb-2">{formatCurrency(stats.monthlyRevenue)}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                Per month
                <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </p>
            </div>
          </Link>

          {/* Amount Owed Card */}
          <Link href="/reports?tab=aging" className={`group relative rounded-2xl p-6 shadow-lg hover:shadow-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${stats.totalOwed > 0 ? 'bg-gradient-to-br from-white to-red-50 dark:from-gray-800 dark:to-gray-750 border-red-100 dark:border-red-900/50' : 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-750 border-gray-100 dark:border-gray-700'}`}>
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl transition-all duration-500 ${stats.totalOwed > 0 ? 'bg-red-500/10 group-hover:bg-red-500/20' : 'bg-gray-500/10 group-hover:bg-gray-500/20'}`}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{stats.totalOwed > 0 ? '⚠️' : '✨'}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${stats.totalOwed > 0 ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'}`}>
                  {stats.tenantsOwing > 0 ? `${stats.tenantsOwing} Unpaid` : 'Paid'}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Amount Owed</p>
              <p className={`text-3xl font-bold mb-2 ${stats.totalOwed > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {formatCurrency(stats.totalOwed)}
              </p>
              <p className={`text-xs font-medium flex items-center gap-1 ${stats.tenantsOwing > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {stats.tenantsOwing > 0 ? `${stats.tenantsOwing} accounts need attention` : 'All accounts paid ✓'}
                <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </p>
            </div>
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
                    <span className="text-xl sm:text-2xl">⚠️</span>
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
                    <span className="text-xl sm:text-2xl">📈</span>
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
                    <span className="text-xl sm:text-2xl">📅</span>
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

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <Link href="/properties" className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 transition-all group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center text-xl sm:text-2xl mb-2 sm:mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-900 transition-colors">
              🏢
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">Properties</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{stats.totalProperties} properties</p>
          </Link>

          <Link href="/leases" className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-green-300 transition-all group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center text-xl sm:text-2xl mb-2 sm:mb-3 group-hover:bg-green-200 dark:group-hover:bg-green-900 transition-colors">
              📄
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">Leases</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{stats.activeLeases} active</p>
          </Link>

          <Link href="/maintenance" className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-orange-300 transition-all group">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl mb-2 sm:mb-3 transition-colors ${
              stats.openWorkOrders > 0 ? 'bg-orange-100 dark:bg-orange-900/50 group-hover:bg-orange-200' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200'
            }`}>
              🔧
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">Maintenance</h3>
            <p className={`text-sm ${stats.openWorkOrders > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
              {stats.openWorkOrders} open
            </p>
          </Link>

          <Link href="/accounting" className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-purple-300 transition-all group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center text-xl sm:text-2xl mb-2 sm:mb-3 group-hover:bg-purple-200 dark:group-hover:bg-purple-900 transition-colors">
              💰
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">Accounting</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Ledger & balances</p>
          </Link>

          <Link href="/reports" className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-300 transition-all group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-xl sm:text-2xl mb-2 sm:mb-3 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900 transition-colors">
              📊
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">Reports</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">P&L & analytics</p>
          </Link>

          <Link href="/vendors" className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-teal-300 transition-all group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 dark:bg-teal-900/50 rounded-lg flex items-center justify-center text-xl sm:text-2xl mb-2 sm:mb-3 group-hover:bg-teal-200 dark:group-hover:bg-teal-900 transition-colors">
              👷
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">Vendors</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Contractors</p>
          </Link>
        </div>

        {/* Quick Add Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <button
            onClick={() => { setQuickCreateType('property'); setShowQuickCreate(true); }}
            className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all border border-blue-200 dark:border-blue-800"
          >
            <div className="text-2xl mb-1">🏢</div>
            <p className="font-semibold text-blue-700 dark:text-blue-300">+ Property</p>
          </button>
          <button
            onClick={() => { setQuickCreateType('unit'); setShowQuickCreate(true); }}
            className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all border border-blue-200 dark:border-blue-800"
          >
            <div className="text-2xl mb-1">🚪</div>
            <p className="font-semibold text-blue-700 dark:text-blue-300">+ Unit</p>
          </button>
          <button
            onClick={() => { setQuickCreateType('lease'); setShowQuickCreate(true); }}
            className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center hover:bg-green-100 dark:hover:bg-green-900/50 transition-all border border-green-200 dark:border-green-800"
          >
            <div className="text-2xl mb-1">📝</div>
            <p className="font-semibold text-green-700 dark:text-green-300">+ Lease</p>
          </button>
          <button
            onClick={() => { setQuickCreateType('vendor'); setShowQuickCreate(true); }}
            className="bg-teal-50 dark:bg-teal-900/30 rounded-xl p-4 text-center hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all border border-teal-200 dark:border-teal-800"
          >
            <div className="text-2xl mb-1">👷</div>
            <p className="font-semibold text-teal-700 dark:text-teal-300">+ Vendor</p>
          </button>
        </div>

        {/* Expiring Leases - Simple List */}
        {expiringLeases.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Expiring Soon</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Next 60 days</p>
              </div>
              <Link href="/leases" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                View All →
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {expiringLeases.slice(0, 5).map(lease => {
                const daysUntil = getDaysUntil(lease.endDate);
                return (
                  <Link
                    key={lease.id}
                    href={`/leases/${lease.id}`}
                    className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{lease.tenantName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{lease.unitName}</p>
                    </div>
                    <div className={`text-right ml-3 px-2 py-1 rounded-full text-xs font-medium ${
                      daysUntil <= 14 ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                      daysUntil <= 30 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
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
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Record Payment</h2>
              <button onClick={() => { setShowPaymentModal(false); setTenantSearch(''); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl p-1">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
                <input
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="Search tenant name..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
                  autoFocus
                />
                <select
                  value={paymentForm.leaseId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, leaseId: e.target.value, amount: '' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {paymentForm.paymentMethod === 'CHECK' ? 'Check #' : 'Money Order #'} (optional)
                  </label>
                  <input
                    type="text"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
                    placeholder={paymentForm.paymentMethod === 'CHECK' ? 'Check number' : 'Money order number'}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              <button
                onClick={() => { setShowPaymentModal(false); setTenantSearch(''); }}
                className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
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
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Add Charge</h2>
              <button onClick={() => setShowChargeModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl p-1">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
                <select
                  value={chargeForm.leaseId}
                  onChange={(e) => setChargeForm({ ...chargeForm, leaseId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
                  autoFocus
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
                  placeholder="Late fee, utility charge, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Charge Type</label>
                <select
                  value={chargeForm.accountCode}
                  onChange={(e) => setChargeForm({ ...chargeForm, accountCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
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
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              <button
                onClick={() => setShowChargeModal(false)}
                className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
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
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Create Work Order</h2>
              <button onClick={() => setShowWorkOrderModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl p-1">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
                <select
                  value={workOrderForm.propertyId}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, propertyId: e.target.value, unitId: '' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
                  placeholder="Brief description of issue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={workOrderForm.description}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
                  rows={3}
                  placeholder="Detailed description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={workOrderForm.category}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
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
                            className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg border border-gray-300"
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
                      <span className="text-sm text-gray-600 dark:text-gray-400">
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
                className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
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

      {/* Floating Action Button - Quick Create */}
      <button
        onClick={() => setShowQuickCreate(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center justify-center text-2xl z-40"
        title="Quick Create"
      >
        +
      </button>

      {/* Quick Create Modal */}
      {showQuickCreate && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl w-full sm:max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {!quickCreateType ? 'Quick Create' :
                   quickCreateType === 'property' ? 'New Property' :
                   quickCreateType === 'unit' ? 'New Unit' :
                   quickCreateType === 'lease' ? 'New Lease' :
                   quickCreateType === 'expense' ? 'Record Expense' :
                   quickCreateType === 'vendor' ? 'New Vendor' :
                   'Quick Create'}
                </h2>
                {!quickCreateType && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">What would you like to create?</p>
                )}
              </div>
              <button
                onClick={() => { setShowQuickCreate(false); setQuickCreateType(null); }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl p-1"
              >
                &times;
              </button>
            </div>

            {/* Entity Selection Grid */}
            {!quickCreateType && (
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setQuickCreateType('property')}
                  className="flex flex-col items-center p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                >
                  <span className="text-2xl mb-1">🏢</span>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">Property</span>
                </button>
                <button
                  onClick={() => setQuickCreateType('unit')}
                  className="flex flex-col items-center p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                >
                  <span className="text-2xl mb-1">🚪</span>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">Unit</span>
                </button>
                <button
                  onClick={() => setQuickCreateType('lease')}
                  className="flex flex-col items-center p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
                >
                  <span className="text-2xl mb-1">📄</span>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">Lease</span>
                </button>
                <button
                  onClick={() => { setShowQuickCreate(false); setShowPaymentModal(true); }}
                  className="flex flex-col items-center p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
                >
                  <span className="text-2xl mb-1">💵</span>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">Payment</span>
                </button>
                <button
                  onClick={() => { setShowQuickCreate(false); setShowChargeModal(true); }}
                  className="flex flex-col items-center p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                >
                  <span className="text-2xl mb-1">+$</span>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">Charge</span>
                </button>
                <button
                  onClick={() => setQuickCreateType('expense')}
                  className="flex flex-col items-center p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                  <span className="text-2xl mb-1">💸</span>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">Expense</span>
                </button>
                <button
                  onClick={() => { setShowQuickCreate(false); setShowWorkOrderModal(true); }}
                  className="flex flex-col items-center p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
                >
                  <span className="text-2xl mb-1">🔧</span>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">Work Order</span>
                </button>
                <button
                  onClick={() => setQuickCreateType('vendor')}
                  className="flex flex-col items-center p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-teal-500 dark:hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all"
                >
                  <span className="text-2xl mb-1">👷</span>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">Vendor</span>
                </button>
              </div>
            )}

            {/* Property Form */}
            {quickCreateType === 'property' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">Start by creating a property. Then add units and tenants.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property Name *</label>
                  <input
                    type="text"
                    value={propertyForm.name}
                    onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Sunset Apartments"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address (optional)</label>
                  <input
                    type="text"
                    value={propertyForm.address}
                    onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="123 Main St, City, State"
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setQuickCreateType(null)}
                    className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleQuickCreateProperty}
                    disabled={submittingQuickCreate}
                    className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {submittingQuickCreate ? 'Creating...' : 'Create Property'}
                  </button>
                </div>
              </div>
            )}

            {/* Unit Form */}
            {quickCreateType === 'unit' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">Add a unit to an existing property.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property *</label>
                  <select
                    value={unitForm.propertyId}
                    onChange={(e) => setUnitForm({ ...unitForm, propertyId: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    autoFocus
                  >
                    <option value="">Select property...</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Number *</label>
                  <input
                    type="text"
                    value={unitForm.unitNumber}
                    onChange={(e) => setUnitForm({ ...unitForm, unitNumber: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., 101, A, 2B"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bedrooms</label>
                    <select
                      value={unitForm.bedrooms}
                      onChange={(e) => setUnitForm({ ...unitForm, bedrooms: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="0">Studio</option>
                      <option value="1">1 BR</option>
                      <option value="2">2 BR</option>
                      <option value="3">3 BR</option>
                      <option value="4">4 BR</option>
                      <option value="5">5+ BR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bathrooms</label>
                    <select
                      value={unitForm.bathrooms}
                      onChange={(e) => setUnitForm({ ...unitForm, bathrooms: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="1">1 BA</option>
                      <option value="1.5">1.5 BA</option>
                      <option value="2">2 BA</option>
                      <option value="2.5">2.5 BA</option>
                      <option value="3">3+ BA</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Market Rent (optional)</label>
                  <input
                    type="number"
                    value={unitForm.rent}
                    onChange={(e) => setUnitForm({ ...unitForm, rent: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="1500"
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setQuickCreateType(null)}
                    className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleQuickCreateUnit}
                    disabled={submittingQuickCreate}
                    className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {submittingQuickCreate ? 'Creating...' : 'Create Unit'}
                  </button>
                </div>
              </div>
            )}

            {/* Lease Form */}
            {quickCreateType === 'lease' && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-800 dark:text-green-200">Add a new tenant to a vacant unit.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property *</label>
                  <select
                    value={leaseForm.propertyId}
                    onChange={(e) => setLeaseForm({ ...leaseForm, propertyId: e.target.value, unitId: '' })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    autoFocus
                  >
                    <option value="">Select property...</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {selectedLeaseProperty && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit *</label>
                    <select
                      value={leaseForm.unitId}
                      onChange={(e) => setLeaseForm({ ...leaseForm, unitId: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select unit...</option>
                      {selectedLeaseProperty.units?.map(u => (
                        <option key={u.id} value={u.id}>{u.unitNumber}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tenant Name *</label>
                  <input
                    type="text"
                    value={leaseForm.tenantName}
                    onChange={(e) => setLeaseForm({ ...leaseForm, tenantName: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Full name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={leaseForm.tenantEmail}
                      onChange={(e) => setLeaseForm({ ...leaseForm, tenantEmail: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={leaseForm.tenantPhone}
                      onChange={(e) => setLeaseForm({ ...leaseForm, tenantPhone: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Rent *</label>
                  <input
                    type="number"
                    value={leaseForm.monthlyRent}
                    onChange={(e) => setLeaseForm({ ...leaseForm, monthlyRent: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="1500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={leaseForm.startDate}
                      onChange={(e) => setLeaseForm({ ...leaseForm, startDate: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                    <input
                      type="date"
                      value={leaseForm.endDate}
                      onChange={(e) => setLeaseForm({ ...leaseForm, endDate: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setQuickCreateType(null)}
                    className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleQuickCreateLease}
                    disabled={submittingQuickCreate}
                    className="flex-1 px-4 py-3 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {submittingQuickCreate ? 'Creating...' : 'Create Lease'}
                  </button>
                </div>
              </div>
            )}

            {/* Expense Form */}
            {quickCreateType === 'expense' && (
              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800 dark:text-red-200">Record an operating expense.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={expenseForm.accountCode}
                    onChange={(e) => setExpenseForm({ ...expenseForm, accountCode: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    autoFocus
                  >
                    <option value="5000">Repairs & Maintenance</option>
                    <option value="5100">Utilities</option>
                    <option value="5200">Property Management</option>
                    <option value="5300">Insurance</option>
                    <option value="5400">Property Taxes</option>
                    <option value="5500">Legal & Professional</option>
                    <option value="5900">Other Expenses</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                  <input
                    type="text"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="What was this expense for?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={expenseForm.entryDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, entryDate: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setQuickCreateType(null)}
                    className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleQuickCreateExpense}
                    disabled={submittingQuickCreate}
                    className="flex-1 px-4 py-3 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                  >
                    {submittingQuickCreate ? 'Recording...' : 'Record Expense'}
                  </button>
                </div>
              </div>
            )}

            {/* Vendor Form */}
            {quickCreateType === 'vendor' && (
              <div className="space-y-4">
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-teal-800 dark:text-teal-200">Add a contractor or service provider.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Name *</label>
                  <input
                    type="text"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="John Smith"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company (optional)</label>
                  <input
                    type="text"
                    value={vendorForm.company}
                    onChange={(e) => setVendorForm({ ...vendorForm, company: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="ABC Plumbing Inc."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specialty</label>
                  <select
                    value={vendorForm.specialty}
                    onChange={(e) => setVendorForm({ ...vendorForm, specialty: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select specialty...</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="HVAC">HVAC</option>
                    <option value="General Contractor">General Contractor</option>
                    <option value="Landscaping">Landscaping</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Pest Control">Pest Control</option>
                    <option value="Appliance Repair">Appliance Repair</option>
                    <option value="Roofing">Roofing</option>
                    <option value="Painting">Painting</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setQuickCreateType(null)}
                    className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleQuickCreateVendor}
                    disabled={submittingQuickCreate}
                    className="flex-1 px-4 py-3 sm:py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
                  >
                    {submittingQuickCreate ? 'Creating...' : 'Create Vendor'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
