/**
 * TRS-80 Model III sound: cassette-port audio
 *
 * The Model III has no sound chip. Games make sound by toggling the
 * cassette output port (0xFF, bits 0-1) at audio rate — a 2-bit DAC:
 * level 1 drives the line positive, 2 negative, 0/3 rest at zero.
 *
 * IOSystem records level transitions with their T-state timestamps;
 * synthesizeSamples() (pure, unit-tested) turns one emulated time slice
 * of transitions into PCM samples; SoundDriver schedules those chunks
 * back-to-back on a WebAudio clock a few tens of ms ahead of playback.
 */

// 2-bit cassette DAC output level -> amplitude
const LEVEL_AMPLITUDE = [0, 1, -1, 0];

/**
 * Convert port-0xFF transitions in [fromCycle, toCycle) into PCM samples.
 *
 * @param {{t:number, level:number}[]} transitions - cycle-stamped levels
 * @param {number} fromCycle - slice start (CPU T-states)
 * @param {number} toCycle - slice end (CPU T-states)
 * @param {number} cpuHz - CPU clock (T-states per second)
 * @param {number} sampleRate - output sample rate
 * @param {number} startLevel - 2-bit level in effect at fromCycle
 * @returns {{samples: Float32Array, endLevel: number}}
 */
export function synthesizeSamples(
  transitions,
  fromCycle,
  toCycle,
  cpuHz,
  sampleRate,
  startLevel
) {
  const count = Math.max(
    0,
    Math.round(((toCycle - fromCycle) / cpuHz) * sampleRate)
  );
  const samples = new Float32Array(count);

  let level = startLevel & 3;
  let index = 0;
  for (const transition of transitions) {
    let at = Math.round(((transition.t - fromCycle) / cpuHz) * sampleRate);
    if (at < index) at = index; // clamp stale/reordered stamps
    if (at > count) at = count;
    samples.fill(LEVEL_AMPLITUDE[level], index, at);
    index = at;
    level = transition.level & 3;
  }
  samples.fill(LEVEL_AMPLITUDE[level], index);

  return { samples, endLevel: level };
}

/** True when a slice would be pure silence (no work to schedule). */
export function sliceIsSilent(transitions, startLevel) {
  return transitions.length === 0 && LEVEL_AMPLITUDE[startLevel & 3] === 0;
}

/**
 * WebAudio playback of synthesized slices. Construction is cheap; the
 * AudioContext is created (and resumed) only from ensureRunning(), which
 * must be called from a user-gesture handler — browsers refuse autoplay.
 */
export class SoundDriver {
  constructor() {
    this.enabled = true; // user preference (MACHINE menu)
    this.supported = typeof window !== "undefined" && !!window.AudioContext;
    this.ctx = null;
    this.gain = null;
    this.nextTime = 0;
    this.lastLevel = 0;
    // Keep scheduling briefly after the last transition so wave tails
    // aren't clipped, then go idle (no buffer churn at the READY prompt).
    this.hotFrames = 0;
  }

  /** Call from a user-gesture handler (keydown/click/tap). */
  ensureRunning() {
    if (!this.enabled || !this.supported) return;
    if (!this.ctx) {
      try {
        this.ctx = new window.AudioContext();
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 0.15; // beeper volume, not a jump scare
        this.gain.connect(this.ctx.destination);
      } catch {
        this.supported = false;
        return;
      }
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on && this.ctx && this.ctx.state === "running") {
      this.ctx.suspend().catch(() => {});
    }
    if (on) this.ensureRunning();
  }

  /**
   * Feed the transitions of the just-emulated slice [fromCycle, toCycle).
   * Always drains the system's transition log, even when muted, so the
   * log can't grow without bound.
   */
  pump(system, fromCycle, toCycle, cpuHz) {
    const transitions = system.io.drainSound();

    if (
      !this.enabled ||
      !this.ctx ||
      this.ctx.state !== "running" ||
      toCycle <= fromCycle
    ) {
      if (transitions.length) {
        this.lastLevel = transitions[transitions.length - 1].level & 3;
      }
      return;
    }

    if (transitions.length) {
      this.hotFrames = 30; // ~half a second of tail at 60 fps
    } else if (this.hotFrames <= 0 && sliceIsSilent(transitions, this.lastLevel)) {
      return; // idle silence: schedule nothing
    }
    this.hotFrames--;

    const { samples, endLevel } = synthesizeSamples(
      transitions,
      fromCycle,
      toCycle,
      cpuHz,
      this.ctx.sampleRate,
      this.lastLevel
    );
    this.lastLevel = endLevel;
    if (samples.length === 0) return;

    const buffer = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate);
    buffer.copyToChannel(samples, 0);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);

    // Chunks are scheduled seamlessly at nextTime; if playback caught up
    // (tab jank), restart a little ahead of the hardware clock.
    const now = this.ctx.currentTime;
    if (this.nextTime < now + 0.02) {
      this.nextTime = now + 0.08;
    }
    source.start(this.nextTime);
    this.nextTime += buffer.duration;
  }
}
