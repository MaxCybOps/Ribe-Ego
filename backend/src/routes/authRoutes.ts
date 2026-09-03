import { Router } from 'express';
import { prisma } from '../utils/prisma.js';

export const authRouter = Router();

// Simple auth / profile switcher for Phase 0 simulation
authRouter.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        seller: { include: { locations: true } },
        location: true,
      },
    });
    res.json({ success: true, data: users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.get('/current-user/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        seller: { include: { locations: true } },
        location: true,
      },
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
