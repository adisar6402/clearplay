import type { PlatformAdapter } from '@clearplay/core';
import { YouTubeAdapter } from './youtube';
import { getRecognizedPlatform } from './recognized';

export class AdapterRegistry {
  private adapters: PlatformAdapter[] = [];

  constructor() {
    this.adapters.push(new YouTubeAdapter());
  }

  getAdapter(url: string): PlatformAdapter | null {
    return this.adapters.find(a => a.detect(url)) || null;
  }

  normalizeUrl(url: string): string | null {
    const adapter = this.getAdapter(url);
    return adapter?.normalizeUrl?.(url) || (adapter ? url : null);
  }

  getVideoId(url: string): string | null {
    return this.getAdapter(url)?.getVideoId?.(url) || null;
  }

  getRecognizedPlatform(url: string): string | null {
    return getRecognizedPlatform(url)
  }
}

export const adapterRegistry = new AdapterRegistry();
