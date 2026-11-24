/* Mechanical feel for the rotatable astrolabe (v2.1.0).
   A vault-lock dial: it follows the hand exactly while held (no snapping, no steps), keeps a little
   momentum when let go, and coasts to rest under viscous plus dry friction. A fine mode scales the hand's
   motion down for precise settings; the wheel and keyboard nudge through a critically damped glide.
   Pure maths, no DOM, so the behaviour is unit-tested. */
export const DIAL_DEFAULTS = Object.freeze({
  viscous: 2.1,        // 1/s, speed-proportional drag: long, smooth deceleration
  dry: 22,             // deg/s², small constant drag so it comes to a clean stop
  maxSpeed: 900,       // deg/s
  stopBelow: 0.6,      // deg/s
  fineGain: 0.12,      // hand motion multiplier in fine mode
  velocityTau: 0.05,   // s, smoothing of the release velocity
  holdMs: 110,         // a pause this long before release means "set it here", no coasting
  glideStiffness: 70   // wheel / keyboard glide
});

const wrap180 = deg => ((((deg + 180) % 360) + 360) % 360) - 180;
export { wrap180 };

export class DialPhysics {
  constructor(options = {}) {
    this.o = { ...DIAL_DEFAULTS, ...options };
    this.angle = 0;
    this.velocity = 0;
    this.mode = 'idle';      // idle | drag | coast | glide
    this.last = null;        // { pointer, t }
    this.target = 0;
    this.lastMoveT = 0;
  }

  grab(pointerAngle, t) {
    this.mode = 'drag';
    this.velocity = 0;
    this.last = { pointer: pointerAngle, t };
    this.lastMoveT = t;
  }

  /** Follow the hand. `fine` makes the dial turn a fraction of the hand's motion. */
  drag(pointerAngle, t, fine = false) {
    if (this.mode !== 'drag' || !this.last) return this.angle;
    const gain = fine ? this.o.fineGain : 1;
    const delta = wrap180(pointerAngle - this.last.pointer) * gain;
    const dt = Math.max(0.001, (t - this.last.t) / 1000);
    this.angle += delta;
    const instant = Math.max(-this.o.maxSpeed, Math.min(this.o.maxSpeed, delta / dt));
    const a = 1 - Math.exp(-dt / this.o.velocityTau);
    this.velocity += (instant - this.velocity) * a;
    this.last = { pointer: pointerAngle, t };
    this.lastMoveT = t;
    return this.angle;
  }

  release(t) {
    if (this.mode !== 'drag') return;
    this.last = null;
    if (t - this.lastMoveT > this.o.holdMs || Math.abs(this.velocity) < this.o.stopBelow * 4) {
      this.velocity = 0;
      this.mode = 'idle';
    } else {
      this.mode = 'coast';
    }
  }

  /** Ease by `deg` (wheel, keyboard). Repeated nudges add up on the same glide. */
  nudge(deg) {
    if (this.mode === 'drag') return;
    if (this.mode !== 'glide') this.target = this.angle;
    this.target += deg;
    this.mode = 'glide';
    this.velocity = 0;
  }

  /** Glide back to the upright position along the shortest way. */
  reset() {
    if (this.mode === 'drag') return;
    this.target = this.angle + wrap180(0 - this.angle);
    this.mode = 'glide';
    this.velocity = 0;
  }

  step(dt) {
    dt = Math.min(0.05, Math.max(0, dt));
    if (!dt) return this.angle;
    if (this.mode === 'coast') {
      const v = this.velocity;
      const drag = this.o.viscous * v + this.o.dry * Math.sign(v);
      let next = v - drag * dt;
      if (Math.sign(next) !== Math.sign(v) || Math.abs(next) < this.o.stopBelow) { next = 0; this.mode = 'idle'; }
      this.angle += (v + next) / 2 * dt;
      this.velocity = next;
    } else if (this.mode === 'glide') {
      const k = this.o.glideStiffness;
      const accel = (this.target - this.angle) * k - 2 * Math.sqrt(k) * this.velocity;
      this.velocity += accel * dt;
      this.angle += this.velocity * dt;
      if (Math.abs(this.target - this.angle) < 0.004 && Math.abs(this.velocity) < 0.05) {
        this.angle = this.target; this.velocity = 0; this.mode = 'idle';
        if (Math.abs(this.angle) > 720) { this.angle = wrap180(this.angle); }
      }
    }
    return this.angle;
  }

  get moving() { return this.mode !== 'idle'; }
}
