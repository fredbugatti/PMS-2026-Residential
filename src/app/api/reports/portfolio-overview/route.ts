import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/reports/portfolio-overview - Comprehensive portfolio report
export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Run all queries in parallel for performance
    const [
      properties,
      units,
      leases,
      ledgerEntries,
      workOrders,
      vendors,
      moveOutInspections,
      scheduledCharges,
      recentPayments,
      recentCharges,
      emailLogs,
      documents
    ] = await Promise.all([
      // Properties with unit counts
      prisma.property.findMany({
        include: {
          units: {
            select: { id: true, status: true }
          },
          leases: {
            where: { status: 'ACTIVE' },
            select: { id: true }
          }
        }
      }),
      // All units
      prisma.unit.findMany({
        select: {
          id: true,
          status: true,
          propertyId: true
        }
      }),
      // All leases with details
      prisma.lease.findMany({
        select: {
          id: true,
          tenantName: true,
          tenantEmail: true,
          tenantPhone: true,
          propertyName: true,
          unitName: true,
          status: true,
          startDate: true,
          endDate: true,
          securityDepositAmount: true,
          propertyId: true,
          unitId: true
        }
      }),
      // All posted ledger entries
      prisma.ledgerEntry.findMany({
        where: { status: 'POSTED' as const },
        select: {
          id: true,
          accountCode: true,
          amount: true,
          debitCredit: true,
          entryDate: true,
          description: true,
          leaseId: true
        }
      }),
      // Work orders
      prisma.workOrder.findMany({
        select: {
          id: true,
          status: true,
          priority: true,
          estimatedCost: true,
          actualCost: true,
          createdAt: true,
          completedDate: true,
          vendorId: true,
          propertyId: true,
          category: true
        }
      }),
      // Vendors
      prisma.vendor.findMany({
        select: {
          id: true,
          name: true,
          specialties: true,
          email: true,
          phone: true
        }
      }),
      // Move-out inspections
      prisma.moveOutInspection.findMany({
        select: {
          id: true,
          leaseId: true,
          status: true,
          depositHeld: true,
          totalDeductions: true,
          amountToReturn: true
        }
      }),
      // Scheduled charges (for rent roll)
      prisma.scheduledCharge.findMany({
        where: { active: true },
        select: {
          id: true,
          leaseId: true,
          accountCode: true,
          amount: true,
          frequency: true,
          description: true
        }
      }),
      // Recent payments (last 30 days)
      prisma.ledgerEntry.findMany({
        where: {
          status: 'POSTED' as const,
          accountCode: '1000',
          debitCredit: 'DR',
          entryDate: {
            gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { entryDate: 'desc' },
        take: 20,
        select: {
          id: true,
          amount: true,
          entryDate: true,
          description: true,
          leaseId: true
        }
      }),
      // Recent charges (last 30 days)
      prisma.ledgerEntry.findMany({
        where: {
          status: 'POSTED' as const,
          accountCode: '1200',
          debitCredit: 'DR',
          entryDate: {
            gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { entryDate: 'desc' },
        take: 20,
        select: {
          id: true,
          amount: true,
          entryDate: true,
          description: true,
          leaseId: true
        }
      }),
      // Email logs (last 30 days)
      prisma.emailLog.findMany({
        where: {
          createdAt: {
            gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          templateType: true,
          status: true
        }
      }),
      // Documents count
      prisma.document.count()
    ]);

    // ==================== PROPERTIES SUMMARY ====================
    const propertiesSummary = properties.map(p => {
      const totalUnits = p.units.length;
      const occupiedUnits = p.units.filter(u => u.status === 'OCCUPIED').length;
      const vacantUnits = p.units.filter(u => u.status === 'VACANT').length;
      const activeLeasesCount = p.leases.length;

      // Calculate rent from scheduled charges for this property's active leases
      const propertyLeaseIds = p.leases.map(l => l.id);
      const propertyRentCharges = scheduledCharges.filter(
        sc => propertyLeaseIds.includes(sc.leaseId) && sc.accountCode === '4000'
      );
      const totalMonthlyRent = propertyRentCharges.reduce((sum, sc) => sum + Number(sc.amount), 0);

      return {
        id: p.id,
        name: p.name,
        address: p.address,
        city: p.city,
        state: p.state,
        type: p.propertyType,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        occupancyRate: totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : '0',
        activeLeases: activeLeasesCount,
        totalPotentialRent: totalMonthlyRent
      };
    });

    const totalProperties = properties.length;
    const totalUnits = units.length;
    const occupiedUnits = units.filter(u => u.status === 'OCCUPIED').length;
    const vacantUnits = units.filter(u => u.status === 'VACANT').length;
    const overallOccupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : '0';

    // ==================== LEASES SUMMARY ====================
    const activeLeases = leases.filter(l => l.status === 'ACTIVE');
    const endedLeases = leases.filter(l => l.status === 'ENDED');
    const pendingLeases = leases.filter(l => l.status === 'PENDING');

    // Leases expiring in next 30/60/90 days
    const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    const next90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const expiringIn30 = activeLeases.filter(l => l.endDate && new Date(l.endDate) <= next30Days);
    const expiringIn60 = activeLeases.filter(l => l.endDate && new Date(l.endDate) <= next60Days);
    const expiringIn90 = activeLeases.filter(l => l.endDate && new Date(l.endDate) <= next90Days);

    const leasesSummary = {
      total: leases.length,
      active: activeLeases.length,
      pending: pendingLeases.length,
      ended: endedLeases.length,
      expiringIn30Days: expiringIn30.length,
      expiringIn60Days: expiringIn60.length,
      expiringIn90Days: expiringIn90.length,
      expiringLeases: expiringIn90.map(l => ({
        id: l.id,
        tenantName: l.tenantName,
        propertyName: l.propertyName,
        unitName: l.unitName,
        endDate: l.endDate,
        daysRemaining: l.endDate ? Math.ceil((new Date(l.endDate).getTime() - today.getTime()) / (24 * 60 * 60 * 1000)) : null
      }))
    };

    // ==================== TENANTS LIST ====================
    const tenantsList = activeLeases.map(l => ({
      id: l.id,
      name: l.tenantName,
      email: l.tenantEmail,
      phone: l.tenantPhone,
      property: l.propertyName,
      unit: l.unitName,
      leaseStart: l.startDate,
      leaseEnd: l.endDate
    }));

    // ==================== FINANCIAL SUMMARY ====================
    // Calculate balances by account
    const accountBalances: { [code: string]: number } = {};
    for (const entry of ledgerEntries) {
      const code = entry.accountCode;
      const amt = Number(entry.amount);
      if (!accountBalances[code]) accountBalances[code] = 0;
      // Assets and Expenses: DR increases, CR decreases
      // Liabilities, Equity, Income: CR increases, DR decreases
      const isDebitNormal = code.startsWith('1') || code.startsWith('5') || code.startsWith('6');
      if (isDebitNormal) {
        accountBalances[code] += entry.debitCredit === 'DR' ? amt : -amt;
      } else {
        accountBalances[code] += entry.debitCredit === 'CR' ? amt : -amt;
      }
    }

    // Cash balance (1000)
    const cashBalance = accountBalances['1000'] || 0;

    // Accounts Receivable (1200)
    const totalAR = accountBalances['1200'] || 0;

    // Security Deposits Liability (2100)
    const securityDepositsHeld = accountBalances['2100'] || 0;

    // Total Income (4xxx accounts)
    const totalIncome = Object.entries(accountBalances)
      .filter(([code]) => code.startsWith('4'))
      .reduce((sum, [, bal]) => sum + bal, 0);

    // Total Expenses (5xxx and 6xxx accounts)
    const totalExpenses = Object.entries(accountBalances)
      .filter(([code]) => code.startsWith('5') || code.startsWith('6'))
      .reduce((sum, [, bal]) => sum + bal, 0);

    // Net Operating Income
    const netOperatingIncome = totalIncome - totalExpenses;

    // AR Aging
    const arByLease: { [leaseId: string]: { balance: number; oldestDate: Date | null } } = {};
    for (const entry of ledgerEntries) {
      if (entry.accountCode === '1200' && entry.leaseId) {
        if (!arByLease[entry.leaseId]) {
          arByLease[entry.leaseId] = { balance: 0, oldestDate: null };
        }
        const amt = Number(entry.amount);
        arByLease[entry.leaseId].balance += entry.debitCredit === 'DR' ? amt : -amt;
        if (entry.debitCredit === 'DR') {
          const entryDate = new Date(entry.entryDate);
          if (!arByLease[entry.leaseId].oldestDate || entryDate < arByLease[entry.leaseId].oldestDate!) {
            arByLease[entry.leaseId].oldestDate = entryDate;
          }
        }
      }
    }

    let ar0to30 = 0, ar31to60 = 0, ar61to90 = 0, ar90plus = 0;
    for (const data of Object.values(arByLease)) {
      if (data.balance > 0 && data.oldestDate) {
        const daysOld = Math.floor((today.getTime() - data.oldestDate.getTime()) / (24 * 60 * 60 * 1000));
        if (daysOld <= 30) ar0to30 += data.balance;
        else if (daysOld <= 60) ar31to60 += data.balance;
        else if (daysOld <= 90) ar61to90 += data.balance;
        else ar90plus += data.balance;
      }
    }

    // Tenant balances
    const tenantBalances = activeLeases.map(l => {
      const arData = arByLease[l.id];
      return {
        leaseId: l.id,
        tenantName: l.tenantName,
        propertyName: l.propertyName,
        unitName: l.unitName,
        balance: arData?.balance || 0
      };
    }).filter(t => t.balance !== 0).sort((a, b) => b.balance - a.balance);

    const financialSummary = {
      cashBalance,
      totalAR,
      securityDepositsHeld,
      totalIncome,
      totalExpenses,
      netOperatingIncome,
      arAging: {
        current: ar0to30,
        days31to60: ar31to60,
        days61to90: ar61to90,
        over90: ar90plus
      },
      tenantBalances
    };

    // ==================== RENT ROLL ====================
    const rentCharges = scheduledCharges.filter(sc => sc.accountCode === '4000');
    const monthlyRentRoll = rentCharges.reduce((sum, sc) => sum + Number(sc.amount), 0);
    const annualRentRoll = monthlyRentRoll * 12;

    const rentRoll = activeLeases.map(l => {
      const leaseCharges = scheduledCharges.filter(sc => sc.leaseId === l.id);
      const monthlyRent = leaseCharges.find(sc => sc.accountCode === '4000');
      const otherCharges = leaseCharges.filter(sc => sc.accountCode !== '4000');

      return {
        leaseId: l.id,
        tenantName: l.tenantName,
        propertyName: l.propertyName,
        unitName: l.unitName,
        monthlyRent: monthlyRent ? Number(monthlyRent.amount) : 0,
        otherCharges: otherCharges.map(oc => ({
          description: oc.description,
          amount: Number(oc.amount)
        })),
        totalMonthly: leaseCharges.reduce((sum, sc) => sum + Number(sc.amount), 0)
      };
    });

    // ==================== WORK ORDERS SUMMARY ====================
    const openWorkOrders = workOrders.filter(wo => wo.status === 'OPEN' || wo.status === 'PENDING');
    const inProgressWorkOrders = workOrders.filter(wo => wo.status === 'IN_PROGRESS');
    const completedWorkOrders = workOrders.filter(wo => wo.status === 'COMPLETED');

    const totalEstimatedCosts = workOrders.reduce((sum, wo) => sum + Number(wo.estimatedCost || 0), 0);
    const totalActualCosts = workOrders.reduce((sum, wo) => sum + Number(wo.actualCost || 0), 0);

    // Work orders by category
    const workOrdersByCategory: { [cat: string]: number } = {};
    for (const wo of workOrders) {
      const cat = wo.category || 'OTHER';
      workOrdersByCategory[cat] = (workOrdersByCategory[cat] || 0) + 1;
    }

    // Work orders by priority
    const highPriorityOpen = openWorkOrders.filter(wo => wo.priority === 'HIGH' || wo.priority === 'URGENT').length;

    const workOrdersSummary = {
      total: workOrders.length,
      open: openWorkOrders.length,
      inProgress: inProgressWorkOrders.length,
      completed: completedWorkOrders.length,
      highPriorityOpen,
      totalEstimatedCosts,
      totalActualCosts,
      byCategory: workOrdersByCategory,
      openWorkOrders: openWorkOrders.slice(0, 10).map(wo => ({
        id: wo.id,
        status: wo.status,
        priority: wo.priority,
        category: wo.category,
        estimatedCost: wo.estimatedCost,
        createdAt: wo.createdAt
      }))
    };

    // ==================== VENDORS SUMMARY ====================
    const vendorsSummary = {
      total: vendors.length,
      list: vendors.map(v => ({
        id: v.id,
        name: v.name,
        specialties: v.specialties,
        email: v.email,
        phone: v.phone,
        workOrderCount: workOrders.filter(wo => wo.vendorId === v.id).length
      }))
    };

    // ==================== MOVE-OUT / DEPOSITS ====================
    const pendingMoveOuts = moveOutInspections.filter(m => m.status !== 'COMPLETED');
    const completedMoveOuts = moveOutInspections.filter(m => m.status === 'COMPLETED');

    const totalDepositsToReturn = pendingMoveOuts.reduce((sum, m) => sum + Number(m.amountToReturn), 0);
    const totalDeductionsProcessed = completedMoveOuts.reduce((sum, m) => sum + Number(m.totalDeductions), 0);

    const moveOutSummary = {
      pendingInspections: pendingMoveOuts.length,
      completedInspections: completedMoveOuts.length,
      totalDepositsToReturn,
      totalDeductionsProcessed,
      securityDepositsHeld,
      pendingList: pendingMoveOuts.map(m => {
        const lease = leases.find(l => l.id === m.leaseId);
        return {
          inspectionId: m.id,
          leaseId: m.leaseId,
          tenantName: lease?.tenantName || 'Unknown',
          status: m.status,
          depositHeld: Number(m.depositHeld),
          totalDeductions: Number(m.totalDeductions),
          amountToReturn: Number(m.amountToReturn)
        };
      })
    };

    // ==================== RECENT ACTIVITY ====================
    const recentActivity = {
      payments: recentPayments.map(p => {
        const lease = leases.find(l => l.id === p.leaseId);
        return {
          id: p.id,
          date: p.entryDate,
          amount: Number(p.amount),
          description: p.description,
          tenantName: lease?.tenantName || 'Unknown'
        };
      }),
      charges: recentCharges.map(c => {
        const lease = leases.find(l => l.id === c.leaseId);
        return {
          id: c.id,
          date: c.entryDate,
          amount: Number(c.amount),
          description: c.description,
          tenantName: lease?.tenantName || 'Unknown'
        };
      }),
      emailsSent: emailLogs.length,
      emailsByType: emailLogs.reduce((acc, e) => {
        acc[e.templateType] = (acc[e.templateType] || 0) + 1;
        return acc;
      }, {} as { [type: string]: number })
    };

    // ==================== DOCUMENTS SUMMARY ====================
    const documentsSummary = {
      totalDocuments: documents
    };

    // ==================== ASSEMBLE FULL REPORT ====================
    const report = {
      generatedAt: new Date().toISOString(),

      // Portfolio Overview
      portfolioOverview: {
        totalProperties,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        overallOccupancyRate: parseFloat(overallOccupancyRate),
        totalActiveLeases: activeLeases.length,
        totalTenants: activeLeases.length,
        monthlyRentRoll,
        annualRentRoll
      },

      // Properties
      properties: propertiesSummary,

      // Leases
      leases: leasesSummary,

      // Tenants
      tenants: tenantsList,

      // Financial
      financial: financialSummary,

      // Rent Roll
      rentRoll,

      // Work Orders
      workOrders: workOrdersSummary,

      // Vendors
      vendors: vendorsSummary,

      // Move-Out / Deposits
      moveOut: moveOutSummary,

      // Documents
      documents: documentsSummary,

      // Recent Activity
      recentActivity
    };

    return NextResponse.json(report);

  } catch (error: any) {
    console.error('GET /api/reports/portfolio-overview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate portfolio overview' },
      { status: 500 }
    );
  }
}
