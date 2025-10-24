/**
 * Dwell Timer Module for NovaVista FreeGaze
 * Detects gaze fixation and triggers click events
 */

/**
 * Calculate Euclidean distance between two points
 */
function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * DwellDetector class
 * Monitors gaze position and triggers clicks on fixation
 */
export class DwellDetector {
  constructor(options = {}) {
    this.dwellTime = options.dwellTime || 1500;     // Time to hold gaze (ms)
    this.threshold = options.threshold || 50;       // Movement threshold (px)
    this.enabled = options.enabled !== false;       // Enabled by default
    
    this.dwellStart = null;
    this.lastPosition = null;
    this.isDwelling = false;
    this.clickCallback = null;
    this.progressCallback = null;
  }

  /**
   * Update with new gaze position
   * @param {Object} position - {x, y} screen coordinates
   * @returns {Object|null} Event object or null
   */
  update(position) {
    if (!this.enabled || !position) {
      return null;
    }

    const now = Date.now();

    // Initialize on first position
    if (!this.lastPosition) {
      this.lastPosition = position;
      this.dwellStart = now;
      this.isDwelling = true;
      return { type: 'dwell_start', position };
    }

    // Calculate movement distance
    const dist = distance(position, this.lastPosition);

    // Check if still dwelling (within threshold)
    if (dist < this.threshold) {
      // Still dwelling
      const elapsed = now - this.dwellStart;
      const progress = Math.min(elapsed / this.dwellTime, 1.0);

      // Call progress callback
      if (this.progressCallback) {
        this.progressCallback(progress, position);
      }

      // Check if dwell time reached
      if (elapsed >= this.dwellTime) {
        // Trigger click!
        const event = {
          type: 'click',
          position: { ...this.lastPosition },
          dwellTime: elapsed
        };

        // Call click callback
        if (this.clickCallback) {
          this.clickCallback(event);
        }

        // Reset after click
        this.reset();
        this.lastPosition = position;
        this.dwellStart = now;

        return event;
      }

      // Return dwell progress
      return {
        type: 'dwell_progress',
        position: { ...this.lastPosition },
        progress,
        elapsed
      };

    } else {
      // Moved away - reset
      const wasDwelling = this.isDwelling;
      
      this.reset();
      this.lastPosition = position;
      this.dwellStart = now;
      this.isDwelling = true;

      if (wasDwelling) {
        return { type: 'dwell_cancel', position };
      }

      return { type: 'dwell_start', position };
    }
  }

  /**
   * Reset dwell state
   */
  reset() {
    this.dwellStart = null;
    this.isDwelling = false;
  }

  /**
   * Set click callback
   * @param {Function} callback - Called on click
   */
  onClick(callback) {
    this.clickCallback = callback;
  }

  /**
   * Set progress callback
   * @param {Function} callback - Called during dwell progress
   */
  onProgress(callback) {
    this.progressCallback = callback;
  }

  /**
   * Enable/disable dwell detection
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.reset();
    }
  }

  /**
   * Update dwell time
   * @param {number} time - Dwell time in ms
   */
  setDwellTime(time) {
    this.dwellTime = time;
  }

  /**
   * Update movement threshold
   * @param {number} threshold - Threshold in pixels
   */
  setThreshold(threshold) {
    this.threshold = threshold;
  }

  /**
   * Get current dwell progress
   * @returns {number} Progress (0-1)
   */
  getProgress() {
    if (!this.isDwelling || !this.dwellStart) {
      return 0;
    }
    const elapsed = Date.now() - this.dwellStart;
    return Math.min(elapsed / this.dwellTime, 1.0);
  }

  /**
   * Check if currently dwelling
   * @returns {boolean}
   */
  isDwellingNow() {
    return this.isDwelling && this.dwellStart !== null;
  }
}

// Export singleton instance
export const dwellDetector = new DwellDetector({
  dwellTime: 600,  // Reduced from 1500ms to 600ms (much better UX)
  threshold: 50,
  enabled: true
});

export default DwellDetector;
