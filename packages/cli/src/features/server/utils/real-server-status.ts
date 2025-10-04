import {
  getServerStatus,
  type ServerStatus,
} from '../commands/server-management';
import { Logger } from '@cage/shared';

// Define ServerInfo locally since we removed it from the store
interface ServerInfo {
  status: 'running' | 'stopped' | 'error';
  port: number;
  pid?: number;
  uptime?: number;
  memoryUsage?: number;
}

const logger = new Logger({ context: 'real-server-status' });

export async function getRealServerStatus(): Promise<{
  status: 'running' | 'stopped' | 'connecting' | 'error';
  serverInfo: ServerInfo | null;
  fullStatus?: ServerStatus;
}> {
  try {
    const status = await getServerStatus();

    const mappedStatus: 'running' | 'stopped' | 'connecting' | 'error' = status
      .server.running
      ? 'running'
      : status.server.warning
        ? 'error'
        : 'stopped';

    const serverInfo: ServerInfo | null = status.server.running
      ? {
          status: 'running',
          port:
            typeof status.server.port === 'number'
              ? status.server.port
              : parseInt(status.server.port.toString()),
          pid: status.server.pid,
          uptime: status.server.uptime, // Now properly tracked in milliseconds
          memoryUsage: undefined, // Not available in current server status
        }
      : null;

    return {
      status: mappedStatus,
      serverInfo,
      fullStatus: status,
    };
  } catch (error) {
    logger.error('Failed to get real server status', { error });
    return {
      status: 'error',
      serverInfo: null,
      fullStatus: undefined,
    };
  }
}

export function getRealServerStatusFormatted(): Promise<ServerStatus> {
  return getServerStatus();
}
