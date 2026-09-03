import { Router } from 'express';
import { InventoryService } from '../services/inventoryService.js';

export const inventoryRouter = Router();

// Create product at a location
inventoryRouter.post('/products', async (req, res) => {
  try {
    const product = await InventoryService.createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Record timestamped stock-in event
inventoryRouter.post('/stock-in', async (req, res) => {
  try {
    const result = await InventoryService.recordStockIn(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update & version price
inventoryRouter.post('/price-update', async (req, res) => {
  try {
    const result = await InventoryService.updatePrice(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get location inventory
inventoryRouter.get('/location/:locationId', async (req, res) => {
  try {
    const products = await InventoryService.getLocationInventory(req.params.locationId);
    res.json({ success: true, data: products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get location stock ledger movements
inventoryRouter.get('/location/:locationId/ledger', async (req, res) => {
  try {
    const movements = await InventoryService.getLocationStockLedger(req.params.locationId);
    res.json({ success: true, data: movements });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
