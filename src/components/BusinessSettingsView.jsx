import React, { useState } from 'react';
import { 
  Building2, 
  Save, 
  CreditCard, 
  Mail, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Info 
} from 'lucide-react';
import { GST_STATES, validateGSTIN } from '../utils/gstFrontendUtils';

function getBusinessFormData(b) {
  const currentYear = new Date().getFullYear();
  return {
    legalName: b?.legalName || b?.name || '',
    tradeName: b?.tradeName || b?.legalName || b?.name || '',
    gstin: b?.gstin || '',
    pan: b?.pan || '',
    email: b?.email || '',
    phone: b?.phone || '',
    addressLine1: b?.addressLine1 || (typeof b?.address === 'string' ? b?.address : '') || '',
    addressLine2: b?.addressLine2 || '',
    city: b?.city || '',
    state: b?.state || 'Maharashtra',
    stateCode: b?.stateCode || '27',
    pincode: b?.pincode || '',
    bankDetails: {
      bankName: b?.bankDetails?.bankName || '',
      accountHolder: b?.bankDetails?.accountHolder || b?.legalName || b?.name || '',
      accountNumber: b?.bankDetails?.accountNumber || '',
      ifscCode: b?.bankDetails?.ifscCode || '',
      branch: b?.bankDetails?.branch || '',
      upiId: b?.bankDetails?.upiId || ''
    },
    invoicePrefix: b?.invoicePrefix || `INV-${currentYear}-`,
    nextInvoiceNumber: b?.nextInvoiceNumber || 101,
    termsAndConditions: b?.termsAndConditions || '1. Payment is due within 15 days of invoice date.\n2. Please mention the invoice number in the NEFT/RTGS/IMPS transfer remarks.\n3. Goods or services once billed are non-refundable unless agreed in writing.',
    defaultNotes: b?.defaultNotes || 'Thank you for your business! We appreciate the opportunity to collaborate with you.',
    resendApiKey: b?.resendApiKey || '',
    resendFromEmail: b?.resendFromEmail || ''
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

  // Sync state when business prop updates from API
  const [prevBusiness, setPrevBusiness] = useState(business);
  if (business !== prevBusiness) {
    setPrevBusiness(business);
    setFormData(getBusinessFormData(business));
  }

  // Helper: Detect if address belongs to Mumbai
  const isMumbaiLocation = (city = '', addr1 = '', addr2 = '', pin = '') => {
    const combined = `${city} ${addr1} ${addr2}`.toLowerCase();
    const hasMumbaiKeyword = combined.includes('mumbai') || 
                             combined.includes('bombay') || 
                             combined.includes('andheri') || 
                             combined.includes('bandra') || 
                             combined.includes('nariman') || 
                             combined.includes('thane') || 
                             combined.includes('vikhroli') || 
                             combined.includes('kurla') || 
                             combined.includes('dadar');
    const isMumbaiPin = (pin || '').trim().startsWith('400');
    return hasMumbaiKeyword || isMumbaiPin;
  };

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

  // State dropdown change handler
  const handleStateChange = (code) => {
    const s = GST_STATES.find(st => st.code === code);
    if (s) {
      const strippedGstin = (formData.gstin || '').trim().replace(/[\s-]/g, '').toUpperCase();
      
      setFormData(prev => ({
        ...prev,
        state: s.name,
        stateCode: s.code
      }));

      // Validate GSTIN prefix match with the newly selected state
      if (strippedGstin) {
        validateGstinState(strippedGstin, s.code);
      }
    }
  };

  // City change with auto-defaulting to 27 - Maharashtra for Mumbai
  const handleCityChange = (cityVal) => {
    const isMumbai = isMumbaiLocation(cityVal, formData.addressLine1, formData.addressLine2, formData.pincode);
    const updates = { city: cityVal };

    // Auto-default to 27 - Maharashtra if Mumbai location detected
    if (isMumbai && formData.stateCode !== '27') {
      const maharashtra = GST_STATES.find(s => s.code === '27');
      if (maharashtra) {
        updates.state = maharashtra.name;
        updates.stateCode = maharashtra.code;
      }
    }

    setFormData(prev => ({ ...prev, ...updates }));

    if (formData.gstin) {
      validateGstinState(formData.gstin, updates.stateCode || formData.stateCode);
    }
  };

  // Address Line 1 change with auto-defaulting for Mumbai
  const handleAddressLine1Change = (addrVal) => {
    const isMumbai = isMumbaiLocation(formData.city, addrVal, formData.addressLine2, formData.pincode);
    const updates = { addressLine1: addrVal };

    if (isMumbai && formData.stateCode !== '27') {
      const maharashtra = GST_STATES.find(s => s.code === '27');
      if (maharashtra) {
        updates.state = maharashtra.name;
        updates.stateCode = maharashtra.code;
      }
    }

    setFormData(prev => ({ ...prev, ...updates }));

    if (formData.gstin) {
      validateGstinState(formData.gstin, updates.stateCode || formData.stateCode);
    }
  };

  // Pincode change with Mumbai 400xxx auto-detection
  const handlePincodeChange = (pinVal) => {
    const isMumbai = isMumbaiLocation(formData.city, formData.addressLine1, formData.addressLine2, pinVal);
    const updates = { pincode: pinVal };

    if (isMumbai && formData.stateCode !== '27') {
      const maharashtra = GST_STATES.find(s => s.code === '27');
      if (maharashtra) {
        updates.state = maharashtra.name;
        updates.stateCode = maharashtra.code;
      }
    }

    setFormData(prev => ({ ...prev, ...updates }));

    if (formData.gstin) {
      validateGstinState(formData.gstin, updates.stateCode || formData.stateCode);
    }
  };

  // GSTIN change handler with state auto-defaulting & strict prefix validation
  const handleGstinChange = (val) => {
    const upper = val.toUpperCase().trim();
    const stripped = upper.replace(/[\s-]/g, '');
    let activeStateCode = formData.stateCode;
    let activeStateName = formData.state;

    // Auto extract PAN
    let newPan = formData.pan;
    if (stripped.length >= 12) {
      newPan = stripped.substring(2, 12);
    }

    // Auto default to 27 - Maharashtra if GSTIN starts with 27 and user has a Mumbai address or default mismatch
    if (stripped.length >= 2) {
      const gstinPrefix = stripped.substring(0, 2);
      const isMumbai = isMumbaiLocation(formData.city, formData.addressLine1, formData.addressLine2, formData.pincode);
      
      if (gstinPrefix === '27' && isMumbai && formData.stateCode !== '27') {
        const maharashtra = GST_STATES.find(s => s.code === '27');
        if (maharashtra) {
          activeStateCode = '27';
          activeStateName = maharashtra.name;
        }
      }
    }

    setFormData(prev => ({
      ...prev,
      gstin: upper,
      pan: newPan,
      stateCode: activeStateCode,
      state: activeStateName
    }));

    validateGstinState(stripped, activeStateCode);
  };

  // Comprehensive GSTIN & State Code validation function
  const validateGstinState = (strippedGstin, expectedStateCode) => {
    const cleaned = (strippedGstin || '').trim().replace(/[\s-]/g, '').toUpperCase();
    if (!cleaned) {
      setGstinError('');
      return true;
    }

    const targetCode = String(expectedStateCode || '').padStart(2, '0');

    // 1. Strict State Code Prefix Validation
    if (cleaned.length >= 2) {
      const gstinPrefix = cleaned.substring(0, 2);
      if (targetCode && gstinPrefix !== targetCode) {
        const gstinStateObj = GST_STATES.find(s => s.code === gstinPrefix);
        const selectedStateObj = GST_STATES.find(s => s.code === targetCode);
        const gstinStateName = gstinStateObj ? gstinStateObj.name : 'Unknown State';
        const selectedStateName = selectedStateObj ? selectedStateObj.name : targetCode;

        setGstinError(
          `State Code Mismatch: GSTIN starts with '${gstinPrefix}' (${gstinStateName}), which does not match selected Registered State '${targetCode} - ${selectedStateName}'. The first 2 digits of the GSTIN must match the selected state code.`
        );
        return false;
      }
    }

    // 2. Format & Checksum Validation
    if (cleaned.length === 15) {
      const res = validateGSTIN(cleaned, targetCode);
      if (!res.valid) {
        setGstinError(res.error);
        return false;
      }
    } else if (cleaned.length > 0 && cleaned.length < 15) {
      setGstinError(`GSTIN must be exactly 15 characters (currently ${cleaned.length}/15). Example: 27AABCV1234F1Z8`);
      return false;
    }

    setGstinError('');
    return true;
  };

  // Name alignment comparison (Legal Name vs Beneficiary Account Name)
  const legalNameTrim = (formData.legalName || '').trim();
  const accountHolderTrim = (formData.bankDetails?.accountHolder || '').trim();
  const hasNameMismatch = legalNameTrim.length > 0 && 
                          accountHolderTrim.length > 0 && 
                          legalNameTrim.toLowerCase() !== accountHolderTrim.toLowerCase();

  // GSTIN State Code mismatch check for disabling save button
  const strippedGstin = (formData.gstin || '').trim().replace(/[\s-]/g, '').toUpperCase();
  const gstinPrefix = strippedGstin.length >= 2 ? strippedGstin.substring(0, 2) : '';
  const targetCode = String(formData.stateCode || '').padStart(2, '0');
  const isStateMismatch = strippedGstin.length >= 2 && gstinPrefix !== targetCode;
  const isSaveDisabled = isSaving || !!gstinError || isStateMismatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalGstin = formData.gstin.trim().replace(/[\s-]/g, '').toUpperCase();

    if (finalGstin) {
      const prefix = finalGstin.substring(0, 2);
      if (prefix !== targetCode) {
        const gstinStateObj = GST_STATES.find(s => s.code === prefix);
        const selectedStateObj = GST_STATES.find(s => s.code === targetCode);
        setGstinError(
          `State Code Mismatch: GSTIN starts with '${prefix}' (${gstinStateObj?.name || prefix}) but registered state is '${targetCode} - ${selectedStateObj?.name || targetCode}'. Please align state and GSTIN before saving.`
        );
        return;
      }

      const res = validateGSTIN(finalGstin, targetCode);
      if (!res.valid) {
        setGstinError(res.error);
        return;
      }
    }

    try {
      setIsSaving(true);
      await onSaveBusiness({
        ...formData,
        gstin: finalGstin
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

      {/* Success Notification Banner */}
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

      {/* Soft Name Alignment Warning Banner */}
      {hasNameMismatch && (
        <div style={{
          background: 'var(--warning-light)',
          border: '1px solid var(--warning-border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          color: 'var(--accent-dark)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          fontSize: '13px'
        }}>
          <AlertTriangle size={20} style={{ color: 'var(--accent-dark)', marginTop: '2px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>
              Name Alignment Warning (Identity Verification Prompt)
            </div>
            <div>
              Legal Business Name (<strong>{formData.legalName}</strong>) does not match Beneficiary Account Name (<strong>{formData.bankDetails.accountHolder}</strong>).
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.9, lineHeight: 1.45 }}>
              Under Indian banking and GST remittance regulations, client NEFT/RTGS payments or tax audit reconciliations may encounter issues if the invoice billing entity name differs from the official bank account holder. Please verify your business identity.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handleBankChange('accountHolder', formData.legalName)}
            style={{
              background: 'var(--cards)',
              color: 'var(--accent-dark)',
              border: '1px solid var(--warning-border)',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Sync Account Name
          </button>
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
            
            {/* Legal Name */}
            <div className="form-group">
              <label className="form-label">Legal Name (As on GST / PAN) *</label>
              <input
                id="business-legal-name-input"
                type="text"
                className="form-control"
                value={formData.legalName}
                onChange={(e) => handleChange('legalName', e.target.value)}
                required
              />
            </div>

            {/* Trade / Brand Name */}
            <div className="form-group">
              <label className="form-label">Trade / Brand Name</label>
              <input
                id="business-trade-name-input"
                type="text"
                className="form-control"
                value={formData.tradeName}
                onChange={(e) => handleChange('tradeName', e.target.value)}
              />
            </div>

            {/* Registered State Dropdown */}
            <div className="form-group">
              <label className="form-label">Registered State & GST Code *</label>
              <select
                id="business-state-select"
                className="form-control"
                value={formData.stateCode}
                onChange={(e) => handleStateChange(e.target.value)}
              >
                {GST_STATES.map(s => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>

            {/* GSTIN Input with Helper Text and Validation */}
            <div className="form-group">
              <label className="form-label">
                <span>GSTIN (15 Digits) *</span>
                <span className="form-hint" style={{ color: gstinError ? 'var(--danger)' : 'var(--secondary)', fontWeight: 600 }}>
                  {gstinError ? 'Mismatch Detected' : 'Verified'}
                </span>
              </label>
              <input
                id="business-gstin-input"
                type="text"
                className={`form-control ${gstinError ? 'is-invalid' : ''}`}
                value={formData.gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                required
                style={{ fontFamily: 'monospace' }}
              />

              {/* Strict Error Message */}
              {gstinError && (
                <div style={{
                  color: 'var(--danger)',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginTop: '5px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '4px'
                }}>
                  <AlertCircle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{gstinError}</span>
                </div>
              )}

              {/* UI Helper Text dictating state code significance */}
              <div style={{
                fontSize: '12px',
                color: 'var(--muted-text)',
                marginTop: '6px',
                lineHeight: 1.45,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px'
              }}>
                <Info size={14} style={{ color: 'var(--secondary)', marginTop: '2px', flexShrink: 0 }} />
                <span>
                  The first 2 digits of the 15-digit GSTIN dictate the registered state (e.g., <strong>27</strong> for Maharashtra, <strong>07</strong> for Delhi). This state code establishes taxpayer jurisdiction and is critical for accurate <strong>CGST + SGST</strong> (intra-state) vs. <strong>IGST</strong> (inter-state) tax calculations.
                </span>
              </div>
            </div>

            {/* PAN */}
            <div className="form-group">
              <label className="form-label">Permanent Account Number (PAN) *</label>
              <input
                id="business-pan-input"
                type="text"
                className="form-control"
                value={formData.pan}
                onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                required
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Business Email *</label>
              <input
                id="business-email-input"
                type="email"
                className="form-control"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                id="business-phone-input"
                type="text"
                className="form-control"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
          </div>

          {/* Address Line 1, City, Pincode */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginTop: '12px' }}>
            <div className="form-group">
              <label className="form-label">Address Line 1 *</label>
              <input
                id="business-address-input"
                type="text"
                className="form-control"
                value={formData.addressLine1}
                onChange={(e) => handleAddressLine1Change(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">City *</label>
              <input
                id="business-city-input"
                type="text"
                className="form-control"
                value={formData.city}
                onChange={(e) => handleCityChange(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Pincode *</label>
              <input
                id="business-pincode-input"
                type="text"
                className="form-control"
                value={formData.pincode}
                onChange={(e) => handlePincodeChange(e.target.value)}
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
                id="business-bank-name-input"
                type="text"
                className="form-control"
                value={formData.bankDetails.bankName}
                onChange={(e) => handleBankChange('bankName', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Beneficiary Account Name *</span>
                {hasNameMismatch && (
                  <span style={{ color: 'var(--accent-dark)', fontSize: '11px', fontWeight: 700 }}>
                    Mismatch
                  </span>
                )}
              </label>
              <input
                id="business-account-holder-input"
                type="text"
                className={`form-control ${hasNameMismatch ? 'is-warning' : ''}`}
                value={formData.bankDetails.accountHolder}
                onChange={(e) => handleBankChange('accountHolder', e.target.value)}
                required
                style={{ borderColor: hasNameMismatch ? 'var(--warning-border)' : undefined }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Number *</label>
              <input
                id="business-account-number-input"
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
                id="business-ifsc-input"
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
                id="business-branch-input"
                type="text"
                className="form-control"
                value={formData.bankDetails.branch}
                onChange={(e) => handleBankChange('branch', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">UPI ID / VPA</label>
              <input
                id="business-upi-input"
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
                id="business-invoice-prefix-input"
                type="text"
                className="form-control"
                value={formData.invoicePrefix}
                onChange={(e) => handleChange('invoicePrefix', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Next Sequence Number</label>
              <input
                id="business-next-number-input"
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
                id="business-terms-input"
                className="form-control"
                rows="3"
                value={formData.termsAndConditions}
                onChange={(e) => handleChange('termsAndConditions', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Invoice Note</label>
              <textarea
                id="business-notes-input"
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

        {/* Save Bar with Disabling and Explanatory Warning */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '10px', gap: '16px', flexWrap: 'wrap' }}>
          
          {isStateMismatch && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--danger)',
              fontSize: '13px',
              fontWeight: 600
            }}>
              <AlertCircle size={16} />
              <span>Save disabled: GSTIN state code prefix must match registered state</span>
            </div>
          )}

          <button
            id="save-business-settings-btn"
            type="submit"
            className="btn btn-accent"
            disabled={isSaveDisabled}
            style={{
              padding: '12px 28px',
              fontSize: '15px',
              opacity: isSaveDisabled ? 0.55 : 1,
              cursor: isSaveDisabled ? 'not-allowed' : 'pointer'
            }}
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving Updates...' : 'Save Business Settings'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
