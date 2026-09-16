import { Router } from 'express';
import { prisma } from '../utils/prisma.js';

export const sellerRouter = Router();

// Register a new seller (Self-serve)
sellerRouter.post('/register', async (req, res) => {
  try {
    const { businessName, contactEmail, contactPhone, initialLocation } = req.body;
    
    // Create seller and their first location in a transaction
    const seller = await prisma.$transaction(async (tx) => {
      const newSeller = await tx.seller.create({
        data: {
          businessName,
          contactEmail,
          contactPhone,
          verificationStatus: 'PENDING',
        }
      });
      
      if (initialLocation) {
        await tx.location.create({
          data: {
            sellerId: newSeller.id,
            name: initialLocation.name,
            type: initialLocation.type || 'STORE',
            address: initialLocation.address,
            city: initialLocation.city,
            contactPhone: initialLocation.contactPhone || contactPhone,
            isVerified: false,
          }
        });
      }
      
      return newSeller;
    });

    res.status(201).json({ success: true, data: seller });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Add a new location to an existing seller
sellerRouter.post('/:id/locations', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, address, city, contactPhone, latitude, longitude, operatingHours } = req.body;

    const seller = await prisma.seller.findUnique({ where: { id } });
    if (!seller) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    const newLocation = await prisma.location.create({
      data: {
        sellerId: id,
        name,
        type: type || 'STORE',
        address,
        city,
        contactPhone,
        latitude,
        longitude,
        operatingHours,
        isVerified: false,
      }
    });

    res.status(201).json({ success: true, data: newLocation });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
