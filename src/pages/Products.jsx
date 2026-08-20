import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, Download, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useProducts } from '../hooks/useProducts';
import { useProduct } from '../context/ProductContext';
import BulkUpdateModal from '../components/BulkUpdateModal';
import PageLoader from '../components/PageLoader';

export default function Products() {
  const navigate = useNavigate();
  const { resetProductData } = useProduct();
  const [statusFilter, setStatusFilter] = React.useState(''); // Empty means default (ACTIVE, DRAFT)
  const { data, isLoading } = useProducts({ page: 1, limit: 50, status: statusFilter || undefined });
  
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = React.useState(false);

  const products = data?.data || [];

  const handleExport = () => {
    import('../utils/csvUtils').then(({ exportToCSV }) => {
      const exportData = products.map(p => ({
        ID: p.id,
        Title: p.title,
        Code: p.productCode,
        Category: p.category,
        BasePrice: p.basePrice,
        Status: p.status,
        VariantCount: p.variantSummary?.variantCount || 0,
        TotalUnits: p.variantSummary?.totalUnits || 0
      }));
      exportToCSV(exportData, 'Products');
    });
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="mobile-no-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0, gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px', color: 'var(--text-primary)' }}>Products</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Manage your catalog, variants, and base pricing.</p>
        </div>
        <div className="mobile-col" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select 
            className="input-field" 
            style={{ width: '150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Active & Drafts</option>
            <option value="ARCHIVED">Archived</option>
            <option value="TRASHED">Trash</option>
          </select>
          <button 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={handleExport}
            disabled={!products.length}
          >
            <Download size={16} />
            Export
          </button>
          <button 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setIsBulkUpdateModalOpen(true)}
          >
            <Upload size={16} />
            Import Updates
          </button>
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => {
              resetProductData();
              navigate('/add/general');
            }}
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        {isLoading ? (
          <PageLoader text="Loading products..." />
        ) : products.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No products added yet.
          </div>
        ) : (
          <motion.table variants={container} initial="hidden" animate="show" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Stock Units</th>
                <th>Base Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <motion.tr 
                  variants={item}
                  key={product.id} 
                  onClick={() => navigate(`/products/${product.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', background: 'var(--bg-input)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={20} color="var(--text-secondary)" />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: '500', fontSize: '14px' }}>{product.title}</p>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{product.productCode}</span>
                      </div>
                    </div>
                  </td>
                  <td>{product.category}</td>
                  <td>{product.variantSummary?.variantCount || 0}</td>
                  <td style={{ color: product.variantSummary?.lowStockVariants > 0 ? 'var(--accent-danger)' : 'inherit', fontWeight: '500' }}>
                    {product.variantSummary?.totalUnits || 0}
                  </td>
                  <td style={{ fontWeight: '500' }}>₹{product.basePrice}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
                      backgroundColor: product.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: product.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--text-secondary)'
                    }}>
                      {product.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </motion.table>
        )}
      </div>
      
      <BulkUpdateModal 
        isOpen={isBulkUpdateModalOpen} 
        onClose={() => setIsBulkUpdateModalOpen(false)} 
      />
    </div>
  );
}
