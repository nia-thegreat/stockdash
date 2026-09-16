export function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Monday of the week containing `date` (ISO-style week start)
export function mondayOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// Map the filter UI state to API query params ("" = omitted)
export function buildSalesParams(query) {
  const params = {};
  if (query.search.trim()) params.search = query.search.trim();
  const now = new Date();
  switch (query.range) {
    case 'today':
      params.from = toYMD(now);
      params.to = toYMD(now);
      break;
    case 'week':
      params.from = toYMD(mondayOfWeek(now));
      params.to = toYMD(now);
      break;
    case 'month':
      params.from = toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
      params.to = toYMD(now);
      break;
    case 'custom':
      if (query.customFrom) params.from = query.customFrom;
      if (query.customTo) params.to = query.customTo;
      break;
    default:
      break;
  }
  return params;
}

// Human-readable label for the active sales filter scope
export function scopeLabelOf(query) {
  let scope = 'All time';
  if (query.range === 'today') scope = 'Today';
  else if (query.range === 'week') scope = 'This week';
  else if (query.range === 'month') scope = 'This month';
  else if (query.range === 'custom') scope = query.customFrom || query.customTo ? 'Custom range' : 'All time';
  if (query.search.trim()) scope += ` · "${query.search.trim()}"`;
  return scope;
}