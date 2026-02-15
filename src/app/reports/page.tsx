'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ReportsPageSkeleton } from '@/components/Skeleton';

interface TenantBalance {
  leaseId: string;
  tenantName: string;
  unitName: string;
  propertyName: string | null;
  status: string;
  balance: number;
  monthlyRent: number | null;
}

interface Summary {
  totalTenants: number;
  tenantsOwing: number;
  tenantsWithCredit: number;
  totalOwed: number;
  totalCredits: number;
  netBalance: number;
}

interface ReportData {
  tenants: TenantBalance[];
  summary: Summary;
}

interface BulkChargePreview {
  leaseId: string;
  tenantName: string;
  unitName: string;
  propertyName: string | null;
  amount: number;
}

interface BulkChargeResult {
  leaseId: string;
  tenantName: string;
  unitName: string;
  amount: number;
  success: boolean;
  entries?: string[];
}

interface Property {
  id: string;
  name: string;
}

interface IncomeBreakdown {
  period: {
    start: string;
    end: string;
  };
  breakdown: Array<{
    code: string;
    name: string;
    amount: number;
  }>;
  totalIncome: number;
  previousPeriodTotal: number;
  changePercent: number;
}

interface ProfitLossData {
  period: {
    start: string;
    end: string;
  };
  income: {
    breakdown: Array<{ code: string; name: string; amount: number }>;
    total: number;
    previousPeriod: number;
    changePercent: number;
  };
  expenses: {
    breakdown: Array<{ code: string; name: string; amount: number }>;
    total: number;
    previousPeriod: number;
    changePercent: number;
  };
  summary: {
    netOperatingIncome: number;
    previousNOI: number;
    noiChangePercent: number;
    expenseRatio: number;
    profitMargin: number;
  };
}

interface Expense {
  id: string;
  date: string;
  accountCode: string;
  accountName: string;
  description: string;
  amount: number;
  propertyName: string | null;
  unitName: string | null;
  postedBy: string;
}

interface ExpenseAccount {
  code: string;
  name: string;
}

interface DrillDownTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  tenantName: string | null;
  unitName: string | null;
  propertyName: string | null;
  vendorName: string | null;
  workOrderId: string | null;
  leaseId: string | null;
  postedBy: string;
  createdAt: string;
}

interface DrillDownData {
  account: {
    code: string;
    name: string;
    type: string;
  };
  transactions: DrillDownTransaction[];
  total: number;
  count: number;
}

interface AgingTenant {
  leaseId: string;
  tenantName: string;
  unitName: string;
  propertyName: string | null;
  amount: number;
  oldestChargeDate: string;
  daysPastDue: number;
}

interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  amount: number;
  count: number;
  tenants: AgingTenant[];
}

interface AgingData {
  asOfDate: string;
  buckets: AgingBucket[];
  summary: {
    totalOutstanding: number;
    totalTenants: number;
    over30Days: number;
    over60Days: number;
    over90Days: number;
  };
}

interface LedgerTransaction {
  id: string;
  date: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  tenantName: string | null;
  propertyName: string | null;
  unitName: string | null;
  leaseId: string | null;
}

interface RentRollUnit {
  unitId: string;
  unitName: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  isOccupied: boolean;
  tenantName: string | null;
  monthlyRent: number | null;
  annualRent: number | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  leaseId: string | null;
}

interface RentRollProperty {
  propertyId: string;
  propertyName: string;
  propertyAddress: string | null;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  totalMonthlyRent: number;
  totalAnnualRent: number;
  units: RentRollUnit[];
}

interface RentRollData {
  asOfDate: string;
  properties: RentRollProperty[];
  summary: {
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    overallOccupancy: number;
    totalMonthlyRent: number;
    totalAnnualRent: number;
  };
}

export default function ReportsPageWrapper() {
  return (
    <Suspense fallback={<ReportsPageSkeleton />}>
      <ReportsPage />
    </Suspense>
  );
}

function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ReportData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'owing' | 'credit' | 'zero'>('all');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<BulkChargePreview[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkResults, setBulkResults] = useState<{ results: BulkChargeResult[], errors: any[] } | null>(null);
  const [incomeData, setIncomeData] = useState<IncomeBreakdown | null>(null);
  const [activeTab, setActiveTab] = useState<'balances' | 'pnl' | 'expenses' | 'aging' | 'transactions' | 'rentroll'>('balances');
  const [agingData, setAgingData] = useState<AgingData | null>(null);
  const [pnlData, setPnlData] = useState<ProfitLossData | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    accountCode: '5000',
    amount: '',
    description: '',
    entryDate: new Date().toISOString().split('T')[0]
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });
  const [showDrillDown, setShowDrillDown] = useState(false);
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const [allTransactions, setAllTransactions] = useState<LedgerTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [rentRollData, setRentRollData] = useState<RentRollData | null>(null);

  useEffect(() => {
    document.title = 'Reports | Sanprinon';
    // Check URL for tab parameter
    const tabParam = searchParams.get('tab');
    if (tabParam && ['balances', 'pnl', 'expenses', 'aging', 'transactions', 'rentroll'].includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab);
    }
    fetchReport();
    fetchProperties();
    fetchIncomeBreakdown();
    fetchProfitLoss();
    fetchExpenses();
    fetchAging();
  }, [searchParams]);

  const fetchReport = async () => {
    try {
      const res = await fetch('/api/reports/tenant-balances');
      if (!res.ok) throw new Error('Failed to fetch report');
      const reportData = await res.json();
      setData(reportData);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties');
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    }
  };

  const fetchIncomeBreakdown = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProperty !== 'all') {
        params.set('propertyId', selectedProperty);
      }
      const res = await fetch(`/api/reports/income-breakdown?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIncomeData(data);
      }
    } catch (error) {
      console.error('Failed to fetch income breakdown:', error);
    }
  };

  const fetchProfitLoss = async () => {
    try {
      const params = new URLSearchParams();
      params.set('startDate', dateRange.start);
      params.set('endDate', dateRange.end);
      if (selectedProperty !== 'all') {
        params.set('propertyId', selectedProperty);
      }
      const res = await fetch(`/api/reports/profit-loss?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPnlData(data);
      }
    } catch (error) {
      console.error('Failed to fetch P&L:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams();
      params.set('startDate', dateRange.start);
      params.set('endDate', dateRange.end);
      if (selectedProperty !== 'all') {
        params.set('propertyId', selectedProperty);
      }
      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses);
        setExpenseAccounts(data.expenseAccounts);
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    }
  };

  const fetchAging = async () => {
    try {
      const res = await fetch('/api/reports/aging');
      if (res.ok) {
        const data = await res.json();
        setAgingData(data);
      }
    } catch (error) {
      console.error('Failed to fetch aging report:', error);
    }
  };

  const fetchAllTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('startDate', dateRange.start);
      params.set('endDate', dateRange.end);
      if (selectedProperty !== 'all') {
        params.set('propertyId', selectedProperty);
      }
      const res = await fetch(`/api/reports/all-transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAllTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch all transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchRentRoll = async () => {
    try {
      const res = await fetch('/api/reports/rent-roll');
      if (res.ok) {
        const data = await res.json();
        setRentRollData(data);
      }
    } catch (error) {
      console.error('Failed to fetch rent roll:', error);
    }
  };

  const fetchDrillDown = async (accountCode: string, type: 'income' | 'expense') => {
    setDrillDownLoading(true);
    setShowDrillDown(true);
    setDrillDownData(null);

    try {
      const params = new URLSearchParams();
      params.set('accountCode', accountCode);
      params.set('startDate', dateRange.start);
      params.set('endDate', dateRange.end);
      params.set('type', type);
      if (selectedProperty !== 'all') {
        params.set('propertyId', selectedProperty);
      }
      const res = await fetch(`/api/reports/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDrillDownData(data);
      }
    } catch (error) {
      console.error('Failed to fetch drill-down data:', error);
    } finally {
      setDrillDownLoading(false);
    }
  };

  const handleTransactionClick = (txn: DrillDownTransaction) => {
    // Navigate to the source of the transaction
    if (txn.workOrderId) {
      // Maintenance expense - navigate to maintenance page with work order ID
      router.push(`/maintenance?workOrder=${txn.workOrderId}`);
    } else if (txn.leaseId) {
      // Lease-related transaction - navigate to lease detail
      router.push(`/leases/${txn.leaseId}`);
    }
    // If neither, the row won't be clickable
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingExpense(true);

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add expense');
      }

      // Reset form and close modal
      setExpenseForm({
        accountCode: '5000',
        amount: '',
        description: '',
        entryDate: new Date().toISOString().split('T')[0]
      });
      setShowExpenseModal(false);

      // Refresh data
      fetchExpenses();
      fetchProfitLoss();
    } catch (error: any) {
      console.error('Failed to add expense:', error);
      alert(error.message || 'Failed to add expense');
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Refetch when property or date range changes
  useEffect(() => {
    fetchIncomeBreakdown();
    fetchProfitLoss();
    fetchExpenses();
  }, [selectedProperty, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // CSV Export Helper Functions
  const downloadCSV = (data: string[][], filename: string) => {
    const csvContent = data.map(row =>
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(cell).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
          ? `"${escaped}"`
          : escaped;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportBalancesCSV = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Tenant', 'Property', 'Unit', 'Monthly Rent', 'Balance', 'Status']
    ];
    filteredTenants.forEach(t => {
      rows.push([
        t.tenantName,
        t.propertyName || '',
        t.unitName,
        t.monthlyRent ? t.monthlyRent.toFixed(2) : '',
        t.balance.toFixed(2),
        t.status
      ]);
    });
    downloadCSV(rows, `tenant-balances-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportPnLCSV = () => {
    if (!pnlData) return;
    const rows: string[][] = [
      ['Profit & Loss Statement'],
      [`Period: ${pnlData.period.start} to ${pnlData.period.end}`],
      [],
      ['Category', 'Account', 'Amount'],
      ['INCOME', '', ''],
      ...pnlData.income.breakdown.map(item => ['', item.name, item.amount.toFixed(2)]),
      ['', 'Total Income', pnlData.income.total.toFixed(2)],
      [],
      ['EXPENSES', '', ''],
      ...pnlData.expenses.breakdown.map(item => ['', item.name, item.amount.toFixed(2)]),
      ['', 'Total Expenses', pnlData.expenses.total.toFixed(2)],
      [],
      ['NET OPERATING INCOME', '', pnlData.summary.netOperatingIncome.toFixed(2)]
    ];
    downloadCSV(rows, `profit-loss-${dateRange.start}-to-${dateRange.end}.csv`);
  };

  const exportExpensesCSV = () => {
    const rows: string[][] = [
      ['Date', 'Category', 'Description', 'Amount', 'Property', 'Unit']
    ];
    expenses.forEach(exp => {
      rows.push([
        new Date(exp.date).toLocaleDateString(),
        exp.accountName,
        exp.description,
        exp.amount.toFixed(2),
        exp.propertyName || '',
        exp.unitName || ''
      ]);
    });
    rows.push(['', '', 'Total', expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2), '', '']);
    downloadCSV(rows, `expenses-${dateRange.start}-to-${dateRange.end}.csv`);
  };

  const exportAgingCSV = () => {
    if (!agingData) return;
    const rows: string[][] = [
      ['Aging Report'],
      [`As of: ${agingData.asOfDate}`],
      [],
      ['Tenant', 'Property', 'Unit', 'Amount', 'Oldest Charge Date', 'Days Past Due', 'Aging Bucket']
    ];
    agingData.buckets.forEach(bucket => {
      bucket.tenants.forEach(t => {
        rows.push([
          t.tenantName,
          t.propertyName || '',
          t.unitName,
          t.amount.toFixed(2),
          t.oldestChargeDate,
          t.daysPastDue.toString(),
          bucket.label
        ]);
      });
    });
    rows.push([]);
    rows.push(['Summary', '', '', '', '', '', '']);
    rows.push(['Total Outstanding', '', '', agingData.summary.totalOutstanding.toFixed(2), '', '', '']);
    rows.push(['Over 30 Days', '', '', agingData.summary.over30Days.toFixed(2), '', '', '']);
    rows.push(['Over 60 Days', '', '', agingData.summary.over60Days.toFixed(2), '', '', '']);
    rows.push(['Over 90 Days', '', '', agingData.summary.over90Days.toFixed(2), '', '', '']);
    downloadCSV(rows, `aging-report-${agingData.asOfDate}.csv`);
  };

  const exportIncomeCSV = () => {
    if (!incomeData) return;
    const rows: string[][] = [
      ['Income Report'],
      [`Period: ${incomeData.period.start} to ${incomeData.period.end}`],
      [],
      ['Account Code', 'Category', 'Amount', '% of Total']
    ];
    incomeData.breakdown.forEach(item => {
      rows.push([
        item.code,
        item.name,
        item.amount.toFixed(2),
        incomeData.totalIncome > 0 ? ((item.amount / incomeData.totalIncome) * 100).toFixed(1) + '%' : '0%'
      ]);
    });
    rows.push([]);
    rows.push(['', 'Total Income', incomeData.totalIncome.toFixed(2), '100%']);
    downloadCSV(rows, `income-report-${incomeData.period.start}-to-${incomeData.period.end}.csv`);
  };

  const exportAllTransactionsCSV = () => {
    if (allTransactions.length === 0) return;
    const rows: string[][] = [
      ['All Transactions'],
      [`Period: ${dateRange.start} to ${dateRange.end}`],
      [],
      ['Date', 'Account Code', 'Account Name', 'Description', 'Debit', 'Credit', 'Tenant', 'Property', 'Unit']
    ];
    allTransactions.forEach(t => {
      rows.push([
        t.date,
        t.accountCode,
        t.accountName,
        t.description,
        t.debit > 0 ? t.debit.toFixed(2) : '',
        t.credit > 0 ? t.credit.toFixed(2) : '',
        t.tenantName || '',
        t.propertyName || '',
        t.unitName || ''
      ]);
    });
    const totalDebits = allTransactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredits = allTransactions.reduce((sum, t) => sum + t.credit, 0);
    rows.push([]);
    rows.push(['', '', '', 'Totals', totalDebits.toFixed(2), totalCredits.toFixed(2), '', '', '']);
    downloadCSV(rows, `all-transactions-${dateRange.start}-to-${dateRange.end}.csv`);
  };

  const exportRentRollCSV = () => {
    if (!rentRollData) return;
    const rows: string[][] = [
      ['Rent Roll Report - Schedule E Helper'],
      [`As of: ${rentRollData.asOfDate}`],
      [],
      ['Property', 'Address', 'Unit', 'Tenant', 'Monthly Rent', 'Annual Rent', 'Lease Start', 'Lease End', 'Status']
    ];
    rentRollData.properties.forEach(property => {
      property.units.forEach(unit => {
        rows.push([
          property.propertyName,
          property.propertyAddress || '',
          unit.unitName,
          unit.tenantName || 'VACANT',
          unit.monthlyRent ? unit.monthlyRent.toFixed(2) : '',
          unit.annualRent ? unit.annualRent.toFixed(2) : '',
          unit.leaseStart || '',
          unit.leaseEnd || '',
          unit.isOccupied ? 'Occupied' : 'Vacant'
        ]);
      });
      // Add property subtotal
      rows.push([
        property.propertyName + ' - SUBTOTAL',
        '',
        `${property.occupiedUnits}/${property.totalUnits} occupied`,
        '',
        property.totalMonthlyRent.toFixed(2),
        property.totalAnnualRent.toFixed(2),
        '',
        '',
        `${property.occupancyRate}% occupancy`
      ]);
      rows.push([]); // Empty row between properties
    });
    // Add grand total
    rows.push(['GRAND TOTAL', '', '', '',
      rentRollData.summary.totalMonthlyRent.toFixed(2),
      rentRollData.summary.totalAnnualRent.toFixed(2),
      '', '',
      `${rentRollData.summary.overallOccupancy}% overall occupancy`
    ]);
    downloadCSV(rows, `rent-roll-${rentRollData.asOfDate}.csv`);
  };

  const getFilteredTenants = () => {
    if (!data) return [];

    let filtered = data.tenants;

    // Apply specific property filter
    if (selectedProperty !== 'all') {
      const propertyMatch = properties.find(p => p.id === selectedProperty);
      if (propertyMatch) {
        filtered = filtered.filter(t => t.propertyName === propertyMatch.name);
      }
    }

    // Apply balance filter
    switch (filter) {
      case 'owing':
        return filtered.filter(t => t.balance > 0);
      case 'credit':
        return filtered.filter(t => t.balance < 0);
      case 'zero':
        return filtered.filter(t => t.balance === 0);
      default:
        return filtered;
    }
  };

  const handleGenerateRent = async () => {
    setBulkLoading(true);
    setBulkResults(null);

    try {
      // First, get preview
      const previewRes = await fetch('/api/charges/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: true, chargeDate })
      });

      if (!previewRes.ok) {
        throw new Error('Failed to fetch preview');
      }

      const previewData = await previewRes.json();
      setBulkPreview(previewData.charges);
      setShowBulkModal(true);
    } catch (error) {
      console.error('Failed to fetch preview:', error);
      alert('Failed to load charge preview');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleConfirmBulkCharges = async () => {
    setBulkLoading(true);

    try {
      const res = await fetch('/api/charges/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: false, chargeDate })
      });

      if (!res.ok) {
        throw new Error('Failed to post bulk charges');
      }

      const result = await res.json();
      setBulkResults(result);

      // Refresh the report to show updated balances
      await fetchReport();
    } catch (error: any) {
      console.error('Failed to post bulk charges:', error);
      alert(error.message || 'Failed to post charges');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowBulkModal(false);
    setBulkPreview([]);
    setBulkResults(null);
  };

  if (loading) {
    return <ReportsPageSkeleton />;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Failed to load report</div>
      </div>
    );
  }

  const filteredTenants = getFilteredTenants();

  // Calculate filtered summary statistics
  const getFilteredSummary = () => {
    const tenantsOwing = filteredTenants.filter(t => t.balance > 0).length;
    const tenantsWithCredit = filteredTenants.filter(t => t.balance < 0).length;
    const totalOwed = filteredTenants
      .filter(t => t.balance > 0)
      .reduce((sum, t) => sum + t.balance, 0);
    const totalCredits = Math.abs(
      filteredTenants
        .filter(t => t.balance < 0)
        .reduce((sum, t) => sum + t.balance, 0)
    );
    const netBalance = filteredTenants.reduce((sum, t) => sum + t.balance, 0);

    return {
      totalTenants: filteredTenants.length,
      tenantsOwing,
      tenantsWithCredit,
      totalOwed,
      totalCredits,
      netBalance
    };
  };

  const filteredSummary = getFilteredSummary();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Reports</h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">Tenant balances and financial summary</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
              {/* Property Filter */}
              {properties.length > 0 && (
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
                >
                  <option value="all">All Properties</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateRent}
                  disabled={bulkLoading}
                  className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkLoading ? 'Loading...' : 'Charge Rent'}
                </button>
                <button
                  onClick={fetchReport}
                  className="px-4 py-2.5 sm:py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Date Range Filter */}
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <label className="text-xs sm:text-sm font-medium text-slate-700">From:</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-2 sm:px-3 py-2 sm:py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <label className="text-xs sm:text-sm font-medium text-slate-700">To:</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-2 sm:px-3 py-2 sm:py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1">
              <button
                onClick={() => {
                  const now = new Date();
                  setDateRange({
                    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
                    end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
                  });
                }}
                className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
              >
                This Month
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  setDateRange({
                    start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
                    end: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
                  });
                }}
                className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
              >
                Last Month
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  setDateRange({
                    start: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
                    end: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
                  });
                }}
                className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
              >
                This Year
              </button>
              <button
                onClick={() => {
                  setDateRange({
                    start: '2000-01-01',
                    end: new Date().toISOString().split('T')[0]
                  });
                }}
                className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {/* Primary Tabs */}
          <button
            onClick={() => setActiveTab('balances')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'balances'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Who Owes
          </button>
          <button
            onClick={() => setActiveTab('aging')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'aging'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Overdue
          </button>
          <button
            onClick={() => setActiveTab('pnl')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'pnl'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Profit/Loss
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Expenses
          </button>

          {/* Secondary - For Exports */}
          <div className="hidden sm:block w-px h-6 bg-slate-300 mx-1"></div>
          <button
            onClick={() => {
              setActiveTab('rentroll');
              fetchRentRoll();
            }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'rentroll'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Rent Roll
          </button>
          <button
            onClick={() => {
              setActiveTab('transactions');
              fetchAllTransactions();
            }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Ledger
          </button>
        </div>

        {activeTab === 'balances' && (
        <>
        {/* Balances Header with Export */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Tenant Balances</h2>
            <p className="text-xs sm:text-sm text-slate-600">{filteredTenants.length} tenants</p>
          </div>
          <button
            onClick={exportBalancesCSV}
            className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
            <p className="text-xs sm:text-sm text-slate-600 mb-1">Total Tenants</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">{filteredSummary.totalTenants}</p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
            <p className="text-xs sm:text-sm text-slate-600 mb-1">Need to Collect</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-600">{filteredSummary.tenantsOwing}</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">{formatCurrency(filteredSummary.totalOwed)}</p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
            <p className="text-xs sm:text-sm text-slate-600 mb-1">Overpaid</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">{filteredSummary.tenantsWithCredit}</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">{formatCurrency(filteredSummary.totalCredits)}</p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
            <p className="text-xs sm:text-sm text-slate-600 mb-1">Amount Owed</p>
            <p className={`text-2xl sm:text-3xl font-bold ${filteredSummary.netBalance >= 0 ? 'text-slate-900' : 'text-green-600'}`}>
              {formatCurrency(filteredSummary.netBalance)}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 min-w-0 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                All ({selectedProperty === 'all' ? data.tenants.length : filteredTenants.length})
              </button>
              <button
                onClick={() => setFilter('owing')}
                className={`flex-1 min-w-0 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === 'owing'
                    ? 'bg-red-50 text-red-700 border-b-2 border-red-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Unpaid ({filteredSummary.tenantsOwing})
              </button>
              <button
                onClick={() => setFilter('credit')}
                className={`flex-1 min-w-0 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === 'credit'
                    ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Overpaid ({filteredSummary.tenantsWithCredit})
              </button>
              <button
                onClick={() => setFilter('zero')}
                className={`flex-1 min-w-0 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === 'zero'
                    ? 'bg-slate-50 text-slate-700 border-b-2 border-slate-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Paid ({filteredTenants.filter(t => t.balance === 0).length})
              </button>
            </div>
          </div>

          {/* Tenant Table */}
          {filteredTenants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No tenants in this category</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-200">
                {filteredTenants.map((tenant) => (
                  <div
                    key={tenant.leaseId}
                    className="p-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() => window.location.href = `/leases/${tenant.leaseId}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-slate-900">{tenant.tenantName}</div>
                        <div className="text-xs text-slate-500">{tenant.propertyName} - {tenant.unitName}</div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {tenant.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Rent: {tenant.monthlyRent ? formatCurrency(tenant.monthlyRent) : '-'}</span>
                      <span className={`font-semibold ${
                        tenant.balance > 0 ? 'text-red-600' : tenant.balance < 0 ? 'text-green-600' : 'text-slate-900'
                      }`}>
                        {formatCurrency(tenant.balance)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Tenant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Monthly Rent
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredTenants.map((tenant) => (
                      <tr key={tenant.leaseId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{tenant.tenantName}</div>
                          {tenant.propertyName && (
                            <div className="text-sm text-slate-500">{tenant.propertyName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">{tenant.unitName}</td>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {tenant.monthlyRent ? formatCurrency(tenant.monthlyRent) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-semibold ${
                            tenant.balance > 0 ? 'text-red-600' : tenant.balance < 0 ? 'text-green-600' : 'text-slate-900'
                          }`}>
                            {formatCurrency(tenant.balance)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {tenant.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => window.location.href = `/leases/${tenant.leaseId}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        </>
        )}

        {/* Profit & Loss Tab */}
        {activeTab === 'pnl' && (
          <div className="space-y-4 sm:space-y-6">
            {pnlData ? (
              <>
                {/* P&L Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200">
                    <p className="text-xs sm:text-sm text-slate-600">Total Income</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{formatCurrency(pnlData.income.total)}</p>
                    <p className={`text-xs mt-1 ${pnlData.income.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pnlData.income.changePercent >= 0 ? '+' : ''}{pnlData.income.changePercent}%
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200">
                    <p className="text-xs sm:text-sm text-slate-600">Total Expenses</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{formatCurrency(pnlData.expenses.total)}</p>
                    <p className={`text-xs mt-1 ${pnlData.expenses.changePercent <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pnlData.expenses.changePercent >= 0 ? '+' : ''}{pnlData.expenses.changePercent}%
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200">
                    <p className="text-xs sm:text-sm text-slate-600">Net Income</p>
                    <p className={`text-xl sm:text-2xl font-bold mt-1 ${pnlData.summary.netOperatingIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(pnlData.summary.netOperatingIncome)}
                    </p>
                    <p className={`text-xs mt-1 ${pnlData.summary.noiChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pnlData.summary.noiChangePercent >= 0 ? '+' : ''}{pnlData.summary.noiChangePercent}%
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200">
                    <p className="text-xs sm:text-sm text-slate-600">Profit Margin</p>
                    <p className={`text-xl sm:text-2xl font-bold mt-1 ${pnlData.summary.profitMargin >= 50 ? 'text-green-600' : pnlData.summary.profitMargin >= 25 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {pnlData.summary.profitMargin}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Exp: {pnlData.summary.expenseRatio}%
                    </p>
                  </div>
                </div>

                {/* P&L Statement */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Profit & Loss Statement</h3>
                      <p className="text-sm text-slate-600">{pnlData.period.start} to {pnlData.period.end}</p>
                    </div>
                    <button
                      onClick={exportPnLCSV}
                      className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </button>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {/* Income Section */}
                    <div className="p-6">
                      <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Income</h4>
                      {pnlData.income.breakdown.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No income recorded</p>
                      ) : (
                        <div className="space-y-2">
                          {pnlData.income.breakdown.map((item) => (
                            <button
                              key={item.code}
                              onClick={() => fetchDrillDown(item.code, 'income')}
                              className="flex justify-between items-center w-full py-1 px-2 -mx-2 rounded hover:bg-blue-50 transition-colors group"
                            >
                              <span className="text-sm text-slate-700 group-hover:text-blue-700">{item.name}</span>
                              <span className="text-sm font-medium text-slate-900 group-hover:text-blue-700 flex items-center gap-1">
                                {formatCurrency(item.amount)}
                                <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200">
                        <span className="text-sm font-semibold text-slate-900">Total Income</span>
                        <span className="text-sm font-bold text-green-600">{formatCurrency(pnlData.income.total)}</span>
                      </div>
                    </div>

                    {/* Expenses Section */}
                    <div className="p-6">
                      <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Expenses</h4>
                      {pnlData.expenses.breakdown.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No expenses recorded</p>
                      ) : (
                        <div className="space-y-2">
                          {pnlData.expenses.breakdown.map((item) => (
                            <button
                              key={item.code}
                              onClick={() => fetchDrillDown(item.code, 'expense')}
                              className="flex justify-between items-center w-full py-1 px-2 -mx-2 rounded hover:bg-red-50 transition-colors group"
                            >
                              <span className="text-sm text-slate-700 group-hover:text-red-700">{item.name}</span>
                              <span className="text-sm font-medium text-slate-900 group-hover:text-red-700 flex items-center gap-1">
                                {formatCurrency(item.amount)}
                                <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200">
                        <span className="text-sm font-semibold text-slate-900">Total Expenses</span>
                        <span className="text-sm font-bold text-red-600">{formatCurrency(pnlData.expenses.total)}</span>
                      </div>
                    </div>

                    {/* Net Operating Income */}
                    <div className="p-6 bg-slate-50">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-slate-900">Net Operating Income</span>
                        <span className={`text-xl font-bold ${pnlData.summary.netOperatingIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(pnlData.summary.netOperatingIncome)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Comparison */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Income vs Expenses</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">Income</span>
                        <span className="text-green-600 font-medium">{formatCurrency(pnlData.income.total)}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-4">
                        <div
                          className="bg-green-500 h-4 rounded-full transition-all duration-500"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">Expenses</span>
                        <span className="text-red-600 font-medium">{formatCurrency(pnlData.expenses.total)}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-4">
                        <div
                          className="bg-red-500 h-4 rounded-full transition-all duration-500"
                          style={{ width: `${pnlData.income.total > 0 ? Math.min((pnlData.expenses.total / pnlData.income.total) * 100, 100) : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">Net Profit</span>
                        <span className={`font-medium ${pnlData.summary.netOperatingIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(pnlData.summary.netOperatingIncome)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-4">
                        <div
                          className={`${pnlData.summary.netOperatingIncome >= 0 ? 'bg-blue-500' : 'bg-red-500'} h-4 rounded-full transition-all duration-500`}
                          style={{ width: `${pnlData.income.total > 0 ? Math.abs(pnlData.summary.netOperatingIncome / pnlData.income.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
                <p className="text-slate-500">Loading P&L report...</p>
              </div>
            )}
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Expenses Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">Expense Transactions</h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  {expenses.length} expenses totaling {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={exportExpensesCSV}
                  className="px-3 py-2.5 sm:py-2 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1 flex-1 sm:flex-none"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex-1 sm:flex-none"
                >
                + Add Expense
                </button>
              </div>
            </div>

            {/* Expense Summary by Category */}
            {expenses.length > 0 && (
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 sm:mb-4">By Category</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {Object.entries(
                    expenses.reduce((acc: { [key: string]: number }, exp) => {
                      acc[exp.accountName] = (acc[exp.accountName] || 0) + exp.amount;
                      return acc;
                    }, {})
                  ).map(([name, amount]) => (
                    <div key={name} className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-600 truncate">{name}</p>
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(amount as number)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expenses Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {expenses.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 mb-4">No expenses recorded for this period</p>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    Add Your First Expense
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {expenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-900">
                            {new Date(expense.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                              {expense.accountName}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-900">{expense.description}</td>
                          <td className="px-6 py-4 text-right text-sm font-semibold text-red-600">
                            {formatCurrency(expense.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-sm font-semibold text-slate-900">Total</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-red-600">
                          {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aging Tab */}
        {activeTab === 'aging' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Aging Summary Cards */}
            {agingData && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900">Aging Report</h2>
                    <p className="text-xs sm:text-sm text-slate-600">As of {agingData.asOfDate}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={exportAgingCSV}
                      className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </button>
                    <button
                      onClick={fetchAging}
                      className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                    Refresh
                    </button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                    <p className="text-xs sm:text-sm text-slate-600 mb-1">Total Outstanding</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900">{formatCurrency(agingData.summary.totalOutstanding)}</p>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">{agingData.summary.totalTenants} tenant{agingData.summary.totalTenants !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                    <p className="text-xs sm:text-sm text-slate-600 mb-1">Over 30 Days</p>
                    <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{formatCurrency(agingData.summary.over30Days)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                    <p className="text-xs sm:text-sm text-slate-600 mb-1">Over 60 Days</p>
                    <p className="text-2xl sm:text-3xl font-bold text-orange-600">{formatCurrency(agingData.summary.over60Days)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                    <p className="text-xs sm:text-sm text-slate-600 mb-1">Over 90 Days</p>
                    <p className="text-2xl sm:text-3xl font-bold text-red-600">{formatCurrency(agingData.summary.over90Days)}</p>
                  </div>
                </div>

                {/* Aging Buckets */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Aging Bucket</th>
                          <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Tenants</th>
                          <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {agingData.buckets.map((bucket, index) => (
                          <tr key={bucket.label} className={bucket.count > 0 ? 'hover:bg-slate-50' : ''}>
                            <td className="px-4 sm:px-6 py-4 text-sm font-medium text-slate-900">{bucket.label}</td>
                            <td className="px-4 sm:px-6 py-4 text-sm text-slate-600 text-right">{bucket.count}</td>
                            <td className={`px-4 sm:px-6 py-4 text-sm font-semibold text-right ${
                              index === 0 ? 'text-slate-900' :
                              index === 1 ? 'text-yellow-600' :
                              index === 2 ? 'text-orange-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(bucket.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50">
                        <tr>
                          <td className="px-4 sm:px-6 py-4 text-sm font-bold text-slate-900">Total</td>
                          <td className="px-4 sm:px-6 py-4 text-sm font-bold text-slate-900 text-right">{agingData.summary.totalTenants}</td>
                          <td className="px-4 sm:px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(agingData.summary.totalOutstanding)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Tenant Detail by Bucket */}
                {agingData.buckets.filter(b => b.count > 0).map((bucket) => (
                  <div key={bucket.label} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200">
                      <h3 className="text-sm font-semibold text-slate-900">{bucket.label}</h3>
                      <p className="text-xs text-slate-600">{bucket.count} tenant{bucket.count !== 1 ? 's' : ''} - {formatCurrency(bucket.amount)}</p>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {bucket.tenants.map((tenant) => (
                        <div
                          key={tenant.leaseId}
                          onClick={() => router.push(`/leases/${tenant.leaseId}`)}
                          className="px-4 sm:px-6 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">{tenant.tenantName}</p>
                            <p className="text-xs text-slate-600">
                              {tenant.unitName}{tenant.propertyName ? ` - ${tenant.propertyName}` : ''}
                            </p>
                            <p className="text-xs text-slate-500">
                              Oldest charge: {tenant.oldestChargeDate} ({tenant.daysPastDue} days)
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${
                              bucket.minDays === 0 ? 'text-slate-900' :
                              bucket.minDays <= 30 ? 'text-yellow-600' :
                              bucket.minDays <= 60 ? 'text-orange-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(tenant.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {agingData.summary.totalTenants === 0 && (
                  <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
                    <div className="text-green-600 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">All Caught Up!</p>
                    <p className="text-sm text-slate-600">No outstanding balances</p>
                  </div>
                )}
              </>
            )}

            {!agingData && (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
                <p className="text-slate-500">Loading aging data...</p>
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Transactions Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">All Transactions</h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  {allTransactions.length} transactions from {dateRange.start} to {dateRange.end}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={exportAllTransactionsCSV}
                  disabled={allTransactions.length === 0}
                  className="px-3 py-2.5 sm:py-2 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1 flex-1 sm:flex-none disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={fetchAllTransactions}
                  className="px-3 py-2.5 sm:py-2 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex-1 sm:flex-none"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {transactionsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-slate-500">Loading transactions...</p>
                </div>
              ) : allTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 mb-4">No transactions found for this period</p>
                  <button
                    onClick={fetchAllTransactions}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    Load Transactions
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Account</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tenant/Property</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Debit</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allTransactions.map((txn) => (
                        <tr
                          key={txn.id}
                          className={`hover:bg-slate-50 transition-colors ${txn.leaseId ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                          onClick={() => txn.leaseId && router.push(`/leases/${txn.leaseId}`)}
                        >
                          <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                            {new Date(txn.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700">
                              {txn.accountCode}
                            </span>
                            <span className="ml-2 text-slate-600">{txn.accountName}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">{txn.description}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {txn.tenantName && (
                              <div className="font-medium text-blue-600">{txn.tenantName}</div>
                            )}
                            {txn.propertyName && (
                              <div className="text-xs text-slate-500">
                                {txn.propertyName}{txn.unitName ? ` - ${txn.unitName}` : ''}
                              </div>
                            )}
                            {!txn.tenantName && !txn.propertyName && (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                            {txn.debit > 0 ? formatCurrency(txn.debit) : ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                            {txn.credit > 0 ? formatCurrency(txn.credit) : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-900">
                          Total ({allTransactions.length} transactions)
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                          {formatCurrency(allTransactions.reduce((sum, t) => sum + t.debit, 0))}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                          {formatCurrency(allTransactions.reduce((sum, t) => sum + t.credit, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rent Roll Tab */}
        {activeTab === 'rentroll' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Rent Roll Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">Rent Roll</h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  {rentRollData ? `As of ${rentRollData.asOfDate} • ${rentRollData.summary.totalProperties} properties, ${rentRollData.summary.totalUnits} units` : 'Loading...'}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={exportRentRollCSV}
                  disabled={!rentRollData}
                  className="px-3 py-2.5 sm:py-2 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1 flex-1 sm:flex-none disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={fetchRentRoll}
                  className="px-3 py-2.5 sm:py-2 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex-1 sm:flex-none"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            {rentRollData && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                  <p className="text-xs sm:text-sm text-slate-600 mb-1">Total Units</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">{rentRollData.summary.totalUnits}</p>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">{rentRollData.summary.totalProperties} properties</p>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                  <p className="text-xs sm:text-sm text-slate-600 mb-1">Occupancy</p>
                  <p className={`text-2xl sm:text-3xl font-bold ${rentRollData.summary.overallOccupancy >= 90 ? 'text-green-600' : rentRollData.summary.overallOccupancy >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {rentRollData.summary.overallOccupancy}%
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">{rentRollData.summary.occupiedUnits} occupied, {rentRollData.summary.vacantUnits} vacant</p>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                  <p className="text-xs sm:text-sm text-slate-600 mb-1">Monthly Rent</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">{formatCurrency(rentRollData.summary.totalMonthlyRent)}</p>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">from occupied units</p>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                  <p className="text-xs sm:text-sm text-slate-600 mb-1">Annual Rent</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">{formatCurrency(rentRollData.summary.totalAnnualRent)}</p>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">Schedule E total</p>
                </div>
              </div>
            )}

            {/* Properties List */}
            {rentRollData ? (
              <div className="space-y-4">
                {rentRollData.properties.map((property) => (
                  <div key={property.propertyId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Property Header */}
                    <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{property.propertyName}</h3>
                          {property.propertyAddress && (
                            <p className="text-xs text-slate-600">{property.propertyAddress}</p>
                          )}
                        </div>
                        <div className="flex gap-4 text-xs">
                          <span className="text-slate-600">
                            <span className="font-medium">{property.occupiedUnits}</span>/{property.totalUnits} occupied
                          </span>
                          <span className={`font-medium ${property.occupancyRate >= 90 ? 'text-green-600' : property.occupancyRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {property.occupancyRate}%
                          </span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(property.totalMonthlyRent)}/mo
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Units Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tenant</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Monthly</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Annual</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lease Period</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {property.units.map((unit) => (
                            <tr
                              key={unit.unitId}
                              className={`hover:bg-slate-50 transition-colors ${unit.leaseId ? 'cursor-pointer' : ''}`}
                              onClick={() => unit.leaseId && router.push(`/leases/${unit.leaseId}`)}
                            >
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">{unit.unitName}</td>
                              <td className="px-4 py-3 text-sm text-slate-900">
                                {unit.tenantName || <span className="text-slate-400 italic">Vacant</span>}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                                {unit.monthlyRent ? formatCurrency(unit.monthlyRent) : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                                {unit.annualRent ? formatCurrency(unit.annualRent) : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {unit.leaseStart && unit.leaseEnd
                                  ? `${unit.leaseStart} to ${unit.leaseEnd}`
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  unit.isOccupied
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {unit.isOccupied ? 'Occupied' : 'Vacant'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50">
                          <tr>
                            <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-slate-900">
                              Property Total
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                              {formatCurrency(property.totalMonthlyRent)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">
                              {formatCurrency(property.totalAnnualRent)}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))}

                {rentRollData.properties.length === 0 && (
                  <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
                    <p className="text-slate-500">No properties found</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-500">Loading rent roll...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Add Expense</h2>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 -mr-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select
                  value={expenseForm.accountCode}
                  onChange={(e) => setExpenseForm({ ...expenseForm, accountCode: e.target.value })}
                  className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
                  required
                >
                  {expenseAccounts.map((account) => (
                    <option key={account.code} value={account.code}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
                  placeholder="e.g., Plumbing repair at Unit 101"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={expenseForm.entryDate}
                  onChange={(e) => setExpenseForm({ ...expenseForm, entryDate: e.target.value })}
                  className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 px-4 py-3 sm:py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {submittingExpense ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Charge Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  {bulkResults ? 'Charges Posted' : 'Charge Rent'}
                </h2>
                {!bulkResults && (
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Review charges before posting
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseModal}
                className="sm:hidden p-2 -mr-2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* Results View */}
              {bulkResults ? (
                <div className="space-y-4 sm:space-y-6">
                  {bulkResults.results.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Successfully Posted ({bulkResults.results.length})
                        </h3>
                      </div>
                      <div className="bg-green-50 rounded-lg border border-green-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-green-100">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold text-green-900">Tenant</th>
                              <th className="px-4 py-2 text-left font-semibold text-green-900">Unit</th>
                              <th className="px-4 py-2 text-right font-semibold text-green-900">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-green-200">
                            {bulkResults.results.map((result) => (
                              <tr key={result.leaseId}>
                                <td className="px-4 py-2 text-slate-900">{result.tenantName}</td>
                                <td className="px-4 py-2 text-slate-900">{result.unitName}</td>
                                <td className="px-4 py-2 text-right text-slate-900 font-medium">
                                  {formatCurrency(result.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-semibold text-slate-700">Total Posted:</span>
                          <span className="text-lg font-bold text-slate-900">
                            {formatCurrency(bulkResults.results.reduce((sum, r) => sum + r.amount, 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {bulkResults.errors.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Errors ({bulkResults.errors.length})
                        </h3>
                      </div>
                      <div className="bg-red-50 rounded-lg border border-red-200 p-4 space-y-2">
                        {bulkResults.errors.map((error: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium text-slate-900">{error.tenantName}:</span>{' '}
                            <span className="text-red-700">{error.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleCloseModal}
                      className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                /* Preview View */
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Charge Date
                    </label>
                    <input
                      type="date"
                      value={chargeDate}
                      onChange={(e) => setChargeDate(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {bulkPreview.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-500">No active leases with monthly rent amounts set</p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3">
                        Charges to be posted ({bulkPreview.length})
                      </h3>
                      <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold text-slate-700">Tenant</th>
                              <th className="px-4 py-2 text-left font-semibold text-slate-700">Unit</th>
                              <th className="px-4 py-2 text-right font-semibold text-slate-700">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {bulkPreview.map((charge) => (
                              <tr key={charge.leaseId}>
                                <td className="px-4 py-2 text-slate-900">{charge.tenantName}</td>
                                <td className="px-4 py-2 text-slate-900">{charge.unitName}</td>
                                <td className="px-4 py-2 text-right text-slate-900 font-medium">
                                  {formatCurrency(charge.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-semibold text-slate-700">Total to be charged:</span>
                          <span className="text-lg font-bold text-slate-900">
                            {formatCurrency(bulkPreview.reduce((sum, c) => sum + c.amount, 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-3 sm:py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmBulkCharges}
                      disabled={bulkLoading || bulkPreview.length === 0}
                      className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {bulkLoading ? 'Posting...' : `Post ${bulkPreview.length} Charges`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drill-Down Modal */}
      {showDrillDown && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
              <div className="min-w-0 flex-1 pr-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                  {drillDownData?.account.name || 'Transaction Details'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  {dateRange.start} to {dateRange.end}
                  {drillDownData && ` • ${drillDownData.count} txns`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDrillDown(false);
                  setDrillDownData(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 -mr-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {drillDownLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-slate-500">Loading transactions...</p>
                </div>
              ) : drillDownData ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-2 sm:items-center">
                      <div>
                        <span className="text-xs sm:text-sm text-slate-600">Account Code:</span>
                        <span className="ml-2 text-xs sm:text-sm font-medium text-slate-900">{drillDownData.account.code}</span>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-xs sm:text-sm text-slate-600">Total:</span>
                        <span className={`ml-2 text-base sm:text-lg font-bold ${drillDownData.account.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(drillDownData.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  {drillDownData.transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-500">No transactions found for this period</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Property / Unit</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Vendor / Tenant</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {drillDownData.transactions.map((txn) => {
                            const isClickable = txn.workOrderId || txn.leaseId;
                            return (
                              <tr
                                key={txn.id}
                                className={`hover:bg-slate-50 transition-colors ${isClickable ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                                onClick={() => isClickable && handleTransactionClick(txn)}
                              >
                                <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                                  {new Date(txn.date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-900">
                                  <div className="flex items-center gap-2">
                                    {txn.description}
                                    {isClickable && (
                                      <span className="text-blue-500 text-xs">View</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {txn.propertyName && (
                                    <div className="font-medium text-slate-900">{txn.propertyName}</div>
                                  )}
                                  {txn.unitName && (
                                    <div className="text-xs text-slate-500">{txn.unitName}</div>
                                  )}
                                  {!txn.propertyName && !txn.unitName && (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {txn.vendorName && (
                                    <div className="font-medium text-purple-600">{txn.vendorName}</div>
                                  )}
                                  {txn.tenantName && (
                                    <div className="font-medium text-blue-600">{txn.tenantName}</div>
                                  )}
                                  {!txn.vendorName && !txn.tenantName && (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className={`px-4 py-3 text-sm font-semibold text-right whitespace-nowrap ${
                                  drillDownData.account.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatCurrency(txn.amount)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-900">
                              Total ({drillDownData.count} transactions)
                            </td>
                            <td className={`px-4 py-3 text-right text-sm font-bold ${
                              drillDownData.account.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(drillDownData.total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500">Failed to load transaction data</p>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 sticky bottom-0">
              <button
                onClick={() => {
                  setShowDrillDown(false);
                  setDrillDownData(null);
                }}
                className="w-full px-4 py-3 sm:py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
