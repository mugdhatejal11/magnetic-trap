// ===== PHYSICS CORE (copied verbatim into the page) =====
// Units: Earth radius = 1, field at the surface equator = 1, particle speed = 1.
// Dipole along z: B = (3xz, 3yz, 3z^2 - r^2) / r^5.   dv/dt = QM * (v x B)
// QM (charge/mass) is a stand-in value chosen so the spiral is much tighter than the
// field's curvature, which is what makes the textbook trapping theory apply.
const QM = 8000;
const _B = [0, 0, 0];
function dipoleB(x, y, z, out) {
  out = out || [0, 0, 0];
  const r2 = x * x + y * y + z * z, r5 = Math.pow(r2, 2.5);
  out[0] = 3 * x * z / r5; out[1] = 3 * y * z / r5; out[2] = (3 * z * z - r2) / r5;
  return out;
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
// Boris rotation, scalar form. Rotates v about B by the gyro-angle for time h; |v| is preserved exactly.
function borisRotate(s, bx, by, bz, h) {
  const k = 0.5 * h * s.QM;
  const tx = k * bx, ty = k * by, tz = k * bz;
  const f = 2 / (1 + tx * tx + ty * ty + tz * tz);
  const sx = tx * f, sy = ty * f, sz = tz * f;
  const vx = s.vx, vy = s.vy, vz = s.vz;
  const px = vx + (vy * tz - vz * ty), py = vy + (vz * tx - vx * tz), pz = vz + (vx * ty - vy * tx);
  s.vx = vx + (py * sz - pz * sy);
  s.vy = vy + (pz * sx - px * sz);
  s.vz = vz + (px * sy - py * sx);
}
function makeParticle(L, alphaDeg, method, dt) {
  const a = alphaDeg * Math.PI / 180;
  const s = { x: L, y: 0, z: 0, vx: 0, vy: Math.sin(a), vz: Math.cos(a), QM, method, dt, h: dt, t: 0 };
  if (method === 'boris') { // leapfrog: velocity lives half a step behind position
    dipoleB(s.x, s.y, s.z, _B);
    borisRotate(s, _B[0], _B[1], _B[2], -0.5 * dt);
  }
  return s;
}
function stepParticle(s) {
  const h = s.h;
  if (s.method === 'boris') {
    dipoleB(s.x, s.y, s.z, _B);
    borisRotate(s, _B[0], _B[1], _B[2], h);
    s.x += s.vx * h; s.y += s.vy * h; s.z += s.vz * h;
  } else if (s.method === 'euler') {
    const c = cross([s.vx, s.vy, s.vz], dipoleB(s.x, s.y, s.z));
    const nx = s.x + s.vx * h, ny = s.y + s.vy * h, nz = s.z + s.vz * h;
    s.vx += s.QM * c[0] * h; s.vy += s.QM * c[1] * h; s.vz += s.QM * c[2] * h;
    s.x = nx; s.y = ny; s.z = nz;
  } else { // rk4
    const q = s.QM;
    const acc = (p, v) => { const c = cross(v, dipoleB(p[0], p[1], p[2])); return [q * c[0], q * c[1], q * c[2]]; };
    const add = (a, b, f) => [a[0] + f * b[0], a[1] + f * b[1], a[2] + f * b[2]];
    const p = [s.x, s.y, s.z], v = [s.vx, s.vy, s.vz];
    const k1v = acc(p, v);
    const p2 = add(p, v, 0.5 * h), v2 = add(v, k1v, 0.5 * h), k2v = acc(p2, v2);
    const p3 = add(p, v2, 0.5 * h), v3 = add(v, k2v, 0.5 * h), k3v = acc(p3, v3);
    const p4 = add(p, v3, h), v4 = add(v, k3v, h), k4v = acc(p4, v4);
    s.x += h / 6 * (v[0] + 2 * v2[0] + 2 * v3[0] + v4[0]);
    s.y += h / 6 * (v[1] + 2 * v2[1] + 2 * v3[1] + v4[1]);
    s.z += h / 6 * (v[2] + 2 * v2[2] + 2 * v3[2] + v4[2]);
    s.vx += h / 6 * (k1v[0] + 2 * k2v[0] + 2 * k3v[0] + k4v[0]);
    s.vy += h / 6 * (k1v[1] + 2 * k2v[1] + 2 * k3v[1] + k4v[1]);
    s.vz += h / 6 * (k1v[2] + 2 * k2v[2] + 2 * k3v[2] + k4v[2]);
  }
}
// Advance to simulated time tEnd. cap > 0 ("careful"): the step shrinks wherever the particle
// spins fast (step <= cap / gyrofrequency). cap = 0 ("careless"): fixed step s.dt.
// Returns the number of steps taken; stops early after maxSteps so a frame never freezes.
function advance(s, tEnd, cap, maxSteps) {
  let n = 0;
  while (s.t < tEnd && n < maxSteps) {
    let h = s.dt;
    if (cap > 0) {
      dipoleB(s.x, s.y, s.z, _B);
      const w = s.QM * Math.sqrt(_B[0] * _B[0] + _B[1] * _B[1] + _B[2] * _B[2]);
      h = Math.min(s.dt, cap / w);
    }
    s.h = h;
    stepParticle(s);
    s.t += h;
    n++;
  }
  return n;
}
// Centre of the little circle the particle spins around: R = x + (v x B) / (QM |B|^2)
function guidingCenter(s, out) {
  dipoleB(s.x, s.y, s.z, _B);
  const B2 = _B[0] * _B[0] + _B[1] * _B[1] + _B[2] * _B[2];
  const f = 1 / (s.QM * B2);
  out[0] = s.x + (s.vy * _B[2] - s.vz * _B[1]) * f;
  out[1] = s.y + (s.vz * _B[0] - s.vx * _B[2]) * f;
  out[2] = s.z + (s.vx * _B[1] - s.vy * _B[0]) * f;
  return out;
}
// B(latitude) / B(equator) along a dipole field line
function bRatio(lam) { return Math.sqrt(1 + 3 * Math.sin(lam) ** 2) / Math.pow(Math.cos(lam), 6); }
// Latitude (rad) where a particle with equatorial pitch angle alpha (rad) turns around.
function mirrorLatitude(alpha) {
  const target = 1 / (Math.sin(alpha) ** 2);
  let lo = 0, hi = 89.5 * Math.PI / 180;
  for (let i = 0; i < 80; i++) { const m = 0.5 * (lo + hi); if (bRatio(m) < target) lo = m; else hi = m; }
  return 0.5 * (lo + hi);
}
// Smallest pitch angle (deg) that still turns around above the surface on field line L.
function lossConeDeg(L) {
  const lamS = Math.acos(Math.sqrt(1 / L));
  return Math.asin(Math.sqrt(1 / bRatio(lamS))) * 180 / Math.PI;
}
// ===== END PHYSICS CORE =====
