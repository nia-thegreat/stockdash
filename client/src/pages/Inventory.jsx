import { useStockDash } from '../context/StockDashContext';
import { LOW_STOCK_THRESHOLD } from '../utils/constants';
import AddProductForm from '../components/AddProductForm';
import ProductList from '../components/ProductList';

export default function Inventory() {
  const {
    parts,
    loading,
    error,
    fetchData,
    handleAddPart,
    handleUpdatePart,
    handleDeletePart,
  } = useStockDash();

  return (
    <div className="space-y-6">
      <AddProductForm onAddPart={handleAddPart} />

      <ProductList
        parts={parts}
        lowStockThreshold={LOW_STOCK_THRESHOLD}
        loading={loading}
        error={error}
        onRetry={fetchData}
        onUpdatePart={handleUpdatePart}
        onDeletePart={handleDeletePart}
      />
    </div>
  );
}