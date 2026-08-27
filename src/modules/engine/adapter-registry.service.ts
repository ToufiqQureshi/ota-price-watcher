import { Injectable, NotFoundException } from '@nestjs/common';
import { GommtAdapter } from './adapters/gommt.adapter';
import { SwiftbookAdapter } from './adapters/swiftbook.adapter';
import { SiteAdapter } from './site-adapter.interface';

@Injectable()
export class AdapterRegistryService {
  private readonly adapters: Map<string, SiteAdapter>;

  constructor(gommt: GommtAdapter, swiftbook: SwiftbookAdapter) {
    this.adapters = new Map<string, SiteAdapter>([
      [gommt.siteType, gommt],
      [swiftbook.siteType, swiftbook],
    ]);
  }

  get(siteType: string): SiteAdapter {
    const adapter = this.adapters.get(siteType);
    if (!adapter) {
      throw new NotFoundException(
        `No adapter registered for siteType "${siteType}". Known: ${[...this.adapters.keys()].join(', ')}`,
      );
    }
    return adapter;
  }

  list(): string[] {
    return [...this.adapters.keys()];
  }
}
