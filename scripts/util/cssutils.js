export function css2matrix(s) {
  return new DOMMatrix(s);
}

export function matrix2css(m) {
  if (m.$matrix) {
    m = m.$matrix;
  }

  return `matrix(${m.m11},${m.m12},${m.m21},${m.m22},${m.m41},${m.m42})`
}

