import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import InvoicesView from './components/InvoicesView';
import CustomersView from './components/CustomersView';
import CatalogView from './components/CatalogView';
import BusinessSettingsView from './components/BusinessSettingsView';
import InvoiceEditorModal from './components/InvoiceEditorModal';
import InvoicePreviewModal from './components/InvoicePreviewModal';
import EmailModal from './components/EmailModal';
import PaymentModal from './components/PaymentModal';
import LoginModal from './components/LoginModal';
import { api, getAuthToken, setAuthToken } from './services/api';
import {
  businessService,
  customersService,
  catalogService,
  invoicesService,
  setWorkspaceId
} from './services/dbService';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Notification Toast System
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Theme State (Dark / Light mode)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('billgst_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('billgst_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      showToast(`Switched to ${next === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
      return next;
    });
  }, [showToast]);

  // Business & Workspace Data
  const [business, setBusiness] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [activePreviewInvoice, setActivePreviewInvoice] = useState(null);
  const [activeEmailInvoice, setActiveEmailInvoice] = useState(null);
  const [activePaymentInvoice, setActivePaymentInvoice] = useState(null);

  // Fetch all core workspace data from Supabase
  const loadSupabaseData = useCallback(async (params = {}) => {
    try {
      const [bizRes, custRes, catRes, invRes] = await Promise.all([
        businessService.getProfile(),
        customersService.getCustomers(),
        catalogService.getProducts(),
        invoicesService.getInvoices({
          search: params.search ?? searchQuery,
          status: params.status ?? statusFilter,
          startDate: params.startDate ?? startDate,
          endDate: params.endDate ?? endDate
        })
      ]);

      if (!bizRes.error && bizRes.data) setBusiness(bizRes.data);
      if (!custRes.error) setCustomers(custRes.data || []);
      if (!catRes.error) setCatalogItems(catRes.data || []);
      if (!invRes.error) setInvoices(invRes.data || []);
    } catch (err) {
      showToast(err.message || 'Unable to load workspace data from Supabase.', 'error');
    }
  }, [searchQuery, statusFilter, startDate, endDate, showToast]);

  // Fetch dashboard analytics (still via Express backend)
  const loadWorkspaceData = useCallback(async () => {
    try {
      const dashRes = await api.getDashboard();
      if (dashRes.success) setDashboardData(dashRes);
    } catch {
      // Dashboard analytics are non-critical; silently swallow
    }
    // Reload Supabase data in parallel
    await loadSupabaseData();
  }, [loadSupabaseData]);

  // Check initial authentication
  useEffect(() => {
    async function checkAuth() {
      const token = getAuthToken();
      if (!token) {
        setIsAuthChecking(false);
        return;
      }
      try {
        const res = await api.getMe();
        if (res.success && res.user) {
          setCurrentUser(res.user);
          // Persist workspace_id so Supabase queries are scoped correctly
          if (res.user.workspace_id) setWorkspaceId(res.user.workspace_id);
          await loadWorkspaceData();
        }
      } catch {
        setAuthToken('');
        setCurrentUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    }
    checkAuth();
  }, [loadWorkspaceData]);

  // Reload invoices whenever filters change
  useEffect(() => {
    if (currentUser) {
      api.getInvoices({ search: searchQuery, status: statusFilter, startDate, endDate })
        .then(res => {
          if (res.success) setInvoices(res.invoices);
        })
        .catch(() => {
          showToast('Failed to apply invoice filter.', 'error');
        });
    }
  }, [searchQuery, statusFilter, startDate, endDate, currentUser, showToast]);

  // Auth Handlers
  const handleLogin = async (credentials) => {
    try {
      const res = await api.login(credentials);
      if (res.success && res.token) {
        setAuthToken(res.token);
        setCurrentUser(res.user);
        if (res.user?.workspace_id) setWorkspaceId(res.user.workspace_id);
        await loadWorkspaceData();
        showToast(`Welcome back, ${res.user?.name || 'Owner'}!`, 'success');
        return res;
      }
      throw new Error(res?.message || 'Login failed. Please check your credentials.');
    } catch (err) {
      showToast(err.message || 'Login failed. Please check your credentials.', 'error');
      throw err;
    }
  };

  const handleRegister = async (registrationData) => {
    try {
      const res = await api.register(registrationData);
      if (res.success && res.token) {
        setAuthToken(res.token);
        setCurrentUser(res.user);
        if (res.user?.workspace_id) setWorkspaceId(res.user.workspace_id);
        await loadWorkspaceData();
        showToast('Business workspace registered successfully!', 'success');
        return res;
      }
      throw new Error(res?.message || 'Registration failed.');
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
      throw err;
    }
  };

  const handleSocialLogin = async (payload) => {
    try {
      const res = await api.socialLogin(payload);
      if (res.success && res.token) {
        setAuthToken(res.token);
        setCurrentUser(res.user);
        if (res.user?.workspace_id) setWorkspaceId(res.user.workspace_id);
        await loadWorkspaceData();
        const providerName = payload.provider?.toLowerCase() === 'google' ? 'Google' : 'Apple';
        showToast(`Authenticated securely via ${providerName} SSO!`, 'success');
        return res;
      }
      throw new Error(res?.message || 'Social authentication encountered an error.');
    } catch (err) {
      showToast(err.message || 'Social authentication encountered an error.', 'error');
      throw err;
    }
  };

  const handlePasskeyLogin = async (payload = {}) => {
    try {
      const res = await api.passkeyLogin(payload);
      if (res.success && res.token) {
        setAuthToken(res.token);
        setCurrentUser(res.user);
        if (res.user?.workspace_id) setWorkspaceId(res.user.workspace_id);
        await loadWorkspaceData();
        showToast('Authenticated via Biometric Passkey / Touch ID!', 'success');
        return res;
      }
      throw new Error(res?.message || 'Passkey verification failed.');
    } catch (err) {
      showToast(err.message || 'Passkey verification failed.', 'error');
      throw err;
    }
  };

  const handleLogout = () => {
    setAuthToken('');
    setWorkspaceId(null);
    setCurrentUser(null);
    showToast('Logged out of GST workspace.', 'info');
  };

  // Invoice Handlers — persist to Supabase
  const handleSaveInvoice = async (invoicePayload) => {
    try {
      const { data, error } = await invoicesService.createInvoice(invoicePayload);
      if (error) throw new Error(error.message);
      setIsCreateInvoiceOpen(false);
      await loadSupabaseData();
      if (data) setActivePreviewInvoice(data);
      showToast(`Invoice #${data?.invoiceNumber || ''} created and saved to Supabase!`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to create invoice.', 'error');
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
    try {
      const { error } = await invoicesService.deleteInvoice(id);
      if (error) throw new Error(error.message);
      await loadSupabaseData();
      showToast('Invoice deleted successfully.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete invoice.', 'error');
    }
  };

  const handleRecordPayment = async (invoiceId, paymentData) => {
    try {
      const { data, error } = await invoicesService.updateInvoiceStatus(invoiceId, {
        status: 'Paid',
        paymentDetails: paymentData
      });
      if (error) throw new Error(error.message);
      await loadSupabaseData();
      if (activePreviewInvoice && activePreviewInvoice.id === invoiceId) {
        setActivePreviewInvoice(data);
      }
      showToast('Payment recorded successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to record payment.', 'error');
    }
  };

  // Customer Handlers — persist to Supabase
  const handleSaveCustomer = async (customerData, id = null) => {
    try {
      let result;
      if (id) {
        result = await customersService.updateCustomer(id, customerData);
        if (result.error) throw new Error(result.error.message);
        showToast('Customer profile updated.', 'success');
      } else {
        result = await customersService.addCustomer(customerData);
        if (result.error) throw new Error(result.error.message);
        showToast('Customer added to directory.', 'success');
      }
      const { data: updated } = await customersService.getCustomers();
      setCustomers(updated || []);
    } catch (err) {
      showToast(err.message || 'Failed to save customer.', 'error');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Delete this customer from the directory?')) return;
    try {
      const { error } = await customersService.deleteCustomer(id);
      if (error) throw new Error(error.message);
      const { data: updated } = await customersService.getCustomers();
      setCustomers(updated || []);
      showToast('Customer removed from directory.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete customer.', 'error');
    }
  };

  // Catalog Item Handlers — persist to Supabase
  const handleSaveCatalogItem = async (itemData, id = null) => {
    try {
      let result;
      if (id) {
        result = await catalogService.updateProduct(id, itemData);
        if (result.error) throw new Error(result.error.message);
        showToast('Catalog item updated.', 'success');
      } else {
        result = await catalogService.addProduct(itemData);
        if (result.error) throw new Error(result.error.message);
        showToast('Catalog item created.', 'success');
      }
      const { data: updated } = await catalogService.getProducts();
      setCatalogItems(updated || []);
    } catch (err) {
      showToast(err.message || 'Failed to save catalog item.', 'error');
    }
  };

  const handleDeleteCatalogItem = async (id) => {
    if (!window.confirm('Delete this item from the catalog?')) return;
    try {
      const { error } = await catalogService.deleteProduct(id);
      if (error) throw new Error(error.message);
      const { data: updated } = await catalogService.getProducts();
      setCatalogItems(updated || []);
      showToast('Item deleted from catalog.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete item.', 'error');
    }
  };

  // Business Profile Handlers — persist to Supabase
  const handleSaveBusiness = async (bizData) => {
    try {
      const { data, error } = await businessService.updateProfile(bizData);
      if (error) throw new Error(error.message);
      if (data) setBusiness(data);
      showToast('Business GST profile saved to Supabase successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save business settings.', 'error');
    }
  };

  // Quick Action to create invoice for a specific customer
  const handleQuickCreateInvoiceForCustomer = () => {
    setIsCreateInvoiceOpen(true);
  };

  // Loading indicator for session checking
  if (isAuthChecking) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px', color: 'var(--primary)' }}>
            BillGST<span style={{ color: 'var(--accent)' }}>.Pro</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted-text)' }}>Loading GST Workspace...</div>
        </div>
      </div>
    );
  }

  // Floating Notification Toasts Renderer
  const renderToasts = () => {
    if (toasts.length === 0) return null;
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '400px',
        width: 'calc(100% - 40px)',
        pointerEvents: 'none'
      }}>
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const borderColor = isSuccess ? 'var(--secondary)' : isError ? 'var(--danger)' : 'var(--primary)';
          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                background: 'var(--cards)',
                border: '1px solid var(--border)',
                borderLeft: `4px solid ${borderColor}`,
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              {isSuccess && <CheckCircle size={18} style={{ color: 'var(--secondary)', flexShrink: 0 }} />}
              {isError && <AlertCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />}
              {!isSuccess && !isError && <Info size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
              
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', flex: 1, lineHeight: 1.4 }}>
                {t.message}
              </span>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted-text)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px'
                }}
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // If user is not authenticated, show single-business owner login modal
  if (!currentUser) {
    return (
      <>
        <LoginModal 
          onLogin={handleLogin} 
          onRegister={handleRegister} 
          onSocialLogin={handleSocialLogin}
          onPasskeyLogin={handlePasskeyLogin}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        {renderToasts()}
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      
      {/* Top Navbar & Workspace Context */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        business={business}
        user={currentUser}
        onLogout={handleLogout}
        onOpenCreateInvoice={() => setIsCreateInvoiceOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Workspace View Router */}
      <main style={{ flex: 1 }}>
        {currentTab === 'dashboard' && (
          <DashboardView
            metrics={dashboardData?.metrics}
            monthlyTrends={dashboardData?.monthlyTrends}
            invoices={invoices}
            recentInvoices={dashboardData?.recentInvoices || []}
            onOpenCreateInvoice={() => setIsCreateInvoiceOpen(true)}
            onOpenCustomerModal={() => setCurrentTab('customers')}
            onOpenCatalogModal={() => setCurrentTab('catalog')}
            onViewInvoice={(inv) => setActivePreviewInvoice(inv)}
            onOpenEmailModal={(inv) => setActiveEmailInvoice(inv)}
            onNavigateToInvoices={() => setCurrentTab('invoices')}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        )}

        {currentTab === 'invoices' && (
          <InvoicesView
            invoices={invoices}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            onOpenCreateInvoice={() => setIsCreateInvoiceOpen(true)}
            onViewInvoice={(inv) => setActivePreviewInvoice(inv)}
            onOpenEmailModal={(inv) => setActiveEmailInvoice(inv)}
            onOpenPaymentModal={(inv) => setActivePaymentInvoice(inv)}
            onDeleteInvoice={handleDeleteInvoice}
          />
        )}

        {currentTab === 'customers' && (
          <CustomersView
            customers={customers}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onQuickCreateInvoiceForCustomer={handleQuickCreateInvoiceForCustomer}
          />
        )}

        {currentTab === 'catalog' && (
          <CatalogView
            items={catalogItems}
            onSaveItem={handleSaveCatalogItem}
            onDeleteItem={handleDeleteCatalogItem}
          />
        )}

        {currentTab === 'settings' && (
          <BusinessSettingsView
            business={business}
            onSaveBusiness={handleSaveBusiness}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '20px 24px',
        background: 'var(--cards)',
        fontSize: '12px',
        color: 'var(--muted-text)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <strong>BillGST Pro</strong> — Compliant Indian GST Tax Invoicing System (CBIC Format, HSN/SAC, CGST/SGST/IGST)
          </div>
          <div>
            Workspace: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{business?.legalName || 'Vani Studios Private Limited'}</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <InvoiceEditorModal
        isOpen={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
        onSave={handleSaveInvoice}
        customers={customers}
        catalogItems={catalogItems}
        business={business}
      />

      <InvoicePreviewModal
        isOpen={!!activePreviewInvoice}
        onClose={() => setActivePreviewInvoice(null)}
        invoice={activePreviewInvoice}
        business={business}
        onOpenEmailModal={(inv) => setActiveEmailInvoice(inv)}
        onOpenPaymentModal={(inv) => setActivePaymentInvoice(inv)}
      />

      <EmailModal
        isOpen={!!activeEmailInvoice}
        onClose={() => setActiveEmailInvoice(null)}
        invoice={activeEmailInvoice}
        business={business}
        onEmailSent={(updated) => {
          loadWorkspaceData();
          if (activePreviewInvoice && activePreviewInvoice.id === updated.id) {
            setActivePreviewInvoice(updated);
          }
        }}
      />

      <PaymentModal
        isOpen={!!activePaymentInvoice}
        onClose={() => setActivePaymentInvoice(null)}
        invoice={activePaymentInvoice}
        onRecordPayment={handleRecordPayment}
      />

      {/* Floating Notification Toasts */}
      {renderToasts()}

    </div>
  );
}
