export interface DemoDiscount {
  percentage: number;
  originalPrice: number;
  salePrice: number;
}

const DEMO_DISCOUNTS: { product: string; percentage: number }[] = [
  { product: 'arroz blanco tradicional', percentage: 10 },
  { product: 'lentejas limpias', percentage: 12 },
  { product: 'leche entera larga vida', percentage: 8 },
  { product: 'huevos rojos tipo aa', percentage: 10 },
  { product: 'pechuga de pollo fresca', percentage: 12 },
  { product: 'yuca dulce costena', percentage: 10 },
  { product: 'tomate chonto maduro', percentage: 15 },
  { product: 'aceite vegetal d1', percentage: 8 },
  { product: 'pan blandito costeno', percentage: 10 },
  { product: 'cafe tostado y molido tradicional', percentage: 12 },
  { product: 'detergente en polvo multiusos', percentage: 10 },
];

export function getDemoDiscount(name: string, originalPrice: number | null | undefined): DemoDiscount | null {
  const price = Number(originalPrice);
  if (!Number.isFinite(price) || price <= 0) return null;

  const normalizedName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const promotion = DEMO_DISCOUNTS.find((item) => normalizedName.includes(item.product));
  if (!promotion) return null;

  return {
    percentage: promotion.percentage,
    originalPrice: price,
    salePrice: Math.round(price * (1 - promotion.percentage / 100)),
  };
}

export function displayPrice(name: string, price: number | null | undefined): number | null {
  const amount = Number(price);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return getDemoDiscount(name, amount)?.salePrice ?? amount;
}
