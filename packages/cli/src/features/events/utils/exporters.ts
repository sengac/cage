import * as fs from 'fs';
import * as path from 'path';

export type ExportFormat = 'json' | 'csv' | 'text';

export interface ExportOptions {
  format: ExportFormat;
  events: unknown[];
  filter?: {
    type?: string;
    tool?: string;
    startDate?: string;
    endDate?: string;
  };
  includeMetadata?: boolean;
}

export interface ExportResult {
  success: boolean;
  data?: string;
  error?: string;
  format?: string;
  filteredCount?: number;
}

export function exportToJSON(data: unknown, indent: number = 2): string {
  const seen = new WeakSet();

  const replacer = (key: string, value: unknown) => {
    if (value !== null && typeof value === 'object') {
      if (seen.has(value)) {
        return undefined; // Remove circular references
      }
      seen.add(value);
    }
    return value;
  };

  if (indent === 0) {
    return JSON.stringify(data, replacer);
  }

  return JSON.stringify(data, replacer, indent);
}

export function exportToCSV(
  data: unknown[],
  headers?: string[],
  delimiter: string = ','
): string {
  if (!data || data.length === 0) {
    return '';
  }

  const escapeCSV = (value: unknown): string => {
    if (value == null) return '""';

    // Don't quote numbers
    if (typeof value === 'number') {
      return String(value);
    }

    const str = Array.isArray(value) ? value.join(',') : String(value);

    // Escape quotes by doubling them
    const escaped = str.replace(/"/g, '""');

    // Wrap in quotes if contains delimiter, newline, or quotes
    if (
      escaped.includes(delimiter) ||
      escaped.includes('\n') ||
      escaped.includes('"')
    ) {
      return `"${escaped}"`;
    }

    return `"${escaped}"`;
  };

  const firstItem = data[0];
  const keys = Object.keys(firstItem as object);
  const headerRow = headers || keys;

  const rows: string[] = [];

  // Add header row
  rows.push(headerRow.join(delimiter));

  // Add data rows
  for (const item of data) {
    const values = keys.map(key =>
      escapeCSV((item as Record<string, unknown>)[key])
    );
    rows.push(values.join(delimiter));
  }

  return rows.join('\n');
}

export function exportToText(
  data: unknown,
  template?: (obj: unknown) => string
): string {
  if (template) {
    return template(data);
  }

  if (
    typeof data === 'string' ||
    typeof data === 'number' ||
    typeof data === 'boolean'
  ) {
    return String(data);
  }

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object') {
      return data.map(item => formatObject(item)).join('\n---\n');
    }
    return data.map(item => String(item)).join('\n');
  }

  if (typeof data === 'object' && data !== null) {
    return formatObject(data);
  }

  return String(data);
}

function formatObject(obj: unknown, indent: number = 0): string {
  const lines: string[] = [];
  const indentStr = '  '.repeat(indent);

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (
      value != null &&
      typeof value === 'object' &&
      !(value instanceof Date)
    ) {
      lines.push(`${indentStr}${key}:`);
      lines.push(formatObject(value, indent + 1));
    } else {
      lines.push(
        `${indentStr}${key}: ${value instanceof Date ? value.toISOString() : value}`
      );
    }
  }

  return lines.join('\n');
}

export async function exportToClipboard(text: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function exportToFile(
  filePath: string,
  data: string,
  encoding: string = 'utf-8'
): void {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, data, encoding as BufferEncoding);
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const isNegative = bytes < 0;
  const absoluteBytes = Math.abs(bytes);

  const i = Math.floor(Math.log(absoluteBytes) / Math.log(k));

  // For bytes (i === 0), don't show decimals
  if (i === 0) {
    return `${isNegative ? '-' : ''}${absoluteBytes} B`;
  }

  const result = (absoluteBytes / Math.pow(k, i)).toFixed(dm);

  return `${isNegative ? '-' : ''}${result} ${sizes[i]}`;
}

export function getExportFilename(
  prefix: string,
  extension?: string,
  timestampFormat?: string
): string {
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9-_]/g, '-');

  const sanitizedPrefix = sanitize(prefix);

  const format = timestampFormat || 'YYYY-MM-DD_HH-mm-ss';
  const timestamp = formatTimestamp(new Date(), format);

  const filename = `${sanitizedPrefix}_${timestamp}`;

  return extension ? `${filename}.${extension}` : filename;
}

function formatTimestamp(date: Date, format: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  const replacements: Record<string, string> = {
    YYYY: String(date.getUTCFullYear()),
    MM: pad(date.getUTCMonth() + 1),
    DD: pad(date.getUTCDate()),
    HH: pad(date.getUTCHours()),
    mm: pad(date.getUTCMinutes()),
    ss: pad(date.getUTCSeconds()),
  };

  let result = format;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(key, value);
  }

  return result;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateExportPath(
  filePath: string,
  allowedExtensions?: string[]
): ValidationResult {
  if (!filePath) {
    return { valid: false, error: 'Path cannot be empty' };
  }

  const ext = path.extname(filePath).toLowerCase().slice(1);
  const validExtensions = allowedExtensions || ['json', 'csv', 'txt', 'log'];

  if (ext && !validExtensions.includes(ext)) {
    return { valid: false, error: 'Invalid file extension' };
  }

  // Check if path is in allowed directories
  const normalizedPath = path.resolve(filePath);
  const allowedPaths = ['/tmp', process.cwd()];

  const isAllowed = allowedPaths.some(allowed =>
    normalizedPath.startsWith(path.resolve(allowed))
  );

  if (!isAllowed && !filePath.startsWith('./')) {
    return { valid: false, error: 'Path not allowed' };
  }

  return { valid: true };
}

export function exportEvents(options: ExportOptions): ExportResult {
  try {
    let events = [...options.events];

    // Apply filters
    if (options.filter) {
      if (options.filter.type) {
        events = events.filter(
          (e: unknown) =>
            (e as Record<string, unknown>).type === options.filter!.type
        );
      }
      if (options.filter.tool) {
        events = events.filter(
          (e: unknown) =>
            (e as Record<string, unknown>).tool === options.filter!.tool
        );
      }
      if (options.filter.startDate || options.filter.endDate) {
        events = events.filter((e: unknown) => {
          const timestamp = (e as Record<string, unknown>).timestamp as string;
          const eventDate = new Date(timestamp);

          if (
            options.filter!.startDate &&
            eventDate < new Date(options.filter!.startDate)
          ) {
            return false;
          }
          if (
            options.filter!.endDate &&
            eventDate > new Date(options.filter!.endDate)
          ) {
            return false;
          }
          return true;
        });
      }
    }

    let data: string;

    if (options.includeMetadata) {
      const metadata = {
        exportDate: new Date().toISOString(),
        totalEvents: events.length,
        format: options.format,
      };

      const exportData = {
        metadata,
        events,
      };

      data = exportToJSON(exportData);
    } else {
      switch (options.format) {
        case 'json':
          data = exportToJSON(events);
          break;
        case 'csv':
          data = exportToCSV(events as Record<string, unknown>[], [
            'id',
            'type',
            'tool',
            'timestamp',
          ]);
          break;
        case 'text':
          const textTemplate = (events: unknown) => {
            const eventArray = events as unknown[];
            return eventArray
              .map((e, i) => {
                const event = e as Record<string, unknown>;
                return `Event ${i + 1}\nType: ${event.type}\nTool: ${event.tool}\nTimestamp: ${event.timestamp}`;
              })
              .join('\n\n');
          };
          data = textTemplate(events);
          break;
        default:
          return { success: false, error: 'Unsupported format' };
      }
    }

    return {
      success: true,
      data,
      format: options.format,
      filteredCount: events.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

export function exportConfig(
  config: unknown,
  format: string,
  includeMetadata: boolean = false,
  hideSensitive: boolean = false
): ExportResult {
  if (!config) {
    return { success: false, error: 'No configuration' };
  }

  try {
    let configData = { ...config } as Record<string, unknown>;

    if (hideSensitive) {
      const sensitiveKeys = ['apikey', 'password', 'secret', 'token'];
      const hideSensitiveRecursive = (
        obj: Record<string, unknown>
      ): Record<string, unknown> => {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (
            sensitiveKeys.some(sensitive =>
              key.toLowerCase().includes(sensitive)
            )
          ) {
            result[key] = '***';
          } else if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value)
          ) {
            result[key] = hideSensitiveRecursive(
              value as Record<string, unknown>
            );
          } else {
            result[key] = value;
          }
        }
        return result;
      };
      configData = hideSensitiveRecursive(configData);
    }

    let exportData: unknown = configData;

    if (includeMetadata) {
      exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        config: configData,
      };
    }

    let data: string;
    switch (format) {
      case 'json':
        data = exportToJSON(exportData);
        break;
      case 'text':
        data = exportToText(exportData);
        break;
      default:
        return { success: false, error: 'Unsupported format' };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}
