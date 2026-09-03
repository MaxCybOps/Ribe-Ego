export interface CreateInvoiceParams {
  amountSats: number;
  memo: string;
  expirySeconds?: number;
  metadata?: Record<string, any>;
}

export interface LightningInvoice {
  paymentHash: string;
  paymentRequest: string; // bolt11 string / deep link
  amountSats: number;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export interface InvoiceStatus {
  paymentHash: string;
  isSettled: boolean;
  settledAt?: Date;
  preimage?: string;
  amountSats: number;
}

export interface LightningWebhookEvent {
  event: 'payment.settled' | 'payment.expired';
  paymentHash: string;
  preimage?: string;
  amountSats: number;
  timestamp: Date;
}

export interface ILightningProvider {
  readonly providerName: string;
  createInvoice(params: CreateInvoiceParams): Promise<LightningInvoice>;
  getInvoiceStatus(paymentHash: string): Promise<InvoiceStatus>;
  simulatePaymentSettlement(paymentHash: string): Promise<InvoiceStatus>; // For testing/simulation
}
