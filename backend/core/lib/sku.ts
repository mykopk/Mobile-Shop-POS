export function formatSku(n: number) {
  return `SKU-${String(n).padStart(3, "0")}`;
}

export function nextSkuNumber(existingSkus: string[]) {
  let max = 0;
  for (const sku of existingSkus) {
    const match = /^SKU-(\d+)$/.exec(sku);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return max + 1;
}
