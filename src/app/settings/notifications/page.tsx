'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NotificationSettings {
  id: string;
  paymentReceipts: boolean;
  latePaymentReminders: boolean;
  daysBeforeLateReminder: number;
  leaseExpiryWarnings: boolean;
  leaseExpiryDays: number[];
  workOrderUpdates: boolean;
  workOrderCreated: boolean;
  monthlyStatements: boolean;
  fromName: string;
  replyToEmail: string | null;
}

interface EmailLog {
  id: string;
  createdAt: string;
  toEmail: string;
  toName: string | null;
  subject: string;
  templateType: string;
  status: string;
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'logs'>('settings');

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/notifications/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/notifications/logs?limit=50');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        alert('Settings saved successfully');
      } else {
        alert('Failed to save settings');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field: keyof NotificationSettings) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: !settings[field] });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SENT: 'bg-blue-100 text-blue-800',
      DELIVERED: 'bg-green-100 text-green-800',
      OPENED: 'bg-purple-100 text-purple-800',
      FAILED: 'bg-red-100 text-red-800',
      BOUNCED: 'bg-orange-100 text-orange-800',
      PENDING: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getTemplateLabel = (type: string) => {
    const labels: Record<string, string> = {
      payment_receipt: 'Payment Receipt',
      late_reminder: 'Late Payment Reminder',
      late_fee_notice: 'Late Fee Notice',
      lease_expiry: 'Lease Expiration',
      work_order_created: 'Work Order Created',
      work_order_update: 'Work Order Update',
      deposit_disposition: 'Deposit Disposition'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900 mb-2 block">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Email Notifications</h1>
          <p className="text-gray-600 mt-1">Configure automated email notifications</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Email History
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'settings' && settings && (
          <div className="space-y-6">
            {/* Email Configuration */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Email Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={settings.fromName}
                    onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                    placeholder="Your Company Name"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">This name will appear as the sender</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reply-To Email
                  </label>
                  <input
                    type="email"
                    value={settings.replyToEmail || ''}
                    onChange={(e) => setSettings({ ...settings, replyToEmail: e.target.value })}
                    placeholder="replies@yourdomain.com"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Replies will be sent to this address</p>
                </div>
              </div>
            </div>

            {/* Payment Notifications */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Payment Notifications</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Payment Receipts</p>
                    <p className="text-sm text-gray-600">Send receipt when payment is recorded</p>
                  </div>
                  <button
                    onClick={() => handleToggle('paymentReceipts')}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.paymentReceipts ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      settings.paymentReceipts ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Late Payment Reminders</p>
                    <p className="text-sm text-gray-600">Send reminder when payment is past due</p>
                  </div>
                  <button
                    onClick={() => handleToggle('latePaymentReminders')}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.latePaymentReminders ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      settings.latePaymentReminders ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {settings.latePaymentReminders && (
                  <div className="ml-4 pl-4 border-l-2 border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Days after due date to send reminder
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.daysBeforeLateReminder}
                      onChange={(e) => setSettings({ ...settings, daysBeforeLateReminder: parseInt(e.target.value) || 3 })}
                      className="w-20 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Lease Notifications */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Lease Notifications</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Lease Expiration Warnings</p>
                    <p className="text-sm text-gray-600">Remind tenants before lease expires</p>
                  </div>
                  <button
                    onClick={() => handleToggle('leaseExpiryWarnings')}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.leaseExpiryWarnings ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      settings.leaseExpiryWarnings ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {settings.leaseExpiryWarnings && (
                  <div className="ml-4 pl-4 border-l-2 border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Days before expiration to send warnings
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Current: {settings.leaseExpiryDays.join(', ')} days</p>
                  </div>
                )}
              </div>
            </div>

            {/* Work Order Notifications */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Work Order Notifications</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Work Order Created</p>
                    <p className="text-sm text-gray-600">Confirm when work order is submitted</p>
                  </div>
                  <button
                    onClick={() => handleToggle('workOrderCreated')}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.workOrderCreated ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      settings.workOrderCreated ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Work Order Updates</p>
                    <p className="text-sm text-gray-600">Notify when status changes</p>
                  </div>
                  <button
                    onClick={() => handleToggle('workOrderUpdates')}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.workOrderUpdates ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      settings.workOrderUpdates ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Monthly Statements */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Monthly Statements</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Send Monthly Statements</p>
                  <p className="text-sm text-gray-600">Email statement at beginning of each month</p>
                </div>
                <button
                  onClick={() => handleToggle('monthlyStatements')}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.monthlyStatements ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    settings.monthlyStatements ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Email History</h2>
              <button
                onClick={fetchLogs}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Refresh
              </button>
            </div>
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No emails sent yet
              </div>
            ) : (
              <div className="divide-y">
                {logs.map((log) => (
                  <div key={log.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{log.subject}</p>
                        <p className="text-sm text-gray-600">
                          To: {log.toName ? `${log.toName} <${log.toEmail}>` : log.toEmail}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(log.status)}`}>
                          {log.status}
                        </span>
                        <span className="text-xs text-gray-500">{getTemplateLabel(log.templateType)}</span>
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
  );
}
