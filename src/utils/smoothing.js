/**
 * Smoothing Filter Module for NovaVista FreeGaze
 * Implements 1€ Filter for gaze coordinate smoothing
 * Reference: http://cristal.univ-lille.fr/~casiez/1euro/
 */

/**
 * 1€ Filter implementation
 * Reduces jitter while maintaining responsiveness
 */
class OneEuroFilter {
  constructor(freq, mincutoff = 1.0, beta = 0.007, dcutoff = 1.0) {
    this.freq = freq;          // Sample frequency (Hz)
    this.mincutoff = mincutoff; // Minimum cutoff frequency
    this.beta = beta;           // Speed coefficient
    this.dcutoff = dcutoff;     // Derivative cutoff frequency
    
    this.x = null;              // Previous filtered value
    this.dx = 0;                // Previous derivative
    this.lasttime = null;       // Last sample time
  }

  /**
   * Apply low-pass filter
   */
  lowpass(value, alpha) {
    if (this.x === null) {
      return value;
    }
    return alpha * value + (1 - alpha) * this.x;
  }

  /**
   * Calculate smoothing factor alpha
   */
  alpha(cutoff) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    const te = 1.0 / this.freq;
    return 1.0 / (1.0 + tau / te);
  }

  /**
   * Filter a value
   * @param {number} value - Raw value to filter
   * @param {number} timestamp - Current timestamp (ms)
   * @returns {number} Filtered value
   */
  filter(value, timestamp = Date.now()) {
    // Initialize on first call
    if (this.lasttime === null) {
      this.x = value;
      this.dx = 0;
      this.lasttime = timestamp;
      return value;
    }

    // Calculate time delta
    const dt = (timestamp - this.lasttime) / 1000; // Convert to seconds
    this.lasttime = timestamp;

    // Update frequency if needed
    if (dt > 0) {
      this.freq = 1.0 / dt;
    }

    // Calculate derivative
    const dvalue = (value - this.x) / dt;

    // Smooth derivative
    const edvalue = this.lowpass(dvalue, this.alpha(this.dcutoff));
    this.dx = edvalue;

    // Calculate adaptive cutoff
    const cutoff = this.mincutoff + this.beta * Math.abs(edvalue);

    // Filter the value
    this.x = this.lowpass(value, this.alpha(cutoff));

    return this.x;
  }

  /**
   * Reset filter state
   */
  reset() {
    this.x = null;
    this.dx = 0;
    this.lasttime = null;
  }
}

/**
 * Gaze coordinate smoother using 1€ Filter
 */
export class GazeSmoother {
  constructor(freq = 30) {
    this.xFilter = new OneEuroFilter(freq, 1.0, 0.007, 1.0);
    this.yFilter = new OneEuroFilter(freq, 1.0, 0.007, 1.0);
  }

  /**
   * Smooth gaze coordinates
   * @param {number} x - Raw X coordinate
   * @param {number} y - Raw Y coordinate
   * @param {number} timestamp - Current timestamp
   * @returns {Object} {x, y} smoothed coordinates
   */
  smooth(x, y, timestamp = Date.now()) {
    return {
      x: this.xFilter.filter(x, timestamp),
      y: this.yFilter.filter(y, timestamp)
    };
  }

  /**
   * Reset smoother state
   */
  reset() {
    this.xFilter.reset();
    this.yFilter.reset();
  }

  /**
   * Update filter parameters
   * @param {Object} params - {mincutoff, beta, dcutoff}
   */
  setParameters(params) {
    if (params.mincutoff !== undefined) {
      this.xFilter.mincutoff = params.mincutoff;
      this.yFilter.mincutoff = params.mincutoff;
    }
    if (params.beta !== undefined) {
      this.xFilter.beta = params.beta;
      this.yFilter.beta = params.beta;
    }
    if (params.dcutoff !== undefined) {
      this.xFilter.dcutoff = params.dcutoff;
      this.yFilter.dcutoff = params.dcutoff;
    }
  }
}

// Export singleton instance
export const gazeSmoother = new GazeSmoother(30);

export default GazeSmoother;
