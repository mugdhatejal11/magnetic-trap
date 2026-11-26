const fs = require('fs');
const P = new Function(fs.readFileSync(__dirname + '/../src/physics_core.js', 'utf8') +
  '; return { makeParticle, advance, guidingCenter, mirrorLatitude, lossConeDeg, dipoleB };')();
const { makeParticle, advance, guidingCenter, mirrorLatitude, lossConeDeg } = P;

function run(L, a, method, dt, cap, T) {
  const s = makeParticle(L, a, method, dt);
  const sp0 = Math.hypot(s.vx, s.vy, s.vz);
  let zmax = 0, ev = 'ok', steps = 0, cross = 0, prevz = 0;
  const gc = [0, 0, 0];
  for (let t = 0.02; t <= T; t += 0.02) {
    steps += advance(s, t, cap, 1e6);
    const r = Math.hypot(s.x, s.y, s.z), sp = Math.hypot(s.vx, s.vy, s.vz);
    if (!isFinite(r) || sp > 4 || r > 25) { ev = 'EXPLODED'; break; }
    if (r < 1) { ev = 'LOST'; break; }
    guidingCenter(s, gc);
    zmax = Math.max(zmax, Math.abs(gc[2]));
    if (prevz !== 0 && Math.sign(gc[2]) !== Math.sign(prevz)) cross++;
    prevz = gc[2];
  }
  const sp = Math.hypot(s.vx, s.vy, s.vz);
  return { ev, zmax, drift: sp / sp0 - 1, steps, t: s.t, cross };
}
const lam = mirrorLatitude(30 * Math.PI / 180);
const zp = 4 * Math.cos(lam) ** 2 * Math.sin(lam);
let r = run(4, 30, 'boris', 0.05, 0.2, 60);
console.log('boris careful 30deg L=4 T=60:', r.ev, 'mirror(guiding centre) ' + r.zmax.toFixed(3) + ' theory ' + zp.toFixed(3), 'drift', r.drift.toExponential(1), 'equator crossings', r.cross);
for (const m of ['rk4', 'euler']) { r = run(4, 30, m, 0.05, 0.2, 60); console.log(m, 'careful:', r.ev, 'drift ' + (100 * r.drift).toFixed(2) + '%'); }
for (const m of ['boris', 'rk4', 'euler']) { r = run(4, 30, m, 0.005, 0, 40); console.log(m, 'careless dt=0.005:', r.ev, 'drift ' + (100 * r.drift).toFixed(2) + '%', 'mirror ' + r.zmax.toFixed(2)); }

// loss-cone / pitch / L grid vs theory
let bad = [];
for (const L of [2, 3, 4, 5, 6, 7]) {
  const lc = lossConeDeg(L);
  for (const a of [3, 5, 8, 12, 20, 30, 45, 60, 80, 88]) {
    const res = run(L, a, 'boris', 0.05, 0.2, 40);
    if ((res.ev === 'LOST') !== (a < lc) && Math.abs(a - lc) > 1) bad.push(`L${L}/${a}`);
  }
}
console.log('loss-cone grid mismatches:', bad.length ? bad.join(' ') : 'none');

// speed
const t0 = process.hrtime.bigint();
const s = makeParticle(4, 30, 'boris', 0.05);
const n = advance(s, 1e9 > 0 ? 25 : 0, 0.2, 5e6);
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
console.log(`perf: ${n} steps in ${ms.toFixed(0)} ms => ${(n / ms * 1000 / 1e6).toFixed(1)} M steps/s`);
