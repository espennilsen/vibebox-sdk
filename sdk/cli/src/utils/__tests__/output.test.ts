import { describe, it, expect } from 'vitest';
import { Output } from '../output.js';

describe('Output utilities', () => {
  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(Output.formatBytes(0)).toBe('0 B');
      expect(Output.formatBytes(1024)).toBe('1.00 KB');
      expect(Output.formatBytes(1048576)).toBe('1.00 MB');
      expect(Output.formatBytes(1073741824)).toBe('1.00 GB');
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(Output.formatDuration(500)).toBe('500ms');
      expect(Output.formatDuration(1500)).toBe('1.5s');
      expect(Output.formatDuration(65000)).toBe('1.1m');
      expect(Output.formatDuration(3700000)).toBe('1.0h');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const long = 'a'.repeat(100);
      const result = Output.truncate(long, 50);
      expect(result).toBe('a'.repeat(47) + '...');
      expect(result.length).toBe(50);
    });

    it('should not truncate short strings', () => {
      const short = 'hello';
      expect(Output.truncate(short, 50)).toBe(short);
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent times', () => {
      const now = new Date();
      expect(Output.formatRelativeTime(now)).toBe('just now');

      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(Output.formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');

      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(Output.formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(Output.formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });
  });
});
