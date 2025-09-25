import { describe, it, expect } from 'vitest';
import * as z from 'zod';

// These imports will work after implementing config.ts
import { CageConfigSchema, type CageConfig } from './config';

describe('Configuration Types', () => {
  describe('CageConfigSchema', () => {
    it('should validate a minimal config with just port', () => {
      const config = {
        port: 3790,
      };

      const result = CageConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.port).toBe(3790);
      }
    });

    it('should validate a full config with all options', () => {
      const config = {
        port: 3790,
        host: 'localhost',
        enabled: true,
        logLevel: 'info',
        eventsDir: '.cage/events',
        maxEventSize: 1048576, // 1MB
        enableMetrics: true,
        enableOfflineMode: true,
        offlineLogPath: '.cage/hooks-offline.log',
      };

      const result = CageConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.port).toBe(3790);
        expect(result.data.host).toBe('localhost');
        expect(result.data.enabled).toBe(true);
        expect(result.data.logLevel).toBe('info');
      }
    });

    it('should provide defaults for optional fields', () => {
      const config = {
        port: 3790,
      };

      const result = CageConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true); // default
        expect(result.data.host).toBe('localhost'); // default
        expect(result.data.logLevel).toBe('info'); // default
      }
    });

    it('should reject invalid port number', () => {
      const config = {
        port: -1,
      };

      const result = CageConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject invalid log level', () => {
      const config = {
        port: 3790,
        logLevel: 'invalid',
      };

      const result = CageConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should accept environment-specific config', () => {
      const config = {
        port: 3790,
        env: 'development',
        debug: true,
      };

      const result = CageConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.env).toBe('development');
        expect(result.data.debug).toBe(true);
      }
    });
  });
});
