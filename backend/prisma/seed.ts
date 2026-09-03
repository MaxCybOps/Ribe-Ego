import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Ribeègo database seed...');

  // Clean existing records
  await prisma.commissionSplit.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.request.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();
  await prisma.seller.deleteMany();

  // 1. Create Sellers
  const ogaMusa = await prisma.seller.create({
    data: {
      businessName: "Oga Musa's Building Materials & Hardware Enterprises",
      contactEmail: "musa@ogamusahardware.com",
      contactPhone: "+2348031234567",
      verificationStatus: "VERIFIED",
      verificationNotes: "Verified business registration and physical inventory inspected",
      commissionRate: 0.07, // 7% standard take-rate
      payoutMethod: "LIGHTNING_ADDRESS",
      payoutDestination: "ogamusa@voltage.ln",
    },
  });

  const chineduPlumbing = await prisma.seller.create({
    data: {
      businessName: "Chinedu Pipes & Sanitary Ware Depot",
      contactEmail: "chinedu@pipesdepot.ng",
      contactPhone: "+2348029876543",
      verificationStatus: "VERIFIED",
      verificationNotes: "Verified physical plumbing supply warehouse",
      commissionRate: 0.07,
      payoutMethod: "FIAT_OFFRAMP",
      payoutDestination: '{"bank":"Access Bank","account":"0123456789","accountName":"Chinedu Pipes Ltd"}',
    },
  });

  // 2. Create Multi-Location Structure for Oga Musa (Storefront + Bulk Warehouse)
  const musaStorefront = await prisma.location.create({
    data: {
      sellerId: ogaMusa.id,
      name: "Trade Fair Market Storefront",
      type: "STORE",
      address: "Shop B12, Building Materials Section, Trade Fair Complex",
      city: "Lagos",
      latitude: 6.4674,
      longitude: 3.2435,
      contactPhone: "+2348031234567",
      operatingHours: "Mon-Sat: 7:30 AM - 6:00 PM",
      isVerified: true,
    },
  });

  const musaWarehouse = await prisma.location.create({
    data: {
      sellerId: ogaMusa.id,
      name: "Alaba Bulk Depot Warehouse",
      type: "WAREHOUSE",
      address: "Plot 8, Industrial Layout, Alaba Expressway",
      city: "Lagos",
      latitude: 6.4521,
      longitude: 3.1982,
      contactPhone: "+2348039988776",
      operatingHours: "Mon-Sat: 7:00 AM - 5:00 PM",
      isVerified: true,
    },
  });

  const chineduStore = await prisma.location.create({
    data: {
      sellerId: chineduPlumbing.id,
      name: "Chinedu Main Depot - Mile 2",
      type: "WAREHOUSE",
      address: "24 Badagry Express Way, Mile 2",
      city: "Lagos",
      latitude: 6.4601,
      longitude: 3.3155,
      contactPhone: "+2348029876543",
      operatingHours: "Mon-Sat: 8:00 AM - 5:30 PM",
      isVerified: true,
    },
  });

  // 3. Create Users
  const emekaBuyer = await prisma.user.create({
    data: {
      email: "emeka.contractor@buildfast.ng",
      phoneNumber: "+2348055551122",
      name: "Emeka the Contractor",
      role: "BUYER",
    },
  });

  const musaAdminUser = await prisma.user.create({
    data: {
      email: "musa@ogamusahardware.com",
      phoneNumber: "+2348031234567",
      name: "Alhaji Musa (Owner)",
      role: "SELLER_ADMIN",
      sellerId: ogaMusa.id,
      locationId: musaStorefront.id,
    },
  });

  const maxwellAdmin = await prisma.user.create({
    data: {
      email: "maxwell@ribeego.com",
      phoneNumber: "+2348000000001",
      name: "Maxwell & Jovanny (Platform Lead)",
      role: "PLATFORM_ADMIN",
    },
  });

  // 4. Create Location-Specific Products with explicit Units of Measure, Stock-in, and Price History
  // Products for Storefront
  const cementStore = await prisma.product.create({
    data: {
      locationId: musaStorefront.id,
      title: "Dangote 3X 42.5R Portland Cement (50kg)",
      category: "BUILDING_MATERIALS",
      description: "Standard premium strength Portland limestone cement for structural concrete and block making.",
      unitOfMeasure: "BAG",
      currentUnitPriceFiat: 8500.0, // NGN / Fiat
      currentStock: 150,
      isActive: true,
    },
  });
  await prisma.priceHistory.create({
    data: { productId: cementStore.id, unitPriceFiat: 8500.0, changedBy: "Oga Musa" },
  });
  await prisma.stockMovement.create({
    data: {
      productId: cementStore.id,
      locationId: musaStorefront.id,
      type: "STOCK_IN",
      quantityDelta: 150,
      balanceAfter: 150,
      referenceId: "BATCH-CM-202608",
      notes: "Truck delivery from Dangote Ibeshe Plant",
    },
  });

  // Bulk Warehouse has larger stock & slightly lower wholesale price
  const cementWarehouse = await prisma.product.create({
    data: {
      locationId: musaWarehouse.id,
      title: "Dangote 3X 42.5R Portland Cement (50kg)",
      category: "BUILDING_MATERIALS",
      description: "Bulk depot trailer-load pallets of Dangote 3X cement.",
      unitOfMeasure: "BAG",
      currentUnitPriceFiat: 8200.0, // Cheaper bulk depot price
      currentStock: 1200,
      isActive: true,
    },
  });
  await prisma.priceHistory.create({
    data: { productId: cementWarehouse.id, unitPriceFiat: 8200.0, changedBy: "Oga Musa" },
  });
  await prisma.stockMovement.create({
    data: {
      productId: cementWarehouse.id,
      locationId: musaWarehouse.id,
      type: "STOCK_IN",
      quantityDelta: 1200,
      balanceAfter: 1200,
      referenceId: "DEPOT-PALLET-091",
      notes: "Direct factory trailer offload",
    },
  });

  // Electrical Wire (High-Risk category)
  const wireStore = await prisma.product.create({
    data: {
      locationId: musaStorefront.id,
      title: "Coleman 2.5mm Single Core Pure Copper Cable (100m)",
      category: "PLUMBING_ELECTRICAL",
      description: "Certified fire-retardant pure copper building wiring roll.",
      unitOfMeasure: "ROLL",
      currentUnitPriceFiat: 45000.0,
      currentStock: 60,
      isActive: true,
    },
  });
  await prisma.priceHistory.create({
    data: { productId: wireStore.id, unitPriceFiat: 45000.0, changedBy: "Oga Musa" },
  });
  await prisma.stockMovement.create({
    data: {
      productId: wireStore.id,
      locationId: musaStorefront.id,
      type: "STOCK_IN",
      quantityDelta: 60,
      balanceAfter: 60,
      referenceId: "COLEMAN-INV-9901",
      notes: "Factory carton supply",
    },
  });

  // PVC Pipes from Chinedu
  const pipeDepot = await prisma.product.create({
    data: {
      locationId: chineduStore.id,
      title: "4-inch Class B Heavy Duty PVC Waste Pipe (4 Meters)",
      category: "PLUMBING_ELECTRICAL",
      description: "Impact-resistant drainage and soil waste pipe length.",
      unitOfMeasure: "LENGTH",
      currentUnitPriceFiat: 12500.0,
      currentStock: 300,
      isActive: true,
    },
  });
  await prisma.priceHistory.create({
    data: { productId: pipeDepot.id, unitPriceFiat: 12500.0, changedBy: "Chinedu" },
  });
  await prisma.stockMovement.create({
    data: {
      productId: pipeDepot.id,
      locationId: chineduStore.id,
      type: "STOCK_IN",
      quantityDelta: 300,
      balanceAfter: 300,
      referenceId: "PIPE-INTAKE-881",
      notes: "Depot restocking",
    },
  });

  // Tools & Fasteners
  const drillTool = await prisma.product.create({
    data: {
      locationId: musaStorefront.id,
      title: "DeWalt 800W SDS-Plus Heavy Rotary Hammer Drill Kit",
      category: "TOOLS_EQUIPMENT",
      description: "Heavy artisan masonry hammer drill with 3 drill bits and carrying case.",
      unitOfMeasure: "PIECE",
      currentUnitPriceFiat: 98000.0,
      currentStock: 15,
      isActive: true,
    },
  });
  await prisma.priceHistory.create({
    data: { productId: drillTool.id, unitPriceFiat: 98000.0, changedBy: "Oga Musa" },
  });
  await prisma.stockMovement.create({
    data: {
      productId: drillTool.id,
      locationId: musaStorefront.id,
      type: "STOCK_IN",
      quantityDelta: 15,
      balanceAfter: 15,
      referenceId: "TOOL-KIT-01",
      notes: "Imported tools lot",
    },
  });

  console.log('✅ Seed completed successfully with Sellers, Multi-Locations, Products, Stock Ledgers, and Users!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
