import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Building,
  FileCheck
} from 'lucide-react';
import { 
  GST_STATES, 
  validateGSTIN, 
  validateHsnSac, 
  calculateInvoiceTotals, 
  formatINR 
} from '../utils/gstFrontendUtils';

export default function InvoiceEditorModal({
  isOpen,
  onClose,
  onSave,
  customers = [],
  catalogItems = [],
  business = {}
}) {
  const businessStateCode = business?.stateCode || '27';

  const defaultInvNum = business?.invoicePrefix 
    ? `${business.invoicePrefix}${business.nextInvoiceNumber || 101}` 
    : 'INV-2024-101';
  const [invoiceNumber, setInvoiceNumber] = useState(defaultInvNum);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => 
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  
  const [placeOfSupply, setPlaceOfSupply] = useState(business?.state || 'Maharashtra');
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState(businessStateCode);
  const [reverseCharge, setReverseCharge] = useState(false);

  // Line Items
  const [items, setItems] = useState([
    {
      catalogItemId: '',
      name: '',
      description: '',
      type: 'SERVICES',
      hsnSac: '998314',
      qty: 1,
      unit: 'NOS',
      unitPrice: 25000,
      discountPercent: 0,
      gstRate: 18
    }
  ]);

  const [notes, setNotes] = useState(business?.defaultNotes || 'Thank you for your business!');
  const [terms, setTerms] = useState(business?.termsAndConditions || 'Payment due within 15 days.');
  const [formErrors, setFormErrors] = useState([]);


  // If modal is not open, return null AFTER all hooks are evaluated
  if (!isOpen) return null;

  // When customer changes in dropdown
  const handleCustomerSelect = (id) => {
    setSelectedCustomerId(id);
    if (!id) return;
    const c = customers.find(item => item.id === id);
    if (c) {
      setCustomerName(c.name || '');
      setCompanyName(c.companyName || '');
      setCustomerGstin(c.gstin || '');
      setCustomerEmail(c.email || '');
      setCustomerPhone(c.phone || '');
      const addr = [c.billingAddress?.street, c.billingAddress?.city].filter(Boolean).join(', ');
      setCustomerAddress(addr);

      if (c.billingAddress?.state && c.billingAddress?.stateCode) {
        setPlaceOfSupply(c.billingAddress.state);
        setPlaceOfSupplyStateCode(c.billingAddress.stateCode);
      }
    }
  };

  // Place of supply change
  const handlePosChange = (code) => {
    const st = GST_STATES.find(s => s.code === code);
    if (st) {
      setPlaceOfSupply(st.name);
      setPlaceOfSupplyStateCode(st.code);
    }
  };

  // When customer GSTIN is typed, auto-sync Place of Supply if first 2 digits are valid
  const handleGstinInputChange = (val) => {
    const cleaned = val.toUpperCase();
    setCustomerGstin(cleaned);
    const stripped = cleaned.replace(/[\s-]/g, '');
    if (stripped.length >= 2) {
      const code = stripped.substring(0, 2);
      const stateObj = GST_STATES.find(s => s.code === code);
      if (stateObj && placeOfSupplyStateCode !== code) {
        setPlaceOfSupply(stateObj.name);
        setPlaceOfSupplyStateCode(stateObj.code);
      }
    }
  };

  // Line item manipulation
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSelectCatalogItem = (index, catalogId) => {
    const cat = catalogItems.find(c => c.id === catalogId);
    if (cat) {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        catalogItemId: cat.id,
        name: cat.name,
        description: cat.description || '',
        type: cat.type || 'SERVICES',
        hsnSac: cat.hsnSacCode || '',
        unitPrice: cat.unitPrice || 0,
        unit: cat.unit || 'NOS',
        gstRate: cat.defaultGstRate || 18
      };
      setItems(updated);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        catalogItemId: '',
        name: '',
        description: '',
        type: 'SERVICES',
        hsnSac: '998311',
        qty: 1,
        unit: 'NOS',
        unitPrice: 10000,
        discountPercent: 0,
        gstRate: 18
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Live Totals calculation
  const calculated = calculateInvoiceTotals(items, businessStateCode, placeOfSupplyStateCode, reverseCharge);
  const isInterState = calculated.isInterState;

  // Validation before submission
  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = [];

    if (!customerName.trim()) {
      errors.push('Customer Name is required.');
    }

    if (!customerEmail.trim()) {
      errors.push('Customer Email is required for invoice dispatch.');
    }

    if (!placeOfSupplyStateCode) {
      errors.push('Place of Supply is mandatory for GST calculations.');
    }

    // Validate Customer GSTIN if provided
    if (customerGstin.trim()) {
      const gstinVal = validateGSTIN(customerGstin, placeOfSupplyStateCode);
      if (!gstinVal.valid) {
        errors.push(`Customer GSTIN Error: ${gstinVal.error}`);
      }
    }

    // Validate Line Items
    if (!items.length) {
      errors.push('At least one item is required.');
    }

    items.forEach((item, idx) => {
      if (!item.name.trim()) {
        errors.push(`Line ${idx + 1}: Item description/name is required.`);
      }
      if (!item.hsnSac || !item.hsnSac.toString().trim()) {
        errors.push(`Line ${idx + 1}: HSN/SAC code is mandatory for Indian GST compliance.`);
      } else {
        const hsnVal = validateHsnSac(item.hsnSac, item.type);
        if (!hsnVal.valid) {
          errors.push(`Line ${idx + 1} (${item.name || 'Item'}): ${hsnVal.error}`);
        }
      }
      if (item.unitPrice < 0) {
        errors.push(`Line ${idx + 1}: Unit price cannot be negative.`);
      }
    });

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors([]);

    const payload = {
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate,
      customerId: selectedCustomerId || null,
      customerDetails: {
        name: customerName.trim(),
        companyName: companyName.trim(),
        gstin: customerGstin.trim().replace(/[\s-]/g, '').toUpperCase(),
        email: customerEmail.trim(),
        phone: customerPhone.trim(),
        address: customerAddress.trim(),
        state: placeOfSupply,
        stateCode: placeOfSupplyStateCode
      },
      placeOfSupply,
      placeOfSupplyStateCode,
      reverseCharge,
      items,
      notes,
      termsAndConditions: terms,
      status: 'Sent'
    };

    onSave(payload);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '980px' }}>
        
        {/* Modal Header */}
        <div className="modal-header" style={{ background: 'var(--bg-subtle)' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck size={22} color="var(--accent)" />
              <span>Create GST Tax Invoice</span>
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted-text)', marginTop: '2px' }}>
              Follows CBIC Indian GST standards with real-time intra/inter-state tax split
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px' }} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Error alerts */}
            {formErrors.length > 0 && (
              <div style={{
                background: 'var(--danger-light)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                color: 'var(--danger)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px' }}>
                  <AlertCircle size={18} />
                  <span>GST Validation Issues Found</span>
                </div>
                <ul style={{ margin: '8px 0 0 20px', fontSize: '13px' }}>
                  {formErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top Row: Invoice metadata */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              background: 'var(--bg-subtle)',
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)'
            }}>
              <div>
                <label className="form-label">Invoice Number *</label>
                <input
                  type="text"
                  className="form-control"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-2024-101"
                  required
                />
              </div>

              <div>
                <label className="form-label">Invoice Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Payment Due Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Customer Information Section */}
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              background: 'var(--cards)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={16} color="var(--primary)" />
                  <span>Billed To (Customer Details)</span>
                </h4>
                
                {customers.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted-text)' }}>Autofill:</span>
                    <select
                      className="form-control"
                      style={{ width: '220px', padding: '6px 10px', fontSize: '13px' }}
                      value={selectedCustomerId}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                    >
                      <option value="">-- Choose saved customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.companyName ? `(${c.companyName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px'
              }}>
                <div>
                  <label className="form-label">Client / Contact Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Priya Sundaram"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Company / Legal Entity</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. TechVeda Solutions LLP"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">
                    <span>Customer GSTIN (B2B)</span>
                    <span className="form-hint">15 chars</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 29AABCT1334M1ZV"
                    value={customerGstin}
                    onChange={(e) => handleGstinInputChange(e.target.value)}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label className="form-label">Billing Email *</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="client@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+91 98450 00000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Billing Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Street, City, Pincode"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* GST Place of Supply & Tax Nature */}
            <div style={{
              background: isInterState ? 'var(--primary-subtle)' : 'var(--secondary-subtle)',
              border: isInterState ? '1px solid var(--info-border)' : '1px solid var(--success-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: isInterState ? 'var(--primary)' : 'var(--secondary)' }}>
                  {isInterState ? '🔵 Inter-State Supply (IGST Applied)' : '🟢 Intra-State Supply (CGST + SGST Applied)'}
                </div>
                <div style={{ fontSize: '13px', color: isInterState ? 'var(--primary)' : 'var(--secondary)', marginTop: '2px' }}>
                  Supplier State: <strong>{business?.state || 'Maharashtra'} ({businessStateCode})</strong> ➜ Place of Supply: <strong>{placeOfSupply} ({placeOfSupplyStateCode})</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
                    Place of Supply (POS State) *
                  </label>
                  <select
                    className="form-control"
                    style={{ minWidth: '220px', padding: '6px 10px', fontSize: '13px', background: 'var(--cards)' }}
                    value={placeOfSupplyStateCode}
                    onChange={(e) => handlePosChange(e.target.value)}
                  >
                    {GST_STATES.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '18px' }}>
                  <input
                    type="checkbox"
                    id="rcm-toggle"
                    checked={reverseCharge}
                    onChange={(e) => setReverseCharge(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="rcm-toggle" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Reverse Charge (RCM)
                  </label>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4>Invoice Line Items & HSN/SAC</h4>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleAddItem}
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <table className="invoice-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '32px' }}>#</th>
                      <th style={{ minWidth: '220px' }}>Item & Catalog Preset</th>
                      <th style={{ width: '100px' }}>Type</th>
                      <th style={{ width: '120px' }}>HSN / SAC *</th>
                      <th style={{ width: '70px' }}>Qty</th>
                      <th style={{ width: '80px' }}>Unit</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Rate (₹)</th>
                      <th style={{ width: '75px', textAlign: 'right' }}>Disc%</th>
                      <th style={{ width: '85px' }}>GST%</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Total (₹)</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const baseAmt = (Number(item.qty) || 1) * (Number(item.unitPrice) || 0);
                      const disc = baseAmt * ((Number(item.discountPercent) || 0) / 100);
                      const taxable = baseAmt - disc;
                      const taxRate = Number(item.gstRate) || 0;
                      const lineTotal = reverseCharge ? taxable : taxable + (taxable * (taxRate / 100));

                      const hsnValidation = item.hsnSac ? validateHsnSac(item.hsnSac, item.type) : { valid: false };

                      return (
                        <tr key={idx}>
                          <td style={{ color: 'var(--muted-text)', fontWeight: 600 }}>{idx + 1}</td>
                          
                          <td>
                            {catalogItems.length > 0 && (
                              <select
                                className="form-control"
                                style={{ padding: '4px 6px', fontSize: '11px', marginBottom: '4px', background: 'var(--bg-subtle)' }}
                                value={item.catalogItemId || ''}
                                onChange={(e) => handleSelectCatalogItem(idx, e.target.value)}
                              >
                                <option value="">-- Autofill from catalog --</option>
                                {catalogItems.map(c => (
                                  <option key={c.id} value={c.id}>{c.name} ({formatINR(c.unitPrice)})</option>
                                ))}
                              </select>
                            )}
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Description of Goods/Services"
                              value={item.name}
                              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              required
                              style={{ fontSize: '13px', padding: '6px 8px' }}
                            />
                          </td>

                          <td>
                            <select
                              className="form-control"
                              value={item.type}
                              onChange={(e) => handleItemChange(idx, 'type', e.target.value)}
                              style={{ padding: '6px 4px', fontSize: '12px' }}
                            >
                              <option value="SERVICES">Services</option>
                              <option value="GOODS">Goods</option>
                            </select>
                          </td>

                          <td>
                            <input
                              type="text"
                              className={`form-control ${item.hsnSac && !hsnValidation.valid ? 'is-invalid' : ''}`}
                              placeholder={item.type === 'SERVICES' ? '998311' : '8471'}
                              value={item.hsnSac}
                              onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                              required
                              style={{ padding: '6px 8px', fontSize: '12px', fontFamily: 'monospace' }}
                            />
                            {item.hsnSac && !hsnValidation.valid && (
                              <div style={{ fontSize: '10px', color: 'var(--danger)', marginTop: '2px' }}>
                                Invalid code
                              </div>
                            )}
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              className="form-control"
                              value={item.qty}
                              onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                              style={{ padding: '6px 4px', textAlign: 'center', fontSize: '13px' }}
                            />
                          </td>

                          <td>
                            <select
                              className="form-control"
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              style={{ padding: '6px 4px', fontSize: '12px' }}
                            >
                              <option value="NOS">NOS</option>
                              <option value="HRS">HRS</option>
                              <option value="PCS">PCS</option>
                              <option value="DAYS">DAYS</option>
                              <option value="MONTHS">MONTHS</option>
                              <option value="BOX">BOX</option>
                              <option value="MTR">MTR</option>
                            </select>
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="form-control"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                              style={{ padding: '6px 6px', textAlign: 'right', fontSize: '13px' }}
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="form-control"
                              value={item.discountPercent}
                              onChange={(e) => handleItemChange(idx, 'discountPercent', e.target.value)}
                              style={{ padding: '6px 4px', textAlign: 'right', fontSize: '12px' }}
                            />
                          </td>

                          <td>
                            <select
                              className="form-control"
                              value={item.gstRate}
                              onChange={(e) => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                              style={{ padding: '6px 4px', fontSize: '12px' }}
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>

                          <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                            {formatINR(lineTotal)}
                          </td>

                          <td>
                            {items.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleRemoveItem(idx)}
                                style={{ padding: '4px', color: 'var(--danger)' }}
                                aria-label="Delete line item"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations and Words Preview */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px'
            }}>
              <div>
                <label className="form-label">Client Notes & Payment Instructions</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes shown on invoice..."
                />

                <label className="form-label" style={{ marginTop: '10px' }}>Terms & Conditions</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Terms of service..."
                />
              </div>

              {/* Financial Summary Card */}
              <div style={{
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                border: '1px solid var(--border)'
              }}>
                <h4 style={{ textTransform: 'uppercase', color: 'var(--muted-text)', marginBottom: '12px', fontSize: '12px' }}>
                  Tax & Payable Summary
                </h4>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                  <span style={{ color: 'var(--muted-text)' }}>Total Taxable Value:</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(calculated.totalTaxableAmount)}</span>
                </div>

                {isInterState ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: 'var(--primary)' }}>
                    <span>Integrated GST (IGST):</span>
                    <span style={{ fontWeight: 600 }}>{formatINR(calculated.totalIgstAmount)}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: 'var(--secondary)' }}>
                      <span>Central GST (CGST):</span>
                      <span style={{ fontWeight: 600 }}>{formatINR(calculated.totalCgstAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: 'var(--secondary)' }}>
                      <span>State GST (SGST):</span>
                      <span style={{ fontWeight: 600 }}>{formatINR(calculated.totalSgstAmount)}</span>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', borderTop: '1px dashed var(--border)', marginTop: '6px' }}>
                  <span style={{ color: 'var(--muted-text)' }}>Total GST Amount:</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(calculated.totalTaxAmount)}</span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 0 6px 0',
                  marginTop: '8px',
                  borderTop: '2px solid var(--primary)',
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--primary)'
                }}>
                  <span>Grand Total:</span>
                  <span style={{ color: 'var(--secondary)' }}>{formatINR(calculated.grandTotal)}</span>
                </div>

                <div style={{
                  background: 'var(--cards)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  marginTop: '10px',
                  lineHeight: '1.4'
                }}>
                  <strong>Amount in Words:</strong> {calculated.totalInWords}
                </div>
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button 
              id="save-issue-invoice-btn"
              type="submit" 
              className="btn btn-accent"
              style={{ fontWeight: 700 }}
            >
              Issue GST Tax Invoice
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
