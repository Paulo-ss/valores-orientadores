import { Inject, Injectable } from '@nestjs/common';
import { Cron, Timeout } from '@nestjs/schedule';
import { ViService } from 'src/vi/vi.service';

@Injectable()
export class TasksService {
  constructor(@Inject() public readonly viService: ViService) {}

  @Timeout(1000)
  public async generateCasViJSONFile() {
    await this.viService.generateCasViJSONFile();
  }

  @Cron('0 2 * 5/9 *', { timeZone: 'America/Sao_Paulo' })
  public async updateCasViJSONFile() {
    await this.viService.generateCasViJSONFile();
  }
}
