import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DwellDetector } from '../../utils/dwellTimer.js';

describe('DwellDetector', () => {
  let detector;
  const defaultDwellTime = 1500;
  const defaultThreshold = 50;

  beforeEach(() => {
    detector = new DwellDetector(defaultDwellTime, defaultThreshold);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default parameters', () => {
      const defaultDetector = new DwellDetector();
      expect(defaultDetector).toBeDefined();
    });

    it('should initialize with custom parameters', () => {
      const customDetector = new DwellDetector(2000, 100);
      expect(customDetector).toBeDefined();
    });
  });

  describe('update()', () => {
    it('should return null on first call', () => {
      const result = detector.update({ x: 100, y: 100 });
      expect(result).toBeNull();
    });

    it('should return dwell progress when gaze is stable', () => {
      const position = { x: 100, y: 100 };
      
      // First call - initialize
      detector.update(position);
      
      // Advance time
      vi.advanceTimersByTime(500);
      
      // Second call - should show progress
      const result = detector.update(position);
      
      expect(result).not.toBeNull();
      expect(result.type).toBe('dwell');
      expect(result.progress).toBeGreaterThan(0);
      expect(result.progress).toBeLessThan(1);
    });

    it('should trigger click after dwell time', () => {
      const position = { x: 100, y: 100 };
      
      detector.update(position);
      vi.advanceTimersByTime(defaultDwellTime);
      
      const result = detector.update(position);
      
      expect(result).not.toBeNull();
      expect(result.type).toBe('click');
      expect(result.position).toEqual(position);
    });

    it('should reset when gaze moves beyond threshold', () => {
      const position1 = { x: 100, y: 100 };
      const position2 = { x: 200, y: 200 }; // Beyond threshold
      
      detector.update(position1);
      vi.advanceTimersByTime(500);
      
      // Move gaze
      const result = detector.update(position2);
      
      // Should reset, no progress
      expect(result).toBeNull();
    });

    it('should maintain dwell when gaze moves within threshold', () => {
      const position1 = { x: 100, y: 100 };
      const position2 = { x: 110, y: 110 }; // Within threshold
      
      detector.update(position1);
      vi.advanceTimersByTime(500);
      
      const result = detector.update(position2);
      
      expect(result).not.toBeNull();
      expect(result.type).toBe('dwell');
      expect(result.progress).toBeGreaterThan(0);
    });

    it('should calculate correct progress percentage', () => {
      const position = { x: 100, y: 100 };
      
      detector.update(position);
      
      // Test at 25% completion
      vi.advanceTimersByTime(defaultDwellTime * 0.25);
      const result25 = detector.update(position);
      expect(result25.progress).toBeCloseTo(0.25, 1);
      
      // Test at 50% completion
      vi.advanceTimersByTime(defaultDwellTime * 0.25);
      const result50 = detector.update(position);
      expect(result50.progress).toBeCloseTo(0.5, 1);
      
      // Test at 75% completion
      vi.advanceTimersByTime(defaultDwellTime * 0.25);
      const result75 = detector.update(position);
      expect(result75.progress).toBeCloseTo(0.75, 1);
    });

    it('should reset after click', () => {
      const position = { x: 100, y: 100 };
      
      detector.update(position);
      vi.advanceTimersByTime(defaultDwellTime);
      detector.update(position); // Trigger click
      
      // Next update should start fresh
      const result = detector.update(position);
      expect(result).toBeNull();
    });
  });

  describe('reset()', () => {
    it('should clear dwell state', () => {
      const position = { x: 100, y: 100 };
      
      detector.update(position);
      vi.advanceTimersByTime(500);
      
      detector.reset();
      
      const result = detector.update(position);
      expect(result).toBeNull();
    });
  });

  describe('Distance Calculation', () => {
    it('should correctly detect movement within threshold', () => {
      const position1 = { x: 100, y: 100 };
      const position2 = { x: 125, y: 125 }; // ~35px away (within 50px threshold)
      
      detector.update(position1);
      vi.advanceTimersByTime(500);
      
      const result = detector.update(position2);
      expect(result).not.toBeNull();
      expect(result.type).toBe('dwell');
    });

    it('should correctly detect movement beyond threshold', () => {
      const position1 = { x: 100, y: 100 };
      const position2 = { x: 200, y: 100 }; // 100px away (beyond threshold)
      
      detector.update(position1);
      vi.advanceTimersByTime(500);
      
      const result = detector.update(position2);
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null position', () => {
      expect(() => detector.update(null)).not.toThrow();
    });

    it('should handle undefined position', () => {
      expect(() => detector.update(undefined)).not.toThrow();
    });

    it('should handle position without x or y', () => {
      expect(() => detector.update({})).not.toThrow();
      expect(() => detector.update({ x: 100 })).not.toThrow();
      expect(() => detector.update({ y: 100 })).not.toThrow();
    });

    it('should handle negative coordinates', () => {
      const position = { x: -100, y: -100 };
      const result = detector.update(position);
      expect(result).toBeNull();
    });

    it('should handle very large coordinates', () => {
      const position = { x: 99999, y: 99999 };
      const result = detector.update(position);
      expect(result).toBeNull();
    });
  });
});
