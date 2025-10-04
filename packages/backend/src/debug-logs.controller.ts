import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { WinstonLoggerService, DebugLogEntry } from './winston-logger.service';
import { DebugLogsBatchDto, DebugLogsReceivedDto } from './dto/debug-logs.dto';

@Controller('debug')
export class DebugLogsController {
  constructor(private readonly winstonService: WinstonLoggerService) {}

  @Get('logs')
  getLogs(
    @Query('level') level?: string,
    @Query('component') component?: string,
    @Query('limit') limit?: string,
    @Query('since') since?: string,
  ): DebugLogEntry[] {
    let logs: DebugLogEntry[];

    if (since) {
      logs = this.winstonService.getLogsSince(since);
    } else {
      logs = this.winstonService.getLogs({ reverse: true });
    }

    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    if (component) {
      logs = logs.filter(log => log.component === component);
    }

    if (limit) {
      const limitNum = parseInt(limit, 10);
      logs = logs.slice(0, limitNum);
    }

    return logs;
  }

  @Post('logs')
  addLogs(@Body() batchDto: DebugLogsBatchDto): DebugLogsReceivedDto {
    for (const log of batchDto.logs) {
      this.winstonService.addLog({
        level: log.level,
        component: log.component,
        message: log.message,
        context: log.context,
        stackTrace: log.stackTrace,
      });
    }

    return { received: batchDto.logs.length };
  }
}