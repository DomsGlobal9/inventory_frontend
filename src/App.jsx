import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ProductProvider } from './context/ProductContext';
import { PlatformAdminProvider } from './context/PlatformAdminContext';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminConsoleLayout from './layouts/AdminConsoleLayout';
import AdminLogin from './pages/admin/AdminLogin';
import ClientsPage from './pages/admin/ClientsPage';
import ClientOverviewPage from './pages/admin/ClientOverviewPage';
import UsersPage from './pages/admin/UsersPage';
import PlatformAdminsPage from './pages/admin/PlatformAdminsPage';
import OnboardingPage from './pages/admin/OnboardingPage';
import LeadsPage from './pages/admin/LeadsPage';
import DayBook from './pages/DayBook';
import Offers from './pages/Offers';
import Campaigns from './pages/campaigns/Campaigns';
import CounterReturn from './pages/sales/CounterReturn';
import CampaignDetail from './pages/campaigns/CampaignDetail';
import OfferDetail from './pages/OfferDetail';
import Signup from './pages/Signup';
import InventoryHealthPage from './pages/admin/InventoryHealthPage';
import OffersHealthPage from './pages/admin/OffersHealthPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import ShortLinksPage from './pages/admin/ShortLinksPage';
import ClientErrorsPage from './pages/admin/ClientErrorsPage';
import SupportTicketsPage from './pages/admin/SupportTicketsPage';
import MainLayout from './layouts/MainLayout';
import WizardLayout from './layouts/WizardLayout';
import LandingPage from './pages/LandingPage';
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
import NewSale from './pages/sales/NewSale';
import Receipt from './pages/sales/Receipt';
import ReturnsList from './pages/sales/ReturnsList';
import ReturnDetail from './pages/sales/ReturnDetail';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import ProtectedRoute from './components/ProtectedRoute';
import Guard from './components/Guard';
import WhereIsIt from './pages/shelves/WhereIsIt';
import PutAway from './pages/shelves/PutAway';
import MoveStock from './pages/shelves/MoveStock';
import ShelfIssues from './pages/shelves/ShelfIssues';
import RackSetup from './pages/shelves/RackSetup';
import ShelfLabels from './pages/shelves/ShelfLabels';
import PickList from './pages/shelves/PickList';
import ShelfCount from './pages/shelves/ShelfCount';
import FillShelves from './pages/shelves/FillShelves';
import RackMap from './pages/shelves/RackMap';

// The Help Center is public and loads on its own, so the app never downloads the guide.
const HelpLayout = lazy(() => import('./pages/help/HelpLayout'));
const HelpHome = lazy(() => import('./pages/help/HelpHome'));
const HelpArticle = lazy(() => import('./pages/help/HelpArticle'));

function App() {
  return (
    <HelmetProvider>
      <ProductProvider>
        <Router>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          {/* Public. Records a signup enquiry as a lead -- it creates no account and no
              workspace, so it sits outside every auth boundary by design. */}
          <Route path="/signup" element={<Signup />} />

          {/* Public user guide: anyone can read it, signed in or not. */}
          <Route path="/help" element={<Suspense fallback={null}><HelpLayout /></Suspense>}>
            <Route index element={<Suspense fallback={null}><HelpHome /></Suspense>} />
            <Route path=":section/:slug" element={<Suspense fallback={null}><HelpArticle /></Suspense>} />
            <Route path="*" element={<Suspense fallback={null}><HelpArticle /></Suspense>} />
          </Route>

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
              <Route path="offers-health" element={<OffersHealthPage />} />
              <Route path="errors" element={<ClientErrorsPage />} />
              <Route path="support" element={<SupportTicketsPage />} />
              <Route path="short-links" element={<ShortLinksPage />} />
              <Route path="audit-log" element={<AuditLogPage />} />
              <Route path="platform-admins" element={<PlatformAdminsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Every business route below carries the permission its backend route enforces.
            None of them did: the sidebar hid the links and the API refused the data, so a
            bookmark or a colleague's link rendered the page anyway with the contents missing --
            Purchase Orders told a salesperson "No purchase orders found", which is not a
            refusal but a false statement about the shop.

            /settings is deliberately open: it holds a person's own profile and password, so
            somebody with no permissions at all still has somewhere to be. */}
        <Route element={<ProtectedRoute />}>
        {/* Outside the app's frame: a receipt is printed on its own, with nothing around it. */}
        <Route path="/orders/:id/receipt" element={<Guard permission="sales_order:view"><Receipt /></Guard>} />
        {/* Shelf labels print on their own too. */}
        <Route path="/shelves/labels" element={<Guard permission="shelf:manage" what="print shelf labels"><ShelfLabels /></Guard>} />
        <Route element={<MainLayout />}>
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/dashboard" element={<Guard permission="dashboard:view"><Dashboard /></Guard>} />
          
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
          
          <Route path="/products/:id" element={<Guard permission="product:view"><ProductDetails /></Guard>} />
          <Route path="/products" element={<Guard permission="product:view"><Products /></Guard>} />
          <Route path="/orders" element={<Guard permission="sales_order:view"><SalesOrders /></Guard>} />
          <Route path="/orders/new-sale" element={<Guard permission="sales_order:counter_sale" what="sell at the counter"><NewSale /></Guard>} />
          <Route path="/orders/:id" element={<Guard permission="sales_order:view"><SalesOrderDetail /></Guard>} />
          <Route path="/returns" element={<Guard permission="return:view"><ReturnsList /></Guard>} />
          <Route path="/returns/new" element={<Guard permission="return:view"><CounterReturn /></Guard>} />
          <Route path="/returns/:id" element={<Guard permission="return:view"><ReturnDetail /></Guard>} />
          <Route path="/inventory/alerts" element={<Guard permission="inventory:view"><AlertCenter /></Guard>} />
          <Route path="/inventory/audits" element={<Guard permission="stock_count:view" what="work with stock counts"><AuditList /></Guard>} />
          <Route path="/inventory/audits/:id" element={<Guard permission="stock_count:view" what="work with stock counts"><ActiveAudit /></Guard>} />
          <Route path="/inventory/suppliers" element={<Guard permission="supplier:view"><PurchaseOrders /></Guard>} />
          <Route path="/inventory/suppliers/:id" element={<Guard permission="supplier:view"><SupplierDetails /></Guard>} />
          <Route path="/inventory/purchase-orders" element={<Guard permission="purchase_order:view"><PurchaseOrders /></Guard>} />
          {/* Rendered by PurchaseOrders, which picks its tab from the path -- same pattern
              as /inventory/suppliers. */}
          <Route path="/inventory/reorder" element={<Guard permission="purchase_order:view"><PurchaseOrders /></Guard>} />
          <Route path="/inventory/purchase-orders/:id" element={<Guard permission="purchase_order:view"><PurchaseOrderDetails /></Guard>} />
          <Route path="/inventory/ledger" element={<Guard permission="inventory:view"><InventoryLedger /></Guard>} />
          <Route path="/inventory/transfers" element={<Guard permission="inventory:transfer" what="move stock between stores"><TransfersPage /></Guard>} />
          <Route path="/inventory" element={<Guard permission="inventory:view"><InventoryOverview /></Guard>} />
          <Route path="/shelves" element={<Guard permission="shelf:view" what="look up where an item is"><WhereIsIt /></Guard>} />
          <Route path="/shelves/put-away" element={<Guard permission="shelf:putaway" what="put stock away"><PutAway /></Guard>} />
          <Route path="/shelves/move" element={<Guard permission="shelf:putaway" what="move stock between shelves"><MoveStock /></Guard>} />
          <Route path="/shelves/issues" element={<Guard permission="shelf:view" what="see shelf issues"><ShelfIssues /></Guard>} />
          <Route path="/shelves/pick" element={<Guard permission="shelf:putaway" what="pick orders"><PickList /></Guard>} />
          <Route path="/shelves/count" element={<Guard permission="shelf:putaway" what="count shelves"><ShelfCount /></Guard>} />
          <Route path="/shelves/fill" element={<Guard permission="shelf:putaway" what="fill shelves"><FillShelves /></Guard>} />
          <Route path="/shelves/map" element={<Guard permission="shelf:view" what="see the shelf map"><RackMap /></Guard>} />
          <Route path="/shelves/setup" element={<Guard permission="shelf:manage" what="set up racks and shelves"><RackSetup /></Guard>} />
          {/* The day book now lives inside Settings. This route is kept so links and
              bookmarks that already point at it still land on the day book itself. */}
          <Route path="/offers" element={<Guard permission="offer:view"><Offers /></Guard>} />
          <Route path="/offers/:id" element={<Guard permission="offer:view"><OfferDetail /></Guard>} />
          <Route path="/campaigns" element={<Guard permission="campaign:view"><Campaigns /></Guard>} />
          <Route path="/campaigns/:id" element={<Guard permission="campaign:view"><CampaignDetail /></Guard>} />
          <Route path="/reports/daybook" element={<Guard permission="report:financial"><DayBook /></Guard>} />
          <Route path="/customers" element={<Guard permission="customer:view"><Customers /></Guard>} />
          <Route path="/customers/:id" element={<Guard permission="customer:view"><CustomerDetail /></Guard>} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/locations" element={<Guard permission="admin:locations" what="set up stores and godowns"><StockLocationsPage /></Guard>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        </Route>
      </Routes>
    </Router>
    </ProductProvider>
    </HelmetProvider>
  );
}

export default App;
