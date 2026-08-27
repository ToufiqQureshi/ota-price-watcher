import { Module } from '@nestjs/common';
import { AdapterRegistryService } from './adapter-registry.service';
import { GommtAdapter } from './adapters/gommt.adapter';
import { SwiftbookAdapter } from './adapters/swiftbook.adapter';
import { EngineService } from './engine.service';

@Module({
  providers: [EngineService, AdapterRegistryService, GommtAdapter, SwiftbookAdapter],
  exports: [EngineService, AdapterRegistryService],
})
export class EngineModule {}
