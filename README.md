# Ribeègo ₿

> *"The place money is spent"* — A Bitcoin Lightning-settled wholesale trade marketplace.

## Overview

Ribeègo is a centralized marketplace for wholesale traders (building materials, plumbing and electrical supplies, artisan tools, and bulk goods).

### Core Architectural Features:
* **Multi-Location Seller Hierarchy**: A seller business operates distinct physical locations (storefronts, bulk warehouses). Inventory, stock-in events, and pricing live at the location level.
* **RFQ Negotiation Fan-Out**: Buyers broadcast bulk requests; eligible locations submit competing offers. Buyers compare offers side-by-side with **zero auto-ranking**.
* **Bitcoin Lightning Settlement**: Sub-3-second checkout with 90-second fiat-to-sats price locking.
* **Traceable Financial Ledger**: Platform receives funds first and allocates 7% marketplace commission and location payouts.
* **Idempotent Webhooks & Automatic Stock-Out**: Guaranteed protection against double-spending and automatic stock deduction upon payment confirmation.

## Quick Start (Phase 0)

### 1. Run Automated Test Suite
```bash
cd backend
npm run test
```

### 2. Start Backend API & WebSocket Server
```bash
cd backend
npm run dev
# Running at http://localhost:4000
```

### 3. Start Frontend Client Portal
```bash
cd frontend
npm run dev
# Running at http://localhost:3000
```

## Surfaces
* **Buyer App (Emeka the Contractor)**: `http://localhost:3000/buyer`
* **Seller Portal (Oga Musa's Enterprise)**: `http://localhost:3000/seller`
* **Platform Admin Console (Maxwell & Jovanny)**: `http://localhost:3000/admin`
