import React, { useState } from 'react';
import { Building2, Save, CreditCard, Mail, FileText, CheckCircle } from 'lucide-react';
import { GST_STATES, validateGSTIN } from '../utils/gstFrontendUtils';

function getBusinessFormData(b) {
  return {
    legalName: b?.legalName || '',
    tradeName: b?.tradeName || '',
    gstin: b?.gstin || '',
    pan: b?.pan || '',
    email: b?.email || '',
    phone: b?.phone || '',
    addressLine1: b?.addressLine1 || '',
    addressLine2: b?.addressLine2 || '',
    city: b?.city || '',
    state: b?.state || 'Maharashtra',
    stateCode: b?.stateCode || '27',
    pincode: b?.pincode || '',
    bankDetails: {
      bankName: b?.bankDetails?.bankName || '',
      accountHolder: b?.bankDetails?.accountHolder || '',
      accountNumber: b?.bankDetails?.accountNumber || '',
      ifscCode: b?.bankDetails?.ifscCode || '',
      branch: b?.bankDetails?.branch || '',
      upiId: b?.bankDetails?.upiId || ''
    },
    invoicePrefix: b?.invoicePrefix || 'INV-2024-',
    nextInvoiceNumber: b?.nextInvoiceNumber || 101,
    termsAndConditions: b?.termsAndConditions || '',
    defaultNotes: b?.defaultNotes || '',
    resendApiKey: b?.resendApiKey || '',
    resendFromEmail: b?.resendFromEmail || 'invoicing@updates.resend.dev'
  };
}

export default function BusinessSettingsView({
  business,
  onSaveBusiness
}) {
  const [formData, setFormData] = useState(() => getBusinessFormData(business));

  const [gstinError, setGstinError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleBankChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: val
      }
    }));
  };

  const handleStateChange = (code) => {
    const s = GST_STATES.find(st => st.code === code);
    if (s) {
      setFormData(prev => ({
        ...prev,
        state: s.name,
        stateCode: s.code
      }));
      if (formData.gstin) {
        validateGstinInput(formData.gstin, code);
      }
    }
  };

  const validateGstinInput = (val, code = formData.stateCode) => {
    const upper = val.toUpperCase();
    handleChange('gstin', upper);
    const stripped = upper.replace(/[\s-]/g, '');
    if (stripped) {
      const res = validateGSTIN(stripped, code);
      if (!res.valid) {
        setGstinError(res.error);
      } else {
        setGstinError('');
        // Auto extract PAN
        handleChange('pan', res.pan);
      }
    } else {
      setGstinError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const strippedGstin = formData.gstin.trim().replace(/[\s-]/g, '').toUpperCase();
    if (strippedGstin) {
      const res = validateGSTIN(strippedGstin, formData.stateCode);
      if (!res.valid) {
        setGstinError(res.error);
        return;
      }
    }

    try {
      setIsSaving(true);
      await onSaveBusiness({
        ...formData,
        gstin: strippedGstin
      });
      setSuccessMsg('Business profile and GST settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '36px 24px' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '28px' }}>
        <h1>Business Profile & GST Configuration</h1>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px', marginTop: '6px' }}>
          Configured details appear directly on issued tax invoices, official PDFs, and email dispatches.
        </p>
      </div>

      {successMsg && (
        <div style={{
          background: 'var(--secondary-subtle)',
          border: '1px solid var(--success-border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          color: 'var(--secondary-dark)',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600
        }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Section 1: Legal Identity & GST */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-subtle)', color: 'var(--accent-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} />
            </div>
            <div>
              <h3>Legal Identity & Indian GST Details</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted-text)', marginTop: '2px' }}>Registered taxpayer information under Indian GST</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Legal Name (As on GST / PAN) *</label>
              <input
                type="text"
                className="form-control"
                value={formData.legalName}
                onChange={(e) => handleChange('legalName', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Trade / Brand Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.tradeName}
                onChange={(e) => handleChange('tradeName', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Registered State & GST Code *</label>
              <select
                className="form-control"
                value={formData.stateCode}
                onChange={(e) => handleStateChange(e.target.value)}
              >
                {GST_STATES.map(s => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>GSTIN (15 Digits) *</span>
                <span className="form-hint">Validated</span>
              </label>
              <input
                type="text"
                className={`form-control ${gstinError ? 'is-invalid' : ''}`}
                value={formData.gstin}
                onChange={(e) => validateGstinInput(e.target.value)}
                required
                style={{ fontFamily: 'monospace' }}
              />
              {gstinError && <div className="form-error">{gstinError}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Permanent Account Number (PAN) *</label>
              <input
                type="text"
                className="form-control"
                value={formData.pan}
                onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                required
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Business Email *</label>
              <input
                type="email"
                className="form-control"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                className="form-control"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginTop: '12px' }}>
            <div className="form-group">
              <label className="form-label">Address Line 1 *</label>
              <input
                type="text"
                className="form-control"
                value={formData.addressLine1}
                onChange={(e) => handleChange('addressLine1', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">City *</label>
              <input
                type="text"
                className="form-control"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Pincode *</label>
              <input
                type="text"
                className="form-control"
                value={formData.pincode}
                onChange={(e) => handleChange('pincode', e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Section 2: Bank Account & Payment Remittance */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--secondary-subtle)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h3>Bank Account & Remittance Details</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted-text)', marginTop: '2px' }}>Printed on invoices for wire transfer / NEFT / IMPS / UPI</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Bank Name *</label>
              <input
                type="text"
                className="form-control"
                value={formData.bankDetails.bankName}
                onChange={(e) => handleBankChange('bankName', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Beneficiary Account Name *</label>
              <input
                type="text"
                className="form-control"
                value={formData.bankDetails.accountHolder}
                onChange={(e) => handleBankChange('accountHolder', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Number *</label>
              <input
                type="text"
                className="form-control"
                value={formData.bankDetails.accountNumber}
                onChange={(e) => handleBankChange('accountNumber', e.target.value)}
                required
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">IFSC Code *</label>
              <input
                type="text"
                className="form-control"
                placeholder="HDFC0001042"
                value={formData.bankDetails.ifscCode}
                onChange={(e) => handleBankChange('ifscCode', e.target.value.toUpperCase())}
                required
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Branch Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.bankDetails.branch}
                onChange={(e) => handleBankChange('branch', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">UPI ID / VPA</label>
              <input
                type="text"
                className="form-control"
                placeholder="name@okhdfcbank"
                value={formData.bankDetails.upiId}
                onChange={(e) => handleBankChange('upiId', e.target.value)}
                style={{ fontFamily: 'monospace' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Invoice Numbering & Terms */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} />
            </div>
            <div>
              <h3>Invoice Sequences & Default Terms</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted-text)', marginTop: '2px' }}>Automate invoice number generation and standard boilerplate</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Invoice Prefix</label>
              <input
                type="text"
                className="form-control"
                value={formData.invoicePrefix}
                onChange={(e) => handleChange('invoicePrefix', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Next Sequence Number</label>
              <input
                type="number"
                className="form-control"
                value={formData.nextInvoiceNumber}
                onChange={(e) => handleChange('nextInvoiceNumber', Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
            <div className="form-group">
              <label className="form-label">Default Terms & Conditions</label>
              <textarea
                className="form-control"
                rows="3"
                value={formData.termsAndConditions}
                onChange={(e) => handleChange('termsAndConditions', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Invoice Note</label>
              <textarea
                className="form-control"
                rows="3"
                value={formData.defaultNotes}
                onChange={(e) => handleChange('defaultNotes', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Centralized SaaS Email Delivery */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--secondary-subtle)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={18} />
            </div>
            <div>
              <h3>Centralized Platform Email Delivery</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted-text)', marginTop: '2px' }}>Managed high-volume delivery service powered by BillGST Pro Master Cloud Mailer</p>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '13px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary)', fontWeight: 700 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)' }} />
              <span>Centralized High-Volume Cloud Mailer Active</span>
            </div>
            <p style={{ color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
              All invoices are dispatched automatically through our centralized, verified master domain with DKIM and SPF authentication to maximize deliverability directly to client inboxes.
            </p>
            <div style={{
              background: 'var(--cards)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '12px 16px',
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--muted-text)', display: 'block' }}>Dynamic Reply-To Destination:</span>
                <strong style={{ color: 'var(--primary)' }}>{formData.email || 'Your Registered Business Email'}</strong>
              </div>
              <span style={{
                fontSize: '11px',
                background: 'var(--primary-subtle)',
                color: 'var(--primary)',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontWeight: 700
              }}>
                Direct Client Replies
              </span>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button
            id="save-business-settings-btn"
            type="submit"
            className="btn btn-accent"
            disabled={isSaving}
            style={{ padding: '12px 28px', fontSize: '15px' }}
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving Updates...' : 'Save Business Settings'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
