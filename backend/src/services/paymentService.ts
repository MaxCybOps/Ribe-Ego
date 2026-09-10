import { prisma } from '../utils/prisma.js';
import { getLightningProvider } from '../lightning/index.js';
import { ExchangeRateService } from './exchangeRateService.js';
import { InventoryService } from './inventoryService.js';
import { wsManager } from '../utils/wsManager.js';

export class PaymentService {
  /**
   * Generate a Lightning invoice for an order with a 90-second price-lock window
   */
  static async createInvoiceForOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { seller: true, location: true, transaction: true },
    });

    if (!order) throw new Error('Order not found');
    if (order.status === 'PAID' || order.status === 'COMPLETED') {
      throw new Error('Order is already paid');
    }

    // Check if an existing unpaid transaction has a valid rate-lock
    if (order.transaction && order.transaction.status === 'UNPAID') {
      if (new Date(order.transaction.rateLockedUntil) > new Date()) {
        return {
          order,
          transaction: order.transaction,
          paymentRequest: order.transaction.paymentRequest,
          amountSats: order.transaction.amountSats,
          expiresAt: order.transaction.rateLockedUntil,
        };
      }
    }

    // Create fresh rate lock
    const rateLock = ExchangeRateService.createRateLock();
    const amountSats = ExchangeRateService.fiatToSats(order.totalFiat, rateLock.rate);

    // Call Lightning Provider via Abstraction Layer
    const provider = getLightningProvider();
    const invoice = await provider.createInvoice({
      amountSats,
      memo: `Ribeego Order ${order.orderNumber} (${order.location.name})`,
      expirySeconds: parseInt(process.env.PRICE_LOCK_SECONDS || '90', 10),
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    });

    // Update Order & upsert Transaction record
    const result = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          totalSats: amountSats,
          exchangeRate: rateLock.rate,
        },
      });

      // Upsert transaction
      const transaction = await tx.transaction.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          paymentHash: invoice.paymentHash,
          paymentRequest: invoice.paymentRequest,
          amountSats,
          amountFiat: order.totalFiat,
          rateLockedUntil: invoice.expiresAt,
          status: 'UNPAID',
        },
        update: {
          paymentHash: invoice.paymentHash,
          paymentRequest: invoice.paymentRequest,
          amountSats,
          amountFiat: order.totalFiat,
          rateLockedUntil: invoice.expiresAt,
          status: 'UNPAID',
        },
      });

      return { transaction, invoice };
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentHash: result.invoice.paymentHash,
      paymentRequest: result.invoice.paymentRequest,
      amountSats,
      amountFiat: order.totalFiat,
      exchangeRate: rateLock.rate,
      expiresAt: result.invoice.expiresAt,
    };
  }

  /**
   * Process payment confirmation idempotently (from webhook or simulated trigger)
   */
  static async handlePaymentSettlement(paymentHash: string, preimage?: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { paymentHash },
      include: { order: { include: { seller: true, location: true } } },
    });

    if (!transaction) throw new Error(`Transaction with payment hash ${paymentHash} not found`);

    // IDEMPOTENCY CHECK: If already settled, do not double-process
    if (transaction.status === 'SETTLED') {
      return {
        idempotent: true,
        message: 'Payment already processed and settled previously',
        transaction,
      };
    }

    return await prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Mark transaction as SETTLED
      const updatedTx = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SETTLED',
          settledAt: now,
          preimage: preimage || 'simulated_preimage_' + Date.now(),
        },
      });

      // 2. Mark order as PAID, generate 6-digit release PIN if pickup
      const pickupPin = transaction.order.fulfillmentType === 'PICKUP'
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : null;

      const updatedOrder = await tx.order.update({
        where: { id: transaction.orderId },
        data: {
          status: 'PAID',
          pickupPin,
        },
      });

      // 3. Calculate Platform Commission Split (5-10%, default per seller)
      const commissionRate = transaction.order.seller.commissionRate || 0.07;
      const commissionSats = Math.round(transaction.amountSats * commissionRate);
      const sellerNetSats = transaction.amountSats - commissionSats;

      // 4. Create Immutable CommissionSplit / Ledger Entry
      const split = await tx.commissionSplit.create({
        data: {
          transactionId: transaction.id,
          orderId: transaction.orderId,
          locationId: transaction.order.locationId,
          grossSats: transaction.amountSats,
          commissionRate,
          commissionSats,
          sellerNetSats,
          settlementStatus: 'HELD_IN_PLATFORM', // Platform receives funds first
        },
      });

      // 5. Automatic Stock-Out deduction for this order
      await InventoryService.processAutomaticStockOut(transaction.orderId, tx);

      // 6. Real-time Webhook / WebSocket Broadcast
      wsManager.broadcast({
        type: 'ORDER_PAID',
        payload: {
          order: updatedOrder,
          transaction: updatedTx,
          split,
        },
        targetLocationId: transaction.order.locationId,
        targetSellerId: transaction.order.sellerId,
        targetBuyerId: transaction.order.buyerId,
      });

      return {
        idempotent: false,
        message: 'Payment successfully settled, stock deducted, and ledger recorded',
        order: updatedOrder,
        transaction: updatedTx,
        split,
      };
    });
  }

  /**
   * For Phase 0 / testing: Simulate payment on a mock invoice
   */
  static async simulateMockPayment(paymentHash: string) {
    const provider = getLightningProvider();
    const status = await provider.simulatePaymentSettlement(paymentHash);
    return await this.handlePaymentSettlement(paymentHash, status.preimage);
  }
}
