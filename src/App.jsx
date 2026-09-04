import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ProductProvider } from './context/ProductContext';
import { PlatformAdminProvider } from './context/PlatformAdminContext';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminConsoleLayout from './layouts/AdminConsoleLayout';
import AdminLogin from './pages/admin/AdminLogin';
import ClientsPage from './pages/admin/ClientsPage';
import ClientOverviewPage from './pages/admin/ClientOverviewPage';
import UsersPage from './pages/admin/UsersPage';
import OnboardingPage from './pages/admin/OnboardingPage';
import LeadsPage from './pages/admin/LeadsPage';
import Signup from './pages/Signup';
import InventoryHealthPage from './pages/admin/InventoryHealthPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import ClientErrorsPage from './pages/admin/ClientErrorsPage';
import SupportTicketsPage from './pages/admin/SupportTicketsPage';
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
import StockLocationsPage from './pages/settings/StockLocationsPage';
import TransfersPage from './pages/inventory/TransfersPage';
import InventoryOverview from './pages/InventoryOverview';
import InventoryLedger from './pages/InventoryLedger';
import AlertCenter from './pages/AlertCenter';
import AuditList from './pages/AuditList';
import ActiveAudit from './pages/ActiveAudit';
import SupplierDetails from './pages/SupplierDetails';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderDetails from './pages/PurchaseOrderDetails';
import Customers from './pages/sales/Customers';
import CustomerDetail from './pages/sales/CustomerDetail';
import SalesOrders from './pages/sales/SalesOrders';
import SalesOrderDetail from './pages/sales/SalesOrderDetail';
import ReturnsList from './pages/sales/ReturnsList';
import ReturnDetail from './pages/sales/ReturnDetail';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ProductProvider>
      <Router>
        <Routes>
        <Route path="/login" element={<Login />} />
        {/* Public. Records a signup enquiry as a lead -- it creates no account and no
            workspace, so it sits outside every auth boundary by design. */}
        <Route path="/signup" element={<Signup />} />

        {/* Platform Admin console: entirely separate auth realm (its own cookie, its own
            login), scoped under its own PlatformAdminProvider so normal client sessions
            never pay for an unused /auth/admin/session check on every page load. */}
        <Route element={<PlatformAdminProvider><Outlet /></PlatformAdminProvider>}>
          <Route path="/platformconsole/login" element={<AdminLogin />} />
          <Route path="/platformconsole" element={<AdminProtectedRoute />}>
            <Route element={<AdminConsoleLayout />}>
              <Route index element={<Navigate to="/platformconsole/clients" replace />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="clients/:clientId" element={<ClientOverviewPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="onboarding" element={<OnboardingPage />} />
              <Route path="health" element={<InventoryHealthPage />} />
              <Route path="errors" element={<ClientErrorsPage />} />
              <Route path="support" element={<SupportTicketsPage />} />
              <Route path="audit-log" element={<AuditLogPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/" element={<Dashboard />} />
          
          <Route path="/add" element={<WizardLayout title="Add Your Product" subtitle="Create a new product and configure its details before publishing." />}>
            {/* Without this, a bare /add matched the layout with no child to fill its
                outlet: the wizard chrome rendered with an empty body and no way forward.
                Reachable by refreshing or bookmarking on /add, since the "Add Product"
                button navigates straight to /add/general and hides the gap. */}
            <Route index element={<Navigate to="/add/general" replace />} />
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
          <Route path="/orders/:id" element={<SalesOrderDetail />} />
          <Route path="/returns" element={<ReturnsList />} />
          <Route path="/returns/:id" element={<ReturnDetail />} />
          <Route path="/inventory/alerts" element={<AlertCenter />} />
          <Route path="/inventory/audits" element={<AuditList />} />
          <Route path="/inventory/audits/:id" element={<ActiveAudit />} />
          <Route path="/inventory/suppliers" element={<PurchaseOrders />} />
          <Route path="/inventory/suppliers/:id" element={<SupplierDetails />} />
          <Route path="/inventory/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/inventory/purchase-orders/:id" element={<PurchaseOrderDetails />} />
          <Route path="/inventory/ledger" element={<InventoryLedger />} />
          <Route path="/inventory/transfers" element={<TransfersPage />} />
          <Route path="/inventory" element={<InventoryOverview />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/locations" element={<StockLocationsPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        </Route>
      </Routes>
    </Router>
    </ProductProvider>
  );
}

export default App;
