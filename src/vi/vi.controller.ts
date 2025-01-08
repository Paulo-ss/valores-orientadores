import {
  Controller,
  Get,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ViService } from './vi.service';
import { Request } from 'express';

@Controller('/vi')
export class ViController {
  constructor(private readonly viService: ViService) {}

  @Get('cas')
  public async getAllAvailableCas() {
    return this.viService.findAllAvailableCas();
  }

  @Get('last-updated')
  public async getLastUpdatedDate() {
    return this.viService.getLastUpdated();
  }

  @Get('cas/:casId')
  public async getViNumberByCas(@Param('casId') casId: string) {
    return this.viService.findViNumberByCas(casId);
  }

  @Get('update-cas-vi-file-job')
  public async updateCasViJSONFile(@Req() request: Request) {
    if (
      request.headers['Authorization'] !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      throw new UnauthorizedException();
    }

    return this.viService.generateCasViJSONFile();
  }
}
