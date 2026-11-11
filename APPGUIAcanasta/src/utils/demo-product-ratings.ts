export function getDemoProductRating(productId: number): number {
  const seed = Math.imul(productId ^ 0x45d9f3b, 0x45d9f3b);
  const hash = (seed ^ (seed >>> 16)) >>> 0;
  return 4 + ((hash % 11) / 10);
}
