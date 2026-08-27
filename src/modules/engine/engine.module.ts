import { Module } from '@nestjs/common';
import { AdapterRegistryService } from './adapter-registry.service';
import { GommtAdapter } from './adapters/gommt.adapter';
import { StaahAdapter } from './adapters/staah.adapter';
import { SwiftbookAdapter } from './adapters/swiftbook.adapter';
import { EngineService } from './engine.service';

@Module({
  providers: [EngineService, AdapterRegistryService, GommtAdapter, SwiftbookAdapter, StaahAdapter],
  exports: [EngineService, AdapterRegistryService],
})
export class EngineModule {}
