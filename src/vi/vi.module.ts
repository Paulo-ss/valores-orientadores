import { Module } from '@nestjs/common';
import { ViService } from './vi.service';
import { ViController } from './vi.controller';

@Module({
  providers: [ViService, ViController],
  exports: [ViService, ViController],
})
export class ViModule {}
