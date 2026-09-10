import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { wsManager } from '../utils/wsManager.js';

export const orderRouter = Router();

// Create direct catalog purchase order
orderRouter.post('/direct', async (req, res) => {
  try {
    const { buyerId, locationId, items, fulfillmentType, deliveryAddress } = req.body;

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: { seller: true },
    });
    if (!location) return res.status(404).json({ success: false, error: 'Location not found' });

    let totalFiat = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Product ${item.productId} not found`);

      const itemTotal = parseFloat((product.currentUnitPriceFiat * item.quantity).toFixed(2));
      totalFiat += itemTotal;

      orderItemsData.push({
        productId: product.id,
        itemTitle: product.title,
        unitOfMeasure: product.unitOfMeasure,
        quantity: item.quantity,
        unitPriceFiat: product.currentUnitPriceFiat,
        totalPriceFiat: itemTotal,
      });
    }

    const count = await prisma.order.count();
    const orderNumber = `RIB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        originType: 'DIRECT_CATALOG',
        buyerId,
        sellerId: location.sellerId,
        locationId,
        fulfillmentType: fulfillmentType || 'PICKUP',
        deliveryAddress,
        totalFiat,
        totalSats: 0,
        exchangeRate: 0,
        status: 'PENDING_PAYMENT',
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
        seller: true,
        location: true,
      },
    });

    res.status(201).json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get order details & digital receipt
orderRouter.get('/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        buyer: { select: { id: true, name: true, email: true, phoneNumber: true } },
        seller: true,
        location: true,
        items: true,
        transaction: true,
        commissionSplit: true,
      },
    });

    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update order fulfillment status (Preparing -> Ready -> Completed)
orderRouter.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { seller: true, location: true },
    });

    wsManager.broadcast({
      type: 'ORDER_STATUS_CHANGED',
      payload: order,
      targetBuyerId: order.buyerId,
      targetLocationId: order.locationId,
    });

    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Verify 6-digit pickup release PIN at warehouse
orderRouter.post('/:id/verify-pickup', async (req, res) => {
  try {
    const { pickupPin, verifiedBy } = req.body;
    if (!pickupPin) return res.status(400).json({ success: false, error: 'Pickup PIN is required' });

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { seller: true, location: true },
    });

    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (!order.pickupPin) return res.status(400).json({ success: false, error: 'No pickup PIN issued for this order' });

    if (order.pickupPin.trim() !== pickupPin.toString().trim()) {
      return res.status(400).json({ success: false, error: 'Invalid Pickup PIN' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'COMPLETED',
        pickupVerifiedAt: new Date(),
        pickupVerifiedBy: verifiedBy || 'Warehouse Staff',
      },
      include: { seller: true, location: true },
    });

    wsManager.broadcast({
      type: 'ORDER_STATUS_CHANGED',
      payload: updatedOrder,
      targetBuyerId: updatedOrder.buyerId,
      targetLocationId: updatedOrder.locationId,
    });

    res.json({ success: true, message: 'Pickup PIN verified. Goods released.', data: updatedOrder });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List orders for a specific seller location
orderRouter.get('/location/:locationId', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { locationId: req.params.locationId },
      include: {
        buyer: { select: { id: true, name: true } },
        items: true,
        transaction: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List orders for a buyer
orderRouter.get('/buyer/:buyerId', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { buyerId: req.params.buyerId },
      include: {
        seller: true,
        location: true,
        items: true,
        transaction: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
