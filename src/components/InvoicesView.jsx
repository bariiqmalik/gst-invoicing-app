import React from 'react';
import { 
  Plus, 
  Search, 
  Eye, 
  Mail, 
  DollarSign, 
  Trash2, 
  CheckCircle, 
  FileText
} from 'lucide-react';
import { formatINR } from '../utils/gstFrontendUtils';

export default function InvoicesView({
  invoices = [],
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onOpenCreateInvoice,
  onViewInvoice,
  onOpenEmailModal,
  onOpenPaymentModal,
  onDeleteInvoice
}) {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 24px' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1>Invoices & Billing Hub</h1>
          <p style={{ color: 'var(--muted-text)', fontSize: '14px', marginTop: '6px' }}>
            Issue GST tax invoices, track payment status, download branded PDFs, and dispatch via email.
          </p>
        </div>

        <button 
          id="invoices-create-btn"
          className="btn btn-accent"
          onClick={onOpenCreateInvoice}
        >
          <Plus size={16} />
          <span>Create New Invoice</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '28px', padding: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          alignItems: 'flex-end'
        }}>
          {/* Search */}
          <div>
            <label className="form-label" style={{ marginBottom: '6px' }}>Search Query</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} color="var(--muted-text)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Invoice #, customer, GSTIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="form-label" style={{ marginBottom: '6px' }}>Status</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Invoices</option>
              <option value="Paid">Paid</option>
              <option value="Sent">Sent</option>
              <option value="Partial">Partial</option>
              <option value="Overdue">Overdue</option>
              <option value="Draft">Draft</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="form-label" style={{ marginBottom: '6px' }}>From Date</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="form-label" style={{ marginBottom: '6px' }}>To Date</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Status Pills */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '18px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border)',
          flexWrap: 'wrap'
        }}>
          {['All', 'Paid', 'Sent', 'Partial', 'Overdue', 'Draft', 'Cancelled'].map(st => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStatusFilter(st)}
                style={{ fontSize: '12px', padding: '5px 14px' }}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Invoices List Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--muted-text)' }}>
            <FileText size={48} color="var(--border)" style={{ marginBottom: '16px' }} />
            <h3 style={{ color: 'var(--text)' }}>No invoices found</h3>
            <p style={{ fontSize: '14px', marginTop: '6px', color: 'var(--muted-text)' }}>Try adjusting your search criteria or create your first invoice.</p>
            <button 
              className="btn btn-accent btn-sm"
              onClick={onOpenCreateInvoice}
              style={{ marginTop: '20px' }}
            >
              <Plus size={15} /> Create Invoice
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="invoice-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Invoice Details</th>
                  <th>Customer & GSTIN</th>
                  <th>Place of Supply</th>
                  <th>Tax Split Mode</th>
                  <th style={{ textAlign: 'right' }}>Taxable Value</th>
                  <th style={{ textAlign: 'right' }}>Tax (GST)</th>
                  <th style={{ textAlign: 'right' }}>Grand Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Email Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const isInter = inv.isInterState;
                  return (
                    <tr key={inv.id}>
                      {/* Invoice Details */}
                      <td>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)', fontSize: '14px' }}>
                          {inv.invoiceNumber}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>
                          Issued: {inv.invoiceDate}
                        </div>
                        <div style={{ fontSize: '11px', color: inv.status === 'Overdue' ? 'var(--danger)' : 'var(--muted-text)', fontWeight: 500 }}>
                          Due: {inv.dueDate}
                        </div>
                      </td>

                      {/* Customer */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {inv.customerDetails?.name || 'Customer'}
                        </div>
                        {inv.customerDetails?.companyName && (
                          <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>
                            {inv.customerDetails.companyName}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>
                          {inv.customerDetails?.gstin ? (
                            <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 600 }}>{inv.customerDetails.gstin}</span>
                          ) : (
                            <span style={{ fontStyle: 'italic' }}>B2C / Unregistered</span>
                          )}
                        </div>
                      </td>

                      {/* Place of Supply */}
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>
                          {inv.placeOfSupply}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>
                          Code: {inv.placeOfSupplyStateCode}
                        </div>
                      </td>

                      {/* Tax Split Mode */}
                      <td>
                        {isInter ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'var(--primary-subtle)',
                            color: 'var(--primary)',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--info-border)'
                          }}>
                            🔵 IGST
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'var(--secondary-subtle)',
                            color: 'var(--secondary)',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--success-border)'
                          }}>
                            🟢 CGST + SGST
                          </span>
                        )}
                        {inv.reverseCharge && (
                          <div style={{ marginTop: '3px' }}>
                            <span style={{
                              fontSize: '10px',
                              background: 'var(--danger-light)',
                              color: 'var(--danger)',
                              padding: '2px 5px',
                              borderRadius: '3px',
                              fontWeight: 700
                            }}>
                              RCM (Reverse Charge)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Taxable */}
                      <td style={{ textAlign: 'right', color: 'var(--muted-text)', fontSize: '13px' }}>
                        {formatINR(inv.totalTaxableAmount)}
                      </td>

                      {/* Tax */}
                      <td style={{ textAlign: 'right', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                        {formatINR(inv.totalTaxAmount)}
                      </td>

                      {/* Grand Total */}
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)', fontSize: '15px' }}>
                        {formatINR(inv.grandTotal)}
                        {inv.paymentDetails?.amountPaid > 0 && inv.status !== 'Paid' && (
                          <div style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: 600 }}>
                            Paid: {formatINR(inv.paymentDetails.amountPaid)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge badge-${(inv.status || 'draft').toLowerCase()}`}>
                          {inv.status}
                        </span>
                      </td>

                      {/* Email Status */}
                      <td style={{ textAlign: 'center' }}>
                        {inv.emailDelivery?.sent ? (
                          <span style={{ color: 'var(--secondary)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }} title={`Sent at ${inv.emailDelivery.sentAt}`}>
                            <CheckCircle size={14} /> Sent
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontSize: '11px' }}>
                            Unsent
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: '6px 10px' }}
                            title="Preview & Download PDF"
                            onClick={() => onViewInvoice(inv)}
                          >
                            <Eye size={14} />
                            <span style={{ fontSize: '12px' }}>View</span>
                          </button>

                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: '6px 10px', color: 'var(--primary)' }}
                            title="Email to Customer via Resend"
                            onClick={() => onOpenEmailModal(inv)}
                          >
                            <Mail size={14} />
                          </button>

                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: '6px 10px', color: 'var(--secondary)' }}
                            title="Record Payment"
                            onClick={() => onOpenPaymentModal(inv)}
                          >
                            <DollarSign size={14} />
                          </button>

                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '6px 8px', color: 'var(--danger)' }}
                            title="Delete Invoice"
                            onClick={() => onDeleteInvoice(inv.id)}
                            aria-label="Delete invoice"
                          >
                            <Trash2 size={14} />
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

    </div>
  );
}
