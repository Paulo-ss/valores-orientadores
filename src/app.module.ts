import { Module } from '@nestjs/common';
import { TasksModule } from './tasks/tasks.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ViModule } from './vi/vi.module';
import { ViController } from './vi/vi.controller';
import { ConfigModule } from '@nestjs/config';
import { config } from './config/config';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    TasksModule,
    ViModule,
  ],
  controllers: [ViController],
})
export class AppModule {}
