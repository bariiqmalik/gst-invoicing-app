import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  Reply, 
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/gstFrontendUtils';

export default function EmailModal({
  isOpen,
  onClose,
  invoice,
  business,
  onEmailSent
}) {
  // Hooks MUST be unconditional
  const [recipient, setRecipient] = useState(() => invoice?.customerDetails?.email || '');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isError, setIsError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Return null only AFTER all hooks
  if (!isOpen || !invoice) return null;

  const replyToAddress = business?.email || 'your registered business email';

  const handleSend = async (e) => {
    e.preventDefault();
    if (!recipient.trim()) return;

    try {
      setIsSending(true);
      setStatusMessage(null);
      setIsError(false);

      const res = await api.sendInvoiceEmail(invoice.id, recipient.trim());

      setStatusMessage(res.message);
      setIsError(false);
      if (onEmailSent && res.invoice) {
        onEmailSent(res.invoice);
      }
    } catch (err) {
      setIsError(true);
      setStatusMessage(err.message || 'Failed to dispatch email. Please check your network connection.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        
        {/* Modal Header */}
        <div className="modal-header" style={{ background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--primary-subtle)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mail size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                Email Invoice to Client
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted-text)' }}>
                Dispatched via Centralized SaaS Cloud Mailer
              </p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px' }} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSend}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Invoice Quick Summary Bar */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>
                  Invoice #{invoice.invoiceNumber}
                </div>
                <div style={{ color: 'var(--muted-text)', fontSize: '12px' }}>
                  Client: <strong>{invoice.customerDetails?.name}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--secondary)', fontSize: '16px' }}>
                  {formatINR(invoice.grandTotal)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>
                  Due: {invoice.dueDate}
                </div>
              </div>
            </div>

            {/* Status Alert Notification */}
            {statusMessage && (
              <div style={{
                background: isError ? 'var(--danger-light)' : 'var(--secondary-subtle)',
                border: isError ? '1px solid var(--danger-border)' : '1px solid var(--success-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                fontSize: '13px',
                color: isError ? 'var(--danger)' : 'var(--secondary-dark)',
                lineHeight: 1.5
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '4px' }}>
                  {isError ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                  <span>{isError ? 'Transmission Issue' : 'Invoice Dispatched Successfully!'}</span>
                </div>
                <div>{statusMessage}</div>
              </div>
            )}

            {/* Recipient Input */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Recipient Client Email *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--muted-text)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="email-modal-recipient-input"
                  type="email"
                  className="form-control"
                  placeholder="e.g. client@company.com"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            {/* Centralized SaaS Delivery & Dynamic Reply-To Card */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary)', fontWeight: 700 }}>
                <ShieldCheck size={16} />
                <span>Centralized SaaS Mailer (SPF & DKIM Authenticated)</span>
              </div>
              <p style={{ color: 'var(--muted-text)', margin: 0, lineHeight: 1.4 }}>
                Invoices are dispatched automatically through our verified master delivery infrastructure to guarantee inbox placement and prevent spam filtering.
              </p>

              <div style={{
                background: 'var(--cards)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--text)'
              }}>
                <Reply size={15} color="var(--primary)" />
                <span>
                  <strong>Dynamic Reply-To:</strong> Replies route directly to <strong>{replyToAddress}</strong>
                </span>
              </div>
            </div>

            {/* Email HTML Preview Button */}
            <div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ width: '100%', fontSize: '13px', justifyContent: 'center' }}
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye size={15} />
                <span>{showPreview ? 'Hide Email Preview' : 'Preview Branded Email Content'}</span>
              </button>
            </div>

            {/* Email Preview Card */}
            {showPreview && (
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                background: 'var(--cards)',
                maxHeight: '220px',
                overflowY: 'auto',
                fontSize: '12px'
              }}>
                <div style={{ background: 'var(--primary)', color: '#ffffff', padding: '10px 12px', borderRadius: '6px', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{business?.legalName || 'My Business'}</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>GSTIN: {business?.gstin || 'N/A'}</div>
                </div>

                <p style={{ margin: '0 0 6px 0' }}>Dear <strong>{invoice.customerDetails?.name}</strong>,</p>
                <p style={{ color: 'var(--text)', margin: '0 0 8px 0' }}>
                  Please find attached your GST Tax Invoice <strong>#{invoice.invoiceNumber}</strong>. Amount payable is <strong>{formatINR(invoice.grandTotal)}</strong> due by <strong>{invoice.dueDate}</strong>.
                </p>

                <div style={{ background: 'var(--bg-subtle)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '11px' }}>
                  <strong>Bank Transfer Instructions:</strong><br />
                  Bank: {business?.bankDetails?.bankName} • A/C: {business?.bankDetails?.accountNumber}<br />
                  IFSC: {business?.bankDetails?.ifscCode}
                </div>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Close
            </button>
            <button
              id="confirm-send-email-btn"
              type="submit"
              className="btn btn-primary"
              disabled={isSending}
              style={{ fontWeight: 700 }}
            >
              <Send size={15} />
              <span>{isSending ? 'Dispatching...' : 'Send Invoice Email'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
