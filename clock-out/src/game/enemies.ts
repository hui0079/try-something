export function patrol(x: number, dir: 1 | -1, left: number, right: number): { x: number; dir: 1 | -1 } {
  if (x <= left) return { x, dir: 1 }
  if (x >= right) return { x, dir: -1 }
  return { x, dir }
}
