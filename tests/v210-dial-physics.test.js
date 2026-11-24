import test from 'node:test';
import assert from 'node:assert/strict';
import { DialPhysics, wrap180 } from '../src/dial-physics.js';

const run = (dial, seconds, dt = 1 / 60) => { const out = []; for (let t = 0; t < seconds; t += dt) out.push(dial.step(dt)); return out; };

test('the dial follows the hand 1:1 with no snapping to steps', () => {
  const d = new DialPhysics();
  d.grab(10, 0);
  const a = d.drag(13.37, 16);
  assert.ok(Math.abs(a - 3.37) < 1e-9, 'moves by exactly the hand delta');
  d.drag(13.9, 32);
  assert.ok(Math.abs(d.angle - 3.9) < 1e-9);
});

test('pointer wrap-around at 180 degrees never causes a jump', () => {
  const d = new DialPhysics();
  d.grab(179, 0); d.drag(-179, 16);   // +2 degrees through the wrap
  assert.ok(Math.abs(d.angle - 2) < 1e-9);
  assert.equal(wrap180(190), -170);
});

test('fine mode turns the dial by a small fraction of the hand motion', () => {
  const d = new DialPhysics();
  d.grab(0, 0); d.drag(20, 16, true);
  assert.ok(Math.abs(d.angle - 20 * d.o.fineGain) < 1e-9);
  assert.ok(d.angle < 3);
});

test('a fast flick keeps momentum and decelerates smoothly to a stop', () => {
  const d = new DialPhysics();
  d.grab(0, 0);
  for (let i = 1; i <= 8; i++) d.drag(i * 8, i * 16);       // 8 deg per 16 ms = 500 deg/s
  const atRelease = d.angle;
  d.release(8 * 16 + 5);
  assert.equal(d.mode, 'coast');
  const track = run(d, 12);
  assert.ok(track.at(-1) > atRelease + 40, 'coasts forward');
  for (let i = 1; i < track.length; i++) assert.ok(track[i] >= track[i - 1] - 1e-9, 'never reverses');
  // speed (per frame step) never increases while coasting
  let prev = Infinity;
  for (let i = 1; i < track.length; i++) { const s = track[i] - track[i - 1]; assert.ok(s <= prev + 1e-9); prev = s; }
  assert.equal(d.mode, 'idle');
  assert.equal(d.velocity, 0);
});

test('releasing after a pause leaves the dial exactly where it was set', () => {
  const d = new DialPhysics();
  d.grab(0, 0); d.drag(30, 16); d.drag(30.2, 400);
  const at = d.angle; d.release(900);
  assert.equal(d.mode, 'idle');
  run(d, 1);
  assert.equal(d.angle, at);
});

test('wheel and keyboard nudges glide and accumulate without overshoot', () => {
  const d = new DialPhysics();
  d.nudge(0.5); d.nudge(0.5);
  const track = run(d, 2);
  assert.ok(Math.abs(track.at(-1) - 1) < 1e-6);
  assert.ok(Math.max(...track) <= 1 + 1e-3, 'critically damped: no overshoot');
  assert.equal(d.mode, 'idle');
});

test('reset glides home by the shortest way', () => {
  const d = new DialPhysics();
  d.angle = 350; d.reset();
  const track = run(d, 3);
  assert.ok(Math.abs(wrap180(track.at(-1))) < 1e-3);
  assert.ok(track[5] > 350, 'turns forward through 360 rather than back through 350 degrees');
});

test('grabbing a coasting dial stops it at once', () => {
  const d = new DialPhysics();
  d.mode = 'coast'; d.velocity = 400;
  d.grab(0, 0);
  assert.equal(d.velocity, 0);
  assert.equal(d.mode, 'drag');
});
