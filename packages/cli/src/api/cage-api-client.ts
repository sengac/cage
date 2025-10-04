/**
 * Centralized CAGE API Client
 *
 * This module provides a single, reusable interface for HTTP API communications
 * with the CAGE server.
 *
 * IMPORTANT: All components MUST use this client for server communication.
 * For SSE streaming, use StreamService instead.
 */

import { loadCageConfig } from '../shared/utils/config';
import { Logger } from '@cage/shared';
import type { Event } from '../shared/stores/appStore';

const logger = new Logger({ context: 'CageApiClient', silent: true });

export interface ApiConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface EventsResponse {
  events: Event[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HooksStatus {
  installed: boolean;
  count: number;
  hooks: Array<{
    type: string;
    enabled: boolean;
    matcher?: string;
  }>;
}

/**
 * Centralized API Client for CAGE Server
 *
 * Usage:
 * ```typescript
 * const client = CageApiClient.getInstance();
 * const events = await client.getEvents();
 * ```
 */
export class CageApiClient {
  private static instance: CageApiClient | null = null;
  private config: ApiConfig;
  private baseUrl: string;

  private constructor(config?: ApiConfig) {
    this.config = config || {
      host: 'localhost',
      port: 3790,
      protocol: 'http',
    };
    this.baseUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
  }

  /**
   * Get singleton instance of the API client
   */
  static getInstance(config?: ApiConfig): CageApiClient {
    if (!CageApiClient.instance) {
      CageApiClient.instance = new CageApiClient(config);
    }
    return CageApiClient.instance;
  }

  /**
   * Reset the singleton instance (mainly for testing)
   */
  static resetInstance(): void {
    CageApiClient.instance = null;
  }

  /**
   * Update configuration (will recreate instance)
   */
  static configure(config: ApiConfig): void {
    CageApiClient.resetInstance();
    CageApiClient.instance = new CageApiClient(config);
  }

  /**
   * Initialize from cage.config.json
   */
  static async initializeFromConfig(): Promise<CageApiClient> {
    try {
      const config = await loadCageConfig();
      if (config) {
        const apiConfig: ApiConfig = {
          host: config.host || 'localhost',
          port: config.port || 3790,
          protocol: 'http', // Could be extended to support https from config
        };
        CageApiClient.configure(apiConfig);
      }
    } catch (error) {
      logger.warn('Failed to load config, using defaults', { error });
    }
    return CageApiClient.getInstance();
  }


  /**
   * Get events from server
   */
  async getEvents(params?: {
    page?: number;
    limit?: number;
    date?: string;
    sessionId?: string;
    since?: string;
  }): Promise<ApiResponse<EventsResponse>> {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, String(value));
          }
        });
      }

      const url = `/api/events/list${queryParams.toString() ? `?${queryParams}` : ''}`;
      return await this.get<EventsResponse>(url);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch events',
      };
    }
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string): Promise<ApiResponse<Event>> {
    return await this.get<Event>(`/api/events/${eventId}`);
  }

  /**
   * Get debug logs
   */
  async getDebugLogs(params?: {
    level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    component?: string;
    limit?: number;
    since?: string;
  }): Promise<
    ApiResponse<
      Array<{
        id: string;
        timestamp: string;
        level: string;
        component: string;
        message: string;
        stackTrace?: string;
      }>
    >
  > {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, String(value));
          }
        });
      }

      const url = `/api/debug/logs${queryParams.toString() ? `?${queryParams}` : ''}`;
      return await this.get(url);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch debug logs',
      };
    }
  }

  /**
   * Get hooks status
   */
  async getHooksStatus(): Promise<ApiResponse<HooksStatus>> {
    return await this.get<HooksStatus>('/api/hooks/status');
  }


  /**
   * Generic GET request
   */
  private async get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${path}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText || response.statusText}`,
        };
      }

      const data = (await response.json()) as T;
      return {
        success: true,
        data,
      };
    } catch (error) {
      logger.debug(`GET request failed: ${path}`, { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Export a default instance for convenience
export const cageApi = CageApiClient.getInstance();
