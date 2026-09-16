import { prisma } from '../utils/prisma.js';
import { wsManager } from '../utils/wsManager.js';

export interface CreateRfqInput {
  buyerId: string;
  title: string;
  category: string;
  quantity: number;
  unitOfMeasure: 'PIECE' | 'BAG' | 'LENGTH' | 'ROLL' | 'CARTON' | 'SQM';
  targetDeliveryLocation?: string;
  deliveryPreference: 'PICKUP' | 'SELLER_DELIVERY';
  deadlineHours?: number;
}

export interface SubmitOfferInput {
  requestId: string;
  sellerId: string;
  locationId: string;
  unitPriceFiat: number;
  estimatedLeadTimeHours: number;
  notes?: string;
  validHours?: number;
}

export class RfqService {
  /**
   * Buyer posts an RFQ request - fans out to eligible seller locations
   */
  static async createRfq(input: CreateRfqInput) {
    const {
      buyerId,
      title,
      category,
      quantity,
      unitOfMeasure,
      targetDeliveryLocation,
      deliveryPreference,
      deadlineHours = 48,
    } = input;

    if (quantity <= 0) throw new Error('Quantity must be greater than zero');

    const deadline = new Date(Date.now() + deadlineHours * 3600 * 1000);

    const rfq = await prisma.request.create({
      data: {
        buyerId,
        title,
        category,
        quantity,
        unitOfMeasure,
        targetDeliveryLocation,
        deliveryPreference,
        deadline,
        status: 'OPEN',
      },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
      },
    });

    // Real-time broadcast to all seller locations
    wsManager.broadcast({
      type: 'RFQ_BROADCAST',
      payload: rfq,
    });

    return rfq;
  }

  /**
   * Location responds with a competitive offer
   */
  static async submitOffer(input: SubmitOfferInput) {
    const {
      requestId,
      sellerId,
      locationId,
      unitPriceFiat,
      estimatedLeadTimeHours,
      notes,
      validHours = 48,
    } = input;

    const rfq = await prisma.request.findUnique({ where: { id: requestId } });
    if (!rfq) throw new Error('RFQ request not found');
    if (rfq.status !== 'OPEN') throw new Error('RFQ is no longer accepting offers');

    // Verify location belongs to seller and both are VERIFIED
    const location = await prisma.location.findFirst({
      where: { id: locationId, sellerId },
      include: { seller: true }
    });
    if (!location) throw new Error('Invalid location for this seller');
    if (!location.isVerified) throw new Error('Location is pending Admin verification');
    if (location.seller.verificationStatus !== 'VERIFIED') throw new Error('Seller business is pending Admin verification');

    const totalPriceFiat = parseFloat((unitPriceFiat * rfq.quantity).toFixed(2));
    const validUntil = new Date(Date.now() + validHours * 3600 * 1000);

    const offer = await prisma.offer.create({
      data: {
        requestId,
        sellerId,
        locationId,
        unitPriceFiat,
        totalPriceFiat,
        estimatedLeadTimeHours,
        notes,
        validUntil,
        status: 'SUBMITTED',
      },
      include: {
        seller: { select: { id: true, businessName: true } },
        location: { select: { id: true, name: true, type: true, address: true, city: true } },
      },
    });

    // Broadcast to the buyer who created the RFQ
    wsManager.broadcast({
      type: 'OFFER_SUBMITTED',
      payload: offer,
      targetBuyerId: rfq.buyerId,
    });

    return offer;
  }

  /**
   * Retrieve all offers for an RFQ side-by-side (unranked / honest neutral presentation)
   */
  static async getRfqOffers(requestId: string) {
    const rfq = await prisma.request.findUnique({
      where: { id: requestId },
      include: { buyer: { select: { id: true, name: true } } },
    });

    if (!rfq) throw new Error('RFQ not found');

    const offers = await prisma.offer.findMany({
      where: { requestId },
      include: {
        seller: {
          select: {
            id: true,
            businessName: true,
            verificationStatus: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            type: true,
            address: true,
            city: true,
            contactPhone: true,
            operatingHours: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' }, // Neutral chronological order, NO auto-ranking algorithm
    });

    return { rfq, offers };
  }

  /**
   * Buyer accepts an offer -> transitions RFQ to AWARDED and rejects other offers
   */
  static async acceptOffer(offerId: string, buyerId: string) {
    return await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id: offerId },
        include: { request: true, seller: true, location: true },
      });

      if (!offer) throw new Error('Offer not found');
      if (offer.request.buyerId !== buyerId) throw new Error('Unauthorized: Only the requesting buyer can accept this offer');
      if (offer.request.status !== 'OPEN') throw new Error('This RFQ is no longer open');

      // 1. Mark accepted offer
      const acceptedOffer = await tx.offer.update({
        where: { id: offerId },
        data: { status: 'ACCEPTED' },
      });

      // 2. Mark other offers on this RFQ as REJECTED
      await tx.offer.updateMany({
        where: {
          requestId: offer.requestId,
          id: { not: offerId },
        },
        data: { status: 'REJECTED' },
      });

      // 3. Mark RFQ as AWARDED
      await tx.request.update({
        where: { id: offer.requestId },
        data: { status: 'AWARDED' },
      });

      // 4. Create Order linked to winning offer and fulfilling location
      const count = await tx.order.count();
      const orderNumber = `RIB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      // Find matching product at this location if available
      const matchingProduct = await tx.product.findFirst({
        where: {
          locationId: offer.locationId,
          OR: [
            { title: { contains: offer.request.title.split(' ')[0] } },
            { category: offer.request.category },
          ],
        },
      });

      const order = await tx.order.create({
        data: {
          orderNumber,
          originType: 'RFQ_NEGOTIATED',
          originOfferId: offer.id,
          buyerId,
          sellerId: offer.sellerId,
          locationId: offer.locationId,
          fulfillmentType: offer.request.deliveryPreference,
          deliveryAddress: offer.request.targetDeliveryLocation,
          totalFiat: offer.totalPriceFiat,
          totalSats: 0, // Calculated during invoice creation with price lock
          exchangeRate: 0,
          status: 'PENDING_PAYMENT',
          items: {
            create: [
              {
                productId: matchingProduct?.id || null,
                itemTitle: offer.request.title,
                unitOfMeasure: offer.request.unitOfMeasure,
                quantity: offer.request.quantity,
                unitPriceFiat: offer.unitPriceFiat,
                totalPriceFiat: offer.totalPriceFiat,
              },
            ],
          },
        },
        include: {
          items: true,
          seller: true,
          location: true,
        },
      });

      // Notify seller & location
      wsManager.broadcast({
        type: 'OFFER_ACCEPTED',
        payload: { order, offer: acceptedOffer },
        targetLocationId: offer.locationId,
        targetSellerId: offer.sellerId,
      });

      return { offer: acceptedOffer, order };
    });
  }
}
