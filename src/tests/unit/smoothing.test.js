import { describe, it, expect, beforeEach } from 'vitest';
import { OneEuroFilter } from '../../utils/smoothing';

describe('OneEuroFilter', () => {
  let filter;

  beforeEach(() => {
    filter = new OneEuroFilter(1.0, 0.007);
  });

  describe('constructor', () => {
    it('should initialize with default parameters', () => {
      expect(filter).toBeDefined();
      expect(filter.minCutoff).toBe(1.0);
      expect(filter.beta).toBe(0.007);
    });

    it('should initialize with custom parameters', () => {
      const customFilter = new OneEuroFilter(2.0, 0.01);
      expect(customFilter.minCutoff).toBe(2.0);
      expect(customFilter.beta).toBe(0.01);
    });
  });

  describe('filter', () => {
    it('should return the first value unchanged', () => {
      const result = filter.filter(100);
      expect(result).toBe(100);
    });

    it('should smooth subsequent values', () => {
      filter.filter(100);
      const result = filter.filter(110);
      
      // Result should be between 100 and 110 (smoothed)
      expect(result).toBeGreaterThan(100);
      expect(result).toBeLessThan(110);
    });

    it('should reduce jitter in noisy data', () => {
      const noisyData = [100, 102, 99, 101, 100, 103, 98];
      const smoothedData = noisyData.map(val => filter.filter(val));
      
      // Calculate variance of smoothed data
      const mean = smoothedData.reduce((a, b) => a + b) / smoothedData.length;
      const variance = smoothedData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / smoothedData.length;
      
      // Smoothed variance should be less than original variance
      const originalMean = noisyData.reduce((a, b) => a + b) / noisyData.length;
      const originalVariance = noisyData.reduce((sum, val) => sum + Math.pow(val - originalMean, 2), 0) / noisyData.length;
      
      expect(variance).toBeLessThan(originalVariance);
    });

    it('should handle rapid changes appropriately', () => {
      filter.filter(100);
      filter.filter(101);
      const result = filter.filter(150); // Big jump
      
      // Should smooth but still respond to large changes
      expect(result).toBeGreaterThan(101);
      expect(result).toBeLessThan(150);
    });

    it('should be responsive to sustained changes', () => {
      // Start at 100
      filter.filter(100);
      
      // Gradually move to 200
      const steps = 20;
      let result;
      for (let i = 1; i <= steps; i++) {
        result = filter.filter(100 + (100 * i / steps));
      }
      
      // After sustained movement, should be close to target
      expect(result).toBeGreaterThan(180);
    });
  });

  describe('reset', () => {
    it('should reset the filter state', () => {
      filter.filter(100);
      filter.filter(110);
      filter.reset();
      
      const result = filter.filter(50);
      expect(result).toBe(50); // First value after reset
    });
  });
});
