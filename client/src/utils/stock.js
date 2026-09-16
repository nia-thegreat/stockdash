export const STATUS_META = {
  instock: { label: 'In stock', dot: 'bg-green-500', badge: 'bg-green-100 text-green-800' },
  lowstock: { label: 'Low stock', dot: 'bg-red-500', badge: 'bg-red-100 text-red-800' },
  outofstock: { label: 'Out of stock', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-800' },
};

export function getStockStatus(stock, threshold) {
  if (stock === 0) return 'outofstock';
  if (stock < threshold) return 'lowstock';
  return 'instock';
}