import { describe, it, expect } from 'vitest';
import { extractEyeFeatures, validateFeatures } from '../../core/featureExtraction';

describe('Feature Extraction', () => {
  // Mock landmarks data
  const createMockLandmarks = () => {
    const landmarks = new Array(478).fill(null).map((_, i) => ({
      x: 0.5,
      y: 0.5,
      z: 0
    }));
    
    // Set specific eye landmarks
    landmarks[468] = { x: 0.45, y: 0.5, z: 0 }; // Left iris center
    landmarks[473] = { x: 0.55, y: 0.5, z: 0 }; // Right iris center
    landmarks[133] = { x: 0.4, y: 0.5, z: 0 };  // Left eye inner
    landmarks[33] = { x: 0.5, y: 0.5, z: 0 };   // Left eye outer
    landmarks[362] = { x: 0.5, y: 0.5, z: 0 };  // Right eye inner
    landmarks[263] = { x: 0.6, y: 0.5, z: 0 };  // Right eye outer
    landmarks[159] = { x: 0.45, y: 0.48, z: 0 }; // Left eye top
    landmarks[145] = { x: 0.45, y: 0.52, z: 0 }; // Left eye bottom
    landmarks[386] = { x: 0.55, y: 0.48, z: 0 }; // Right eye top
    landmarks[374] = { x: 0.55, y: 0.52, z: 0 }; // Right eye bottom
    
    return landmarks;
  };

  describe('extractEyeFeatures', () => {
    it('should return an object with 8 feature values', () => {
      const landmarks = createMockLandmarks();
      const features = extractEyeFeatures(landmarks);
      
      expect(features).toBeDefined();
      expect(typeof features).toBe('object');
      expect(Object.keys(features).length).toBe(6);
    });

    it('should calculate iris offsets correctly', () => {
      const landmarks = createMockLandmarks();
      const features = extractEyeFeatures(landmarks);
      
      expect(features.leftIrisX).toBeDefined();
      expect(features.leftIrisY).toBeDefined();
      expect(features.rightIrisX).toBeDefined();
      expect(features.rightIrisY).toBeDefined();
      expect(typeof features.leftIrisX).toBe('number');
      expect(typeof features.rightIrisX).toBe('number');
    });

    it('should calculate eye aperture correctly', () => {
      const landmarks = createMockLandmarks();
      const features = extractEyeFeatures(landmarks);
      
      expect(features.leftAperture).toBeDefined();
      expect(features.rightAperture).toBeDefined();
      expect(typeof features.leftAperture).toBe('number');
      expect(typeof features.rightAperture).toBe('number');
      expect(features.leftAperture).toBeGreaterThan(0);
      expect(features.rightAperture).toBeGreaterThan(0);
    });

    it('should handle missing landmarks gracefully', () => {
      const landmarks = new Array(400).fill({ x: 0.5, y: 0.5, z: 0 });
      
      expect(() => extractEyeFeatures(landmarks)).not.toThrow();
    });
  });

  describe('validateFeatures', () => {
    it('should validate normal features as true', () => {
      const features = {
        leftIrisX: 0.5,
        leftIrisY: 0.5,
        leftAperture: 0.04,
        rightIrisX: 0.5,
        rightIrisY: 0.5,
        rightAperture: 0.04
      };
      
      expect(validateFeatures(features)).toBe(true);
    });

    it('should invalidate features with very small aperture (blink)', () => {
      const features = {
        leftIrisX: 0.5,
        leftIrisY: 0.5,
        leftAperture: 0.001,  // Very small = blink
        rightIrisX: 0.5,
        rightIrisY: 0.5,
        rightAperture: 0.04
      };
      
      expect(validateFeatures(features)).toBe(false);
    });

    it('should invalidate features with extreme iris offset', () => {
      const features = {
        leftIrisX: 5.0,  // Way too large
        leftIrisY: 0.5,
        leftAperture: 0.04,
        rightIrisX: 0.5,
        rightIrisY: 0.5,
        rightAperture: 0.04
      };
      
      expect(validateFeatures(features)).toBe(false);
    });
  });
});
