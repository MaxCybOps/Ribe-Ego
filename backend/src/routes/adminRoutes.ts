import { Router } from 'express';
import { AdminService } from '../services/adminService.js';
import { prisma } from '../utils/prisma.js';

export const adminRouter = Router();

// Get platform KPIs & revenue metrics
adminRouter.get('/stats', async (req, res) => {
  try {
    const stats = await AdminService.getPlatformStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get RFQ Health metrics
adminRouter.get('/kpi/rfq-health', async (req, res) => {
  try {
    const health = await AdminService.getRfqHealth();
    res.json({ success: true, data: health });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get platform financial transaction ledger (end-to-end trace)
adminRouter.get('/ledger', async (req, res) => {
  try {
    const ledger = await AdminService.getTransactionLedger();
    res.json({ success: true, data: ledger });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List all sellers & locations for admin verification
adminRouter.get('/sellers', async (req, res) => {
  try {
    const sellers = await prisma.seller.findMany({
      include: {
        locations: { include: { _count: { select: { products: true, orders: true } } } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: sellers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify seller
adminRouter.patch('/sellers/:id/verify', async (req, res) => {
  try {
    const { status, commissionRate, notes } = req.body;
    const seller = await AdminService.updateSellerVerification(req.params.id, status, commissionRate, notes);
    res.json({ success: true, data: seller });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Verify location
adminRouter.patch('/locations/:id/verify', async (req, res) => {
  try {
    const { isVerified } = req.body;
    const location = await AdminService.updateLocationVerification(req.params.id, isVerified);
    res.json({ success: true, data: location });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update seller payout configuration (Bitcoin on-chain / Lightning address / Fiat off-ramp)
adminRouter.patch('/sellers/:id/payout-config', async (req, res) => {
  try {
    const { payoutMethod, payoutDestination } = req.body;
    const seller = await prisma.seller.update({
      where: { id: req.params.id },
      data: { payoutMethod, payoutDestination },
    });
    res.json({ success: true, data: seller });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
