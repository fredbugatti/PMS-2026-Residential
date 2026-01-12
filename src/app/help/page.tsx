'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'overview' | 'getting-started' | 'properties' | 'leases' | 'payments' | 'charges' | 'work-orders' | 'reports' | 'automation' | 'move-out' | 'ledger' | 'troubleshooting';

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState<Section>('overview');

  const sections = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
    { id: 'properties', label: 'Properties & Units', icon: '🏠' },
    { id: 'leases', label: 'Leases & Tenants', icon: '📄' },
    { id: 'payments', label: 'Recording Payments', icon: '💵' },
    { id: 'charges', label: 'Adding Charges', icon: '💰' },
    { id: 'work-orders', label: 'Work Orders', icon: '🔧' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'automation', label: 'Automation', icon: '⚙️' },
    { id: 'move-out', label: 'Move-Out & Deposits', icon: '🚪' },
    { id: 'ledger', label: 'How Ledger Works', icon: '📒' },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: '❓' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Help & User Guide</h1>
              <p className="text-sm text-gray-500">Everything you need to know about using this system</p>
            </div>
            <Link href="/" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg border p-4 lg:sticky lg:top-24">
              <h2 className="font-semibold text-gray-900 mb-3">Topics</h2>
              <nav className="space-y-1">
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as Section)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-white rounded-lg border p-6 lg:p-8">
            {/* OVERVIEW */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">System Overview</h2>
                  <p className="text-gray-600 mb-4">
                    This is a complete property management system with double-entry accounting.
                    It helps you manage properties, tenants, rent collection, maintenance, and finances all in one place.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">What This System Does</h3>
                  <ul className="space-y-2 text-blue-800">
                    <li>✓ Manage multiple properties and units</li>
                    <li>✓ Track tenants and leases</li>
                    <li>✓ Automatically charge rent each month</li>
                    <li>✓ Record payments and track who owes money</li>
                    <li>✓ Handle security deposits and move-outs</li>
                    <li>✓ Create and track work orders</li>
                    <li>✓ Generate financial reports</li>
                    <li>✓ Send email notifications</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Link href="/properties" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
                      <div className="text-2xl mb-1">🏠</div>
                      <div className="text-sm font-medium">Properties</div>
                    </Link>
                    <Link href="/leases" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
                      <div className="text-2xl mb-1">📄</div>
                      <div className="text-sm font-medium">Leases</div>
                    </Link>
                    <Link href="/work-orders" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
                      <div className="text-2xl mb-1">🔧</div>
                      <div className="text-sm font-medium">Work Orders</div>
                    </Link>
                    <Link href="/reports" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
                      <div className="text-2xl mb-1">📊</div>
                      <div className="text-sm font-medium">Reports</div>
                    </Link>
                    <Link href="/reports/portfolio-overview" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
                      <div className="text-2xl mb-1">📋</div>
                      <div className="text-sm font-medium">Everything Report</div>
                    </Link>
                    <Link href="/admin" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
                      <div className="text-2xl mb-1">⚙️</div>
                      <div className="text-sm font-medium">Admin</div>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* GETTING STARTED */}
            {activeSection === 'getting-started' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Getting Started</h2>

                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-lg">Step 1: Add Your Properties</h3>
                    <p className="text-gray-600 mt-1">
                      Go to <Link href="/properties" className="text-blue-600 underline">Properties</Link> and click "Add Property".
                      Enter the property address and details.
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-lg">Step 2: Add Units</h3>
                    <p className="text-gray-600 mt-1">
                      Click on a property to open it, then add units (apartments, houses, etc.).
                      Each unit can have one tenant/lease at a time.
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-lg">Step 3: Create Leases</h3>
                    <p className="text-gray-600 mt-1">
                      Go to <Link href="/leases" className="text-blue-600 underline">Leases</Link> and click "New Lease".
                      Select a property and unit, enter tenant info, rent amount, and security deposit.
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-lg">Step 4: Set Up Scheduled Charges</h3>
                    <p className="text-gray-600 mt-1">
                      When creating a lease, add scheduled charges (rent, utilities, parking, pet fees).
                      These will automatically post each month.
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-lg">Step 5: Add Vendors</h3>
                    <p className="text-gray-600 mt-1">
                      Go to <Link href="/vendors" className="text-blue-600 underline">Vendors</Link> to add contractors
                      (plumbers, electricians, etc.) for work orders.
                    </p>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900">You're Ready!</h3>
                  <p className="text-green-800 mt-1">
                    Once you have properties, units, and leases set up, the system will automatically
                    charge rent each month and track tenant balances.
                  </p>
                </div>
              </div>
            )}

            {/* PROPERTIES & UNITS */}
            {activeSection === 'properties' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Properties & Units</h2>

                <div>
                  <h3 className="font-semibold text-lg mb-2">What is a Property?</h3>
                  <p className="text-gray-600">
                    A property is a building or location you manage - like an apartment building,
                    a house, or a commercial building. Each property has an address.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">What is a Unit?</h3>
                  <p className="text-gray-600">
                    A unit is a rentable space within a property - like Apartment 1A, Unit 101,
                    or just "Main House". Each unit can have one active tenant at a time.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">How to Add a Property</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600">
                    <li>Go to <Link href="/properties" className="text-blue-600 underline">Properties</Link></li>
                    <li>Click "Add Property"</li>
                    <li>Enter the address, city, state, zip</li>
                    <li>Select property type (Residential or Commercial)</li>
                    <li>Click Save</li>
                  </ol>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">How to Add a Unit</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600">
                    <li>Click on a property to open it</li>
                    <li>Click "Add Unit"</li>
                    <li>Enter unit number/name (e.g., "1A", "Suite 200")</li>
                    <li>Optionally add bedrooms, bathrooms, square feet</li>
                    <li>Click Save</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Unit Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">OCCUPIED</span>
                      <span className="text-gray-600">- Has an active tenant</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">VACANT</span>
                      <span className="text-gray-600">- No tenant, ready to rent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">MAINTENANCE</span>
                      <span className="text-gray-600">- Being repaired, not rentable</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LEASES & TENANTS */}
            {activeSection === 'leases' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Leases & Tenants</h2>

                <div>
                  <h3 className="font-semibold text-lg mb-2">What is a Lease?</h3>
                  <p className="text-gray-600">
                    A lease is a rental agreement between you and a tenant. It connects a tenant
                    to a specific unit and tracks their rent, payments, and balance.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">How to Create a Lease</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600">
                    <li>Go to <Link href="/leases" className="text-blue-600 underline">Leases</Link></li>
                    <li>Click "New Lease"</li>
                    <li>Select property and unit</li>
                    <li>Enter tenant name, email, phone</li>
                    <li>Set lease start date and end date</li>
                    <li>Enter security deposit amount</li>
                    <li>Add scheduled charges (rent, utilities, etc.)</li>
                    <li>Click Create Lease</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Lease Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">DRAFT</span>
                      <span className="text-gray-600">- Not yet active, still being set up</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">ACTIVE</span>
                      <span className="text-gray-600">- Current tenant, charges are posting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">ENDED</span>
                      <span className="text-gray-600">- Lease completed normally</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">TERMINATED</span>
                      <span className="text-gray-600">- Lease ended early</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Scheduled Charges</h3>
                  <p className="text-gray-600 mb-2">
                    Scheduled charges are recurring fees that automatically post each month:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li><strong>Rent</strong> - Monthly rent payment</li>
                    <li><strong>Utilities</strong> - Water, trash, etc.</li>
                    <li><strong>Parking</strong> - Parking space fee</li>
                    <li><strong>Pet Fee</strong> - Monthly pet rent</li>
                    <li><strong>Storage</strong> - Storage unit fee</li>
                  </ul>
                </div>
              </div>
            )}

            {/* RECORDING PAYMENTS */}
            {activeSection === 'payments' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Recording Payments</h2>

                <div>
                  <h3 className="font-semibold text-lg mb-2">When to Record a Payment</h3>
                  <p className="text-gray-600">
                    Record a payment whenever a tenant pays you - whether by check, cash,
                    bank transfer, or any other method.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">How to Record a Payment</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600">
                    <li>Go to <Link href="/leases" className="text-blue-600 underline">Leases</Link></li>
                    <li>Click on the tenant's lease</li>
                    <li>Click "Record Payment"</li>
                    <li>Enter the amount received</li>
                    <li>Select payment method (Check, Cash, ACH, etc.)</li>
                    <li>Add a reference number if applicable (check #)</li>
                    <li>Click Submit</li>
                  </ol>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">What Happens When You Record a Payment</h3>
                  <p className="text-blue-800">
                    The system creates two accounting entries:
                  </p>
                  <ul className="mt-2 space-y-1 text-blue-800">
                    <li>• <strong>Cash increases</strong> (you received money)</li>
                    <li>• <strong>Tenant's balance decreases</strong> (they owe less)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Partial Payments</h3>
                  <p className="text-gray-600">
                    If a tenant pays less than they owe, just record the amount they paid.
                    The remaining balance will stay on their account.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Overpayments</h3>
                  <p className="text-gray-600">
                    If a tenant pays more than they owe, record the full amount.
                    They'll have a credit balance that applies to future charges.
                  </p>
                </div>
              </div>
            )}

            {/* ADDING CHARGES */}
            {activeSection === 'charges' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Adding Charges</h2>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Automatic vs Manual Charges</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900">Automatic (Scheduled)</h4>
                      <p className="text-green-800 text-sm mt-1">
                        Rent and recurring fees post automatically each month based on
                        the scheduled charges you set up on the lease.
                      </p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900">Manual (One-Time)</h4>
                      <p className="text-yellow-800 text-sm mt-1">
                        Late fees, damages, special charges - you add these manually
                        when needed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">How to Add a Manual Charge</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600">
                    <li>Go to <Link href="/leases" className="text-blue-600 underline">Leases</Link></li>
                    <li>Click on the tenant's lease</li>
                    <li>Click "Add Charge"</li>
                    <li>Select charge type (Late Fee, Damage, Utility, etc.)</li>
                    <li>Enter the amount</li>
                    <li>Add a description</li>
                    <li>Click Submit</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Common Charge Types</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">When to Use</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr className="border-b">
                        <td className="py-2">Late Fee</td>
                        <td className="py-2">Tenant paid rent late</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">NSF Fee</td>
                        <td className="py-2">Check bounced</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Damage</td>
                        <td className="py-2">Tenant damaged property</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Utility</td>
                        <td className="py-2">One-time utility charge</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Legal Fee</td>
                        <td className="py-2">Eviction or legal costs</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* WORK ORDERS */}
            {activeSection === 'work-orders' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Work Orders</h2>

                <div>
                  <h3 className="font-semibold text-lg mb-2">What is a Work Order?</h3>
                  <p className="text-gray-600">
                    A work order is a maintenance or repair request. It tracks the problem,
                    which unit it affects, who's assigned to fix it, and the cost.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">How to Create a Work Order</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600">
                    <li>Go to <Link href="/work-orders" className="text-blue-600 underline">Work Orders</Link></li>
                    <li>Click "New Work Order"</li>
                    <li>Select property and unit</li>
                    <li>Enter title and description of the issue</li>
                    <li>Set priority (Low, Medium, High, Emergency)</li>
                    <li>Optionally assign a vendor</li>
                    <li>Click Create</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Work Order Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">OPEN</span>
                      <span className="text-gray-600">- Just created, needs attention</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">ASSIGNED</span>
                      <span className="text-gray-600">- Vendor assigned, waiting to start</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">IN PROGRESS</span>
                      <span className="text-gray-600">- Work is being done</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">COMPLETED</span>
                      <span className="text-gray-600">- Work is finished</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">CANCELLED</span>
                      <span className="text-gray-600">- Work order was cancelled</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Priority Levels</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">LOW</span>
                      <span className="text-gray-600">- Can wait, not urgent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">MEDIUM</span>
                      <span className="text-gray-600">- Should be done soon</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm">HIGH</span>
                      <span className="text-gray-600">- Needs attention quickly</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">EMERGENCY</span>
                      <span className="text-gray-600">- Fix immediately (flood, no heat, etc.)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* REPORTS */}
            {activeSection === 'reports' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Reports</h2>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Everything Report (Most Important)</h3>
                  <p className="text-blue-800 mb-2">
                    This shows EVERYTHING in your system in one place - properties, tenants,
                    money owed, work orders, everything.
                  </p>
                  <Link href="/reports/portfolio-overview" className="text-blue-600 underline">
                    Go to Everything Report →
                  </Link>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3">Available Reports</h3>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Report</th>
                        <th className="text-left py-2">What It Shows</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr className="border-b">
                        <td className="py-3 font-medium">Tenant Balances</td>
                        <td className="py-3">Who owes what - simple list of each tenant's balance</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 font-medium">Aged A/R</td>
                        <td className="py-3">How old is the debt - shows if money is 30, 60, 90+ days overdue</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 font-medium">Profit & Loss</td>
                        <td className="py-3">Am I making money - income minus expenses</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 font-medium">Balance Sheet</td>
                        <td className="py-3">What I own vs owe - assets, liabilities, equity</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 font-medium">Cash Flow</td>
                        <td className="py-3">Where did cash go - tracks money in and out</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 font-medium">Income</td>
                        <td className="py-3">Money coming in - rent, fees, etc.</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 font-medium">Expenses</td>
                        <td className="py-3">Money going out - repairs, utilities, etc.</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 font-medium">Trial Balance</td>
                        <td className="py-3">All account totals - verifies books are balanced</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AUTOMATION */}
            {activeSection === 'automation' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Automation</h2>

                <div>
                  <h3 className="font-semibold text-lg mb-2">What Happens Automatically</h3>
                  <p className="text-gray-600 mb-4">
                    The system runs daily to handle recurring tasks so you don't have to do them manually.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900">Daily Rent Charging</h4>
                    <p className="text-green-800 text-sm mt-1">
                      Every day at 6 AM, the system checks if any rent is due and posts charges automatically.
                      For example, if rent is due on the 1st and today is the 1st, rent gets charged.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900">Email Notifications</h4>
                    <p className="text-blue-800 text-sm mt-1">
                      The system can automatically send emails for:
                    </p>
                    <ul className="text-blue-800 text-sm mt-2 space-y-1">
                      <li>• Payment receipts when payments are recorded</li>
                      <li>• Late payment reminders</li>
                      <li>• Lease expiry warnings (90, 60, 30 days)</li>
                      <li>• Work order updates</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Manual Override</h3>
                  <p className="text-gray-600 mb-2">
                    If you need to run charges manually (for testing or catch-up):
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600">
                    <li>Go to <Link href="/admin" className="text-blue-600 underline">Admin</Link></li>
                    <li>Click "Automation" tab</li>
                    <li>Click "Run Daily Charges Now"</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Notification Settings</h3>
                  <p className="text-gray-600">
                    Configure which emails get sent at{' '}
                    <Link href="/settings/notifications" className="text-blue-600 underline">
                      Settings → Notifications
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {/* MOVE-OUT & DEPOSITS */}
            {activeSection === 'move-out' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Move-Out & Security Deposits</h2>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Security Deposit Basics</h3>
                  <p className="text-gray-600">
                    When a tenant moves in, they pay a security deposit. This money is held
                    as protection against damages or unpaid rent. When they move out, you
                    either return it or deduct from it for damages.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Move-Out Process (4 Steps)</h3>
                  <ol className="list-decimal list-inside space-y-3 text-gray-600">
                    <li>
                      <strong>Start Inspection</strong> - Go to the lease, click "Move Out",
                      record the inspection date and unit condition
                    </li>
                    <li>
                      <strong>Add Deductions</strong> - List any damages, cleaning fees,
                      or unpaid rent to deduct from the deposit
                    </li>
                    <li>
                      <strong>Review Summary</strong> - See the deposit held, total deductions,
                      and amount to return
                    </li>
                    <li>
                      <strong>Complete</strong> - Finalize the move-out, which posts the
                      accounting entries and ends the lease
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Common Deductions</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">Example</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr className="border-b">
                        <td className="py-2">Cleaning</td>
                        <td className="py-2">Unit wasn't left clean</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Damage - Walls</td>
                        <td className="py-2">Holes, scuffs, paint damage</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Damage - Flooring</td>
                        <td className="py-2">Carpet stains, scratched floors</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Damage - Appliances</td>
                        <td className="py-2">Broken appliances</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Unpaid Rent</td>
                        <td className="py-2">Outstanding balance</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Keys Not Returned</td>
                        <td className="py-2">Re-keying cost</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900">Important</h3>
                  <p className="text-yellow-800 text-sm">
                    Check your state laws for security deposit rules - many states require
                    you to return the deposit (or itemized deductions) within a specific
                    timeframe (often 14-30 days).
                  </p>
                </div>
              </div>
            )}

            {/* HOW LEDGER WORKS */}
            {activeSection === 'ledger' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">How the Ledger Works</h2>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Double-Entry Accounting</h3>
                  <p className="text-gray-600">
                    Every transaction creates TWO entries that balance each other.
                    This ensures your books are always accurate.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">When Rent is Charged</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-green-100 p-3 rounded">
                        <div className="font-medium text-green-800">Accounts Receivable +$1,500</div>
                        <div className="text-green-700">Tenant now owes you money</div>
                      </div>
                      <div className="bg-blue-100 p-3 rounded">
                        <div className="font-medium text-blue-800">Rental Income +$1,500</div>
                        <div className="text-blue-700">You earned rental income</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">When Payment is Received</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-green-100 p-3 rounded">
                        <div className="font-medium text-green-800">Cash +$1,500</div>
                        <div className="text-green-700">You received money</div>
                      </div>
                      <div className="bg-red-100 p-3 rounded">
                        <div className="font-medium text-red-800">Accounts Receivable -$1,500</div>
                        <div className="text-red-700">Tenant owes less</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">When Security Deposit is Collected</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-green-100 p-3 rounded">
                        <div className="font-medium text-green-800">Cash +$2,000</div>
                        <div className="text-green-700">You received the deposit</div>
                      </div>
                      <div className="bg-yellow-100 p-3 rounded">
                        <div className="font-medium text-yellow-800">Security Deposits Liability +$2,000</div>
                        <div className="text-yellow-700">You owe this back to tenant</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">When Deposit is Returned</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-yellow-100 p-3 rounded">
                        <div className="font-medium text-yellow-800">Security Deposits Liability -$2,000</div>
                        <div className="text-yellow-700">You no longer owe this</div>
                      </div>
                      <div className="bg-red-100 p-3 rounded">
                        <div className="font-medium text-red-800">Cash -$2,000</div>
                        <div className="text-red-700">You paid out the deposit</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Key Accounts</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Account</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">What It Tracks</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr className="border-b">
                        <td className="py-2">Cash (1000)</td>
                        <td className="py-2">Asset</td>
                        <td className="py-2">Money you have</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Accounts Receivable (1200)</td>
                        <td className="py-2">Asset</td>
                        <td className="py-2">Money tenants owe you</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Security Deposits (2100)</td>
                        <td className="py-2">Liability</td>
                        <td className="py-2">Deposits you owe back</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Rental Income (4000)</td>
                        <td className="py-2">Income</td>
                        <td className="py-2">Rent you've earned</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Repairs (5100)</td>
                        <td className="py-2">Expense</td>
                        <td className="py-2">Maintenance costs</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TROUBLESHOOTING */}
            {activeSection === 'troubleshooting' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Troubleshooting</h2>

                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2">Rent didn't charge automatically</h3>
                    <p className="text-gray-600 mb-2">Check these things:</p>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Is the lease status "ACTIVE"?</li>
                      <li>Is the scheduled charge set to "Active"?</li>
                      <li>Is the charge day set correctly? (e.g., 1 for 1st of month)</li>
                      <li>Go to Admin → Automation and click "Run Daily Charges Now"</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2">Tenant balance is wrong</h3>
                    <p className="text-gray-600 mb-2">The balance comes from ledger entries. Check:</p>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Go to the lease and review the "Ledger" section</li>
                      <li>Make sure all payments were recorded</li>
                      <li>Check if charges were posted correctly</li>
                      <li>You can add a credit/adjustment if needed</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2">Can't find a tenant</h3>
                    <p className="text-gray-600 mb-2">Try these:</p>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Use the search box on the Leases page</li>
                      <li>Check if you're filtering by status (Active/Ended)</li>
                      <li>Check the "Everything Report" which shows all tenants</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2">Reports show wrong numbers</h3>
                    <p className="text-gray-600 mb-2">Reports are based on ledger entries:</p>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Check the date range on the report</li>
                      <li>Go to Admin → Data Integrity to check for issues</li>
                      <li>Trial Balance should always have Debits = Credits</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2">Emails not sending</h3>
                    <p className="text-gray-600 mb-2">Email requires setup:</p>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Make sure RESEND_API_KEY is set in environment variables</li>
                      <li>Check notification settings at Settings → Notifications</li>
                      <li>Verify tenant has an email address on their lease</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900">Need More Help?</h3>
                  <p className="text-blue-800">
                    Go to <Link href="/admin" className="underline">Admin</Link> to:
                  </p>
                  <ul className="text-blue-800 mt-2 space-y-1">
                    <li>• Run system health checks</li>
                    <li>• Test API endpoints</li>
                    <li>• Check data integrity</li>
                    <li>• View automation logs</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
