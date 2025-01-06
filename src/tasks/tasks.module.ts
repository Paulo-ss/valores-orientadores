import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ViModule } from 'src/vi/vi.module';

@Module({
  imports: [ViModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
