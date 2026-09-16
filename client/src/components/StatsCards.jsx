export default function StatsCards({ inventoryValue, totalParts, lowStockCount, totalRevenue }) {
  const cards = [
    {
      label: 'Inventory Value',
      value: `$${inventoryValue.toFixed(2)}`,
      color: 'text-blue-600',
    },
    {
      label: 'Total Parts',
      value: totalParts,
      color: 'text-gray-900',
    },
    {
      label: 'Low Stock Items',
      value: lowStockCount,
      color: lowStockCount > 0 ? 'text-red-600' : 'text-green-600',
    },
    {
      label: 'Total Sales Revenue',
      value: `$${totalRevenue.toFixed(2)}`,
      color: 'text-green-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500 font-medium">{card.label}</p>
          <p className={`text-3xl font-bold mt-1 tabular-nums ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}