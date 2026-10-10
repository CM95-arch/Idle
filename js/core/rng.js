// Small seeded random generator (mulberry32). Its whole state is one number, so it saves with the game.
export function makeRng(seed = (Math.random() * 2 ** 32) >>> 0) {
  const r = { s: seed >>> 0 };
  r.next = () => {
    r.s = (r.s + 0x6d2b79f5) >>> 0;
    let t = r.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a, b) => a + (b - a) * r.next();
  r.int = (a, b) => Math.floor(a + (b - a + 1) * r.next());
  r.pick = (arr) => arr[Math.floor(r.next() * arr.length)];
  r.weighted = (arr, w) => {
    let total = 0; for (const x of arr) total += w(x);
    let roll = r.next() * total;
    for (const x of arr) { roll -= w(x); if (roll < 0) return x; }
    return arr[arr.length - 1];
  };
  return r;
}
export const restoreRng = (s) => makeRng(s);
