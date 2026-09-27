import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  Percent, 
  FileText, 
  ArrowUpRight, 
  Plus, 
  Search, 
  CheckCircle,
  Eye,
  IndianRupee,
  Users,
  Package,
  X,
  Filter
} from 'lucide-react';
import { Mail } from 'lucide-react';
import { formatINR } from '../utils/gstFrontendUtils';

export default function DashboardView({
  metrics,
  monthlyTrends,
  invoices = [],
  recentInvoices = [],
  onOpenCreateInvoice,
  onOpenCustomerModal,
  onOpenCatalogModal,
  onViewInvoice,
  onOpenEmailModal,
  onNavigateToInvoices,
  searchQuery = '',
  setSearchQuery,
  statusFilter = 'All',
  setStatusFilter
}) {
  const taxBreakup = metrics?.taxBreakup || { cgst: 0, sgst: 0, igst: 0 };
  const statusCounts = metrics?.statusCounts || {};

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Determine active invoice source (prioritize full live list)
  const poolInvoices = useMemo(() => {
    if (invoices && invoices.length > 0) return invoices;
    return recentInvoices || [];
  }, [invoices, recentInvoices]);

  // Compute live filtered invoices based on search & status pill
  const filteredInvoices = useMemo(() => {
    return poolInvoices.filter(inv => {
      // 1. Status Filter
      if (statusFilter && statusFilter !== 'All') {
        const invStatus = (inv.status || '').toLowerCase();
        const targetStatus = statusFilter.toLowerCase();
        
        if (targetStatus === 'overdue') {
          const isOverdue = (invStatus === 'sent' || invStatus === 'partial' || invStatus === 'draft') && inv.dueDate < todayStr;
          if (!isOverdue && invStatus !== 'overdue') return false;
        } else if (invStatus !== targetStatus) {
          return false;
        }
      }

      // 2. Search Query Filter
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const invNum = (inv.invoiceNumber || '').toLowerCase();
        const custName = (inv.customerDetails?.name || '').toLowerCase();
        const compName = (inv.customerDetails?.companyName || '').toLowerCase();
        const gstin = (inv.customerDetails?.gstin || '').toLowerCase();
        const pos = (inv.placeOfSupply || '').toLowerCase();
        const posCode = (inv.placeOfSupplyStateCode || '').toLowerCase();
        const amount = String(inv.grandTotal || '');
        const itemMatch = inv.items?.some(it => (it.name || '').toLowerCase().includes(q) || (it.hsnSac || '').toLowerCase().includes(q));

        const matches = invNum.includes(q) ||
          custName.includes(q) ||
          compName.includes(q) ||
          gstin.includes(q) ||
          pos.includes(q) ||
          posCode.includes(q) ||
          amount.includes(q) ||
          itemMatch;

        if (!matches) return false;
      }

      return true;
    });
  }, [poolInvoices, statusFilter, searchQuery, todayStr]);

  const isFiltering = (statusFilter && statusFilter !== 'All') || (searchQuery && searchQuery.trim() !== '');

  // GST Reports state
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [gstSummary, setGstSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGstSummary = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/reports/gst-summary?month=${selectedMonth}&year=${selectedYear}`);
        const data = await response.json();
        if (data.success) {
          setGstSummary(data.data);
        } else {
          console.error('Failed to fetch GST summary:', data.message);
        }
      } catch (err) {
        console.error('Error fetching GST summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGstSummary();
  }, [selectedMonth, selectedYear]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 24px' }}>
      
      {/* Welcome & Action Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1>GST Billing & Financial Workspace</h1>
          <p style={{ color: 'var(--muted-text)', fontSize: '14px', marginTop: '6px' }}>
            Real-time tax liability, receivables tracking, and CBIC-compliant GST overview.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-outline btn-sm"
            onClick={onOpenCustomerModal}
          >
            <Users size={15} color="var(--primary)" />
            <span>+ Customer</span>
          </button>
          <button 
            className="btn btn-outline btn-sm"
            onClick={onOpenCatalogModal}
          >
            <Package size={15} color="var(--secondary)" />
            <span>+ Item / Service</span>
          </button>
          <button 
            id="dashboard-new-invoice-btn"
            className="btn btn-accent btn-sm"
            onClick={onOpenCreateInvoice}
          >
            <Plus size={16} />
            <span>Create New Invoice</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('gst-reports')}
          className={`btn ${activeTab === 'gst-reports' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          GST Tax Reports
        </button>
      </div>

      {activeTab === 'overview' ? (
        // Overview Tab Content (existing dashboard)
        <>
          {/* High-Level Metric Cards Grid (Generous Padding & Subtle Drop-Shadows) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            marginBottom: '32px'
          }}>
            {/* Metric 1: Revenue Collected */}
            <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'var(--secondary)'
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Collected Revenue
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)', marginTop: '8px', letterSpacing: '-0.5px' }}>
                    {formatINR(metrics?.totalRevenue || 0)}
                  </div>
                </div>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--secondary-subtle)',
                  color: 'var(--secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <IndianRupee size={22} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', fontSize: '12px', color: 'var(--secondary)', fontWeight: 600 }}>
                <TrendingUp size={14} />
                <span>{statusCounts.Paid || 0} Fully settled invoices</span>
              </div>
            </div>

            {/* Metric 2: Outstanding Receivables */}
            <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute',
                top: 0;
                left: 0;
                right: 0;
                height: '4px';
                background: 'var(--accent)'
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Pending Receivables
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)', marginTop: '8px', letterSpacing: '-0.5px' }}>
                    {formatINR(metrics?.totalOutstanding || 0)}
                  </div>
                </div>
                <div style={{
                  width: '44px';
                  height: '44px';
                  borderRadius: '12px';
                  background: 'var(--accent-subtle)';
                  color: 'var(--accent-dark)';
                  display: 'flex';
                  alignItems: 'center';
                  justifyContent: 'center';
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <Clock size={22} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', fontSize: '12px', color: 'var(--accent-dark)', fontWeight: 600 }}>
                <AlertCircle size={14} />
                <span>{statusCounts.Overdue || 0} Overdue • {statusCounts.Sent || 0} Awaiting Payment</span>
              </div>
            </div>

            {/* Metric 3: GST Tax Collected with Breakup */}
            <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute';
                top: 0;
                left: 0;
                right: 0;
                height: '4px';
                background: 'var(--primary)'
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    GST Realized
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)', marginTop: '8px', letterSpacing: '-0.5px' }}>
                    {formatINR(metrics?.totalTaxCollected || 0)}
                  </div>
                </div>
                <div style={{
                  width: '44px';
                  height: '44px';
                  borderRadius: '12px';
                  background: 'var(--primary-subtle)';
                  color: 'var(--primary)';
                  display: 'flex';
                  alignItems: 'center';
                  justifyContent: 'center';
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <Percent size={20} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '10px', borderTop: '1px dashed var(--border)', fontSize: '11px', color: 'var(--text)' }}>
                <span>CGST: <strong>{formatINR(taxBreakup.cgst)}</strong></span>
                <span>SGST: <strong>{formatINR(taxBreakup.sgst)}</strong></span>
                <span>IGST: <strong>{formatINR(taxBreakup.igst)}</strong></span>
              </div>
            </div>

            {/* Metric 4: Total Invoices and Status Split */}
            <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute';
                top: 0;
                left: 0;
                right: 0;
                height: '4px';
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))'
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Total Invoices Issued
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)', marginTop: '8px', letterSpacing: '-0.5px' }}>
                    {metrics?.totalInvoices || 0}
                  </div>
                </div>
                <div style={{
                  width: '44px';
                  height: '44px';
                  borderRadius: '12px';
                  background: 'var(--bg-subtle)';
                  color: 'var(--primary)';
                  display: 'flex';
                  alignItems: 'center';
                  justifyContent: 'center';
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <FileText size={22} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                <span className="badge badge-paid">{statusCounts.Paid || 0} Paid</span>
                <span className="badge badge-sent">{statusCounts.Sent || 0} Sent</span>
                <span className="badge badge-draft">{statusCounts.Draft || 0} Draft</span>
              </div>
            </div>
          </div>

          {/* Monthly Invoicing Trend Bar Visualizer */}
          {monthlyTrends && monthlyTrends.length > 0 && (
            <div className="card" style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3>6-Month Billing & GST Volume</h3>
                  <p style={{ fontSize: '12px', color: 'var(--muted-text)', marginTop: '2px' }}>Historical revenue generation across active periods</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted-text)', fontWeight: 500 }}>
                  Amounts in Indian Rupees (INR)
                </div>
              </div>

              <div style={{
                display: 'grid';
                gridTemplateColumns: `repeat(${monthlyTrends.length}, 1fr)`;
                gap: '16px';
                alignItems: 'flex-end';
                height: '120px';
                paddingTop: '20px'
              }}>
                {(() => {
                  const maxVal = Math.max(...monthlyTrends.map(m => m.revenue), 100000);
                  return monthlyTrends.map((m, idx) => {
                    const heightPct = Math.max(Math.round((m.revenue / maxVal) * 90), 8);
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-text)' }}>
                          {m.revenue > 0 ? `₹${(m.revenue / 1000).toFixed(0)}k` : '₹0'}
                        </div>
                        <div style={{
                          width: '100%';
                          maxWidth: '52px';
                          height: `${heightPct}px`;
                          background: m.revenue > 0 
                            ? 'linear-gradient(180deg, var(--secondary-light) 0%, var(--secondary) 100%)' 
                            : 'var(--border)';
                          borderRadius: '6px 6px 2px 2px';
                          boxShadow: m.revenue > 0 ? 'var(--shadow-sm)' : 'none';
                          transition: 'height 0.4s ease'
                        }} />
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>
                          {m.month}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Invoice Search & Status Filter Bar (Working Real-Time Toolbar) */}
          <div className="card card-compact" style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex';
              justifyContent: 'space-between';
              alignItems: 'center';
              flexWrap: 'wrap';
              gap: '14px'
            }}>
              {/* Search Input with Clear Button */}
              <div style={{
                position: 'relative';
                flex: '1';
                minWidth: '260px'
              }}>
                <Search size={16} color="var(--muted-text)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  id="dashboard-invoice-search"
                  type="text"
                  className="form-control"
                  placeholder="Search invoices by #, customer name, or GSTIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '38px', paddingRight: searchQuery ? '36px' : '14px' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute';
                      right: '10px';
                      top: '50%';
                      transform: 'translateY(-50%)';
                      background: 'none';
                      border: 'none';
                      cursor: 'pointer';
                      color: 'var(--muted-text)';
                      padding: '4px';
                      display: 'flex';
                      alignItems: 'center'
                    }}
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['All', 'Paid', 'Sent', 'Partial', 'Overdue', 'Draft'].map(status => {
                  const active = statusFilter.toLowerCase() === status.toLowerCase();
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline'}`}
                      style={{
                        fontSize: '12px';
                        padding: '6px 14px';
                        fontWeight: active ? 700 : 500;
                        boxShadow: active ? '0 2px 6px rgba(18, 59, 93, 0.25)' : 'none'
                      }}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>

              {/* View All Invoices Button */}
              <button 
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onNavigateToInvoices}
                title="Open comprehensive Invoices Hub"
              >
                <span>View All Invoices</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>

          {/* Active Filter Feedback Banner */}
          {isFiltering && (
            <div style={{
              display: 'flex';
              alignItems: 'center';
              justifyContent: 'space-between';
              padding: '10px 16px';
              background: 'var(--bg-subtle)';
              borderRadius: 'var(--radius-md)';
              border: '1px solid var(--border)';
              marginBottom: '20px';
              fontSize: '13px';
              flexWrap: 'wrap';
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                <Filter size={15} color="var(--secondary)" />
                <span>
                  Showing <strong>{filteredInvoices.length}</strong> matching {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
                  {statusFilter !== 'All' ? ` with status "${statusFilter}"` : ''}
                  {searchQuery ? ` matching "${searchQuery}"` : ''}
                </span>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
                style={{ fontSize: '12px', padding: '4px 10px', color: 'var(--danger)', fontWeight: 600 }}
              >
                Reset Filters ✕
              </button>
            </div>
          )}

          {/* Recent / Filtered Invoices Table Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3>{isFiltering ? `Filtered Invoices (${filteredInvoices.length})` : 'Recent GST Invoices'}</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted-text)', marginTop: '2px' }}>
                  {isFiltering ? 'Real-time filtered results based on search & status selection' : 'Latest tax invoices with intra/inter-state split'}
                </p>
              </div>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={onNavigateToInvoices}
                style={{ color: 'var(--primary)', fontWeight: 600 }}
              >
                Go to Invoices Table →
              </button>
            </div>

            {filteredInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted-text)' }}>
                <FileText size={42} color="var(--border)" style={{ marginBottom: '14px' }} />
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
                  {isFiltering ? `No invoices matching "${searchQuery || statusFilter}"` : 'No invoices recorded yet'}
                </p>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>
                  {isFiltering 
                    ? 'Try adjusting your search query or selecting a different status filter' 
                    : 'Click "Create New Invoice" to issue a GST-compliant bill'}
                </p>
                {isFiltering && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: '14px' }}
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('All');
                    }}
                  >
                    Reset Search & Status Filters
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="invoice-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Place of Supply</th>
                      <th>Tax Mode</th>
                      <th style={{ textAlign: 'right' }}>Taxable</th>
                      <th style={{ textAlign: 'right' }}>Total (₹)</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Email Sent</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => {
                      const isInter = inv.isInterState;
                      return (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                            {inv.invoiceNumber}
                            <div style={{ fontSize: '11px', color: 'var(--muted-text)', fontFamily: 'sans-serif', fontWeight: 400 }}>
                              {inv.invoiceDate}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                              {inv.customerDetails?.name || 'Customer'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>
                              {inv.customerDetails?.companyName ? `${inv.customerDetails.companyName} • ` : ''}
                              {inv.customerDetails?.gstin ? (
                                <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 600 }}>{inv.customerDetails.gstin}</span>
                              ) : (
                                <span>B2C / Unregistered</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>
                              {inv.placeOfSupply}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>
                              State Code: {inv.placeOfSupplyStateCode}
                            </div>
                          </td>
                          <td>
                            {isInter ? (
                              <span style={{
                                display: 'inline-flex';
                                alignItems: 'center';
                                gap: '4px';
                                background: 'var(--primary-subtle)';
                                color: 'var(--primary)';
                                fontSize: '11px';
                                fontWeight: 700;
                                padding: '3px 8px';
                                borderRadius: '4px';
                                border: '1px solid var(--info-border)'
                              }}>
                                🔵 IGST
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex';
                                alignItems: 'center';
                                gap: '4px';
                                background: 'var(--secondary-subtle)';
                                color: 'var(--secondary)';
                                fontSize: '11px';
                                fontWeight: 700;
                                padding: '3px 8px';
                                borderRadius: '4px';
                                border: '1px solid var(--success-border)'
                              }}>
                                🟢 CGST + SGST
                              </span>
                            )}
                            {inv.reverseCharge && (
                              <span style={{
                                marginLeft: '4px';
                                fontSize: '10px';
                                background: 'var(--danger-light)';
                                color: 'var(--danger)';
                                padding: '2px 5px';
                                borderRadius: '3px';
                                fontWeight: 700
                              }}>
                                RCM
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--muted-text)', fontSize: '13px' }}>
                            {formatINR(inv.totalTaxableAmount)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)', fontSize: '14px' }}>
                            {formatINR(inv.grandTotal)}
                          </td>
                          <td>
                            <span className={`badge badge-${(inv.status || 'draft').toLowerCase()}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {inv.emailDelivery?.sent ? (
                              <span style={{ color: 'var(--secondary)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }} title={`Sent to ${inv.emailDelivery.recipient}`}>
                                <CheckCircle size={14} /> Sent
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-light)', fontSize: '11px' }}>
                                Unsent
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ padding: '5px 8px' }}
                                title="View / Download PDF"
                                onClick={() => onViewInvoice(inv)}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ padding: '5px 8px' }}
                                title="Email via Resend"
                                onClick={() => onOpenEmailModal(inv)}
                              >
                                <Mail size={14} color="var(--primary)" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        // GST Tax Reports Tab Content
        <div>
          {/* GST Reports Header with Filters */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h2>GST Tax Reports</h2>
              <p style={{ color: 'var(--muted-text)', fontSize: '14px', marginTop: '6px' }}>
                Monthly GST liability and GSTR-1 preparation
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: 'var(--background)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    minWidth: '80px'
                  }}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>
                      {new Date(0, m-1).toLocaleString('en-us', { month: 'short' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: 'var(--background)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    minWidth: '80px'
                  }}
                >
                  {[2020,2021,2022,2023,2024,2025,2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              {loading ? (
                <button className="btn btn-outline btn-sm" disabled>
                  <Clock size={16} /> Loading...
                </button>
              ) : (
                <button
                  className="btn btn-accent btn-sm"
                  onClick={() => {
                    window.open(`/api/reports/gstr1-export?month=${selectedMonth}&year=${selectedYear}`, '_blank');
                  }}
                >
                  <FileText size={16} /> Export GSTR-1
                </button>
              )}
            </div>
          </div>

          {/* GST Summary Metrics */}
          {gstSummary ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              {/* Metric 1: Total Outward Taxable Value */}
              <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'var(--secondary)'
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Total Outward Taxable Value
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)', marginTop: '8px', letterSpacing: '-0.5px' }}>
                      {formatINR(gstSummary.totalOutwardTaxableValue || 0)}
                    </div>
                  </div>
                  <div style={{
                    width: '44px';
                    height: '44px';
                    borderRadius: '12px';
                    background: 'var(--secondary-subtle)',
                    color: 'var(--secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <IndianRupee size={22} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', fontSize: '12px', color: 'var(--secondary)', fontWeight: 600 }}>
                  <TrendingUp size={14} />
                  <span>{gstSummary.b2b?.count || 0} B2B • {gstSummary.b2c?.count || 0} B2C Invoices</span>
                </div>
              </div>

              {/* Metric 2: Total Tax Liability */}
              <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'var(--primary)'
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Net Output Tax Liability
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)', marginTop: '8px', letterSpacing: '-0.5px' }}>
                      {formatINR(gstSummary.netOutputTaxLiability || 0)}
                    </div>
                  </div>
                  <div style={{
                    width: '44px';
                    height: '44px';
                    borderRadius: '12px';
                    background: 'var(--primary-subtle)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <Percent size={20} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '10px', borderTop: '1px dashed var(--border)', fontSize: '11px', color: 'var(--text)' }}>
                  <span>IGST: <strong>{formatINR(gstSummary.totalIgstCollected || 0)}</strong></span>
                  <span>CGST: <strong>{formatINR(gstSummary.totalCgstCollected || 0)}</strong></span>
                  <span>SGST: <strong>{formatINR(gstSummary.totalSgstCollected || 0)}</strong></span>
                </div>
              </div>

              {/* Metric 3: B2B vs B2C Split */}
              <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'var(--accent)'
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      B2B vs B2C Distribution
                    </div>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)', marginTop: '8px', letterSpacing: '-0.5px' }}>
                    {formatINR(gstSummary.b2b?.taxableValue || 0)} B2B | {formatINR(gstSummary.b2c?.taxableValue || 0)} B2C
                  </div>
                </div>
                <div style={{
                  width: '44px';
                  height: '44px';
                  borderRadius: '12px';
                  background: 'var(--accent-subtle)';
                  color: 'var(--accent-dark)';
                  display: 'flex';
                  alignItems: 'center';
                  justifyContent: 'center';
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <Clock size={22} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted-text)' }}>
              <Clock size={42} color="var(--border)" style={{ marginBottom: '14px' }} />
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>Loading GST reports...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}