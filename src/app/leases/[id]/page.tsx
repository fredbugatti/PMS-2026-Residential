'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, ExternalLink, Copy, Mail, Lock, Check } from 'lucide-react';

interface LedgerEntry {
  id: string;
  entryDate: string;
  accountCode: string;
  amount: number;
  debitCredit: 'DR' | 'CR';
  description: string;
  status: string;
  account: {
    code: string;
    name: string;
  };
}

interface Lease {
  id: string;
  tenantName: string;
  tenantEmail: string | null;
  tenantPhone: string | null;
  unitName: string;
  propertyName: string | null;
  propertyId: string | null;
  unitId: string | null;
  startDate: string;
  endDate: string;
  monthlyRentAmount: number | null;
  securityDepositAmount: number | null;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'TERMINATED';
  notes: string | null;
  createdAt: string;
  balance: number;
  ledgerEntries: LedgerEntry[];
  scheduledCharges: ScheduledCharge[];
  portalToken: string | null;
  portalLastAccess: string | null;
}

interface DepositStatus {
  leaseId: string;
  currentBalance: number;
  totalReceived: number;
  totalReturned: number;
  totalDeducted: number;
  expectedAmount: number | null;
  status: 'HELD' | 'RETURNED' | 'NOT_RECEIVED';
  entries: any[];
}

interface RentIncrease {
  id: string;
  previousAmount: number;
  newAmount: number;
  effectiveDate: string;
  noticeDate: string;
  status: 'SCHEDULED' | 'APPLIED' | 'CANCELLED';
  noticeGenerated: boolean;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
}

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  category: string;
  description: string | null;
  uploadedBy: string;
  createdAt: string;
}

interface AutomationSettings {
  autoChargeEnabled: boolean;
  chargeDay: number | null;
  gracePeriodDays: number | null;
  lateFeeAmount: number | null;
  lateFeeType: string | null;
  reminderEmails: boolean;
  lastChargedDate: string | null;
}

interface ScheduledCharge {
  id: string;
  leaseId: string;
  description: string;
  amount: number;
  chargeDay: number;
  accountCode: string;
  active: boolean;
  lastChargedDate: string | null;
  createdAt: string;
}

export default function LeaseDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Auto-open payment modal if ?action=pay is in URL
  useEffect(() => {
    if (searchParams.get('action') === 'pay' && lease) {
      setShowPaymentModal(true);
      if (lease.balance > 0) {
        setPaymentForm(prev => ({ ...prev, amount: lease.balance.toFixed(2) }));
      }
    }
  }, [searchParams, lease]);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    description: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [charges, setCharges] = useState<Array<{
    amount: string;
    chargeType: 'rent' | 'late_fee' | 'utility' | 'other';
    description: string;
  }>>([{
    amount: '',
    chargeType: 'rent',
    description: ''
  }]);
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingRent, setEditingRent] = useState(false);
  const [rentAmount, setRentAmount] = useState('');
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(null);
  const [showDepositReceiveModal, setShowDepositReceiveModal] = useState(false);
  const [showDepositReturnModal, setShowDepositReturnModal] = useState(false);
  const [depositReceiveForm, setDepositReceiveForm] = useState({
    amount: '',
    description: '',
    receiptDate: new Date().toISOString().split('T')[0]
  });
  const [depositReturnForm, setDepositReturnForm] = useState({
    amount: '',
    description: '',
    returnDate: new Date().toISOString().split('T')[0],
    deductions: [] as Array<{ description: string; amount: string }>
  });
  const [rentIncreases, setRentIncreases] = useState<RentIncrease[]>([]);
  const [showRentIncreaseModal, setShowRentIncreaseModal] = useState(false);
  const [rentIncreaseForm, setRentIncreaseForm] = useState({
    newAmount: '',
    effectiveDate: '',
    noticeDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    category: 'other',
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings | null>(null);
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [automationForm, setAutomationForm] = useState({
    autoChargeEnabled: false,
    chargeDay: '',
    gracePeriodDays: '5',
    lateFeeAmount: '',
    lateFeeType: 'FLAT',
    reminderEmails: false
  });
  const [chargingRent, setChargingRent] = useState(false);
  const [chargingLateFee, setChargingLateFee] = useState(false);
  const [automationExpanded, setAutomationExpanded] = useState(false);
  const [leaseInfoExpanded, setLeaseInfoExpanded] = useState(false);
  const [depositExpanded, setDepositExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [documentsExpanded, setDocumentsExpanded] = useState(false);
  const [maintenanceExpanded, setMaintenanceExpanded] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [portalExpanded, setPortalExpanded] = useState(false);
  const [generatingPortal, setGeneratingPortal] = useState(false);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);

  // Edit tenant info state
  const [editingTenantInfo, setEditingTenantInfo] = useState(false);
  const [tenantInfoForm, setTenantInfoForm] = useState({
    tenantName: '',
    tenantEmail: '',
    tenantPhone: ''
  });
  const [savingTenantInfo, setSavingTenantInfo] = useState(false);

  // Scheduled charges state
  const [scheduledChargesExpanded, setScheduledChargesExpanded] = useState(false);
  const [showScheduledChargeModal, setShowScheduledChargeModal] = useState(false);
  const [scheduledChargeRows, setScheduledChargeRows] = useState<Array<{
    description: string;
    amount: string;
    chargeDay: string;
    accountCode: string;
  }>>([{ description: '', amount: '', chargeDay: '1', accountCode: '4000' }]);
  const [savingScheduledCharge, setSavingScheduledCharge] = useState(false);
  const [editingScheduledChargeId, setEditingScheduledChargeId] = useState<string | null>(null);
  const [editingScheduledChargeForm, setEditingScheduledChargeForm] = useState({
    description: '',
    amount: '',
    chargeDay: '1',
    accountCode: '4000'
  });
  const [postingScheduledCharges, setPostingScheduledCharges] = useState(false);

  // Ledger view toggle (simplified = AR only, full = all entries)
  const [ledgerViewMode, setLedgerViewMode] = useState<'simplified' | 'full'>('simplified');

  useEffect(() => {
    fetchLease();
    fetchDepositStatus();
    fetchRentIncreases();
    fetchDocuments();
    fetchAutomationSettings();
  }, []);

  useEffect(() => {
    if (lease) {
      fetchWorkOrders();
    }
  }, [lease]);

  const fetchLease = async () => {
    try {
      const res = await fetch(`/api/leases/${params.id}`);
      if (!res.ok) throw new Error('Lease not found');
      const data = await res.json();
      setLease(data);
      setRentAmount(data.monthlyRentAmount?.toString() || '');
      setTenantInfoForm({
        tenantName: data.tenantName || '',
        tenantEmail: data.tenantEmail || '',
        tenantPhone: data.tenantPhone || ''
      });
      // Update page title with tenant name
      document.title = `${data.tenantName} - Lease | Sanprinon`;
    } catch (error) {
      console.error('Failed to fetch lease:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepositStatus = async () => {
    try {
      const res = await fetch(`/api/deposits/status/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setDepositStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch deposit status:', error);
    }
  };

  const handleSaveRent = async () => {
    try {
      // Find the rent scheduled charge (account code 4000)
      const rentCharge = lease?.scheduledCharges?.find(c => c.accountCode === '4000' && c.active);

      if (rentCharge) {
        // Update existing rent scheduled charge
        const res = await fetch(`/api/scheduled-charges/${rentCharge.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(rentAmount)
          })
        });

        if (!res.ok) throw new Error('Failed to update rent');
      } else if (rentAmount && parseFloat(rentAmount) > 0) {
        // Create new rent scheduled charge
        const res = await fetch(`/api/scheduled-charges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leaseId: params.id,
            description: 'Monthly Rent',
            amount: parseFloat(rentAmount),
            chargeDay: 1,
            accountCode: '4000'
          })
        });

        if (!res.ok) throw new Error('Failed to create rent charge');
      }

      await fetchLease();
      setEditingRent(false);
    } catch (error) {
      console.error('Failed to update rent:', error);
      alert('Failed to update monthly rent');
    }
  };

  const handleSaveTenantInfo = async () => {
    setSavingTenantInfo(true);
    try {
      const res = await fetch(`/api/leases/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: tenantInfoForm.tenantName,
          tenantEmail: tenantInfoForm.tenantEmail || null,
          tenantPhone: tenantInfoForm.tenantPhone || null
        })
      });

      if (!res.ok) throw new Error('Failed to update tenant info');

      await fetchLease();
      setEditingTenantInfo(false);
    } catch (error) {
      console.error('Failed to update tenant info:', error);
      alert('Failed to update tenant information');
    } finally {
      setSavingTenantInfo(false);
    }
  };

  // Calculate payment summary from ledger entries (AR account 1200 only)
  const getPaymentSummary = () => {
    if (!lease?.ledgerEntries) return { totalCharged: 0, totalPaid: 0 };

    let totalCharged = 0;
    let totalPaid = 0;

    lease.ledgerEntries.forEach(entry => {
      // Only count AR (Accounts Receivable) entries - account code 1200
      if (entry.accountCode === '1200') {
        const amount = Number(entry.amount);
        if (entry.debitCredit === 'DR') {
          totalCharged += amount;
        } else {
          totalPaid += amount;
        }
      }
    });

    return { totalCharged, totalPaid };
  };

  // Calculate days until lease ends
  const getDaysUntilLeaseEnds = () => {
    if (!lease?.endDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(lease.endDate);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const handleGeneratePortalLink = async () => {
    setGeneratingPortal(true);
    try {
      const res = await fetch(`/api/leases/${params.id}/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) throw new Error('Failed to generate portal link');

      const data = await res.json();
      await fetchLease();
      alert('Portal link generated successfully!');
    } catch (error) {
      console.error('Failed to generate portal link:', error);
      alert('Failed to generate portal link');
    } finally {
      setGeneratingPortal(false);
    }
  };

  const handleCopyPortalLink = async () => {
    if (!lease?.portalToken) return;

    const portalUrl = `${window.location.origin}/tenant/${lease.portalToken}`;
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopiedPortalLink(true);
      setTimeout(() => setCopiedPortalLink(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link to clipboard');
    }
  };

  const handleEmailPortalLink = async () => {
    if (!lease?.portalToken || !lease?.tenantEmail) {
      alert('Tenant email is required to send the portal link');
      return;
    }

    const portalUrl = `${window.location.origin}/tenant/${lease.portalToken}`;
    const subject = encodeURIComponent(`Your Tenant Portal Access - ${lease.propertyName || ''}`);
    const body = encodeURIComponent(`Hello ${lease.tenantName},\n\nYou can access your tenant portal using the following link:\n\n${portalUrl}\n\nThis link is unique to you and should not be shared.\n\nBest regards`);

    window.location.href = `mailto:${lease.tenantEmail}?subject=${subject}&body=${body}`;
  };

  const handleRevokePortalAccess = async () => {
    if (!confirm('Are you sure you want to revoke portal access? The tenant will no longer be able to access their portal.')) {
      return;
    }

    setGeneratingPortal(true);
    try {
      const res = await fetch(`/api/leases/${params.id}/portal`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to revoke portal access');

      await fetchLease();
      alert('Portal access revoked successfully');
    } catch (error) {
      console.error('Failed to revoke portal access:', error);
      alert('Failed to revoke portal access');
    } finally {
      setGeneratingPortal(false);
    }
  };

  const handleDepositReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/deposits/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(depositReceiveForm.amount),
          leaseId: params.id,
          description: depositReceiveForm.description,
          receiptDate: depositReceiveForm.receiptDate
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record deposit receipt');
      }

      // Reset form and close modal
      setDepositReceiveForm({
        amount: '',
        description: '',
        receiptDate: new Date().toISOString().split('T')[0]
      });
      setShowDepositReceiveModal(false);

      // Refresh data
      await fetchLease();
      await fetchDepositStatus();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDepositReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const deductions = depositReturnForm.deductions
        .filter(d => d.amount && parseFloat(d.amount) > 0)
        .map(d => ({
          description: d.description,
          amount: parseFloat(d.amount)
        }));

      const res = await fetch('/api/deposits/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(depositReturnForm.amount),
          leaseId: params.id,
          description: depositReturnForm.description,
          returnDate: depositReturnForm.returnDate,
          deductions: deductions
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record deposit return');
      }

      // Reset form and close modal
      setDepositReturnForm({
        amount: '',
        description: '',
        returnDate: new Date().toISOString().split('T')[0],
        deductions: []
      });
      setShowDepositReturnModal(false);

      // Refresh data
      await fetchLease();
      await fetchDepositStatus();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addDeduction = () => {
    setDepositReturnForm({
      ...depositReturnForm,
      deductions: [...depositReturnForm.deductions, { description: '', amount: '' }]
    });
  };

  const removeDeduction = (index: number) => {
    setDepositReturnForm({
      ...depositReturnForm,
      deductions: depositReturnForm.deductions.filter((_, i) => i !== index)
    });
  };

  const updateDeduction = (index: number, field: 'description' | 'amount', value: string) => {
    const newDeductions = [...depositReturnForm.deductions];
    newDeductions[index][field] = value;
    setDepositReturnForm({
      ...depositReturnForm,
      deductions: newDeductions
    });
  };

  const fetchRentIncreases = async () => {
    try {
      const res = await fetch(`/api/rent-increases?leaseId=${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setRentIncreases(data);
      }
    } catch (error) {
      console.error('Failed to fetch rent increases:', error);
    }
  };

  const handleRentIncreaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/rent-increases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: params.id,
          newAmount: parseFloat(rentIncreaseForm.newAmount),
          effectiveDate: rentIncreaseForm.effectiveDate,
          noticeDate: rentIncreaseForm.noticeDate,
          notes: rentIncreaseForm.notes
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to schedule rent increase');
      }

      // Reset form and close modal
      setRentIncreaseForm({
        newAmount: '',
        effectiveDate: '',
        noticeDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowRentIncreaseModal(false);

      // Refresh data
      await fetchRentIncreases();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyRentIncrease = async (increaseId: string) => {
    if (!confirm('Apply this rent increase now? This will update the monthly rent amount.')) {
      return;
    }

    try {
      const res = await fetch(`/api/rent-increases/${increaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPLIED' })
      });

      if (!res.ok) {
        throw new Error('Failed to apply rent increase');
      }

      await fetchLease();
      await fetchRentIncreases();
      alert('Rent increase applied successfully');
    } catch (error) {
      console.error('Failed to apply rent increase:', error);
      alert('Failed to apply rent increase');
    }
  };

  const handleCancelRentIncrease = async (increaseId: string) => {
    if (!confirm('Cancel this scheduled rent increase?')) {
      return;
    }

    try {
      const res = await fetch(`/api/rent-increases/${increaseId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Failed to cancel rent increase');
      }

      await fetchRentIncreases();
    } catch (error) {
      console.error('Failed to cancel rent increase:', error);
      alert('Failed to cancel rent increase');
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/documents?leaseId=${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const fetchWorkOrders = async () => {
    try {
      if (!lease?.unitId) return;
      const res = await fetch(`/api/work-orders?unitId=${lease.unitId}`);
      if (res.ok) {
        const data = await res.json();
        setWorkOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch work orders:', error);
    }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploadingDocument(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('leaseId', params.id as string);
      formData.append('category', documentForm.category);
      formData.append('description', documentForm.description);
      formData.append('uploadedBy', 'admin');

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload document');
      }

      // Reset form
      setSelectedFile(null);
      setDocumentForm({ category: 'other', description: '' });
      setShowDocumentModal(false);

      // Refresh documents
      await fetchDocuments();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Failed to delete document');
      }

      await fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      lease_agreement: 'Lease Agreement',
      inspection: 'Inspection Report',
      receipt: 'Receipt',
      tenant_id: 'Tenant ID',
      proof_income: 'Proof of Income',
      reference: 'Reference',
      other: 'Other'
    };
    return labels[category] || category;
  };

  const fetchAutomationSettings = async () => {
    try {
      const res = await fetch(`/api/leases/${params.id}/automation`);
      if (res.ok) {
        const data = await res.json();
        setAutomationSettings(data);
        setAutomationForm({
          autoChargeEnabled: data.autoChargeEnabled || false,
          chargeDay: data.chargeDay?.toString() || '',
          gracePeriodDays: data.gracePeriodDays?.toString() || '5',
          lateFeeAmount: data.lateFeeAmount?.toString() || '',
          lateFeeType: data.lateFeeType || 'FLAT',
          reminderEmails: data.reminderEmails || false
        });
      }
    } catch (error) {
      console.error('Failed to fetch automation settings:', error);
    }
  };

  const handleAutomationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/leases/${params.id}/automation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoChargeEnabled: automationForm.autoChargeEnabled,
          chargeDay: automationForm.chargeDay ? parseInt(automationForm.chargeDay) : null,
          gracePeriodDays: automationForm.gracePeriodDays ? parseInt(automationForm.gracePeriodDays) : null,
          lateFeeAmount: automationForm.lateFeeAmount ? parseFloat(automationForm.lateFeeAmount) : null,
          lateFeeType: automationForm.lateFeeType,
          reminderEmails: automationForm.reminderEmails
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update automation settings');
      }

      setShowAutomationModal(false);
      await fetchAutomationSettings();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChargeRent = async () => {
    if (!confirm('Charge rent for this month? This will create ledger entries.')) {
      return;
    }

    setChargingRent(true);
    try {
      const res = await fetch(`/api/leases/${params.id}/charge-rent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to charge rent');
      }

      const data = await res.json();
      alert(data.message);
      await fetchLease();
      await fetchAutomationSettings();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setChargingRent(false);
    }
  };

  const handleChargeLateFee = async () => {
    if (!confirm('Charge late fee? This will create ledger entries.')) {
      return;
    }

    setChargingLateFee(true);
    try {
      const res = await fetch(`/api/leases/${params.id}/charge-late-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to charge late fee');
      }

      const data = await res.json();
      alert(data.message);
      await fetchLease();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setChargingLateFee(false);
    }
  };

  // Scheduled charges functions
  const handleAddScheduledCharges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingScheduledCharge(true);
    setError('');

    try {
      // If editing, use single charge endpoint
      if (editingScheduledChargeId) {
        const res = await fetch(`/api/scheduled-charges/${editingScheduledChargeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: editingScheduledChargeForm.description,
            amount: parseFloat(editingScheduledChargeForm.amount),
            chargeDay: parseInt(editingScheduledChargeForm.chargeDay),
            accountCode: editingScheduledChargeForm.accountCode
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update scheduled charge');
        }
      } else {
        // Filter out empty rows and create bulk
        const validCharges = scheduledChargeRows.filter(
          row => row.description.trim() && row.amount && parseFloat(row.amount) > 0
        );

        if (validCharges.length === 0) {
          throw new Error('Please add at least one charge');
        }

        const res = await fetch('/api/scheduled-charges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leaseId: params.id,
            charges: validCharges.map(charge => ({
              description: charge.description,
              amount: parseFloat(charge.amount),
              chargeDay: parseInt(charge.chargeDay),
              accountCode: charge.accountCode
            }))
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save scheduled charges');
        }
      }

      // Reset form and close modal
      setScheduledChargeRows([{ description: '', amount: '', chargeDay: '1', accountCode: '4000' }]);
      setEditingScheduledChargeId(null);
      setEditingScheduledChargeForm({ description: '', amount: '', chargeDay: '1', accountCode: '4000' });
      setShowScheduledChargeModal(false);

      // Refresh lease data
      await fetchLease();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingScheduledCharge(false);
    }
  };

  const handleAddChargeRow = () => {
    setScheduledChargeRows([...scheduledChargeRows, { description: '', amount: '', chargeDay: '1', accountCode: '4000' }]);
  };

  const handleRemoveChargeRow = (index: number) => {
    if (scheduledChargeRows.length > 1) {
      setScheduledChargeRows(scheduledChargeRows.filter((_, i) => i !== index));
    }
  };

  const handleChargeRowChange = (index: number, field: string, value: string) => {
    const newRows = [...scheduledChargeRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setScheduledChargeRows(newRows);
  };

  const handleEditScheduledCharge = (charge: ScheduledCharge) => {
    setEditingScheduledChargeForm({
      description: charge.description,
      amount: charge.amount.toString(),
      chargeDay: charge.chargeDay.toString(),
      accountCode: charge.accountCode
    });
    setEditingScheduledChargeId(charge.id);
    setShowScheduledChargeModal(true);
  };

  const handleDeleteScheduledCharge = async (chargeId: string) => {
    if (!confirm('Delete this scheduled charge?')) return;

    try {
      const res = await fetch(`/api/scheduled-charges/${chargeId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete scheduled charge');
      }

      await fetchLease();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleScheduledCharge = async (charge: ScheduledCharge) => {
    try {
      const res = await fetch(`/api/scheduled-charges/${charge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !charge.active })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to toggle scheduled charge');
      }

      await fetchLease();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePostScheduledCharges = async () => {
    if (!confirm('Post all due scheduled charges for this lease?')) return;

    setPostingScheduledCharges(true);
    try {
      const res = await fetch('/api/scheduled-charges/post-due', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaseId: params.id })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post scheduled charges');
      }

      const data = await res.json();
      const { summary } = data;
      alert(`Posted ${summary.posted} charge(s), skipped ${summary.skipped}, errors: ${summary.errors}`);
      await fetchLease();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPostingScheduledCharges(false);
    }
  };

  const handleResetScheduledCharge = async (chargeId: string) => {
    if (!confirm('Reset this charge so it can be posted again this month?')) return;

    try {
      const res = await fetch(`/api/scheduled-charges/${chargeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastChargedDate: null })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset scheduled charge');
      }

      await fetchLease();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteLedgerEntry = async (entryId: string, description: string) => {
    if (!confirm(`Delete ledger entry "${description}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/ledger/${entryId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete ledger entry');
      }

      await fetchLease();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          leaseId: params.id,
          description: paymentForm.description || `Payment from ${lease?.tenantName}`,
          paymentDate: paymentForm.paymentDate
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record payment');
      }

      // Reset form and close modal
      setPaymentForm({
        amount: '',
        description: '',
        paymentDate: new Date().toISOString().split('T')[0]
      });
      setShowPaymentModal(false);

      // Refresh lease data
      await fetchLease();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addCharge = () => {
    setCharges([...charges, { amount: '', chargeType: 'rent', description: '' }]);
  };

  const removeCharge = (index: number) => {
    if (charges.length > 1) {
      setCharges(charges.filter((_, i) => i !== index));
    }
  };

  const updateCharge = (index: number, field: keyof typeof charges[0], value: string) => {
    const newCharges = [...charges];
    newCharges[index] = { ...newCharges[index], [field]: value };
    setCharges(newCharges);
  };

  const handleChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Validate all charges have amounts
      const validCharges = charges.filter(c => c.amount && parseFloat(c.amount) > 0);

      if (validCharges.length === 0) {
        throw new Error('Please enter at least one charge amount');
      }

      // Post all charges
      let successCount = 0;
      const errors: string[] = [];

      for (const charge of validCharges) {
        try {
          const res = await fetch('/api/charges', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: parseFloat(charge.amount),
              leaseId: params.id,
              description: charge.description,
              chargeDate: chargeDate,
              chargeType: charge.chargeType
            })
          });

          if (!res.ok) {
            const data = await res.json();
            errors.push(data.error || 'Failed to post charge');
          } else {
            successCount++;
          }
        } catch (err: any) {
          errors.push(err.message);
        }
      }

      if (errors.length > 0 && successCount === 0) {
        throw new Error(errors.join(', '));
      }

      // Reset form and close modal
      setCharges([{ amount: '', chargeType: 'rent', description: '' }]);
      setChargeDate(new Date().toISOString().split('T')[0]);
      setShowChargeModal(false);

      // Show success message
      if (successCount > 0) {
        alert(`Successfully posted ${successCount} charge${successCount > 1 ? 's' : ''}`);
      }
      if (errors.length > 0) {
        alert(`Some charges failed: ${errors.join(', ')}`);
      }

      // Refresh lease data
      await fetchLease();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Change lease status to ${newStatus}?`)) {
      return;
    }

    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/leases/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }

      await fetchLease();
      setShowStatusDropdown(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'ENDED': return 'bg-slate-100 text-slate-800';
      case 'TERMINATED': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Calculate next post date for a scheduled charge
  const getNextPostInfo = (chargeDay: number, lastChargedDate: string | null, leaseStartDate?: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Check if lease hasn't started yet
    if (leaseStartDate) {
      const startDate = new Date(leaseStartDate);
      startDate.setHours(0, 0, 0, 0);
      if (startDate > today) {
        // Lease hasn't started - calculate when first charge will post
        const startMonth = startDate.getMonth();
        const startYear = startDate.getFullYear();
        const startDay = startDate.getDate();

        // First post will be on chargeDay of the start month (if chargeDay >= startDay)
        // or chargeDay of the following month (if chargeDay < startDay)
        let firstPostDate: Date;
        if (chargeDay >= startDay) {
          firstPostDate = new Date(startYear, startMonth, chargeDay);
        } else {
          const nextMonth = startMonth === 11 ? 0 : startMonth + 1;
          const nextYear = startMonth === 11 ? startYear + 1 : startYear;
          firstPostDate = new Date(nextYear, nextMonth, chargeDay);
        }

        const daysUntil = Math.ceil((firstPostDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          status: 'not_started' as const,
          nextPostDate: firstPostDate,
          daysUntil,
          message: `Starts ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → First post ${firstPostDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        };
      }
    }

    // Check if already posted this month
    if (lastChargedDate) {
      const lastCharged = new Date(lastChargedDate);
      if (lastCharged.getMonth() === currentMonth && lastCharged.getFullYear() === currentYear) {
        // Already posted this month - next post is next month
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const nextPostDate = new Date(nextYear, nextMonth, chargeDay);
        const daysUntil = Math.ceil((nextPostDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          status: 'posted' as const,
          postedDate: lastCharged,
          nextPostDate,
          daysUntil,
          message: `Posted ${lastCharged.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → Next: ${nextPostDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        };
      }
    }

    // Not posted this month yet
    let nextPostDate: Date;
    let daysUntil: number;

    if (chargeDay <= currentDay) {
      // Charge day has passed but not posted - will post on next cron run (6 AM)
      nextPostDate = new Date(currentYear, currentMonth, chargeDay);
      daysUntil = 0;
      return {
        status: 'due' as const,
        nextPostDate,
        daysUntil,
        message: `Due now → Posts at 6 AM cron`
      };
    } else {
      // Charge day is later this month
      nextPostDate = new Date(currentYear, currentMonth, chargeDay);
      daysUntil = Math.ceil((nextPostDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        status: 'upcoming' as const,
        nextPostDate,
        daysUntil,
        message: `Posts ${nextPostDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${daysUntil} day${daysUntil !== 1 ? 's' : ''})`
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header skeleton */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="h-6 bg-slate-200 rounded w-48 mb-2 animate-pulse"></div>
                <div className="h-4 bg-slate-200 rounded w-32 animate-pulse"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-slate-200 rounded-lg animate-pulse"></div>
                <div className="h-8 w-24 bg-slate-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>
          {/* Content skeleton */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="h-6 bg-slate-200 rounded w-32 mb-4 animate-pulse"></div>
            <div className="space-y-3">
              <div className="h-10 bg-slate-100 rounded animate-pulse"></div>
              <div className="h-10 bg-slate-100 rounded animate-pulse"></div>
              <div className="h-10 bg-slate-100 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Lease not found</p>
          <button
            onClick={() => window.location.href = '/leases'}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Leases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => window.location.href = '/leases'}
                className="text-sm text-slate-600 hover:text-slate-900 mb-2 flex items-center gap-1"
              >
                ← Back to Leases
              </button>
              <h1 className="text-2xl font-bold text-slate-900">{lease.tenantName}</h1>
              <p className="text-sm text-slate-600 mt-1">{lease.unitName}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  disabled={updatingStatus}
                  className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(lease.status)} hover:opacity-80 transition-opacity disabled:opacity-50`}
                >
                  {lease.status}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showStatusDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowStatusDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                      {['ACTIVE', 'DRAFT', 'ENDED', 'TERMINATED'].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          disabled={lease.status === status}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            lease.status === status ? 'font-semibold' : ''
                          }`}
                        >
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
{lease.balance > 0 && (
                <button
                  onClick={() => {
                    setPaymentForm(prev => ({ ...prev, amount: lease.balance.toFixed(2) }));
                    setShowPaymentModal(true);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Record Payment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Lease Expiry Alert - Show at top if expiring soon */}
        {(() => {
          const daysLeft = getDaysUntilLeaseEnds();
          if (daysLeft === null) return null;

          if (daysLeft < 0) {
            return (
              <div className="px-4 py-3 bg-red-100 border border-red-200 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-red-800">
                  Lease expired {Math.abs(daysLeft)} days ago
                </span>
              </div>
            );
          } else if (daysLeft <= 30) {
            return (
              <div className="px-4 py-3 bg-orange-100 border border-orange-200 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-orange-800">
                  {daysLeft === 0 ? 'Lease expires today!' : `${daysLeft} days until lease ends`}
                </span>
              </div>
            );
          } else if (daysLeft <= 90) {
            return (
              <div className="px-4 py-3 bg-yellow-100 border border-yellow-200 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-800">
                  {daysLeft} days until lease ends
                </span>
              </div>
            );
          }
          return null;
        })()}

        {/* Combined Balance & Ledger Section - Primary Focus */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Balance Header */}
          <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Balance */}
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Current Balance</p>
                  <p className={`text-3xl font-bold ${lease.balance > 0 ? 'text-red-600' : lease.balance < 0 ? 'text-green-600' : 'text-slate-900'}`}>
                    {formatCurrency(Math.abs(lease.balance))}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {lease.balance > 0 ? 'Amount owed' : lease.balance < 0 ? 'Credit on account' : 'Paid in full'}
                  </p>
                </div>
                <div className="h-12 w-px bg-slate-200"></div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-slate-500">Charged:</span>
                    <span className="ml-2 font-semibold text-slate-900">{formatCurrency(getPaymentSummary().totalCharged)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Paid:</span>
                    <span className="ml-2 font-semibold text-green-600">{formatCurrency(getPaymentSummary().totalPaid)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Rent:</span>
                    {editingRent ? (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <span>$</span>
                        <input
                          type="number"
                          value={rentAmount}
                          onChange={(e) => setRentAmount(e.target.value)}
                          className="w-20 px-1 py-0.5 border border-slate-300 rounded text-sm font-semibold"
                          step="0.01"
                          autoFocus
                        />
                        <button onClick={handleSaveRent} className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded">Save</button>
                        <button onClick={() => { setEditingRent(false); setRentAmount(lease.monthlyRentAmount?.toString() || ''); }} className="px-1.5 py-0.5 bg-slate-200 text-xs rounded">Cancel</button>
                      </span>
                    ) : (
                      <span className="ml-2 font-semibold text-slate-900">
                        {lease.monthlyRentAmount ? formatCurrency(parseFloat(lease.monthlyRentAmount.toString())) : 'Not set'}
                        <button onClick={() => setEditingRent(true)} className="ml-1 text-blue-600 hover:text-blue-800 text-xs">(edit)</button>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {automationSettings?.lateFeeAmount && (
                  <button
                    onClick={handleChargeLateFee}
                    disabled={chargingLateFee}
                    className="px-3 sm:px-3 py-2.5 sm:py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {chargingLateFee ? 'Charging...' : 'Late Fee'}
                  </button>
                )}
                {lease.portalToken && (
                  <button
                    onClick={() => window.open(`/tenant/${lease.portalToken}`, '_blank')}
                    className="px-3 sm:px-3 py-2.5 sm:py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                  >
                    Portal
                  </button>
                )}
                <button
                  onClick={() => window.open(`/leases/${lease.id}/statement`, '_blank')}
                  className="px-3 sm:px-3 py-2.5 sm:py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  Statement
                </button>
                <button
                  onClick={() => {
                    setCharges([{
                      amount: lease.monthlyRentAmount ? lease.monthlyRentAmount.toString() : '',
                      chargeType: 'rent',
                      description: ''
                    }]);
                    setChargeDate(new Date().toISOString().split('T')[0]);
                    setShowChargeModal(true);
                  }}
                  className="px-3 sm:px-3 py-2.5 sm:py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  + Charge
                </button>
                <button
                  onClick={() => {
                    if (lease.balance > 0) {
                      setPaymentForm(prev => ({ ...prev, amount: lease.balance.toFixed(2) }));
                    }
                    setShowPaymentModal(true);
                  }}
                  className="px-3 sm:px-3 py-2.5 sm:py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  + Payment
                </button>
              </div>
            </div>
          </div>
          {/* Ledger View Toggle */}
          <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-sm text-slate-600">
              {ledgerViewMode === 'simplified' ? 'Showing charges & payments only' : 'Showing full accounting ledger'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLedgerViewMode('simplified')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  ledgerViewMode === 'simplified'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                Simplified
              </button>
              <button
                onClick={() => setLedgerViewMode('full')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  ledgerViewMode === 'full'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                Full Ledger
              </button>
            </div>
          </div>
          {lease.ledgerEntries.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-slate-900 font-medium mb-1">No transactions yet</p>
              <p className="text-sm text-slate-500 mb-4">Charges and payments will appear here.</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    setCharges([{
                      amount: lease.monthlyRentAmount ? lease.monthlyRentAmount.toString() : '',
                      chargeType: 'rent',
                      description: ''
                    }]);
                    setChargeDate(new Date().toISOString().split('T')[0]);
                    setShowChargeModal(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  + Charge
                </button>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  + Payment
                </button>
              </div>
            </div>
          ) : ledgerViewMode === 'simplified' ? (
            /* Simplified View - AR entries only */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                      Charge
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">

                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lease.ledgerEntries
                    .filter(entry => entry.accountCode === '1200')
                    .map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 group">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {formatDate(entry.entryDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {entry.debitCredit === 'DR' ? (
                          <span className="text-red-600 font-medium">
                            +{formatCurrency(parseFloat(entry.amount.toString()))}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {entry.debitCredit === 'CR' ? (
                          <span className="text-green-600 font-medium">
                            -{formatCurrency(parseFloat(entry.amount.toString()))}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <button
                          onClick={() => handleDeleteLedgerEntry(entry.id, entry.description)}
                          className="p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete entry"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Full Ledger View - All entries with accounting details */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                      Debit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                      Credit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">

                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lease.ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 group">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {formatDate(entry.entryDate)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="text-slate-900 font-medium">{entry.account.code}</div>
                        <div className="text-slate-500 text-xs">{entry.account.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {entry.debitCredit === 'DR' ? (
                          <span className="text-slate-900 font-medium">
                            {formatCurrency(parseFloat(entry.amount.toString()))}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {entry.debitCredit === 'CR' ? (
                          <span className="text-slate-900 font-medium">
                            {formatCurrency(parseFloat(entry.amount.toString()))}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <button
                          onClick={() => handleDeleteLedgerEntry(entry.id, entry.description)}
                          className="p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete entry"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Security Deposit - Collapsible */}
        {lease.securityDepositAmount && depositStatus && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <button
              onClick={() => setDepositExpanded(!depositExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-5 h-5 text-slate-500 transition-transform ${depositExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <h2 className="text-lg font-semibold text-slate-900">Security Deposit</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">Held: {formatCurrency(depositStatus.currentBalance)}</span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  depositStatus.status === 'HELD' ? 'bg-blue-100 text-blue-800' :
                  depositStatus.status === 'RETURNED' ? 'bg-slate-100 text-slate-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {depositStatus.status.replace('_', ' ')}
                </span>
              </div>
            </button>

            {depositExpanded && (
              <div className="px-6 pb-6 border-t border-slate-200 pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Expected Amount</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(depositStatus.expectedAmount || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Currently Held</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatCurrency(depositStatus.currentBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Returned</p>
                    <p className="text-lg font-semibold text-slate-600">
                      {formatCurrency(depositStatus.totalReturned)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Deducted</p>
                    <p className="text-lg font-semibold text-red-600">
                      {formatCurrency(depositStatus.totalDeducted)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {depositStatus.status === 'NOT_RECEIVED' && (
                    <button
                      onClick={() => {
                        setDepositReceiveForm({
                          ...depositReceiveForm,
                          amount: lease.securityDepositAmount?.toString() || ''
                        });
                        setShowDepositReceiveModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      Record Deposit Received
                    </button>
                  )}
                  {depositStatus.status === 'HELD' && depositStatus.currentBalance > 0 && (
                    <button
                      onClick={() => {
                        setDepositReturnForm({
                          ...depositReturnForm,
                          amount: depositStatus.currentBalance.toString()
                        });
                        setShowDepositReturnModal(true);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                    >
                      Return Deposit
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rent Roll - Complete Rent History */}
        {lease.monthlyRentAmount && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Rent Roll</h2>
                <p className="text-sm text-slate-500">Complete rent history from lease start to present</p>
              </div>
              <button
                onClick={() => setShowRentIncreaseModal(true)}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Schedule Rent Increase
              </button>
            </div>

            {/* Current Rent Summary */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Current Monthly Rent</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(lease.monthlyRentAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Lease Period</p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(lease.startDate).toLocaleDateString()} - {new Date(lease.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Rent Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>

              {/* Lease Start Entry */}
              <div className="relative flex items-start gap-4 pb-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center z-10 flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="flex-1 bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-medium">LEASE START</p>
                      <p className="text-sm font-medium text-slate-900">{new Date(lease.startDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">
                        {formatCurrency(rentIncreases.filter(r => r.status === 'APPLIED').length > 0
                          ? rentIncreases.filter(r => r.status === 'APPLIED').sort((a, b) =>
                              new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
                            )[0].previousAmount
                          : lease.monthlyRentAmount
                        )}
                      </p>
                      <p className="text-xs text-slate-500">/month</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Applied Rent Increases */}
              {rentIncreases
                .filter(inc => inc.status === 'APPLIED')
                .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime())
                .map((increase, index) => (
                  <div key={increase.id} className="relative flex items-start gap-4 pb-4">
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center z-10 flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    </div>
                    <div className="flex-1 bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-green-600 font-medium">RENT INCREASE APPLIED</p>
                          <p className="text-sm font-medium text-slate-900">{new Date(increase.effectiveDate).toLocaleDateString()}</p>
                          {increase.notes && <p className="text-xs text-slate-500 mt-1">{increase.notes}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">{formatCurrency(increase.newAmount)}</p>
                          <p className="text-xs text-green-600">
                            +{formatCurrency(increase.newAmount - increase.previousAmount)} ({(((increase.newAmount - increase.previousAmount) / increase.previousAmount) * 100).toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Current/Today marker if different from last increase */}
              {rentIncreases.filter(r => r.status === 'APPLIED').length > 0 && (
                <div className="relative flex items-start gap-4 pb-4">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center z-10 flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-lg p-3 border border-slate-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-600 font-medium">CURRENT RENT</p>
                        <p className="text-sm font-medium text-slate-900">Today</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(lease.monthlyRentAmount)}</p>
                        <p className="text-xs text-slate-500">/month</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Scheduled Future Increases */}
              {rentIncreases
                .filter(inc => inc.status === 'SCHEDULED')
                .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime())
                .map((increase) => (
                  <div key={increase.id} className="relative flex items-start gap-4 pb-4">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center z-10 flex-shrink-0 border-2 border-dashed border-purple-300">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 bg-purple-50 rounded-lg p-3 border border-purple-200 border-dashed">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-purple-600 font-medium">SCHEDULED INCREASE</p>
                          <p className="text-sm font-medium text-slate-900">{new Date(increase.effectiveDate).toLocaleDateString()}</p>
                          {increase.notes && <p className="text-xs text-slate-500 mt-1">{increase.notes}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-purple-600">{formatCurrency(increase.newAmount)}</p>
                          <p className="text-xs text-purple-600">
                            +{formatCurrency(increase.newAmount - increase.previousAmount)} ({(((increase.newAmount - increase.previousAmount) / increase.previousAmount) * 100).toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleApplyRentIncrease(increase.id)}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Apply Now
                        </button>
                        <button
                          onClick={() => handleCancelRentIncrease(increase.id)}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Lease End */}
              <div className="relative flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center z-10 flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">LEASE END</p>
                      <p className="text-sm font-medium text-slate-900">{new Date(lease.endDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancelled Increases (collapsed) */}
            {rentIncreases.filter(inc => inc.status === 'CANCELLED').length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2">Cancelled Increases ({rentIncreases.filter(inc => inc.status === 'CANCELLED').length})</p>
                <div className="space-y-2">
                  {rentIncreases
                    .filter(inc => inc.status === 'CANCELLED')
                    .map((increase) => (
                      <div key={increase.id} className="text-xs text-slate-400 line-through">
                        {new Date(increase.effectiveDate).toLocaleDateString()} - {formatCurrency(increase.previousAmount)} to {formatCurrency(increase.newAmount)}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scheduled Charges */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => setScheduledChargesExpanded(!scheduledChargesExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg
                className={`w-5 h-5 text-slate-500 transition-transform ${scheduledChargesExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-slate-900">Scheduled Charges</h2>
                <p className="text-sm text-slate-600 mt-1">Recurring monthly charges (rent, utilities, parking, etc.)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lease.scheduledCharges && lease.scheduledCharges.filter(c => c.active).length > 0 && (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  {lease.scheduledCharges.filter(c => c.active).length} active
                </span>
              )}
              {lease.scheduledCharges && (
                <span className="text-sm text-slate-500">
                  {formatCurrency(lease.scheduledCharges.filter(c => c.active).reduce((sum, c) => sum + Number(c.amount), 0))}/mo
                </span>
              )}
            </div>
          </button>

          {scheduledChargesExpanded && (
            <div className="px-6 pb-6 border-t border-slate-200">
              <div className="flex justify-between items-center pt-4 mb-4">
                <button
                  onClick={handlePostScheduledCharges}
                  disabled={postingScheduledCharges || !lease.scheduledCharges?.some(c => c.active)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {postingScheduledCharges ? 'Posting...' : 'Post Due Charges'}
                </button>
                <button
                  onClick={() => {
                    setScheduledChargeRows([{ description: '', amount: '', chargeDay: '1', accountCode: '4000' }]);
                    setEditingScheduledChargeId(null);
                    setShowScheduledChargeModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  + Add Charge
                </button>
              </div>

              {!lease.scheduledCharges || lease.scheduledCharges.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500">No scheduled charges configured.</p>
                  <p className="text-xs text-slate-400 mt-1">Add recurring charges like rent, utilities, parking fees, etc.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lease.scheduledCharges.map((charge) => (
                    <div
                      key={charge.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        charge.active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleToggleScheduledCharge(charge)}
                          className={`w-10 h-6 rounded-full transition-colors relative ${
                            charge.active ? 'bg-green-500' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              charge.active ? 'left-5' : 'left-1'
                            }`}
                          />
                        </button>
                        <div>
                          <p className="font-medium text-slate-900">{charge.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500">Day {charge.chargeDay} of each month</span>
                            {charge.active && (() => {
                              const postInfo = getNextPostInfo(charge.chargeDay, charge.lastChargedDate);
                              return (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                                  postInfo.status === 'posted'
                                    ? 'bg-green-100 text-green-700'
                                    : postInfo.status === 'due'
                                    ? 'bg-amber-100 text-amber-700 animate-pulse'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {postInfo.status === 'posted' && (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                  {postInfo.status === 'due' && (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                  {postInfo.status === 'upcoming' && (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                  {postInfo.message}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-slate-900">
                          {formatCurrency(Number(charge.amount))}
                        </span>
                        <div className="flex items-center gap-2">
                          {charge.lastChargedDate && (
                            <button
                              onClick={() => handleResetScheduledCharge(charge.id)}
                              className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded transition-colors flex items-center gap-1"
                              title="Reset (allow re-posting this month)"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Reset
                            </button>
                          )}
                          <button
                            onClick={() => handleEditScheduledCharge(charge)}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteScheduledCharge(charge.id)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total Monthly</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(lease.scheduledCharges.filter(c => c.active).reduce((sum, c) => sum + Number(c.amount), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lease Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => setLeaseInfoExpanded(!leaseInfoExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg
                className={`w-5 h-5 text-slate-500 transition-transform ${leaseInfoExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900">Lease Information</h2>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>{lease.tenantName}</span>
              <span>•</span>
              <span>{lease.unitName}</span>
            </div>
          </button>

          {leaseInfoExpanded && (
            <div className="px-6 pb-6 border-t border-slate-200 pt-4">
              {/* Property & Unit */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Property & Unit</h3>
            <div className="flex items-center gap-4">
              {lease.propertyName && (
                <div>
                  <p className="text-xs text-blue-700">Property</p>
                  <p className="text-base font-semibold text-blue-900">{lease.propertyName}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-blue-700">Unit</p>
                <p className="text-base font-semibold text-blue-900">{lease.unitName}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-600">Tenant Details</h3>
                {!editingTenantInfo && (
                  <button
                    onClick={() => setEditingTenantInfo(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingTenantInfo ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Name *</label>
                    <input
                      type="text"
                      value={tenantInfoForm.tenantName}
                      onChange={(e) => setTenantInfoForm({ ...tenantInfoForm, tenantName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tenant name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Email</label>
                    <input
                      type="email"
                      value={tenantInfoForm.tenantEmail}
                      onChange={(e) => setTenantInfoForm({ ...tenantInfoForm, tenantEmail: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="tenant@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Phone</label>
                    <input
                      type="tel"
                      value={tenantInfoForm.tenantPhone}
                      onChange={(e) => setTenantInfoForm({ ...tenantInfoForm, tenantPhone: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveTenantInfo}
                      disabled={!tenantInfoForm.tenantName.trim() || savingTenantInfo}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingTenantInfo ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingTenantInfo(false);
                        setTenantInfoForm({
                          tenantName: lease.tenantName || '',
                          tenantEmail: lease.tenantEmail || '',
                          tenantPhone: lease.tenantPhone || ''
                        });
                      }}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="text-sm text-slate-900">{lease.tenantName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm text-slate-900">{lease.tenantEmail || <span className="text-slate-400 italic">Not set</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="text-sm text-slate-900">{lease.tenantPhone || <span className="text-slate-400 italic">Not set</span>}</p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-3">Lease Period</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500">Start Date</p>
                  <p className="text-sm text-slate-900">{formatDate(lease.startDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">End Date</p>
                  <p className="text-sm text-slate-900">{formatDate(lease.endDate)}</p>
                </div>
              </div>
            </div>
          </div>
          {lease.notes && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-700">{lease.notes}</p>
            </div>
          )}
            </div>
          )}
        </div>

        {/* Tenant Portal Access */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => setPortalExpanded(!portalExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg
                className={`w-5 h-5 text-slate-500 transition-transform ${portalExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900">Tenant Payment Link</h2>
            </div>
            <div className="flex items-center gap-2">
              {lease.portalToken ? (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                  Active
                </span>
              ) : (
                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-800 rounded-full font-medium">
                  Inactive
                </span>
              )}
            </div>
          </button>

          {portalExpanded && (
            <div className="px-6 pb-6 border-t border-slate-200 pt-4">
              {lease.portalToken ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">✓</div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-green-900 mb-1">
                          Payment Link Active
                        </h3>
                        <p className="text-sm text-green-700 mb-3">
                          {lease.tenantName} can view balance and make payments using the link below.
                        </p>

                        <div className="bg-white p-3 rounded border border-green-300 mb-3">
                          <p className="text-xs text-slate-500 mb-1">Payment Link</p>
                          <p className="text-sm font-mono text-slate-900 break-all">
                            {`${typeof window !== 'undefined' ? window.location.origin : ''}/tenant/${lease.portalToken}`}
                          </p>
                        </div>

                        {lease.portalLastAccess && (
                          <p className="text-xs text-green-600 mb-3">
                            Last accessed: {new Date(lease.portalLastAccess).toLocaleString()}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => window.open(`/tenant/${lease.portalToken}`, '_blank')}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>Open Portal</span>
                          </button>

                          <button
                            onClick={handleCopyPortalLink}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                          >
                            {copiedPortalLink ? (
                              <>
                                <span>✓</span>
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          {lease.tenantEmail && (
                            <button
                              onClick={handleEmailPortalLink}
                              className="px-4 py-2 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                            >
                              <Mail className="h-4 w-4" />
                              <span>Email to Tenant</span>
                            </button>
                          )}

                          <button
                            onClick={handleGeneratePortalLink}
                            disabled={generatingPortal}
                            className="px-4 py-2 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                          >
                            {generatingPortal ? 'Regenerating...' : 'Regenerate Link'}
                          </button>

                          <button
                            onClick={handleRevokePortalAccess}
                            disabled={generatingPortal}
                            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            Revoke Access
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">What can tenants do?</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• View lease details and rent information</li>
                      <li>• Track upcoming rent due dates</li>
                      <li>• Submit maintenance requests</li>
                      <li>• View status of existing maintenance requests</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Lock className="h-6 w-6 text-slate-400" />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-slate-900 mb-1">
                          Payment Link Not Created
                        </h3>
                        <p className="text-sm text-slate-600 mb-3">
                          Create a payment link so {lease.tenantName} can view their balance and pay online.
                        </p>

                        <button
                          onClick={handleGeneratePortalLink}
                          disabled={generatingPortal}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {generatingPortal ? 'Creating...' : 'Create Payment Link'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">What tenants can do</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• View their balance and pay online</li>
                      <li>• See rent due dates</li>
                      <li>• Submit maintenance requests</li>
                    </ul>
                    <p className="text-xs text-blue-600 mt-3">
                      No password required - access via unique secure link.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Documents Section - Collapsible */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => setDocumentsExpanded(!documentsExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg
                className={`w-5 h-5 text-slate-500 transition-transform ${documentsExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
            </div>
            <span className="text-sm text-slate-600">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
          </button>

          {documentsExpanded && (
            <div className="border-t border-slate-200">
              <div className="p-4 flex justify-end border-b border-slate-100">
                <button
                  onClick={() => setShowDocumentModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Upload Document
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-slate-500 mb-4">No documents uploaded yet</p>
                  <button
                    onClick={() => setShowDocumentModal(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Upload your first document
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{doc.fileName}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="inline-flex px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                                {getCategoryLabel(doc.category)}
                              </span>
                              <span className="text-xs text-slate-500">{formatFileSize(doc.fileSize)}</span>
                              <span className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</span>
                            </div>
                            {doc.description && (
                              <p className="text-xs text-slate-600 mt-1">{doc.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Requests Section - Collapsible */}
      {lease.unitId && (
        <div className="max-w-7xl mx-auto px-6 pb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <button
              onClick={() => setMaintenanceExpanded(!maintenanceExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-5 h-5 text-slate-500 transition-transform ${maintenanceExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <h2 className="text-lg font-semibold text-slate-900">Maintenance Requests</h2>
              </div>
              <span className="text-sm text-slate-600">{workOrders.length} request{workOrders.length !== 1 ? 's' : ''}</span>
            </button>

            {maintenanceExpanded && (
              <div className="border-t border-slate-200">
                <div className="p-4 flex justify-end border-b border-slate-100">
                  <Link
                    href={`/maintenance/new?unitId=${lease.unitId}&propertyId=${lease.propertyId}&leaseId=${lease.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    Create Request
                  </Link>
                </div>

                {workOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                    <p className="text-slate-500 mb-4">No maintenance requests yet</p>
                    <Link
                      href={`/maintenance/new?unitId=${lease.unitId}&propertyId=${lease.propertyId}&leaseId=${lease.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Create your first request
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {workOrders.map((wo: any) => (
                      <div key={wo.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Link
                                href={`/maintenance/${wo.id}`}
                                className="text-base font-medium text-blue-600 hover:text-blue-800"
                              >
                                {wo.title}
                              </Link>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                wo.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800' :
                                wo.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                                wo.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-800' :
                                wo.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {wo.status.replace('_', ' ')}
                              </span>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                                wo.priority === 'EMERGENCY' ? 'bg-red-100 text-red-800 border-red-300' :
                                wo.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                wo.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                'bg-green-100 text-green-800 border-green-300'
                              }`}>
                                {wo.priority}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 mb-2">{wo.description}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>Category: {wo.category}</span>
                              {wo.assignedTo && <span>Assigned to: {wo.assignedTo}</span>}
                              <span>Created: {new Date(wo.createdAt).toLocaleDateString()}</span>
                              {wo.actualCost && (
                                <span className="font-medium text-slate-700">
                                  Cost: ${Number(wo.actualCost).toFixed(2)} ({wo.paidBy})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Upload Document</h2>
                <button
                  onClick={() => {
                    setShowDocumentModal(false);
                    setSelectedFile(null);
                    setDocumentForm({ category: 'other', description: '' });
                    setError('');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleDocumentUpload} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  File *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                />
                <p className="text-xs text-slate-500 mt-1">Max 10MB. Supported: PDF, DOC, DOCX, JPG, PNG, GIF</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={documentForm.category}
                  onChange={(e) => setDocumentForm({ ...documentForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="lease_agreement">Lease Agreement</option>
                  <option value="inspection">Inspection Report</option>
                  <option value="receipt">Receipt</option>
                  <option value="tenant_id">Tenant ID</option>
                  <option value="proof_income">Proof of Income</option>
                  <option value="reference">Reference</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={documentForm.description}
                  onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional notes about this document..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDocumentModal(false);
                    setSelectedFile(null);
                    setDocumentForm({ category: 'other', description: '' });
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDocument || !selectedFile}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingDocument ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal - Bottom sheet on mobile */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Record Payment</h2>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setError('');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-4 sm:p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Balance Due:</span> {formatCurrency(lease.balance)}
                </p>
                {lease.balance > 0 && (
                  <p className="text-xs text-blue-700 mt-1">
                    Recording this payment will reduce the amount owed.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Payment Amount *
                  </label>
                  {lease.balance > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, amount: lease.balance.toFixed(2) })}
                      className="text-xs text-green-600 hover:text-green-800 font-medium"
                    >
                      Pay Full Balance ({formatCurrency(lease.balance)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full pl-8 pr-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base sm:text-sm"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                {parseFloat(paymentForm.amount) > lease.balance && lease.balance > 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    This is more than the balance due. The extra {formatCurrency(parseFloat(paymentForm.amount) - lease.balance)} will become a credit.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base sm:text-sm"
                  placeholder={`Payment from ${lease.tenantName}`}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 sm:py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Charge Modal - Bottom sheet on mobile */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Post Charges</h2>
                  <p className="text-sm text-slate-600 mt-1">Add multiple charges at once</p>
                </div>
                <button
                  onClick={() => {
                    setShowChargeModal(false);
                    setError('');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleChargeSubmit} className="p-4 sm:p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Tenant:</span> {lease.tenantName}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  All charges will post: DR Accounts Receivable / CR Rental Income
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Charge Date (applies to all) *
                </label>
                <input
                  type="date"
                  required
                  value={chargeDate}
                  onChange={(e) => setChargeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Charges</h3>
                  <button
                    type="button"
                    onClick={addCharge}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Another Charge
                  </button>
                </div>

                <div className="space-y-3">
                  {charges.map((charge, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Type *
                              </label>
                              <select
                                required
                                value={charge.chargeType}
                                onChange={(e) => updateCharge(index, 'chargeType', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              >
                                <option value="rent">Monthly Rent</option>
                                <option value="late_fee">Late Fee</option>
                                <option value="utility">Utility</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Amount *
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  required
                                  value={charge.amount}
                                  onChange={(e) => updateCharge(index, 'amount', e.target.value)}
                                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Description (optional)
                            </label>
                            <input
                              type="text"
                              value={charge.description}
                              onChange={(e) => updateCharge(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="Auto-filled based on charge type"
                            />
                          </div>
                        </div>
                        {charges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCharge(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remove charge"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-700">Total Amount:</span>
                    <span className="text-lg font-bold text-slate-900">
                      ${charges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowChargeModal(false);
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 sm:py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Posting...' : `Post ${charges.filter(c => c.amount && parseFloat(c.amount) > 0).length} Charge${charges.filter(c => c.amount && parseFloat(c.amount) > 0).length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Receive Modal */}
      {showDepositReceiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Record Deposit Received</h2>
                <button
                  onClick={() => {
                    setShowDepositReceiveModal(false);
                    setError('');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleDepositReceiveSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">This will post:</span> DR Cash / CR Deposits Held
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Records deposit received and increases liability
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Deposit Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={depositReceiveForm.amount}
                    onChange={(e) => setDepositReceiveForm({ ...depositReceiveForm, amount: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Receipt Date *
                </label>
                <input
                  type="date"
                  required
                  value={depositReceiveForm.receiptDate}
                  onChange={(e) => setDepositReceiveForm({ ...depositReceiveForm, receiptDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={depositReceiveForm.description}
                  onChange={(e) => setDepositReceiveForm({ ...depositReceiveForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Security deposit from ${lease.tenantName}`}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDepositReceiveModal(false);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Recording...' : 'Record Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Return Modal */}
      {showDepositReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Return Security Deposit</h2>
                <button
                  onClick={() => {
                    setShowDepositReturnModal(false);
                    setError('');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleDepositReturnSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900">
                  <span className="font-semibold">Deposit Held:</span> {formatCurrency(depositStatus?.currentBalance || 0)}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Base posting: DR Deposits Held / CR Cash
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount to Return *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={depositReturnForm.amount}
                    onChange={(e) => setDepositReturnForm({ ...depositReturnForm, amount: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Return Date *
                </label>
                <input
                  type="date"
                  required
                  value={depositReturnForm.returnDate}
                  onChange={(e) => setDepositReturnForm({ ...depositReturnForm, returnDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={depositReturnForm.description}
                  onChange={(e) => setDepositReturnForm({ ...depositReturnForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={`Deposit return to ${lease.tenantName}`}
                />
              </div>

              {/* Deductions Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Deductions (optional)</h3>
                  <button
                    type="button"
                    onClick={addDeduction}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add Deduction
                  </button>
                </div>

                {depositReturnForm.deductions.length > 0 && (
                  <div className="space-y-3">
                    {depositReturnForm.deductions.map((deduction, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={deduction.description}
                          onChange={(e) => updateDeduction(index, 'description', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                          placeholder="Cleaning, repairs, etc."
                        />
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={deduction.amount}
                            onChange={(e) => updateDeduction(index, 'amount', e.target.value)}
                            className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDeduction(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        Deductions will post: DR Deposits Held / DR Expense for each item
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDepositReturnModal(false);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : 'Return Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Automation Settings Modal */}
      {showAutomationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Automation Settings</h2>
                <button
                  onClick={() => {
                    setShowAutomationModal(false);
                    setError('');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleAutomationSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">Enable Auto-Charge</p>
                  <p className="text-xs text-slate-600 mt-0.5">Automatically charge rent each month</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationForm.autoChargeEnabled}
                    onChange={(e) => setAutomationForm({ ...automationForm, autoChargeEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Charge Day (1-31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={automationForm.chargeDay}
                  onChange={(e) => setAutomationForm({ ...automationForm, chargeDay: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., 1 for first day of month"
                />
                <p className="text-xs text-slate-500 mt-1">Day of the month to charge rent (1 = 1st, 15 = 15th, etc.)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Grace Period (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={automationForm.gracePeriodDays}
                  onChange={(e) => setAutomationForm({ ...automationForm, gracePeriodDays: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="5"
                />
                <p className="text-xs text-slate-500 mt-1">Days before late fee is charged</p>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Late Fee Configuration</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Late Fee Type
                  </label>
                  <select
                    value={automationForm.lateFeeType}
                    onChange={(e) => setAutomationForm({ ...automationForm, lateFeeType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="FLAT">Flat Fee</option>
                    <option value="PERCENTAGE">Percentage of Rent</option>
                  </select>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {automationForm.lateFeeType === 'FLAT' ? 'Late Fee Amount' : 'Late Fee Percentage'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      {automationForm.lateFeeType === 'FLAT' ? '$' : '%'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={automationForm.lateFeeAmount}
                      onChange={(e) => setAutomationForm({ ...automationForm, lateFeeAmount: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder={automationForm.lateFeeType === 'FLAT' ? '50.00' : '5.00'}
                    />
                  </div>
                  {automationForm.lateFeeType === 'PERCENTAGE' && (
                    <p className="text-xs text-slate-500 mt-1">Percentage of monthly rent (e.g., 5 for 5%)</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">Reminder Emails</p>
                  <p className="text-xs text-slate-600 mt-0.5">Send payment reminders (coming soon)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationForm.reminderEmails}
                    onChange={(e) => setAutomationForm({ ...automationForm, reminderEmails: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAutomationModal(false);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scheduled Charge Modal */}
      {showScheduledChargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingScheduledChargeId ? 'Edit Scheduled Charge' : 'Add Scheduled Charges'}
                </h2>
                <button
                  onClick={() => {
                    setShowScheduledChargeModal(false);
                    setEditingScheduledChargeId(null);
                    setScheduledChargeRows([{ description: '', amount: '', chargeDay: '1', accountCode: '4000' }]);
                    setError('');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {!editingScheduledChargeId && (
                <p className="text-sm text-slate-500 mt-1">Add one or more recurring charges for this lease</p>
              )}
            </div>

            <form onSubmit={handleAddScheduledCharges} className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {editingScheduledChargeId ? (
                // Single charge edit form
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                    <input
                      type="text"
                      value={editingScheduledChargeForm.description}
                      onChange={(e) => setEditingScheduledChargeForm({ ...editingScheduledChargeForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., Monthly Rent, Water, Parking"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={editingScheduledChargeForm.amount}
                          onChange={(e) => setEditingScheduledChargeForm({ ...editingScheduledChargeForm, amount: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Day (1-28) *</label>
                      <input
                        type="number"
                        min="1"
                        max="28"
                        value={editingScheduledChargeForm.chargeDay}
                        onChange={(e) => setEditingScheduledChargeForm({ ...editingScheduledChargeForm, chargeDay: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
                      <select
                        value={editingScheduledChargeForm.accountCode}
                        onChange={(e) => setEditingScheduledChargeForm({ ...editingScheduledChargeForm, accountCode: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="4000">Rental Income</option>
                        <option value="4010">Late Fees</option>
                        <option value="4020">Utility Reimb.</option>
                        <option value="4030">Parking</option>
                        <option value="4040">Pet Fees</option>
                        <option value="4050">Storage</option>
                        <option value="4100">Other Income</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                // Multiple charge rows
                <div className="space-y-3">
                  {scheduledChargeRows.map((row, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-700">Charge {index + 1}</span>
                        {scheduledChargeRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveChargeRow(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => handleChargeRowChange(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            placeholder="Description"
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={row.amount}
                              onChange={(e) => handleChargeRowChange(index, 'amount', e.target.value)}
                              className="w-full pl-6 pr-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            max="28"
                            value={row.chargeDay}
                            onChange={(e) => handleChargeRowChange(index, 'chargeDay', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            placeholder="Day"
                          />
                        </div>
                        <div className="col-span-4">
                          <select
                            value={row.accountCode}
                            onChange={(e) => handleChargeRowChange(index, 'accountCode', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          >
                            <option value="4000">Rental Income</option>
                            <option value="4010">Late Fees</option>
                            <option value="4020">Utility Reimb.</option>
                            <option value="4030">Parking</option>
                            <option value="4040">Pet Fees</option>
                            <option value="4050">Storage</option>
                            <option value="4100">Other Income</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddChargeRow}
                    className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors text-sm font-medium"
                  >
                    + Add Another Charge
                  </button>

                  <p className="text-xs text-slate-500">
                    Charges will be posted automatically on the specified day each month (max day 28 for all months)
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-6 mt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduledChargeModal(false);
                    setEditingScheduledChargeId(null);
                    setScheduledChargeRows([{ description: '', amount: '', chargeDay: '1', accountCode: '4000' }]);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingScheduledCharge}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingScheduledCharge ? 'Saving...' : (editingScheduledChargeId ? 'Update Charge' : `Add ${scheduledChargeRows.filter(r => r.description && r.amount).length || ''} Charge${scheduledChargeRows.filter(r => r.description && r.amount).length !== 1 ? 's' : ''}`)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rent Increase Modal */}
      {showRentIncreaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Schedule Rent Increase</h2>
                <button
                  onClick={() => {
                    setShowRentIncreaseModal(false);
                    setError('');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleRentIncreaseSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-900">
                  <span className="font-semibold">Current Rent:</span> {formatCurrency(lease.monthlyRentAmount || 0)}
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  Schedule a future rent increase for this lease
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Monthly Rent *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={rentIncreaseForm.newAmount}
                    onChange={(e) => setRentIncreaseForm({ ...rentIncreaseForm, newAmount: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                {rentIncreaseForm.newAmount && lease.monthlyRentAmount && (
                  <p className="text-xs text-slate-600 mt-1">
                    Increase: +{formatCurrency(parseFloat(rentIncreaseForm.newAmount) - Number(lease.monthlyRentAmount))} ({(((parseFloat(rentIncreaseForm.newAmount) - Number(lease.monthlyRentAmount)) / Number(lease.monthlyRentAmount)) * 100).toFixed(1)}%)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Effective Date *
                </label>
                <input
                  type="date"
                  required
                  value={rentIncreaseForm.effectiveDate}
                  onChange={(e) => setRentIncreaseForm({ ...rentIncreaseForm, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">When the new rent amount takes effect</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notice Date
                </label>
                <input
                  type="date"
                  value={rentIncreaseForm.noticeDate}
                  onChange={(e) => setRentIncreaseForm({ ...rentIncreaseForm, noticeDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">When notice was provided to tenant</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={rentIncreaseForm.notes}
                  onChange={(e) => setRentIncreaseForm({ ...rentIncreaseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={2}
                  placeholder="Reason for increase, market conditions, etc."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRentIncreaseModal(false);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Scheduling...' : 'Schedule Increase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
