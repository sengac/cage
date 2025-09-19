import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn()
}));

// Mock path module
vi.mock('path', () => ({
  dirname: vi.fn((p: string) => {
    const lastSlash = p.lastIndexOf('/');
    return lastSlash > 0 ? p.substring(0, lastSlash) : '/';
  }),
  extname: vi.fn((p: string) => {
    const lastDot = p.lastIndexOf('.');
    return lastDot > 0 ? p.substring(lastDot) : '';
  }),
  resolve: vi.fn((...paths: string[]) => paths.join('/'))
}));

import {
  exportToJSON,
  exportToCSV,
  exportToText,
  exportToClipboard,
  exportToFile,
  formatBytes,
  getExportFilename,
  validateExportPath,
  exportEvents,
  exportConfig,
  ExportOptions,
  ExportFormat
} from './exporters';
import * as fs from 'fs';
import * as path from 'path';

describe('exporters', () => {
  describe('exportToJSON', () => {
    it('should export data as JSON string', () => {
      const data = { name: 'test', value: 123 };
      const result = exportToJSON(data);

      expect(result).toBe('{\n  "name": "test",\n  "value": 123\n}');
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];
      const result = exportToJSON(data);

      expect(result).toBe('[\n  1,\n  2,\n  3\n]');
    });

    it('should handle custom indentation', () => {
      const data = { test: true };
      const result = exportToJSON(data, 4);

      expect(result).toBe('{\n    "test": true\n}');
    });

    it('should handle circular references', () => {
      interface CircularData {
        name: string;
        circular?: CircularData;
      }
      const data: CircularData = { name: 'test' };
      data.circular = data;
      const result = exportToJSON(data);

      expect(result).toContain('name');
      expect(result).not.toContain('[Circular]');
    });

    it('should handle dates', () => {
      const data = { date: new Date('2025-01-01T00:00:00Z') };
      const result = exportToJSON(data);

      expect(result).toContain('2025-01-01T00:00:00.000Z');
    });

    it('should handle undefined and null values', () => {
      const data = { a: undefined, b: null };
      const result = exportToJSON(data);

      expect(result).toBe('{\n  "b": null\n}');
    });

    it('should handle empty objects', () => {
      const result = exportToJSON({});

      expect(result).toBe('{}');
    });

    it('should minify when indent is 0', () => {
      const data = { name: 'test', value: 123 };
      const result = exportToJSON(data, 0);

      expect(result).toBe('{"name":"test","value":123}');
    });
  });

  describe('exportToCSV', () => {
    it('should export array of objects as CSV', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ];
      const result = exportToCSV(data);

      expect(result).toBe('name,age\n"Alice",30\n"Bob",25');
    });

    it('should handle custom headers', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ];
      const result = exportToCSV(data, ['Name', 'Age']);

      expect(result).toBe('Name,Age\n"Alice",30\n"Bob",25');
    });

    it('should handle custom delimiter', () => {
      const data = [
        { name: 'Alice', age: 30 }
      ];
      const result = exportToCSV(data, undefined, ';');

      expect(result).toBe('name;age\n"Alice";30');
    });

    it('should escape quotes in values', () => {
      const data = [
        { name: 'Alice "Ally" Smith', age: 30 }
      ];
      const result = exportToCSV(data);

      expect(result).toBe('name,age\n"Alice ""Ally"" Smith",30');
    });

    it('should handle values with commas', () => {
      const data = [
        { name: 'Smith, Alice', age: 30 }
      ];
      const result = exportToCSV(data);

      expect(result).toBe('name,age\n"Smith, Alice",30');
    });

    it('should handle values with newlines', () => {
      const data = [
        { name: 'Alice\nSmith', age: 30 }
      ];
      const result = exportToCSV(data);

      expect(result).toBe('name,age\n"Alice\nSmith",30');
    });

    it('should handle null and undefined values', () => {
      const data = [
        { name: null, age: undefined, city: 'NYC' }
      ];
      const result = exportToCSV(data);

      expect(result).toBe('name,age,city\n"","","NYC"');
    });

    it('should handle empty arrays', () => {
      const result = exportToCSV([]);

      expect(result).toBe('');
    });

    it('should handle nested objects', () => {
      const data = [
        { name: 'Alice', address: { city: 'NYC' } }
      ];
      const result = exportToCSV(data);

      expect(result).toBe('name,address\n"Alice","[object Object]"');
    });

    it('should handle arrays in values', () => {
      const data = [
        { name: 'Alice', tags: ['a', 'b'] }
      ];
      const result = exportToCSV(data);

      expect(result).toBe('name,tags\n"Alice","a,b"');
    });
  });

  describe('exportToText', () => {
    it('should export data as formatted text', () => {
      const data = { name: 'test', value: 123 };
      const result = exportToText(data);

      expect(result).toContain('name: test');
      expect(result).toContain('value: 123');
    });

    it('should handle arrays of objects', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ];
      const result = exportToText(data);

      expect(result).toContain('name: Alice');
      expect(result).toContain('age: 30');
      expect(result).toContain('name: Bob');
      expect(result).toContain('age: 25');
      expect(result).toContain('---');
    });

    it('should handle custom templates', () => {
      const data = { name: 'test', value: 123 };
      const template = (obj: { name: string; value: number }) => `Name: ${obj.name}, Value: ${obj.value}`;
      const result = exportToText(data, template);

      expect(result).toBe('Name: test, Value: 123');
    });

    it('should handle primitive values', () => {
      const result = exportToText('Hello World');

      expect(result).toBe('Hello World');
    });

    it('should handle arrays of primitives', () => {
      const result = exportToText([1, 2, 3]);

      expect(result).toBe('1\n2\n3');
    });

    it('should handle nested objects', () => {
      const data = {
        name: 'test',
        nested: {
          value: 123
        }
      };
      const result = exportToText(data);

      expect(result).toContain('name: test');
      expect(result).toContain('nested:');
      expect(result).toContain('  value: 123');
    });

    it('should handle dates', () => {
      const data = { date: new Date('2025-01-01T00:00:00Z') };
      const result = exportToText(data);

      expect(result).toContain('date: 2025-01-01T00:00:00.000Z');
    });
  });

  describe('exportToClipboard', () => {
    interface MockClipboard {
      writeText: ReturnType<typeof vi.fn>;
    }

    let mockClipboard: MockClipboard;

    beforeEach(() => {
      mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined)
      };
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: mockClipboard
        },
        writable: true
      });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should copy text to clipboard', async () => {
      const text = 'Hello World';
      const result = await exportToClipboard(text);

      expect(result).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(text);
    });

    it('should handle clipboard errors', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Failed'));

      const result = await exportToClipboard('test');

      expect(result).toBe(false);
    });

    it('should handle missing clipboard API', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });

      const result = await exportToClipboard('test');

      expect(result).toBe(false);
    });
  });

  describe('exportToFile', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should write data to file', () => {
      const filePath = '/tmp/test.json';
      const data = 'test data';

      vi.mocked(fs.existsSync).mockReturnValue(true);
      exportToFile(filePath, data);

      expect(fs.writeFileSync).toHaveBeenCalledWith(filePath, data, 'utf-8');
    });

    it('should create directory if it does not exist', () => {
      const filePath = '/tmp/subdir/test.json';
      const data = 'test data';

      vi.mocked(fs.existsSync).mockReturnValue(false);
      exportToFile(filePath, data);

      expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/subdir', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(filePath, data, 'utf-8');
    });

    it('should handle custom encoding', () => {
      const filePath = '/tmp/test.txt';
      const data = 'test data';

      vi.mocked(fs.existsSync).mockReturnValue(true);
      exportToFile(filePath, data, 'ascii');

      expect(fs.writeFileSync).toHaveBeenCalledWith(filePath, data, 'ascii');
    });

    it('should throw on write errors', () => {
      const filePath = '/invalid/path.txt';
      const data = 'test';

      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => exportToFile(filePath, data)).toThrow('Permission denied');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1)).toBe('1 B');
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('should handle custom decimals', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB');
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(1536, 3)).toBe('1.500 KB');
    });

    it('should handle negative numbers', () => {
      expect(formatBytes(-1024)).toBe('-1.00 KB');
    });

    it('should handle very large numbers', () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
      expect(formatBytes(1024 * 1024 * 1024 * 1024 * 1024)).toBe('1.00 PB');
    });
  });

  describe('getExportFilename', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15T10:30:45.123Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should generate filename with timestamp', () => {
      const result = getExportFilename('events', 'json');

      expect(result).toBe('events_2025-01-15_10-30-45.json');
    });

    it('should handle different extensions', () => {
      expect(getExportFilename('data', 'csv')).toBe('data_2025-01-15_10-30-45.csv');
      expect(getExportFilename('report', 'txt')).toBe('report_2025-01-15_10-30-45.txt');
    });

    it('should handle custom timestamp format', () => {
      const result = getExportFilename('test', 'json', 'YYYY-MM-DD');

      expect(result).toBe('test_2025-01-15.json');
    });

    it('should handle no extension', () => {
      const result = getExportFilename('test');

      expect(result).toBe('test_2025-01-15_10-30-45');
    });

    it('should sanitize prefix', () => {
      const result = getExportFilename('my/file:name*test', 'json');

      expect(result).toBe('my-file-name-test_2025-01-15_10-30-45.json');
    });
  });

  describe('validateExportPath', () => {
    it('should validate writable paths', () => {
      const result = validateExportPath('/tmp/test.json');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid extensions', () => {
      const result = validateExportPath('/tmp/test.exe');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file extension');
    });

    it('should reject paths outside allowed directories', () => {
      const result = validateExportPath('/etc/passwd');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Path not allowed');
    });

    it('should allow custom allowed extensions', () => {
      const result = validateExportPath('/tmp/test.custom', ['custom']);

      expect(result.valid).toBe(true);
    });

    it('should handle relative paths', () => {
      const result = validateExportPath('./export.json');

      expect(result.valid).toBe(true);
    });

    it('should reject empty paths', () => {
      const result = validateExportPath('');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Path cannot be empty');
    });
  });

  describe('exportEvents', () => {
    const mockEvents = [
      {
        id: '1',
        type: 'ToolUse',
        tool: 'Read',
        timestamp: '2025-01-15T10:00:00Z',
        arguments: { file: 'test.js' },
        result: 'file content'
      },
      {
        id: '2',
        type: 'ToolUse',
        tool: 'Write',
        timestamp: '2025-01-15T10:01:00Z',
        arguments: { file: 'test.js', content: 'new content' },
        result: 'success'
      }
    ];

    it('should export events as JSON', () => {
      const options: ExportOptions = {
        format: 'json' as ExportFormat,
        events: mockEvents
      };

      const result = exportEvents(options);

      expect(result.success).toBe(true);
      expect(result.data).toContain('"type": "ToolUse"');
      expect(result.data).toContain('"tool": "Read"');
      expect(result.format).toBe('json');
    });

    it('should export events as CSV', () => {
      const options: ExportOptions = {
        format: 'csv' as ExportFormat,
        events: mockEvents
      };

      const result = exportEvents(options);

      expect(result.success).toBe(true);
      expect(result.data).toContain('id,type,tool,timestamp');
      expect(result.data).toContain('ToolUse');
      expect(result.data).toContain('Read');
      expect(result.format).toBe('csv');
    });

    it('should export events as text', () => {
      const options: ExportOptions = {
        format: 'text' as ExportFormat,
        events: mockEvents
      };

      const result = exportEvents(options);

      expect(result.success).toBe(true);
      expect(result.data).toContain('Event 1');
      expect(result.data).toContain('Type: ToolUse');
      expect(result.data).toContain('Tool: Read');
      expect(result.format).toBe('text');
    });

    it('should filter events by type', () => {
      const options: ExportOptions = {
        format: 'json' as ExportFormat,
        events: mockEvents,
        filter: {
          type: 'ToolUse'
        }
      };

      const result = exportEvents(options);

      expect(result.success).toBe(true);
      expect(result.data).toContain('ToolUse');
    });

    it('should filter events by tool', () => {
      const options: ExportOptions = {
        format: 'json' as ExportFormat,
        events: mockEvents,
        filter: {
          tool: 'Read'
        }
      };

      const result = exportEvents(options);

      expect(result.success).toBe(true);
      expect(result.data).toContain('Read');
      expect(result.data).not.toContain('Write');
    });

    it('should filter events by date range', () => {
      const options: ExportOptions = {
        format: 'json' as ExportFormat,
        events: mockEvents,
        filter: {
          startDate: '2025-01-15T09:00:00Z',
          endDate: '2025-01-15T10:00:30Z'
        }
      };

      const result = exportEvents(options);

      expect(result.success).toBe(true);
      expect(result.filteredCount).toBe(1);
    });

    it('should include metadata', () => {
      const options: ExportOptions = {
        format: 'json' as ExportFormat,
        events: mockEvents,
        includeMetadata: true
      };

      const result = exportEvents(options);

      expect(result.success).toBe(true);
      expect(result.data).toContain('metadata');
      expect(result.data).toContain('exportDate');
      expect(result.data).toContain('totalEvents');
    });

    it('should handle empty events', () => {
      const options: ExportOptions = {
        format: 'json' as ExportFormat,
        events: []
      };

      const result = exportEvents(options);

      expect(result.success).toBe(true);
      expect(result.data).toBe('[]');
    });

    it('should handle export errors', () => {
      const options: ExportOptions = {
        format: 'invalid' as ExportFormat,
        events: mockEvents
      };

      const result = exportEvents(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported format');
    });
  });

  describe('exportConfig', () => {
    const mockConfig = {
      theme: 'dark',
      server: {
        port: 3000,
        host: 'localhost'
      },
      display: {
        showTimestamps: true,
        dateFormat: 'YYYY-MM-DD'
      }
    };

    it('should export config as JSON', () => {
      const result = exportConfig(mockConfig, 'json');

      expect(result.success).toBe(true);
      expect(result.data).toContain('"theme": "dark"');
      expect(result.data).toContain('"port": 3000');
    });

    it('should export config as text', () => {
      const result = exportConfig(mockConfig, 'text');

      expect(result.success).toBe(true);
      expect(result.data).toContain('theme: dark');
      expect(result.data).toContain('port: 3000');
    });

    it('should include export metadata', () => {
      const result = exportConfig(mockConfig, 'json', true);

      expect(result.success).toBe(true);
      expect(result.data).toContain('exportedAt');
      expect(result.data).toContain('version');
    });

    it('should handle sensitive data', () => {
      const configWithSecrets = {
        ...mockConfig,
        apiKey: 'secret123',
        password: 'hidden'
      };

      const result = exportConfig(configWithSecrets, 'json', false, true);

      expect(result.success).toBe(true);
      expect(result.data).not.toContain('secret123');
      expect(result.data).not.toContain('hidden');
      expect(result.data).toContain('***');
    });

    it('should handle null config', () => {
      const result = exportConfig(null, 'json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No configuration');
    });
  });
});