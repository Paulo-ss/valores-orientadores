import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { ViService } from './vi.service';
import { Request } from 'express';

@Controller('/vi')
export class ViController {
  constructor(private readonly viService: ViService) {}

  @Get('cas')
  public async getCurrentCasViJSONFile() {
    return this.viService.getCurrentCasViJSONFile();
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

  @Get('test-cron-job')
  public async testCronJob(@Req() request: Request) {
    console.log({ Authorization1: request.headers['Authorization'] });

    if (
      request.headers['Authorization'] !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      throw new UnauthorizedException();
    }

    console.log({ Authorization2: request.headers['Authorization'] });

    return { ok: true };
  }
}
