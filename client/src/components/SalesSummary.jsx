export default function SalesSummary({ sales, loading }) {
  const revenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const unitsSold = sales.reduce((sum, s) => sum + Number(s.quantity_sold), 0);

  const cards = [
    {
      label: 'Total Revenue',
      value: loading ? '—' : `$${revenue.toFixed(2)}`,
      color: 'text-green-600',
    },
    {
      label: 'Units Sold',
      value: loading ? '—' : unitsSold,
      color: 'text-gray-900',
    },
    {
      label: 'Transactions',
      value: loading ? '—' : sales.length,
      color: 'text-blue-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500 font-medium">{card.label}</p>
          <p className={`text-3xl font-bold mt-1 tabular-nums ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}