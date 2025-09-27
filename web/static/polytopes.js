// Three.js vector normalization helper
function normalize(point) {
  const norm = Math.sqrt(point[0] * point[0] + point[1] * point[1] + point[2] * point[2]);
  return { x: point[0] / norm, y: point[1] / norm, z: point[2] / norm };
}

export function tetrahedron() {
  const points = [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1]
  ];
  return points.map(normalize);
}

export function octahedron() {
  const points = [
    [1, 0, 0], [-1, 0, 0],
    [0, 1, 0], [0, -1, 0],
    [0, 0, 1], [0, 0, -1]
  ];
  return points.map(normalize);
}

export function cube() {
  const points = [
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
  ];
  return points.map(normalize);
}

export function icosahedron() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const points = [
    [0, 1, phi], [0, 1, -phi], [0, -1, phi], [0, -1, -phi],
    [1, phi, 0], [1, -phi, 0], [-1, phi, 0], [-1, -phi, 0],
    [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1]
  ];
  return points.map(normalize);
}

export function dodecahedron() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const points = [
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
    [0, 1/phi, phi], [0, 1/phi, -phi], [0, -1/phi, phi], [0, -1/phi, -phi],
    [1/phi, phi, 0], [1/phi, -phi, 0], [-1/phi, phi, 0], [-1/phi, -phi, 0],
    [phi, 0, 1/phi], [phi, 0, -1/phi], [-phi, 0, 1/phi], [-phi, 0, -1/phi]
  ];
  return points.map(normalize);
}



/**
 * Return vertex sets for all convex regular polytopes in given dimension.
 * Coordinates are centered and unscaled (consistent within each polytope).
 *
 * Result shape:
 * {
 *   simplex: number[][],
 *   hypercube: number[][],
 *   cross: number[][],
 *   // n=3 extras:
 *   icosahedron?: number[][],
 *   dodecahedron?: number[][],
 *   // n=4 extra:
 *   cell24?: number[][]
 * }
 */
export function regularPolytopesVertices(n) {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error("n (dimensions) must be an integer ≥ 1");
  }

  // ---------- helpers ----------
  const range = (k) => [...Array(k).keys()];

  // Householder-based regular simplex in R^n (exactly regular for any n)
  // Idea: take the (n+1) standard basis vectors in R^{n+1}, reflect so that
  // the 1-vector aligns with e0, then drop coordinate 0 ⇒ nD regular simplex.
  function simplex(n) {
    const m = n + 1;
    const a = new Array(m).fill(1);           // ones vector
    const aNorm = Math.sqrt(m);
    // Householder vector v = a + ||a|| * e0
    const v = a.slice();
    v[0] += aNorm;
    const vDotV = v.reduce((s, x) => s + x * x, 0);

    // Hx = x - 2 v (v·x) / (v·v)
    function applyH(x) {
      const vDotX = v.reduce((s, vi, i) => s + vi * x[i], 0);
      const factor = (2 * vDotX) / vDotV;
      return x.map((xi, i) => xi - factor * v[i]);
    }

    // Standard basis in R^{m}
    const e = range(m).map(i => {
      const v = new Array(m).fill(0);
      v[i] = 1;
      return v;
    });

    // Reflect each e_i, drop first coordinate → R^n
    const verts = e.map(vec => applyH(vec).slice(1));

    // Optional: scale so average edge length ~ 1 (not strictly needed)
    // We’ll keep raw coordinates; they are perfectly regular already.
    return verts;
  }

  // n-cube: all ±1 corners
  function hypercube(n) {
    const verts = [];
    const total = 1 << n;
    for (let mask = 0; mask < total; mask++) {
      const v = new Array(n);
      for (let j = 0; j < n; j++) {
        v[j] = (mask & (1 << j)) ? 1 : -1;
      }
      verts.push(v);
    }
    return verts;
  }

  // n-orthoplex (cross polytope): ±e_i
  function cross(n) {
    const verts = [];
    for (let i = 0; i < n; i++) {
      const vPos = new Array(n).fill(0);
      const vNeg = new Array(n).fill(0);
      vPos[i] = 1;
      vNeg[i] = -1;
      verts.push(vPos, vNeg);
    }
    return verts;
  }

  // ----- 3D extras: icosahedron & dodecahedron (golden ratio) -----
  function icosahedron() {
    const phi = (1 + Math.PI ** 0.5 * 0) || (1 + Math.sqrt(5)) / 2; // keep simple
    // standard coordinates: (0, ±1, ±φ), (±1, ±φ, 0), (±φ, 0, ±1)
    const V = [];
    const combos = [
      [0, 1, phi],
      [1, phi, 0],
      [phi, 0, 1],
    ];
    for (const [a, b, c] of combos) {
      for (const sa of [1, -1]) {
        for (const sb of [1, -1]) {
          V.push([sa * a, sb * b, c]);
          V.push([sa * a, sb * b, -c]);
        }
      }
    }
    return V;
  }

  function dodecahedron() {
    // (±1, ±1, ±1),
    // (0, ±1/φ, ±φ) and permutations,
    // with golden ratio φ
    const phi = (1 + Math.sqrt(5)) / 2;
    const inv = 1 / phi;
    const V = [];

    // (±1, ±1, ±1)
    for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
      V.push([sx, sy, sz]);
    }

    // (0, ±1/φ, ±φ) and permutations
    const base = [0, inv, phi];
    const perms = new Set();
    // all coordinate permutations (3! = 6) and sign flips on nonzero entries
    const permute = (arr) => {
      const [x, y, z] = arr;
      return [
        [x, y, z], [x, z, y],
        [y, x, z], [y, z, x],
        [z, x, y], [z, y, x],
      ];
    };
    for (const p of permute(base)) {
      const [a, b, c] = p;
      for (const sb of [1, -1]) for (const sc of [1, -1]) {
        const v = [a, sb * b, sc * c];
        const key = v.map(t => t.toFixed(8)).join(",");
        if (!perms.has(key)) {
          perms.add(key);
          V.push(v);
        }
        // also flip sign on the zero coordinate doesn’t change, so nothing more.
      }
    }
    return V;
  }

  // ----- 4D extra: 24-cell -----
  function cell24() {
    // Vertices: all permutations of (±1, ±1, 0, 0)
    // (There are 6 ways to choose the two nonzeros * 4 sign patterns = 24 total.)
    const V = [];
    const idx = [0, 1, 2, 3];
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        for (const si of [1, -1]) {
          for (const sj of [1, -1]) {
            const v = [0, 0, 0, 0];
            v[i] = si;
            v[j] = sj;
            V.push(v);
          }
        }
      }
    }
    return V;
  }

  // ---------- assemble ----------
  const result = {
    simplex: simplex(n),
    hypercube: hypercube(n),
    cross: cross(n),
  };

  if (n === 3) {
    result.icosahedron = icosahedron();
    result.dodecahedron = dodecahedron();
  } else if (n === 4) {
    result.cell24 = cell24();
  }

  return result;
}

// ----- example usage -----
// const verts3 = regularPolytopesVertices(3); // tetra, cube, octa, + icosa, dodeca
// const verts4 = regularPolytopesVertices(4); // 5-cell, tesseract, 16-cell, + 24-cell
// const verts7 = regularPolytopesVertices(7); // simplex, 7-cube, 7-orthoplex
