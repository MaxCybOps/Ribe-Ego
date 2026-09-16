import { prisma } from '../utils/prisma.js';

export interface CreateProductInput {
  locationId: string;
  title: string;
  category: string;
  description?: string;
  unitOfMeasure: 'PIECE' | 'BAG' | 'LENGTH' | 'ROLL' | 'CARTON' | 'SQM';
  initialUnitPriceFiat: number;
  initialStock?: number;
  recordedBy?: string;
}

export interface RecordStockInInput {
  productId: string;
  quantityDelta: number;
  referenceId?: string;
  notes?: string;
  recordedBy?: string;
}

export interface UpdatePriceInput {
  productId: string;
  newUnitPriceFiat: number;
  changedBy?: string;
}

export class InventoryService {
  /**
   * Create a new product for a specific location with initial stock & price history
   */
  static async createProduct(input: CreateProductInput) {
    const {
      locationId,
      title,
      category,
      description,
      unitOfMeasure,
      initialUnitPriceFiat,
      initialStock = 0,
      recordedBy,
    } = input;

    // Verify location exists
    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) throw new Error('Location not found');

    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          locationId,
          title,
          category,
          description,
          unitOfMeasure,
          currentUnitPriceFiat: initialUnitPriceFiat,
          currentStock: initialStock,
          isActive: true,
        },
      });

      // 1. Initial price history record
      await tx.priceHistory.create({
        data: {
          productId: product.id,
          unitPriceFiat: initialUnitPriceFiat,
          changedBy: recordedBy || 'System Init',
        },
      });

      // 2. Initial stock movement record if initial stock > 0
      if (initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            locationId,
            type: 'STOCK_IN',
            quantityDelta: initialStock,
            balanceAfter: initialStock,
            referenceId: 'INITIAL_STOCK_RECORD',
            notes: 'Initial stock on product creation',
          },
        });
      }

      return product;
    });
  }

  /**
   * Record a Stock-In event for a product at a specific location
   */
  static async recordStockIn(input: RecordStockInInput) {
    const { productId, quantityDelta, referenceId, notes } = input;
    if (quantityDelta <= 0) {
      throw new Error('Stock-in quantity must be greater than zero');
    }

    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { location: true },
      });
      if (!product) throw new Error('Product not found');

      const newBalance = product.currentStock + quantityDelta;

      // Update current stock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newBalance },
      });

      // Create immutable stock movement record
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          locationId: product.locationId,
          type: 'STOCK_IN',
          quantityDelta,
          balanceAfter: newBalance,
          referenceId: referenceId || 'STOCK_IN_BATCH',
          notes: notes || 'Manual stock-in entry',
        },
      });

      return { product: updatedProduct, movement };
    });
  }

  /**
   * Version and update product price
   */
  static async updatePrice(input: UpdatePriceInput) {
    const { productId, newUnitPriceFiat, changedBy } = input;
    if (newUnitPriceFiat <= 0) {
      throw new Error('Price must be greater than zero');
    }

    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found');

      // Update current product price
      const updated = await tx.product.update({
        where: { id: productId },
        data: { currentUnitPriceFiat: newUnitPriceFiat },
      });

      // Add immutable price history entry
      const history = await tx.priceHistory.create({
        data: {
          productId,
          unitPriceFiat: newUnitPriceFiat,
          changedBy: changedBy || 'Admin/Seller',
        },
      });

      return { product: updated, history };
    });
  }

  /**
   * Deduct stock automatically upon confirmed order payment
   */
  static async processAutomaticStockOut(orderId: string, txContext?: any) {
    const db = txContext || prisma;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true, location: true },
    });

    if (!order) throw new Error('Order not found for stock-out');

    for (const item of order.items) {
      let product = null;
      if (item.productId) {
        product = await db.product.findUnique({ where: { id: item.productId } });
      } else {
        product = await db.product.findFirst({
          where: {
            locationId: order.locationId,
            OR: [
              { title: { contains: item.itemTitle.split(' ')[0] } },
              { title: item.itemTitle },
            ],
          },
        });
      }

      if (product) {
        const newStock = Math.max(0, product.currentStock - item.quantity);

        await db.product.update({
          where: { id: product.id },
          data: { currentStock: newStock },
        });

        await db.stockMovement.create({
          data: {
            productId: product.id,
            locationId: order.locationId,
            type: 'STOCK_OUT_ORDER',
            quantityDelta: -item.quantity,
            balanceAfter: newStock,
            referenceId: order.orderNumber,
            notes: `Automatic stock deduction for order ${order.orderNumber}`,
          },
        });
      }
    }
  }

  /**
   * List inventory for a specific location
   */
  static async getLocationInventory(locationId: string) {
    return await prisma.product.findMany({
      where: { locationId, isActive: true },
      include: {
        priceHistory: { orderBy: { effectiveFrom: 'desc' }, take: 5 },
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
  }

  /**
   * Bulk CSV import for a specific location
   * Format: title,category,description,unitOfMeasure,unitPriceFiat,initialStock
   */
  static async importCsv(locationId: string, csvContent: string, recordedBy: string = 'CSV Import') {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must contain a header and at least one data row');

    const createdProducts = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [title, category, description, unitOfMeasure, unitPriceFiatStr, initialStockStr] = line.split(',');
      if (!title || !category || !unitPriceFiatStr) continue;

      const product = await this.createProduct({
        locationId,
        title: title.trim(),
        category: category.trim(),
        description: description?.trim() || '',
        unitOfMeasure: (unitOfMeasure?.trim().toUpperCase() as any) || 'PIECE',
        initialUnitPriceFiat: parseFloat(unitPriceFiatStr.trim()),
        initialStock: parseInt(initialStockStr?.trim() || '0', 10),
        recordedBy,
      });
      createdProducts.push(product);
    }
    return createdProducts;
  }

  /**
   * Get all stock movements (ledger) for a specific location
   */
  static async getLocationStockLedger(locationId: string) {
    return await prisma.stockMovement.findMany({
      where: { locationId },
      include: {
        product: { select: { id: true, title: true, unitOfMeasure: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
