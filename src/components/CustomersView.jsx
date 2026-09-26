import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, FilePlus } from 'lucide-react';
import { GST_STATES, validateGSTIN } from '../utils/gstFrontendUtils';

export default function CustomersView({
  customers = [],
  onSaveCustomer,
  onDeleteCustomer,
  onQuickCreateInvoiceForCustomer
}) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [pincode, setPincode] = useState('');
  const [notes, setNotes] = useState('');
  const [gstinError, setGstinError] = useState('');

  const filtered = customers.filter(c => 
    (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
    (c.companyName && c.companyName.toLowerCase().includes(search.toLowerCase())) ||
    (c.gstin && c.gstin.toLowerCase().includes(search.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setCompanyName('');
    setGstin('');
    setEmail('');
    setPhone('');
    setStreet('');
    setCity('');
    setStateCode('27');
    setPincode('');
    setNotes('');
    setGstinError('');
    setIsModalOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCustomer(c);
    setName(c.name || '');
    setCompanyName(c.companyName || '');
    setGstin(c.gstin || '');
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setStreet(c.billingAddress?.street || '');
    setCity(c.billingAddress?.city || '');
    setStateCode(c.billingAddress?.stateCode || '27');
    setPincode(c.billingAddress?.pincode || '');
    setNotes(c.notes || '');
    setGstinError('');
    setIsModalOpen(true);
  };

  const handleGstinChange = (val) => {
    const upper = val.toUpperCase();
    setGstin(upper);
    const stripped = upper.replace(/[\s-]/g, '');
    
    // Auto-sync state dropdown if user typed or pasted valid 2-digit state prefix
    if (stripped.length >= 2) {
      const code = stripped.substring(0, 2);
      const stateObj = GST_STATES.find(s => s.code === code);
      if (stateObj && stateCode !== code) {
        setStateCode(code);
      }
    }

    if (stripped.length > 0) {
      const res = validateGSTIN(stripped, stateCode);
      if (!res.valid) {
        setGstinError(res.error);
      } else {
        setGstinError('');
      }
    } else {
      setGstinError('');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const cleanedGstin = gstin.trim().replace(/[\s-]/g, '').toUpperCase();
    if (cleanedGstin) {
      const res = validateGSTIN(cleanedGstin, stateCode);
      if (!res.valid) {
        setGstinError(res.error);
        return;
      }
    }

    const stateObj = GST_STATES.find(s => s.code === stateCode);

    const payload = {
      name: name.trim(),
      companyName: companyName.trim(),
      gstin: cleanedGstin,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      billingAddress: {
        street: street.trim(),
        city: city.trim(),
        state: stateObj ? stateObj.name : 'Maharashtra',
        stateCode: stateCode,
        pincode: pincode.trim()
      },
      notes: notes.trim()
    };

    await onSaveCustomer(payload, editingCustomer ? editingCustomer.id : null);
    setIsModalOpen(false);
  };

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
          <h1>Customer Directory</h1>
          <p style={{ color: 'var(--muted-text)', fontSize: '14px', marginTop: '6px' }}>
            B2B registered enterprises & B2C clients with verified GST state codes
          </p>
        </div>

        <button 
          id="add-customer-btn"
          className="btn btn-accent"
          onClick={openAddModal}
        >
          <Plus size={16} />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="card card-compact" style={{ marginBottom: '28px' }}>
        <div style={{ position: 'relative', maxWidth: '420px' }}>
          <Search size={16} color="var(--muted-text)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search customer by name, company, GSTIN, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {/* Customer Cards Grid (Generous internal padding & subtle drop-shadows) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '24px'
      }}>
        {filtered.map(c => {
          const isB2B = !!(c.gstin && c.gstin.trim());
          return (
            <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <h3 style={{ color: 'var(--primary)' }}>{c.name}</h3>
                    {c.companyName && (
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>
                        {c.companyName}
                      </div>
                    )}
                  </div>
                  <span className={`badge ${isB2B ? 'badge-paid' : 'badge-draft'}`}>
                    {isB2B ? 'B2B Registered' : 'B2C Consumer'}
                  </span>
                </div>

                <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>
                    <span style={{ color: 'var(--muted-text)' }}>GSTIN: </span>
                    {c.gstin ? (
                      <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{c.gstin}</strong>
                    ) : (
                      <span style={{ fontStyle: 'italic', color: 'var(--text-light)' }}>None (Unregistered)</span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted-text)' }}>Location: </span>
                    <span>{c.billingAddress?.city ? `${c.billingAddress.city}, ` : ''}{c.billingAddress?.state} ({c.billingAddress?.stateCode || '--'})</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted-text)' }}>Email: </span>
                    <span>{c.email}</span>
                  </div>
                  {c.phone && (
                    <div>
                      <span style={{ color: 'var(--muted-text)' }}>Phone: </span>
                      <span>{c.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '20px',
                paddingTop: '14px',
                borderTop: '1px solid var(--border)'
              }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '12px' }}
                  onClick={() => onQuickCreateInvoiceForCustomer(c)}
                >
                  <FilePlus size={14} color="var(--accent-dark)" />
                  <span>Invoice Client</span>
                </button>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px' }}
                    onClick={() => openEditModal(c)}
                    title="Edit customer"
                    aria-label="Edit customer"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px', color: 'var(--danger)' }}
                    onClick={() => onDeleteCustomer(c.id)}
                    title="Delete customer"
                    aria-label="Delete customer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)} aria-label="Close modal">
                &times;
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Contact Person Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Company Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">State & GST Code *</label>
                    <select
                      className="form-control"
                      value={stateCode}
                      onChange={(e) => {
                        setStateCode(e.target.value);
                        if (gstin) handleGstinChange(gstin);
                      }}
                    >
                      {GST_STATES.map(s => (
                        <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>GSTIN (B2B)</span>
                      <span className="form-hint">15 chars</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${gstinError ? 'is-invalid' : ''}`}
                      placeholder="e.g. 27AABCV1234F1Z8"
                      value={gstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                    />
                    {gstinError && <div className="form-error">{gstinError}</div>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Street Address</label>
                    <input
                      type="text"
                      className="form-control"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-control"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input
                      type="text"
                      className="form-control"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Internal Notes</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Key client, net 15 payment terms"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
