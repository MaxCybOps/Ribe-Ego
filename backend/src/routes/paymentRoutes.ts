import { Router } from 'express';
import { PaymentService } from '../services/paymentService.js';
import { prisma } from '../utils/prisma.js';

export const paymentRouter = Router();

// Generate Lightning invoice for an order
paymentRouter.post('/create-invoice', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId is required' });

    const invoiceData = await PaymentService.createInvoiceForOrder(orderId);
    res.json({ success: true, data: invoiceData });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Check transaction / invoice status
paymentRouter.get('/status/:paymentHash', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { paymentHash: req.params.paymentHash },
      include: { order: true },
    });

    if (!transaction) return res.status(404).json({ success: false, error: 'Transaction not found' });
    res.json({ success: true, data: transaction });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook endpoint for Lightning provider (idempotent settlement)
paymentRouter.post('/webhook', async (req, res) => {
  try {
    const { paymentHash, preimage } = req.body;
    if (!paymentHash) return res.status(400).json({ success: false, error: 'paymentHash is required' });

    const result = await PaymentService.handlePaymentSettlement(paymentHash, preimage);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Mock simulation endpoint for testing / UI demo
paymentRouter.post('/simulate-settlement', async (req, res) => {
  try {
    const { paymentHash } = req.body;
    if (!paymentHash) return res.status(400).json({ success: false, error: 'paymentHash is required' });

    const result = await PaymentService.simulateMockPayment(paymentHash);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
