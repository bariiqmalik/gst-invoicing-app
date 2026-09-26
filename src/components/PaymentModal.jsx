import React, { useState } from 'react';
import { X, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatINR } from '../utils/gstFrontendUtils';

export default function PaymentModal({
  isOpen,
  onClose,
  invoice,
  onRecordPayment
}) {
  const grandTotal = invoice?.grandTotal || 0;
  const currentPaid = invoice?.paymentDetails?.amountPaid || 0;
  const balanceDue = Math.max(grandTotal - currentPaid, 0);

  // Hooks declared unconditionally at the top
  const [amount, setAmount] = useState(() => balanceDue || grandTotal);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer (NEFT/RTGS)');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Early return only AFTER hooks
  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const paidNum = Number(amount) || 0;
    setErrorMsg('');

    setIsSubmitting(true);
    try {
      await onRecordPayment(invoice.id, {
        amountPaid: paidNum,
        paymentDate,
        paymentMethod,
        paymentReference,
        notes
      });

      // Celebrate full payment
      if (paidNum >= grandTotal) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--secondary-subtle)',
              color: 'var(--secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DollarSign size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px' }}>Record Received Payment</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted-text)' }}>
                Invoice #{invoice.invoiceNumber} • {invoice.customerDetails?.name}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px' }} aria-label="Close payment modal">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Balance Due Notice */}
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
                <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>Total Invoice Value:</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{formatINR(grandTotal)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>Remaining Balance:</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: balanceDue > 0 ? 'var(--accent-dark)' : 'var(--secondary)' }}>
                  {formatINR(balanceDue)}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div style={{
                background: 'var(--danger-light)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--danger)',
                fontSize: '13px',
                fontWeight: 500
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Amount Input */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Amount Received (₹) *</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '11px', color: 'var(--accent-dark)', padding: '2px 6px' }}
                  onClick={() => setAmount(grandTotal)}
                >
                  Pay Full Amount
                </button>
              </div>
              <input
                type="number"
                step="any"
                min="1"
                className="form-control"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            {/* Payment Date */}
            <div className="form-group">
              <label className="form-label">Payment Date *</label>
              <input
                type="date"
                className="form-control"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label className="form-label">Remittance Method</label>
              <select
                className="form-control"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                <option value="IMPS / Instant Transfer">IMPS / Instant Transfer</option>
                <option value="UPI (GooglePay / PhonePe / Paytm)">UPI (GooglePay / PhonePe / Paytm)</option>
                <option value="Cheque / Demand Draft">Cheque / Demand Draft</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            {/* Reference Number */}
            <div className="form-group">
              <label className="form-label">
                <span>UTR / Transaction Reference</span>
                <span className="form-hint">Optional</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. HDFCR202409150029"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Payment Notes</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Cleared into primary current account"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              id="confirm-record-payment-btn"
              type="submit"
              className="btn btn-accent"
              disabled={isSubmitting}
            >
              <CheckCircle size={15} />
              <span>{isSubmitting ? 'Recording...' : 'Confirm & Update Status'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
