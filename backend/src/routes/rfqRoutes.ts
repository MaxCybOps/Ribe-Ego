import { Router } from 'express';
import { RfqService } from '../services/rfqService.js';
import { prisma } from '../utils/prisma.js';

export const rfqRouter = Router();

// Post a new RFQ request
rfqRouter.post('/', async (req, res) => {
  try {
    const rfq = await RfqService.createRfq(req.body);
    res.status(201).json({ success: true, data: rfq });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List all open RFQs (for seller RFQ inbox)
rfqRouter.get('/inbox', async (req, res) => {
  try {
    const rfqs = await prisma.request.findMany({
      where: { status: 'OPEN' },
      include: {
        buyer: { select: { id: true, name: true } },
        offers: {
          include: {
            seller: { select: { id: true, businessName: true } },
            location: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: rfqs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List buyer's RFQ requests
rfqRouter.get('/buyer/:buyerId', async (req, res) => {
  try {
    const rfqs = await prisma.request.findMany({
      where: { buyerId: req.params.buyerId },
      include: {
        offers: {
          include: {
            seller: { select: { id: true, businessName: true } },
            location: { select: { id: true, name: true, city: true, address: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: rfqs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get side-by-side unranked offers for an RFQ
rfqRouter.get('/:id/offers', async (req, res) => {
  try {
    const result = await RfqService.getRfqOffers(req.params.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Submit a competing offer from a seller location
rfqRouter.post('/offers', async (req, res) => {
  try {
    const offer = await RfqService.submitOffer(req.body);
    res.status(201).json({ success: true, data: offer });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Accept a winning offer
rfqRouter.post('/offers/:offerId/accept', async (req, res) => {
  try {
    const { buyerId } = req.body;
    const result = await RfqService.acceptOffer(req.params.offerId, buyerId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
