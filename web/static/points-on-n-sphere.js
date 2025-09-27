/**
 * getEquidistantPointsOnUnitNSphereApproximation
 * ----------------------------------------------
 * Approximate n-point “even” placement on the unit n-sphere S^{n-1} in R^n
 * via a few iterations of pairwise repulsion projected onto the sphere.
 *
 * @param {number} dimensions  Ambient dimension n (points lie on S^{n-1} ⊂ R^n)
 * @param {number} nPoints     Number of points to place
 * @param {object} [opts]
 *   - seed: number (default 1)      Deterministic RNG seed
 *   - iterations: number            Default scales with nPoints
 *   - step0: number (default 0.12)  Initial step size
 *   - decay: number (default 0.97)  Per-iteration step decay multiplier
 *   - softening: number (default 1e-3)  Softening to avoid singular forces
 *   - power: number (default 2)     Force ~ 1 / r^(power); 2≈Coulomb-like, 3 stronger
 * @returns {Array<Float64Array>}    Array of length nPoints; each is Float64Array(dimensions)
 */
function getEquidistantPointsOnUnitNSphereApproximation(dimensions, nPoints, opts = {}) {
  if (!Number.isInteger(dimensions) || dimensions < 2) {
    throw new Error("dimensions must be an integer ≥ 2 (points lie on S^{n-1}).");
  }
  if (!Number.isInteger(nPoints) || nPoints < 2) {
    throw new Error("nPoints must be an integer ≥ 2.");
  }

  const {
    seed = 1,
    iterations = Math.max(40, Math.min(300, Math.round(20 + 6 * Math.log2(nPoints * dimensions + 3)))),
    step0 = 0.12,
    decay = 0.97,
    softening = 1e-3,
    power = 2,
  } = opts;

  // --- tiny deterministic RNG (xorshift32) + Box–Muller for N(0,1)
  let state = (seed >>> 0) || 1;
  const rand = () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17; state >>>= 0;
    state ^= state << 5;  state >>>= 0;
    return (state >>> 0) / 0x100000000;
  };
  const randn = (() => {
    let spare = null;
    return () => {
      if (spare !== null) { const v = spare; spare = null; return v; }
      let u = 0, v = 0, s = 0;
      do {
        u = 2 * rand() - 1;
        v = 2 * rand() - 1;
        s = u * u + v * v;
      } while (s === 0 || s >= 1);
      const m = Math.sqrt(-2 * Math.log(s) / s);
      spare = v * m;
      return u * m;
    };
  })();

  // --- helpers
  const norm = (x) => Math.hypot.apply(null, x);
  const normalizeInPlace = (x) => {
    const n = norm(x) || 1;
    for (let i = 0; i < x.length; i++) x[i] /= n;
  };

  // --- initialize points by normalizing Gaussian vectors (quasi-uniform on S^{n-1})
  const points = Array.from({ length: nPoints }, () => {
    const p = new Float64Array(dimensions);
    for (let d = 0; d < dimensions; d++) p[d] = randn();
    normalizeInPlace(p);
    return p;
  });

  // Early exits for trivial exact cases
  if (dimensions === 2) {
    // S^1: exact equal arc spacing on the circle
    for (let i = 0; i < nPoints; i++) {
      const theta = (2 * Math.PI * i) / nPoints;
      points[i][0] = Math.cos(theta);
      points[i][1] = Math.sin(theta);
    }
    return points;
  }

  // --- iterative repulsion on the sphere
  let step = step0;
  const forces = Array.from({ length: nPoints }, () => new Float64Array(dimensions));

  for (let it = 0; it < iterations; it++) {
    // zero forces
    for (let i = 0; i < nPoints; i++) forces[i].fill(0);

    // accumulate pairwise forces
    for (let i = 0; i < nPoints; i++) {
      const pi = points[i];
      for (let j = i + 1; j < nPoints; j++) {
        const pj = points[j];
        // chord vector (in R^n)
        let r2 = 0;
        for (let d = 0; d < dimensions; d++) {
          const diff = pi[d] - pj[d];
          r2 += diff * diff;
        }
        const r = Math.sqrt(r2 + softening * softening);
        // direction from j->i and i->j
        const scale = 1 / Math.pow(r, power); // repulsive magnitude
        for (let d = 0; d < dimensions; d++) {
          const dir = (pi[d] - pj[d]) / r;
          const f = scale * dir;
          forces[i][d] += f;
          forces[j][d] -= f;
        }
      }
    }

    // project forces to tangent plane and update + renormalize
    for (let i = 0; i < nPoints; i++) {
      const p = points[i];
      const f = forces[i];

      // Project f onto tangent plane at p: f_tan = f - (f·p) p
      let fp = 0;
      for (let d = 0; d < dimensions; d++) fp += f[d] * p[d];
      for (let d = 0; d < dimensions; d++) f[d] -= fp * p[d];

      // Update: p <- p + step * f_tan ; then renormalize to the sphere
      for (let d = 0; d < dimensions; d++) p[d] += step * f[d];
      normalizeInPlace(p);
    }

    step *= decay;
  }

  return points;
}

// --------- Example usage ---------
// const pts = getEquidistantPointsOnUnitNSphereApproximation(4, 8, { seed: 42 });
// console.log(pts.map(v => Array.from(v)));
