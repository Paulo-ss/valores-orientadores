import { Module } from '@nestjs/common';
import { ViModule } from './vi/vi.module';
import { ViController } from './vi/vi.controller';
import { ConfigModule } from '@nestjs/config';
import { config } from './config/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [config] }), ViModule],
  controllers: [ViController],
})
export class AppModule {}
