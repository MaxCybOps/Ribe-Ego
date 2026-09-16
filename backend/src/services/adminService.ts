import { prisma } from '../utils/prisma.js';

export class AdminService {
  /**
   * Verify or update seller status and commission rate
   */
  static async updateSellerVerification(sellerId: string, status: 'VERIFIED' | 'REJECTED' | 'SUSPENDED', commissionRate?: number, notes?: string) {
    return await prisma.seller.update({
      where: { id: sellerId },
      data: {
        verificationStatus: status,
        verificationNotes: notes,
        ...(commissionRate !== undefined ? { commissionRate } : {}),
      },
    });
  }

  /**
   * Verify individual location (e.g. physical store or depot warehouse)
   */
  static async updateLocationVerification(locationId: string, isVerified: boolean) {
    return await prisma.location.update({
      where: { id: locationId },
      data: { isVerified },
    });
  }

  /**
   * Get platform transaction ledger with end-to-end traceability
   */
  static async getTransactionLedger() {
    return await prisma.commissionSplit.findMany({
      include: {
        transaction: true,
        order: {
          include: {
            buyer: { select: { id: true, name: true, email: true } },
            seller: { select: { id: true, businessName: true } },
            location: { select: { id: true, name: true, city: true } },
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get platform-wide KPIs
   */
  static async getPlatformStats() {
    const totalOrders = await prisma.order.count({ where: { status: { not: 'CANCELLED' } } });
    const paidOrders = await prisma.order.count({ where: { status: { in: ['PAID', 'PREPARING', 'READY', 'COMPLETED'] } } });
    const totalRfqs = await prisma.request.count();
    const awardedRfqs = await prisma.request.count({ where: { status: 'AWARDED' } });
    const totalSellers = await prisma.seller.count();
    const totalLocations = await prisma.location.count();

    const revenueResult = await prisma.commissionSplit.aggregate({
      _sum: {
        grossSats: true,
        commissionSats: true,
        sellerNetSats: true,
      },
    });

    return {
      totalOrders,
      paidOrders,
      totalRfqs,
      awardedRfqs,
      rfqMatchRate: totalRfqs > 0 ? ((awardedRfqs / totalRfqs) * 100).toFixed(1) + '%' : '0%',
      totalSellers,
      totalLocations,
      grossVolumeSats: revenueResult._sum.grossSats || 0,
      totalCommissionSats: revenueResult._sum.commissionSats || 0,
      sellerNetPayoutSats: revenueResult._sum.sellerNetSats || 0,
    };
  }

  /**
   * Record a payout to a seller
   */
  static async issuePayout(sellerId: string, amountSats: number, method: string, destination: string) {
    return await prisma.payout.create({
      data: {
        sellerId,
        amountSats,
        method,
        destination,
        status: 'COMPLETED',
        txHash: 'tx_payout_' + Date.now(),
      },
    });
  }
  /**
   * Get RFQ health metrics (average response rate, response time)
   */
  static async getRfqHealth() {
    const rfqs = await prisma.request.findMany({
      include: {
        offers: true,
      },
    });

    let totalOffers = 0;
    let rfqsWithOffers = 0;
    let sumTimeToFirstOfferMs = 0;

    for (const rfq of rfqs) {
      if (rfq.offers.length > 0) {
        rfqsWithOffers++;
        totalOffers += rfq.offers.length;
        
        // Calculate time to first offer
        const firstOffer = rfq.offers.reduce((earliest, current) => 
          current.createdAt < earliest.createdAt ? current : earliest
        );
        sumTimeToFirstOfferMs += (firstOffer.createdAt.getTime() - rfq.createdAt.getTime());
      }
    }

    const avgTimeToFirstOfferMs = rfqsWithOffers > 0 ? sumTimeToFirstOfferMs / rfqsWithOffers : 0;
    const avgOffersPerRfq = rfqs.length > 0 ? totalOffers / rfqs.length : 0;

    return {
      totalRfqs: rfqs.length,
      rfqsWithOffers,
      avgOffersPerRfq: avgOffersPerRfq.toFixed(2),
      avgTimeToFirstOfferMinutes: (avgTimeToFirstOfferMs / (1000 * 60)).toFixed(1),
    };
  }
}
