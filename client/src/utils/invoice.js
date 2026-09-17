export function openInvoice(saleId) {
  window.open(`/api/sales/${saleId}/invoice.pdf`, '_blank');
}

export async function downloadInvoice(saleId, invoiceNumber) {
  const res = await fetch(`/api/sales/${saleId}/invoice.pdf?download=1`);
  if (!res.ok) throw new Error('Could not download invoice');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}