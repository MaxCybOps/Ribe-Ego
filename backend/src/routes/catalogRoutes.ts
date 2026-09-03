import { Router } from 'express';
import { prisma } from '../utils/prisma.js';

export const catalogRouter = Router();

// Browse fixed-price catalog items filterable by category, location, and search query
catalogRouter.get('/products', async (req, res) => {
  try {
    const { category, locationId, search } = req.query;

    const where: any = { isActive: true };
    if (category) where.category = category as string;
    if (locationId) where.locationId = locationId as string;
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        location: {
          include: {
            seller: {
              select: { id: true, businessName: true, verificationStatus: true },
            },
          },
        },
        priceHistory: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List all verified locations & sellers directory
catalogRouter.get('/locations', async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      where: { isVerified: true },
      include: {
        seller: {
          select: { id: true, businessName: true, verificationStatus: true },
        },
        _count: { select: { products: true } },
      },
    });
    res.json({ success: true, data: locations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
