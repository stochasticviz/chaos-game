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