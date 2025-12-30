/**
 * Tests for Photo Upload Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock expo-file-system
vi.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: vi.fn().mockResolvedValue('base64encodedphotodata'),
}));

// Import after mocks are set up
import { 
  uploadPhotoToCloud, 
  isCloudUrl, 
  getPhotoDisplayUrl,
  uploadPhotoWithFallback 
} from '../lib/photo-upload';

describe('Photo Upload Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isCloudUrl', () => {
    it('should return true for https URLs', () => {
      expect(isCloudUrl('https://example.com/photo.jpg')).toBe(true);
    });

    it('should return true for http URLs', () => {
      expect(isCloudUrl('http://example.com/photo.jpg')).toBe(true);
    });

    it('should return false for local file paths', () => {
      expect(isCloudUrl('file:///path/to/photo.jpg')).toBe(false);
    });

    it('should return false for content URIs', () => {
      expect(isCloudUrl('content://media/photo.jpg')).toBe(false);
    });

    it('should return false for relative paths', () => {
      expect(isCloudUrl('/path/to/photo.jpg')).toBe(false);
    });
  });

  describe('getPhotoDisplayUrl', () => {
    it('should return cloud URL as-is', () => {
      const cloudUrl = 'https://r2.example.com/photos/123.jpg';
      expect(getPhotoDisplayUrl(cloudUrl)).toBe(cloudUrl);
    });

    it('should return local URI as-is', () => {
      const localUri = 'file:///data/photos/123.jpg';
      expect(getPhotoDisplayUrl(localUri)).toBe(localUri);
    });
  });

  describe('uploadPhotoToCloud', () => {
    it('should upload photo successfully and return cloud URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: {
            data: {
              json: {
                key: 'photos/123.jpg',
                url: 'https://r2.example.com/photos/123.jpg',
              },
            },
          },
        }),
      });

      const result = await uploadPhotoToCloud({
        uri: 'file:///local/photo.jpg',
        fileName: 'test.jpg',
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://r2.example.com/photos/123.jpg');
      expect(result.key).toBe('photos/123.jpg');
    });

    it('should handle upload failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const result = await uploadPhotoToCloud({
        uri: 'file:///local/photo.jpg',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await uploadPhotoToCloud({
        uri: 'file:///local/photo.jpg',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle tRPC error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          error: {
            json: {
              message: 'Unauthorized',
            },
          },
        }),
      });

      const result = await uploadPhotoToCloud({
        uri: 'file:///local/photo.jpg',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('uploadPhotoWithFallback', () => {
    it('should return cloud URL on successful upload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: {
            data: {
              json: {
                key: 'photos/123.jpg',
                url: 'https://r2.example.com/photos/123.jpg',
              },
            },
          },
        }),
      });

      const result = await uploadPhotoWithFallback('file:///local/photo.jpg');

      expect(result.isCloud).toBe(true);
      expect(result.uri).toBe('https://r2.example.com/photos/123.jpg');
    });

    it('should fall back to local URI on upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error'),
      });

      const localUri = 'file:///local/photo.jpg';
      const result = await uploadPhotoWithFallback(localUri);

      expect(result.isCloud).toBe(false);
      expect(result.uri).toBe(localUri);
      expect(result.error).toBeDefined();
    });
  });

  describe('API URL Configuration', () => {
    it('should use default Render URL when env not set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: { data: { json: { key: 'test', url: 'https://test.com' } } },
        }),
      });

      await uploadPhotoToCloud({ uri: 'file:///test.jpg' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('propertysnap.onrender.com'),
        expect.any(Object)
      );
    });
  });
});
