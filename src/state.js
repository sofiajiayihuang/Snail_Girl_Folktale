export const STEP = Math.PI * 2 / 3;
export const clampScale = n => Math.max(.75, Math.min(1.8, n));
export const sideForStep = n => ((-n % 3) + 3) % 3;
export class TableTurn {
  constructor(duration = 800) { this.duration = duration; this.angle = 0; this.steps = 0; this.queue = []; this.active = null; }
  turn(direction) { if (direction !== 1 && direction !== -1) return; this.queue.push(direction); }
  update(now, reduced = false) {
    if (!this.active && this.queue.length) this.active = { from: this.steps * STEP, to: (this.steps + this.queue.shift()) * STEP, start: now };
    if (!this.active) return false;
    const p = reduced ? 1 : Math.min(1, (now - this.active.start) / this.duration);
    const ease = p < .5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
    this.angle = this.active.from + (this.active.to-this.active.from)*ease;
    if (p === 1) { this.steps = Math.round(this.active.to / STEP); this.angle = this.steps * STEP; this.active = null; }
    return true;
  }
  get busy() { return !!this.active || this.queue.length > 0; }
  get side() { return sideForStep(this.steps); }
}
