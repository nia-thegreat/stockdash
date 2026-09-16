export function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Server time-series labels: day 'YYYY-MM-DD' → '09/15'; month 'YYYY-MM' → 'Sep 2026'
export function formatSeriesLabel(label) {
  const parts = String(label).split('-');
  if (parts.length === 3) {
    const [, m, d] = parts.map(Number);
    return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
  }
  if (parts.length === 2) {
    const [y, m] = parts.map(Number);
    return `${MONTHS[m - 1] || m} ${y}`;
  }
  return label;
}

// Reformat the frozen MySQL string 'YYYY-MM-DD HH:MM' without touching timezone math.
export function formatSaleDate(value) {
  const [datePart, timePart] = typeof value === 'string' ? value.split(' ') : [null, null];
  if (!datePart) return value;
  const [y, m, d] = datePart.split('-').map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) || !MONTHS[m - 1]) {
    return value;
  }
  let time = '';
  if (timePart) {
    const [hh, mm] = timePart.split(':').map(Number);
    if (Number.isInteger(hh) && Number.isInteger(mm)) {
      const period = hh >= 12 ? 'PM' : 'AM';
      const hour12 = hh % 12 === 0 ? 12 : hh % 12;
      time = ` · ${hour12}:${String(mm).padStart(2, '0')} ${period}`;
    }
  }
  return `${MONTHS[m - 1]} ${d}, ${y}${time}`;
}