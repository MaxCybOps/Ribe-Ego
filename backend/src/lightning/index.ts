import { ILightningProvider } from './types.js';
import { MockLightningProvider } from './mock-provider.js';
import { PolarLightningProvider } from './polar-provider.js';
import { LNbitsLightningProvider } from './lnbits-provider.js';
import { OpenNodeLightningProvider } from './opennode-provider.js';

let lightningProviderInstance: ILightningProvider | null = null;

export function getLightningProvider(): ILightningProvider {
  if (!lightningProviderInstance) {
    const providerType = (process.env.LIGHTNING_PROVIDER || 'mock').toLowerCase();
    switch (providerType) {
      case 'polar':
        lightningProviderInstance = new PolarLightningProvider();
        break;
      case 'lnbits':
        lightningProviderInstance = new LNbitsLightningProvider();
        break;
      case 'opennode':
        lightningProviderInstance = new OpenNodeLightningProvider();
        break;
      default:
        lightningProviderInstance = new MockLightningProvider();
        break;
    }
  }
  return lightningProviderInstance;
}

export * from './types.js';
export * from './mock-provider.js';
export * from './polar-provider.js';
export * from './lnbits-provider.js';
export * from './opennode-provider.js';
