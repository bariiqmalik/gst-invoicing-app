import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { validateHsnSac, formatINR } from '../utils/gstFrontendUtils';

export default function CatalogView({
  items = [],
  onSaveItem,
  onDeleteItem
}) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('SERVICES');
  const [hsnSacCode, setHsnSacCode] = useState('998311');
  const [unitPrice, setUnitPrice] = useState(15000);
  const [unit, setUnit] = useState('NOS');
  const [defaultGstRate, setDefaultGstRate] = useState(18);
  const [codeError, setCodeError] = useState('');

  const filtered = items.filter(it => 
    (it.name && it.name.toLowerCase().includes(search.toLowerCase())) ||
    (it.description && it.description.toLowerCase().includes(search.toLowerCase())) ||
    (it.hsnSacCode && it.hsnSacCode.includes(search))
  );

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setType('SERVICES');
    setHsnSacCode('998314');
    setUnitPrice(25000);
    setUnit('NOS');
    setDefaultGstRate(18);
    setCodeError('');
    setIsModalOpen(true);
  };

  const openEditModal = (it) => {
    setEditingItem(it);
    setName(it.name || '');
    setDescription(it.description || '');
    setType(it.type || 'SERVICES');
    setHsnSacCode(it.hsnSacCode || '');
    setUnitPrice(it.unitPrice || 0);
    setUnit(it.unit || 'NOS');
    setDefaultGstRate(it.defaultGstRate || 18);
    setCodeError('');
    setIsModalOpen(true);
  };

  const handleCodeChange = (val) => {
    setHsnSacCode(val);
    const stripped = val.trim().replace(/[\s-]/g, '');
    if (stripped) {
      const res = validateHsnSac(stripped, type);
      if (!res.valid) {
        setCodeError(res.error);
      } else {
        setCodeError('');
      }
    } else {
      setCodeError('');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const strippedCode = hsnSacCode.trim().replace(/[\s-]/g, '');
    const res = validateHsnSac(strippedCode, type);
    if (!res.valid) {
      setCodeError(res.error);
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      type,
      hsnSacCode: strippedCode,
      unitPrice: Number(unitPrice),
      unit,
      defaultGstRate: Number(defaultGstRate)
    };

    await onSaveItem(payload, editingItem ? editingItem.id : null);
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
          <h1>Product & Service Catalog</h1>
          <p style={{ color: 'var(--muted-text)', fontSize: '14px', marginTop: '6px' }}>
            Preconfigured items with standard Indian HSN/SAC codes and default GST slabs
          </p>
        </div>

        <button 
          id="add-catalog-item-btn"
          className="btn btn-primary"
          onClick={openAddModal}
        >
          <Plus size={16} />
          <span>Add Catalog Item</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="card card-compact" style={{ marginBottom: '28px' }}>
        <div style={{ position: 'relative', maxWidth: '420px' }}>
          <Search size={16} color="var(--muted-text)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search items by name, description, or HSN/SAC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {/* Grid of Catalog Cards (Generous padding & subtle drop-shadows) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {filtered.map(item => (
          <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: item.type === 'SERVICES' ? 'var(--primary-subtle)' : 'var(--accent-subtle)',
                  color: item.type === 'SERVICES' ? 'var(--primary)' : 'var(--accent-dark)',
                  border: item.type === 'SERVICES' ? '1px solid var(--info-border)' : '1px solid var(--warning-border)'
                }}>
                  {item.type}
                </span>

                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  background: 'var(--bg-subtle)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)'
                }}>
                  GST {item.defaultGstRate}%
                </span>
              </div>

              <h3 style={{ marginTop: '14px', color: 'var(--primary)' }}>
                {item.name}
              </h3>

              {item.description && (
                <p style={{ fontSize: '13px', color: 'var(--muted-text)', marginTop: '4px', lineHeight: 1.4 }}>
                  {item.description}
                </p>
              )}

              <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text)' }}>
                <div>
                  <span style={{ color: 'var(--muted-text)' }}>{item.type === 'SERVICES' ? 'SAC Code:' : 'HSN Code:'} </span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{item.hsnSacCode}</strong>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <span style={{ color: 'var(--muted-text)' }}>Default Rate: </span>
                  <strong style={{ fontSize: '15px', color: 'var(--secondary)' }}>{formatINR(item.unitPrice)}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--muted-text)' }}> / {item.unit}</span>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              marginTop: '18px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border)'
            }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => openEditModal(item)}
                aria-label="Edit catalog item"
              >
                <Edit2 size={14} />
                <span>Edit</span>
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)' }}
                onClick={() => onDeleteItem(item.id)}
                aria-label="Delete catalog item"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Catalog Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3>
                {editingItem ? 'Edit Catalog Item' : 'New Catalog Item / Service'}
              </h3>
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)} aria-label="Close modal">
                &times;
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                <div className="form-group">
                  <label className="form-label">Item / Service Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Cloud Architecture & DevOps"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Brief description for invoice line item..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Classification Type *</label>
                    <select
                      className="form-control"
                      value={type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setType(newType);
                        if (newType === 'SERVICES' && !hsnSacCode.startsWith('99')) {
                          setHsnSacCode('998311');
                        }
                      }}
                    >
                      <option value="SERVICES">Services (SAC)</option>
                      <option value="GOODS">Goods (HSN)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>{type === 'SERVICES' ? 'SAC Code (6 digits)' : 'HSN Code (4/6/8)'} *</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${codeError ? 'is-invalid' : ''}`}
                      placeholder={type === 'SERVICES' ? '998311' : '84715000'}
                      value={hsnSacCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      required
                    />
                    {codeError && <div className="form-error">{codeError}</div>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Unit Price (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-control"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit Measure</label>
                    <select
                      className="form-control"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      <option value="NOS">NOS (Numbers)</option>
                      <option value="HRS">HRS (Hours)</option>
                      <option value="PCS">PCS (Pieces)</option>
                      <option value="DAYS">DAYS</option>
                      <option value="MONTHS">MONTHS</option>
                      <option value="BOX">BOX</option>
                      <option value="MTR">MTR (Meters)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">GST Slab *</label>
                    <select
                      className="form-control"
                      value={defaultGstRate}
                      onChange={(e) => setDefaultGstRate(Number(e.target.value))}
                    >
                      <option value="0">0% (Nil)</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent">
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
