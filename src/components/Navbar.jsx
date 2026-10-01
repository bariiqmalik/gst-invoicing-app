import React from 'react';
import { 
  FileText, 
  LayoutDashboard, 
  Users, 
  Package, 
  Settings, 
  LogOut, 
  Plus, 
  ShieldCheck,
  Building2,
  Sun,
  Moon
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  business, 
  user, 
  onLogout, 
  onOpenCreateInvoice,
  theme = 'light',
  onToggleTheme
}) {
  return (
    <header style={{
      background: 'var(--cards)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Top Bar with Business context */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Brand & Business identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            cursor: 'pointer'
          }} onClick={() => setCurrentTab('dashboard')}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--palette-forest) 0%, var(--palette-green) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 3px 10px rgba(39, 111, 39, 0.28)'
            }}>
              <FileText size={20} color="var(--palette-lime)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '19px',
                  fontWeight: 800,
                  letterSpacing: '-0.3px',
                  color: 'var(--primary)'
                }}>
                  BillGST<span style={{ color: 'var(--palette-green)' }}>.Pro</span>
                </span>
                <span style={{
                  fontSize: '10px',
                  background: 'var(--palette-lime)',
                  color: '#142914',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  letterSpacing: '0.3px'
                }}>
                  GST INDIA
                </span>
              </div>
            </div>
          </div>

          <div style={{ height: '24px', width: '1px', background: 'var(--border)', margin: '0 4px' }} />

          {/* Business Workspace Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={16} color="var(--muted-text)" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                {business?.legalName || 'My GST Workspace'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>
                GSTIN: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{business?.gstin || 'Not Configured'}</span> • {business?.state || 'India'} ({business?.stateCode || '--'})
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Action + Profile + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            id="quick-create-invoice-btn"
            className="btn btn-primary btn-sm"
            onClick={onOpenCreateInvoice}
            style={{ fontWeight: 700 }}
          >
            <Plus size={16} />
            <span>Create Invoice</span>
          </button>

          {/* Theme Mode Toggle (Dark / Light) */}
          <button
            id="navbar-theme-toggle-btn"
            className="btn btn-outline btn-sm"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark/light theme"
            style={{
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text)'
            }}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} style={{ color: 'var(--palette-lime)' }} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Light</span>
              </>
            ) : (
              <>
                <Moon size={15} style={{ color: 'var(--palette-forest)' }} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Dark</span>
              </>
            )}
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)'
          }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--palette-forest) 0%, var(--palette-green) 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'O'}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                {user?.name || 'Owner'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                <ShieldCheck size={10} color="var(--primary)" /> Owner Access
              </div>
            </div>
          </div>

          <button 
            className="btn btn-ghost btn-sm"
            onClick={onLogout}
            title="Lock workspace / Logout"
            style={{ color: 'var(--danger)', padding: '6px' }}
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        gap: '4px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'invoices', label: 'Invoices & Billing', icon: FileText },
          { id: 'customers', label: 'Customer Directory', icon: Users },
          { id: 'catalog', label: 'Catalog & Services', icon: Package },
          { id: 'settings', label: 'Business Profile & GST', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--primary)' : 'var(--muted-text)',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} color={isActive ? 'var(--primary)' : 'var(--muted-text)'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
