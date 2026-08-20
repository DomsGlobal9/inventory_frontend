import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProductProvider } from './context/ProductContext';
import MainLayout from './layouts/MainLayout';
import WizardLayout from './layouts/WizardLayout';
import Dashboard from './pages/Dashboard';
import GeneralInfo from './pages/GeneralInfo';
import Measurements from './pages/Measurements';
import UploadPhotos from './pages/UploadPhotos';
import ProductPreview from './pages/ProductPreview';
import PlaceholderPage from './pages/PlaceholderPage';
import ProductDetails from './pages/ProductDetails';
import Products from './pages/Products';
import Settings from './pages/Settings';
import InventoryOverview from './pages/InventoryOverview';
import InventoryLedger from './pages/InventoryLedger';
import AlertCenter from './pages/AlertCenter';
import AuditList from './pages/AuditList';
import ActiveAudit from './pages/ActiveAudit';
import Suppliers from './pages/Suppliers';
import SupplierDetails from './pages/SupplierDetails';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderDetails from './pages/PurchaseOrderDetails';
import Customers from './pages/sales/Customers';
import CustomerDetail from './pages/sales/CustomerDetail';
import SalesOrders from './pages/sales/SalesOrders';
import SalesOrderDetail from './pages/sales/SalesOrderDetail';
import CreateOrder from './pages/sales/CreateOrder';
import ReturnsList from './pages/sales/ReturnsList';
import ReturnDetail from './pages/sales/ReturnDetail';

function App() {
  return (
    <ProductProvider>
      <Router>
        <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          
          <Route path="/add" element={<WizardLayout title="Add Your Product" subtitle="Create a new product and configure its details before publishing." />}>
            <Route path="general" element={<GeneralInfo />} />
            <Route path="measurements" element={<Measurements />} />
          </Route>
          
          <Route path="/add" element={<WizardLayout title="Upload Photo" subtitle="Capture the detail, texture, and silhouette of your garment for the boutique gallery." />}>
             <Route path="upload" element={<UploadPhotos />} />
          </Route>

          <Route path="/preview" element={
            <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Product Preview</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Review your product details before publishing to the boutique storefront.</p>
              </header>
              <ProductPreview />
            </div>
          } />
          
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<SalesOrders />} />
          <Route path="/orders/new" element={<CreateOrder />} />
          <Route path="/orders/:id" element={<SalesOrderDetail />} />
          <Route path="/returns" element={<ReturnsList />} />
          <Route path="/returns/:id" element={<ReturnDetail />} />
          <Route path="/inventory/alerts" element={<AlertCenter />} />
          <Route path="/inventory/audits" element={<AuditList />} />
          <Route path="/inventory/audits/:id" element={<ActiveAudit />} />
          <Route path="/inventory/suppliers" element={<Suppliers />} />
          <Route path="/inventory/suppliers/:id" element={<SupplierDetails />} />
          <Route path="/inventory/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/inventory/purchase-orders/:id" element={<PurchaseOrderDetails />} />
          <Route path="/inventory/ledger" element={<InventoryLedger />} />
          <Route path="/inventory" element={<InventoryOverview />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/settings" element={<Settings />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
    </ProductProvider>
  );
}

export default App;
