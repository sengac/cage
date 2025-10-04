import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  openInBrowser,
  openOpenAPIDocumentation,
  CAGE_API_URLS,
} from './openBrowser';

vi.mock('open', () => ({
  default: vi.fn(),
}));

vi.mock('../stores/useStore', () => ({
  useDebugStore: {
    getState: vi.fn(() => ({
      debugMode: false,
      addDebugLog: vi.fn(),
    })),
  },
}));

describe('openBrowser', () => {
  let openMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const openModule = await import('open');
    openMock = vi.mocked(openModule.default);
    openMock.mockResolvedValue(undefined);
  });

  describe('CAGE_API_URLS', () => {
    it('should have correct URLs configured', () => {
      expect(CAGE_API_URLS.OPENAPI).toBe('http://localhost:3790/api-docs');
      expect(CAGE_API_URLS.HEALTH).toBe('http://localhost:3790/health');
      expect(CAGE_API_URLS.EVENTS).toBe('http://localhost:3790/api/events');
      expect(CAGE_API_URLS.SSE_STREAM).toBe(
        'http://localhost:3790/api/events/stream'
      );
    });
  });

  describe('openInBrowser', () => {
    it('should call open with correct URL', async () => {
      const url = 'https://example.com';
      await openInBrowser({ url });

      expect(openMock).toHaveBeenCalledWith(url, { wait: false });
    });

    it('should call open with wait option', async () => {
      const url = 'https://example.com';
      await openInBrowser({ url, wait: true });

      expect(openMock).toHaveBeenCalledWith(url, { wait: true });
    });

    it('should throw error when open fails', async () => {
      const error = new Error('Browser not found');
      openMock.mockRejectedValue(error);

      await expect(
        openInBrowser({ url: 'https://example.com' })
      ).rejects.toThrow('Failed to open browser: Browser not found');
    });
  });

  describe('openOpenAPIDocumentation', () => {
    it('should open the OpenAPI documentation URL', async () => {
      await openOpenAPIDocumentation();

      expect(openMock).toHaveBeenCalledWith(CAGE_API_URLS.OPENAPI, {
        wait: false,
      });
    });
  });
});
