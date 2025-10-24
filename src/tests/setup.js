import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock MediaPipe and TensorFlow.js for testing
global.MediaPipe = {
  FaceMesh: vi.fn(),
};

global.navigator.mediaDevices = {
  getUserMedia: vi.fn(),
};

// Suppress console errors in tests
global.console.error = vi.fn();
