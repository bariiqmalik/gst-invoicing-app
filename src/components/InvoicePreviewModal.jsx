import React, { useRef, useState } from 'react';
import {
  X,
  Printer,
  Download,
  Mail,
  DollarSign,
  CheckCircle,
  Clock,
  CreditCard
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { formatINR, isIntraStateSupply, numberToIndianWords } from '../utils/gstFrontendUtils';

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice,
  business,
  onOpenEmailModal,
  onOpenPaymentModal
}) {
  // All hooks MUST be declared unconditionally at the top
  const invoiceSheetRef = useRef(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  // Early return only AFTER hooks
  if (!isOpen || !invoice) return null;

  const isInterState = invoice.isInterState !== undefined
    ? Boolean(invoice.isInterState)
    : (Number(invoice.totalIgstAmount) > 0 || !isIntraStateSupply(
        business?.stateCode || invoice.businessDetails?.stateCode || '27',
        invoice.placeOfSupplyStateCode || invoice.customerDetails?.stateCode
      ));
  const isPaid = invoice.status === 'Paid';
  const isOverdue = invoice.status === 'Overdue';

  // Supplier state code derived from business GSTIN (first 2 chars) or stateCode field
  const supplierStateCode = business?.stateCode
    || (business?.gstin?.length >= 2 ? business.gstin.substring(0, 2) : '27');

  // Buyer state code from customer GSTIN first 2 chars or placeOfSupplyStateCode
  const buyerStateCode = invoice.customerDetails?.stateCode
    || invoice.placeOfSupplyStateCode
    || (invoice.customerDetails?.gstin?.length >= 2 ? invoice.customerDetails.gstin.substring(0, 2) : '');

  // Group line items by HSN/SAC for the official GST HSN summary table
  const hsnSummaryMap = {};
  (invoice.items || []).forEach(item => {
    const code = item.hsnSac || 'OTHER';
    if (!hsnSummaryMap[code]) {
      hsnSummaryMap[code] = {
        hsnSac: code,
        taxableAmount: 0,
        cgstRate: item.cgstRate || 0,
        cgstAmount: 0,
        sgstRate: item.sgstRate || 0,
        sgstAmount: 0,
        igstRate: item.igstRate || 0,
        igstAmount: 0,
        totalTax: 0,
        rate: item.gstRate || 0
      };
    }
    hsnSummaryMap[code].taxableAmount += (item.taxableAmount || 0);
    hsnSummaryMap[code].cgstAmount += (item.cgstAmount || 0);
    hsnSummaryMap[code].sgstAmount += (item.sgstAmount || 0);
    hsnSummaryMap[code].igstAmount += (item.igstAmount || 0);
    hsnSummaryMap[code].totalTax += ((item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0));
  });
  const hsnSummaryList = Object.values(hsnSummaryMap);

  // Grand total in words — use stored value or recompute
  const totalInWords = invoice.totalInWords || numberToIndianWords(invoice.grandTotal || 0);

  // Robust PDF Generation via html2canvas & jsPDF
  const handleDownloadPdf = async () => {
    if (!invoiceSheetRef.current) return;
    setPdfError('');
    setIsGeneratingPdf(true);

    try {
      const element = invoiceSheetRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentHeight = (canvas.height * pageWidth) / canvas.width;

      if (contentHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, contentHeight);
      } else {
        let heightLeft = contentHeight;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, contentHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          position = heightLeft - contentHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pageWidth, contentHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`Tax-Invoice-${invoice.invoiceNumber || 'draft'}.pdf`);
    } catch {
      setPdfError('PDF export encountered an issue. Use the "Print" button to save as PDF directly.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => { window.print(); };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '940px', maxHeight: '95vh' }}>

        {/* ── Control Bar (hidden on print) ───────────────────────── */}
        <div className="no-print" style={{
          padding: '14px 24px',
          background: 'linear-gradient(135deg, var(--emerald-deep) 0%, var(--emerald-dark) 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: 'var(--radius-xl)',
          borderTopRightRadius: 'var(--radius-xl)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>
              Invoice #{invoice.invoiceNumber}
            </span>
            <span className={`badge badge-${(invoice.status || 'draft').toLowerCase()}`}>
              {invoice.status}
            </span>
            {invoice.emailDelivery?.sent && (
              <span style={{ fontSize: '11px', color: '#6EE7B7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={12} /> Emailed to {invoice.emailDelivery.recipient}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              id="record-payment-btn"
              className="btn btn-outline btn-sm"
              onClick={() => onOpenPaymentModal(invoice)}
            >
              <DollarSign size={14} color="var(--secondary)" />
              <span>Record Payment</span>
            </button>

            <button
              id="email-invoice-btn"
              className="btn btn-outline btn-sm"
              onClick={() => onOpenEmailModal(invoice)}
            >
              <Mail size={14} color="var(--primary)" />
              <span>Send via Email</span>
            </button>

            <button
              id="print-invoice-btn"
              className="btn btn-outline btn-sm"
              onClick={handlePrint}
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              id="download-pdf-btn"
              className="btn btn-accent btn-sm"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
            >
              <Download size={14} />
              <span>{isGeneratingPdf ? 'Generating PDF…' : 'Download PDF'}</span>
            </button>

            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ color: '#ffffff', padding: '6px' }}
              aria-label="Close invoice preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Scrollable wrapper ────────────────────────────────────── */}
        <div style={{ padding: '28px 20px', background: 'var(--background)', overflowY: 'auto' }}>

          {/* PDF error alert (no-print) */}
          {pdfError && (
            <div className="no-print" style={{
              maxWidth: '860px', margin: '0 auto 14px auto',
              background: 'var(--warning-light)', border: '1px solid var(--warning-border)',
              borderRadius: 'var(--radius-md)', padding: '12px 18px',
              color: 'var(--accent-dark)', fontSize: '13px'
            }}>
              {pdfError}
            </div>
          )}

          {/* Payment status banner (no-print) */}
          <div className="no-print" style={{
            maxWidth: '860px', margin: '0 auto 16px auto',
            background: isPaid ? 'var(--secondary-subtle)' : isOverdue ? 'var(--danger-light)' : 'var(--accent-subtle)',
            border: isPaid ? '1px solid var(--success-border)' : isOverdue ? '1px solid var(--danger-border)' : '1px solid var(--warning-border)',
            borderRadius: 'var(--radius-md)', padding: '12px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: '13px',
            color: isPaid ? 'var(--secondary-dark)' : isOverdue ? 'var(--danger)' : 'var(--accent-dark)',
            flexWrap: 'wrap', gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isPaid ? <CheckCircle size={18} /> : <Clock size={18} />}
              <div>
                <strong>Payment Status: {invoice.status?.toUpperCase()}</strong>
                {isPaid && invoice.paymentDetails?.paymentDate ? (
                  <span> — Paid on {invoice.paymentDetails.paymentDate} via {invoice.paymentDetails.paymentMethod} (Ref: {invoice.paymentDetails.paymentReference || 'N/A'})</span>
                ) : (
                  <span> — Remit payment using Bank NEFT/RTGS or UPI ID below.</span>
                )}
              </div>
            </div>
            {!isPaid && (
              <button
                className="btn btn-sm btn-outline"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={() => onOpenPaymentModal(invoice)}
              >
                Update Payment
              </button>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              PRINTABLE / DOWNLOADABLE INVOICE SHEET
              All print-relevant content lives inside .invoice-sheet
              ═══════════════════════════════════════════════════════════ */}
          <div ref={invoiceSheetRef} className="invoice-sheet" id="invoice-printable-sheet">

            {/* ── HEADER: Business + TAX INVOICE stamp ──────────────── */}
            <div className="invoice-header-block" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2.5px solid var(--primary)',
              paddingBottom: '18px',
              marginBottom: '18px'
            }}>
              {/* Supplier / Business side */}
              <div style={{ maxWidth: '460px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  {business?.logoUrl ? (
                    <img src={business.logoUrl} alt="Logo" style={{ height: '44px', objectFit: 'contain' }} />
                  ) : (
                    <div className="invoice-avatar">
                      {business?.legalName ? business.legalName.charAt(0).toUpperCase() : 'B'}
                    </div>
                  )}
                  <div>
                    <h2 style={{ fontSize: '19px', margin: 0, color: 'var(--primary)', lineHeight: 1.1 }} className="print-primary-color">
                      {business?.legalName || 'Business Name'}
                    </h2>
                    {business?.tradeName && (
                      <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>{business.tradeName}</div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.6 }}>
                  <div>{business?.addressLine1}{business?.addressLine2 ? `, ${business.addressLine2}` : ''}</div>
                  <div>{business?.city}, {business?.state} — {business?.pincode}</div>
                  <div>Phone: {business?.phone || 'N/A'} &nbsp;•&nbsp; Email: {business?.email || 'N/A'}</div>
                  <div style={{ marginTop: '5px', fontWeight: 700 }}>
                    <span style={{ color: 'var(--primary)' }} className="print-primary-color">GSTIN:&nbsp;</span>
                    <span style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}>{business?.gstin || 'N/A'}</span>
                    &nbsp;&nbsp;
                    <span style={{ color: 'var(--primary)' }} className="print-primary-color">State Code:&nbsp;</span>
                    <span style={{ fontFamily: 'monospace' }}>{supplierStateCode}</span>
                  </div>
                  <div>
                    <strong>State:&nbsp;</strong>{business?.state || 'N/A'}
                    &nbsp;&nbsp;
                    <strong>PAN:&nbsp;</strong><span style={{ fontFamily: 'monospace' }}>{business?.pan || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* TAX INVOICE stamp + metadata */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="invoice-stamp">
                  TAX INVOICE
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted-text)', marginTop: '3px' }}>
                  (Original for Recipient)
                </div>

                <div style={{ marginTop: '14px', fontSize: '13px', lineHeight: 1.7 }}>
                  <div>
                    Invoice No:&nbsp;
                    <strong style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--primary)' }} className="print-primary-color">
                      {invoice.invoiceNumber}
                    </strong>
                  </div>
                  <div>Invoice Date: <strong>{invoice.invoiceDate}</strong></div>
                  <div>
                    Payment Due Date:&nbsp;
                    <strong style={{ color: isOverdue ? 'var(--danger)' : 'var(--primary)' }} className="print-primary-color">
                      {invoice.dueDate}
                    </strong>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    Place of Supply:&nbsp;
                    <strong>{invoice.placeOfSupply} ({invoice.placeOfSupplyStateCode})</strong>
                  </div>
                  <div>
                    Reverse Charge:&nbsp;
                    <strong>{invoice.reverseCharge ? 'YES (RCM Applicable)' : 'NO'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PARTY BLOCKS: Billed To / Compliance ──────────────── */}
            <div className="invoice-party-block" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '14px 18px',
              marginBottom: '18px',
              fontSize: '12px'
            }}>
              {/* Buyer block */}
              <div>
                <div style={{
                  fontSize: '10px', textTransform: 'uppercase',
                  color: 'var(--muted-text)', fontWeight: 700, marginBottom: '5px', letterSpacing: '0.5px'
                }}>
                  BILLED TO (BUYER / RECIPIENT)
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }} className="print-primary-color">
                  {invoice.customerDetails?.name}
                </div>
                {invoice.customerDetails?.companyName && (
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                    {invoice.customerDetails.companyName}
                  </div>
                )}
                <div style={{ color: 'var(--muted-text)', marginTop: '4px', lineHeight: 1.5 }}>
                  {invoice.customerDetails?.address || 'Address on record'}
                </div>
                <div style={{ marginTop: '4px' }}>
                  <strong>State:&nbsp;</strong>{invoice.customerDetails?.state || invoice.placeOfSupply}
                  &nbsp;&nbsp;
                  <strong>State Code:&nbsp;</strong>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{buyerStateCode}</span>
                </div>
                <div>Email: {invoice.customerDetails?.email}&nbsp;&nbsp;Phone: {invoice.customerDetails?.phone || 'N/A'}</div>
              </div>

              {/* Buyer GSTIN + tax nature */}
              <div>
                <div style={{
                  fontSize: '10px', textTransform: 'uppercase',
                  color: 'var(--muted-text)', fontWeight: 700, marginBottom: '5px', letterSpacing: '0.5px'
                }}>
                  BUYER GSTIN &amp; TAX NATURE
                </div>
                <div style={{ marginTop: '4px' }}>
                  <strong>GSTIN:&nbsp;</strong>
                  {invoice.customerDetails?.gstin ? (
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '13px' }} className="print-primary-color">
                      {invoice.customerDetails.gstin}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--muted-text)', fontStyle: 'italic' }}>Unregistered / B2C Consumer</span>
                  )}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <strong>Nature of Supply:&nbsp;</strong>
                  <span style={{ fontWeight: 700, color: isInterState ? 'var(--primary)' : 'var(--secondary)' }}>
                    {isInterState ? 'Inter-State Supply (IGST)' : 'Intra-State Supply (CGST + SGST)'}
                  </span>
                </div>
                <div>
                  <strong>Applicable Taxes:&nbsp;</strong>
                  <span style={{ fontWeight: 600 }}>{isInterState ? 'IGST' : 'CGST + SGST'}</span>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <strong>Supplier State Code:&nbsp;</strong>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{supplierStateCode}</span>
                  &nbsp;&nbsp;
                  <strong>Buyer State Code:&nbsp;</strong>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{buyerStateCode}</span>
                </div>
              </div>
            </div>

            {/* ── LINE ITEMS TABLE ───────────────────────────────────── */}
            <table className="invoice-table" style={{ margin: '0 0 4px 0' }}>
              <thead>
                <tr>
                  <th style={{ width: '26px', textAlign: 'center' }}>#</th>
                  <th style={{ minWidth: '180px' }}>Description of Goods / Services</th>
                  <th style={{ width: '72px', textAlign: 'center' }}>HSN / SAC</th>
                  <th style={{ width: '40px', textAlign: 'center' }}>Qty</th>
                  <th style={{ width: '44px', textAlign: 'center' }}>Unit</th>
                  <th style={{ width: '76px', textAlign: 'right' }}>Unit Price (₹)</th>
                  <th style={{ width: '50px', textAlign: 'right' }}>Disc%</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Taxable (₹)</th>
                  <th style={{ width: '46px', textAlign: 'center' }}>GST%</th>
                  <th style={{ width: '76px', textAlign: 'right' }}>Tax Amt (₹)</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, idx) => {
                  const taxAmt = isInterState
                    ? (item.igstAmount || 0)
                    : ((item.cgstAmount || 0) + (item.sgstAmount || 0));

                  const taxLabel = isInterState
                    ? `IGST ${item.igstRate || item.gstRate || 0}%`
                    : `CGST ${item.cgstRate || 0}% + SGST ${item.sgstRate || 0}%`;

                  return (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center', color: 'var(--muted-text)', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--primary)' }} className="print-primary-color">
                          {item.name}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: '11px', color: 'var(--muted-text)', marginTop: '2px' }}>
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>{item.hsnSac}</td>
                      <td style={{ textAlign: 'center' }}>{item.qty}</td>
                      <td style={{ textAlign: 'center' }}>{item.unit}</td>
                      <td style={{ textAlign: 'right' }}>{Number(item.unitPrice).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{item.discountPercent ? `${item.discountPercent}%` : '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(item.taxableAmount || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'center', fontSize: '11px' }}>
                        <div style={{ fontWeight: 600 }}>{item.gstRate}%</div>
                        <div style={{ fontSize: '10px', color: 'var(--muted-text)' }}>
                          {isInterState ? 'IGST' : 'C+S'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '12px' }}>
                        <div>{Number(taxAmt).toFixed(2)}</div>
                        <div style={{ fontSize: '10px', color: 'var(--muted-text)', lineHeight: 1.2 }}>{taxLabel}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }} className="print-primary-color">
                        {Number(item.totalAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── TOTALS + WORDS + BANK ─────────────────────────────── */}
            <div className="invoice-totals-block" style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '24px',
              marginTop: '6px',
              flexWrap: 'wrap'
            }}>
              {/* Left: Amount in words + Bank details */}
              <div style={{ flex: '1', minWidth: '280px', fontSize: '12px' }} className="invoice-bank-block">
                {/* Amount in words */}
                <div style={{
                  background: 'var(--bg-subtle)', padding: '10px 14px',
                  borderRadius: '4px', border: '1px solid var(--border)',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted-text)', fontWeight: 700 }}>
                    Invoice Value in Words
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }} className="print-primary-color">
                    {totalInWords}
                  </div>
                </div>

                {/* Bank details + UPI QR Code */}
                <div style={{ border: '1px dashed var(--border)', borderRadius: '6px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }} className="print-primary-color">
                    <CreditCard size={14} />
                    <span>Bank &amp; Remittance Details</span>
                  </div>

                  {/* Two-column: bank text left, QR right */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

                    {/* Bank text fields */}
                    <div style={{ flex: 1, color: 'var(--text)', lineHeight: 1.65, fontSize: '11px' }}>
                      <div><strong>Bank Name:</strong>&nbsp;{business?.bankDetails?.bankName || 'N/A'}</div>
                      <div><strong>Account Holder:</strong>&nbsp;{business?.bankDetails?.accountHolder || business?.legalName || 'N/A'}</div>
                      <div>
                        <strong>A/C No:</strong>&nbsp;
                        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{business?.bankDetails?.accountNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <strong>IFSC:</strong>&nbsp;
                        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{business?.bankDetails?.ifscCode || 'N/A'}</span>
                        &nbsp;&nbsp;
                        <strong>Branch:</strong>&nbsp;{business?.bankDetails?.branch || 'N/A'}
                      </div>
                      {business?.bankDetails?.upiId && (
                        <div style={{ marginTop: '4px', color: 'var(--secondary)', fontWeight: 600 }}>
                          UPI VPA:&nbsp;
                          <span style={{ fontFamily: 'monospace' }}>{business.bankDetails.upiId}</span>
                        </div>
                      )}
                    </div>

                    {/* UPI QR Code — only rendered when UPI ID is configured */}
                    {business?.bankDetails?.upiId && (() => {
                      const upiUri = `upi://pay?pa=${encodeURIComponent(business.bankDetails.upiId)}&pn=${encodeURIComponent(business.legalName || business.tradeName || 'Merchant')}&am=${Number(invoice.grandTotal || 0).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Invoice ' + (invoice.invoiceNumber || ''))}`;
                      return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          flexShrink: 0
                        }}>
                          {/* SVG QR — vector, prints at full DPI */}
                          <div style={{
                            padding: '6px',
                            background: '#ffffff',
                            border: '1.5px solid var(--border)',
                            borderRadius: '6px',
                            lineHeight: 0
                          }}>
                            <QRCodeSVG
                              value={upiUri}
                              size={96}
                              level="M"
                              includeMargin={false}
                              style={{ display: 'block' }}
                            />
                          </div>
                          <div style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: 'var(--primary)',
                            textAlign: 'center',
                            lineHeight: 1.3,
                            maxWidth: '108px'
                          }} className="print-primary-color">
                            Scan to Pay via UPI
                          </div>
                          <div style={{
                            fontSize: '8.5px',
                            color: 'var(--muted-text)',
                            textAlign: 'center',
                            lineHeight: 1.25,
                            maxWidth: '108px'
                          }}>
                            GPay · PhonePe · Paytm
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </div>
              </div>

              {/* Right: Numeric totals summary */}
              <div style={{ width: '268px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: 'var(--muted-text)' }}>
                  <span>Total Taxable Value:</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(invoice.totalTaxableAmount)}</span>
                </div>

                {isInterState ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: 'var(--primary)' }} className="print-primary-color">
                    <span>Integrated GST (IGST):</span>
                    <span style={{ fontWeight: 600 }}>{formatINR(invoice.totalIgstAmount)}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: 'var(--secondary)' }}>
                      <span>Central GST (CGST):</span>
                      <span style={{ fontWeight: 600 }}>{formatINR(invoice.totalCgstAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: 'var(--secondary)' }}>
                      <span>State GST (SGST):</span>
                      <span style={{ fontWeight: 600 }}>{formatINR(invoice.totalSgstAmount)}</span>
                    </div>
                  </>
                )}

                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '5px 0', color: 'var(--muted-text)',
                  borderTop: '1px dashed var(--border)', marginTop: '4px'
                }}>
                  <span>Total Tax:</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(invoice.totalTaxAmount)}</span>
                </div>

                {invoice.roundOff !== undefined && Number(invoice.roundOff) !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '11px', color: 'var(--muted-text)' }}>
                    <span>Round-off ({Number(invoice.roundOff) > 0 ? '+' : ''}{Number(invoice.roundOff).toFixed(2)}):</span>
                    <span>{Number(invoice.roundOff) > 0 ? '+' : ''}{formatINR(Math.abs(Number(invoice.roundOff)))}</span>
                  </div>
                )}

                <div className="double-line-total" style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', marginTop: '6px'
                }}>
                  <span>TOTAL PAYABLE:</span>
                  <span>{formatINR(invoice.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* ── HSN / SAC TAX BREAKUP SUMMARY (CBIC Format) ────────── */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <div style={{
                fontSize: '10px', fontWeight: 700, color: 'var(--muted-text)',
                textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px'
              }}>
                HSN / SAC Tax Breakup Summary (CBIC Format)
              </div>
              <table className="hsn-summary-table" style={{
                width: '100%', borderCollapse: 'collapse', fontSize: '11px'
              }}>
                <thead>
                  <tr style={{
                    background: 'var(--bg-subtle)', textAlign: 'right',
                    borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)'
                  }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>HSN/SAC</th>
                    <th style={{ padding: '6px 8px' }}>Taxable Value (₹)</th>
                    {!isInterState && (
                      <>
                        <th style={{ padding: '6px 8px' }}>CGST Rate</th>
                        <th style={{ padding: '6px 8px' }}>CGST (₹)</th>
                        <th style={{ padding: '6px 8px' }}>SGST Rate</th>
                        <th style={{ padding: '6px 8px' }}>SGST (₹)</th>
                      </>
                    )}
                    {isInterState && (
                      <>
                        <th style={{ padding: '6px 8px' }}>IGST Rate</th>
                        <th style={{ padding: '6px 8px' }}>IGST (₹)</th>
                      </>
                    )}
                    <th style={{ padding: '6px 8px' }}>Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {hsnSummaryList.map((hsn, i) => (
                    <tr key={i} style={{ textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                      <td style={{ textAlign: 'left', padding: '6px 8px', fontFamily: 'monospace', fontWeight: 600 }}>
                        {hsn.hsnSac}
                      </td>
                      <td style={{ padding: '6px 8px' }}>{formatINR(hsn.taxableAmount)}</td>
                      {!isInterState && (
                        <>
                          <td style={{ padding: '6px 8px' }}>{hsn.rate / 2}%</td>
                          <td style={{ padding: '6px 8px' }}>{formatINR(hsn.cgstAmount)}</td>
                          <td style={{ padding: '6px 8px' }}>{hsn.rate / 2}%</td>
                          <td style={{ padding: '6px 8px' }}>{formatINR(hsn.sgstAmount)}</td>
                        </>
                      )}
                      {isInterState && (
                        <>
                          <td style={{ padding: '6px 8px' }}>{hsn.rate}%</td>
                          <td style={{ padding: '6px 8px' }}>{formatINR(hsn.igstAmount)}</td>
                        </>
                      )}
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>{formatINR(hsn.totalTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── TERMS, NOTES & AUTHORIZED SIGNATORY ──────────────── */}
            <div className="invoice-footer-section" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: '22px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border)',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              {/* Terms & Notes */}
              <div className="invoice-terms-block" style={{ flex: '1', minWidth: '260px', fontSize: '11px', color: 'var(--text)' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }} className="print-primary-color">
                  Terms &amp; Conditions:
                </div>
                <div style={{ whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                  {invoice.termsAndConditions || business?.termsAndConditions || 'Standard payment terms apply.'}
                </div>
                {invoice.notes && (
                  <div style={{ marginTop: '8px', fontStyle: 'italic', color: 'var(--muted-text)' }}>
                    <strong>Note:</strong> {invoice.notes}
                  </div>
                )}
                <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--muted-text)', lineHeight: 1.4 }}>
                  This is a computer-generated invoice and is valid without a physical signature unless otherwise stated.
                  Subject to jurisdiction of {business?.city || 'local'} courts.
                </div>
              </div>

              {/* Authorized Signatory */}
              <div className="invoice-signatory-block" style={{ textAlign: 'center', width: '200px', flexShrink: 0 }}>
                <div style={{
                  height: '56px',
                  border: '1px dashed var(--border)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '6px',
                  color: 'var(--secondary)',
                  fontWeight: 600,
                  fontSize: '11px'
                }}>
                  ✓ Digitally Signed &amp; Verified
                </div>
                <div style={{
                  borderTop: '1.5px solid var(--primary)',
                  paddingTop: '5px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--primary)'
                }} className="print-primary-color">
                  For {business?.legalName || 'Business Entity'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted-text)', marginTop: '2px' }}>
                  Authorized Signatory
                </div>
                {business?.gstin && (
                  <div style={{ fontSize: '10px', color: 'var(--muted-text)', marginTop: '2px', fontFamily: 'monospace' }}>
                    GSTIN: {business.gstin}
                  </div>
                )}
              </div>
            </div>

          </div>{/* /invoice-sheet */}
        </div>{/* /scroll wrapper */}
      </div>{/* /modal-content */}
    </div>/* /modal-overlay */
  );
}
