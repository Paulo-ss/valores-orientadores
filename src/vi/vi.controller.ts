import { Controller, Get, Param } from '@nestjs/common';
import { ViService } from './vi.service';

@Controller('/vi')
export class ViController {
  constructor(private readonly viService: ViService) {}

  @Get('cas')
  public async getAllAvailableCas() {
    return this.viService.findAllAvailableCas();
  }

  @Get('cas/:casId')
  public async getViNumberByCas(@Param('casId') casId: string) {
    return this.viService.findViNumberByCas(casId);
  }
}
