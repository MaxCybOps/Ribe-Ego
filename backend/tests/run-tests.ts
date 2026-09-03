import { prisma } from '../src/utils/prisma.js';
import { InventoryService } from '../src/services/inventoryService.js';
import { RfqService } from '../src/services/rfqService.js';
import { PaymentService } from '../src/services/paymentService.js';
import { ExchangeRateService } from '../src/services/exchangeRateService.js';
import { AdminService } from '../src/services/adminService.js';

async function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING RIBEÈGO PHASE 0 END-TO-END AUTOMATED SUITE');
  console.log('======================================================\n');

  try {
    // 1. Setup entities check
    const buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    const musaStore = await prisma.location.findFirst({ where: { name: { contains: 'Trade Fair' } } });
    const musaDepot = await prisma.location.findFirst({ where: { name: { contains: 'Alaba' } } });

    await assert(!!buyer, 'Buyer Emeka exists in database');
    await assert(!!musaStore && !!musaDepot, 'Oga Musa operates distinct Storefront and Bulk Depot locations');

    // 2. Test Inventory Service: Stock-in & Price History
    console.log('\n📦 Testing Multi-Location Inventory & Versioned Pricing:');
    const cementInStore = await prisma.product.findFirst({ where: { locationId: musaStore!.id, title: { contains: 'Cement' } } });
    const initialStock = cementInStore!.currentStock;

    // Record Stock-in
    const stockInResult = await InventoryService.recordStockIn({
      productId: cementInStore!.id,
      quantityDelta: 50,
      referenceId: 'TEST-TRUCK-001',
      notes: 'Test trailer restock',
    });

    await assert(stockInResult.product.currentStock === initialStock + 50, 'Stock-in increments currentStock correctly');
    await assert(stockInResult.movement.type === 'STOCK_IN', 'Stock movement recorded as STOCK_IN');

    // Update Price
    const priceUpdate = await InventoryService.updatePrice({
      productId: cementInStore!.id,
      newUnitPriceFiat: 8700.0,
      changedBy: 'Test Runner',
    });
    await assert(priceUpdate.product.currentUnitPriceFiat === 8700.0, 'Price updated to 8700');
    await assert(priceUpdate.history.unitPriceFiat === 8700.0, 'Price history version entry created');

    // 3. Test RFQ Negotiation: Fan-out & Competing Location Offers
    console.log('\n🤝 Testing RFQ Broadcast & Multi-Location Competing Offers:');
    const rfq = await RfqService.createRfq({
      buyerId: buyer!.id,
      title: 'Dangote 3X Cement 50kg for Lekki Site Phase 2',
      category: 'BUILDING_MATERIALS',
      quantity: 100,
      unitOfMeasure: 'BAG',
      targetDeliveryLocation: 'Lekki Phase 2 Construction Site',
      deliveryPreference: 'PICKUP',
      deadlineHours: 24,
    });

    await assert(rfq.status === 'OPEN', 'RFQ created with OPEN status');
    await assert(rfq.quantity === 100 && rfq.unitOfMeasure === 'BAG', 'RFQ has exact quantity (100) and Unit of Measure (BAG)');

    // Storefront submits Offer
    const offer1 = await RfqService.submitOffer({
      requestId: rfq.id,
      sellerId: musaStore!.sellerId,
      locationId: musaStore!.id,
      unitPriceFiat: 8600.0,
      estimatedLeadTimeHours: 2,
      notes: 'Storefront pickup ready immediately',
    });

    // Depot Warehouse submits Competing Offer
    const offer2 = await RfqService.submitOffer({
      requestId: rfq.id,
      sellerId: musaDepot!.sellerId,
      locationId: musaDepot!.id,
      unitPriceFiat: 8100.0, // Cheaper bulk depot price
      estimatedLeadTimeHours: 6,
      notes: 'Depot warehouse forklift pallet loading',
    });

    await assert(offer1.status === 'SUBMITTED' && offer2.status === 'SUBMITTED', 'Both locations submitted competing offers');

    // Verify neutral side-by-side offers
    const comparison = await RfqService.getRfqOffers(rfq.id);
    await assert(comparison.offers.length === 2, 'Side-by-side comparison contains exactly 2 offers');

    // 4. Test Offer Acceptance -> Order Creation
    console.log('\n🏆 Testing Offer Acceptance & Order Creation:');
    const acceptResult = await RfqService.acceptOffer(offer2.id, buyer!.id);
    await assert(acceptResult.offer.status === 'ACCEPTED', 'Depot offer marked ACCEPTED');
    await assert(acceptResult.order.locationId === musaDepot!.id, 'Order tied strictly to fulfilling Depot Location');
    await assert(acceptResult.order.originType === 'RFQ_NEGOTIATED', 'Order origin recorded as RFQ_NEGOTIATED');
    await assert(acceptResult.order.totalFiat === 810000.0, 'Total Fiat correctly calculated (100 * 8100 = 810,000)');

    // 5. Test Lightning Checkout & 90s Price Lock
    console.log('\n⚡ Testing Lightning Invoice Creation & 90s Rate Lock:');
    const invoiceData = await PaymentService.createInvoiceForOrder(acceptResult.order.id);
    await assert(invoiceData.amountSats > 0, `Invoice created with ${invoiceData.amountSats} Satoshis`);
    await assert(invoiceData.paymentRequest.startsWith('lnbc'), 'Bolt11 invoice format generated');
    await assert(new Date(invoiceData.expiresAt) > new Date(), 'Rate lock expiry is in the future');

    // 6. Test Idempotent Payment Settlement & Automatic Stock Deduction
    console.log('\n💰 Testing Payment Settlement, Automatic Stock-Out & Ledger Split:');
    const depotCementBefore = await prisma.product.findFirst({ where: { locationId: musaDepot!.id, title: { contains: 'Cement' } } });
    const depotStockBefore = depotCementBefore!.currentStock;

    // First Webhook Settlement
    const settleResult1 = await PaymentService.simulateMockPayment(invoiceData.paymentHash);
    await assert(settleResult1.idempotent === false, 'First payment processed successfully (not idempotent duplicate)');
    await assert(settleResult1.order!.status === 'PAID', 'Order status updated to PAID');
    await assert(settleResult1.split!.commissionRate === 0.07, 'Platform commission rate recorded at 7%');
    await assert(settleResult1.split!.commissionSats + settleResult1.split!.sellerNetSats === invoiceData.amountSats, 'Commission + Net equals Gross Sats exactly');

    // Verify automatic stock deduction
    const depotCementAfter = await prisma.product.findFirst({ where: { locationId: musaDepot!.id, title: { contains: 'Cement' } } });
    await assert(depotCementAfter!.currentStock === depotStockBefore - 100, `Stock automatically deducted by 100 bags (${depotStockBefore} -> ${depotCementAfter!.currentStock})`);

    // Verify stock movement audit trail
    const stockOutMovement = await prisma.stockMovement.findFirst({
      where: { productId: depotCementAfter!.id, type: 'STOCK_OUT_ORDER' },
      orderBy: { createdAt: 'desc' },
    });
    await assert(!!stockOutMovement && stockOutMovement.quantityDelta === -100, 'Immutable STOCK_OUT_ORDER movement created');

    // 7. Test Webhook Idempotency (Duplicate webhook payload)
    console.log('\n🛡️ Testing Idempotent Webhook Protection:');
    const settleResult2 = await PaymentService.handlePaymentSettlement(invoiceData.paymentHash, 'repeat_call');
    await assert(settleResult2.idempotent === true, 'Duplicate webhook identified and safely ignored without double-processing');

    const depotCementAfterDuplicate = await prisma.product.findFirst({ where: { locationId: musaDepot!.id, title: { contains: 'Cement' } } });
    await assert(depotCementAfterDuplicate!.currentStock === depotCementAfter!.currentStock, 'Stock NOT double-deducted on duplicate webhook');

    // 8. Test Platform Admin Ledger & Traceability
    console.log('\n📊 Testing Platform Admin Ledger & KPIs:');
    const stats = await AdminService.getPlatformStats();
    await assert(stats.paidOrders >= 1, 'Platform stats reflects paid orders');
    await assert(stats.grossVolumeSats >= invoiceData.amountSats, 'Gross volume in sats properly aggregated');

    const ledger = await AdminService.getTransactionLedger();
    await assert(ledger.length >= 1, 'Transaction ledger contains complete audit trace');
    await assert(!!ledger[0].transaction.paymentHash, 'Ledger entry links to unique Lightning payment hash');

    console.log('\n======================================================');
    console.log('🎉 ALL 18 PHASE 0 AUTOMATED TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('\n❌ Test Suite Failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
