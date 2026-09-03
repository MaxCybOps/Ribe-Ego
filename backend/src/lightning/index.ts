import { ILightningProvider } from './types.js';
import { MockLightningProvider } from './mock-provider.js';
import { PolarLightningProvider } from './polar-provider.js';

let lightningProviderInstance: ILightningProvider | null = null;

export function getLightningProvider(): ILightningProvider {
  if (!lightningProviderInstance) {
    const providerType = process.env.LIGHTNING_PROVIDER || 'mock';
    if (providerType === 'polar') {
      lightningProviderInstance = new PolarLightningProvider();
    } else {
      lightningProviderInstance = new MockLightningProvider();
    }
  }
  return lightningProviderInstance;
}

export * from './types.js';
export * from './mock-provider.js';
export * from './polar-provider.js';
