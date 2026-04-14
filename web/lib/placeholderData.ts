// Deterministic gradient generator - turns any string (artist/album/track
// name) into a stable two-color CSS linear-gradient.
export function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 60 + (Math.abs(hash >> 3) % 120)) % 360;
  return `linear-gradient(135deg, hsl(${h1} 70% 45%), hsl(${h2} 65% 30%))`;
}
