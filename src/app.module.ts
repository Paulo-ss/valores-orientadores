import { Module } from '@nestjs/common';
import { TasksModule } from './tasks/tasks.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ViModule } from './vi/vi.module';
import { ViController } from './vi/vi.controller';
import { CommonModule } from './tasks/common/common.module';

@Module({
  imports: [ScheduleModule.forRoot(), TasksModule, ViModule, CommonModule],
  controllers: [ViController],
})
export class AppModule {}
