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
import { formatINR, isIntraStateSupply } from '../utils/gstFrontendUtils';

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
    : (Number(invoice.totalIgstAmount) > 0 || !isIntraStateSupply(business?.stateCode || invoice.businessDetails?.stateCode || '27', invoice.placeOfSupplyStateCode || invoice.customerDetails?.stateCode));
  const isPaid = invoice.status === 'Paid';
  const isOverdue = invoice.status === 'Overdue';

  // Group line items by HSN/SAC for the official GST HSN summary table
  const hsnSummaryMap = {};
  (invoice.items || []).forEach(item => {
    const code = item.hsnSac || 'OTHER';
    if (!hsnSummaryMap[code]) {
      hsnSummaryMap[code] = {
        hsnSac: code,
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
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

  // Robust PDF Generation via html2canvas & jsPDF with multi-page & CORS fallback
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
        // Fits comfortably on a single A4 page
        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, contentHeight);
      } else {
        // Multi-page document handling for invoices with many line items
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
      setPdfError('PDF export encountered an issue. You can use the "Print" button to save directly as PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '920px', maxHeight: '95vh' }}>
        
        {/* Modal Top Control Bar (Hidden during print) */}
        <div className="no-print" style={{
          padding: '14px 24px',
          background: 'var(--primary)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: 'var(--radius-xl)',
          borderTopRightRadius: 'var(--radius-xl)',
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
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
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

        {/* Modal Scrollable Container for Invoice */}
        <div style={{ padding: '30px 20px', background: 'var(--background)', overflowY: 'auto' }}>
          
          {/* PDF Fallback Alert if download fails */}
          {pdfError && (
            <div className="no-print" style={{
              maxWidth: '820px',
              margin: '0 auto 16px auto',
              background: 'var(--warning-light)',
              border: '1px solid var(--warning-border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 18px',
              color: 'var(--accent-dark)',
              fontSize: '13px'
            }}>
              {pdfError}
            </div>
          )}

          {/* Payment State Notification Banner */}
          <div className="no-print" style={{
            maxWidth: '820px',
            margin: '0 auto 16px auto',
            background: isPaid ? 'var(--secondary-subtle)' : isOverdue ? 'var(--danger-light)' : 'var(--accent-subtle)',
            border: isPaid ? '1px solid var(--success-border)' : isOverdue ? '1px solid var(--danger-border)' : '1px solid var(--warning-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: isPaid ? 'var(--secondary-dark)' : isOverdue ? 'var(--danger)' : 'var(--accent-dark)',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isPaid ? <CheckCircle size={18} /> : <Clock size={18} />}
              <div>
                <strong>Payment Status: {invoice.status.toUpperCase()}</strong>
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

          {/* PRINTABLE & DOWNLOADABLE INVOICE SHEET (A4 Aspect Ratio) */}
          <div ref={invoiceSheetRef} className="invoice-sheet" id="invoice-printable-sheet">
            
            {/* Top Header: Business & TAX INVOICE Title */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid var(--primary)',
              paddingBottom: '20px',
              marginBottom: '20px'
            }}>
              {/* Business Details */}
              <div style={{ maxWidth: '440px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  {business?.logoUrl ? (
                    <img src={business.logoUrl} alt="Logo" style={{ height: '44px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      background: 'var(--primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '18px'
                    }}>
                      {business?.legalName ? business.legalName.charAt(0) : 'B'}
                    </div>
                  )}
                  <div>
                    <h2 style={{ fontSize: '20px', margin: 0, color: 'var(--primary)', lineHeight: 1.1 }}>
                      {business?.legalName || 'Business Name'}
                    </h2>
                    {business?.tradeName && (
                      <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>{business.tradeName}</div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5 }}>
                  <div>{business?.addressLine1}{business?.addressLine2 ? `, ${business.addressLine2}` : ''}</div>
                  <div>{business?.city}, {business?.state} - {business?.pincode}</div>
                  <div>Phone: {business?.phone || 'N/A'} • Email: {business?.email}</div>
                  <div style={{ marginTop: '4px', fontWeight: 600, color: 'var(--primary)' }}>
                    GSTIN: <span style={{ fontFamily: 'monospace' }}>{business?.gstin}</span> • State Code: {business?.stateCode}
                  </div>
                  <div>PAN: <span style={{ fontFamily: 'monospace' }}>{business?.pan}</span></div>
                </div>
              </div>

              {/* TAX INVOICE Stamp & Metadata */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  display: 'inline-block',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  padding: '5px 14px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '1px'
                }}>
                  TAX INVOICE
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted-text)', marginTop: '4px' }}>
                  (Original for Recipient)
                </div>

                <div style={{ marginTop: '12px', fontSize: '13px' }}>
                  <div>Invoice No: <strong style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--primary)' }}>{invoice.invoiceNumber}</strong></div>
                  <div>Invoice Date: <strong>{invoice.invoiceDate}</strong></div>
                  <div>Payment Due Date: <strong style={{ color: isOverdue ? 'var(--danger)' : 'var(--primary)' }}>{invoice.dueDate}</strong></div>
                  <div style={{ marginTop: '4px' }}>
                    Place of Supply: <strong>{invoice.placeOfSupply} ({invoice.placeOfSupplyStateCode})</strong>
                  </div>
                  <div>
                    Reverse Charge: <strong>{invoice.reverseCharge ? 'YES (RCM Applicable)' : 'NO'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Billed To / Client Details Box */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '14px 18px',
              marginBottom: '20px',
              fontSize: '12px'
            }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted-text)', fontWeight: 700, marginBottom: '4px' }}>
                  BILLED TO (BUYER)
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>
                  {invoice.customerDetails?.name}
                </div>
                {invoice.customerDetails?.companyName && (
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                    {invoice.customerDetails.companyName}
                  </div>
                )}
                <div style={{ color: 'var(--muted-text)', marginTop: '4px' }}>
                  {invoice.customerDetails?.address || 'Address on record'}
                </div>
                <div>State: {invoice.customerDetails?.state || invoice.placeOfSupply} (Code: {invoice.customerDetails?.stateCode || invoice.placeOfSupplyStateCode})</div>
                <div>Email: {invoice.customerDetails?.email} • Phone: {invoice.customerDetails?.phone || 'N/A'}</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted-text)', fontWeight: 700, marginBottom: '4px' }}>
                  BUYER GSTIN & COMPLIANCE
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  GSTIN: {invoice.customerDetails?.gstin ? (
                    <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{invoice.customerDetails.gstin}</strong>
                  ) : (
                    <span style={{ color: 'var(--muted-text)', fontStyle: 'italic' }}>Unregistered / B2C Consumer</span>
                  )}
                </div>
                <div style={{ marginTop: '8px', color: 'var(--text)' }}>
                  Nature of Supply: <strong>{isInterState ? 'Inter-State Supply (IGST)' : 'Intra-State Supply (CGST + SGST)'}</strong>
                </div>
                <div>
                  Applicable Taxes: <strong>{isInterState ? 'IGST' : 'CGST + SGST'}</strong>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="invoice-table">
              <thead>
                <tr>
                  <th style={{ width: '28px' }}>#</th>
                  <th>Description of Goods / Services</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>HSN/SAC</th>
                  <th style={{ width: '50px', textAlign: 'center' }}>Qty</th>
                  <th style={{ width: '50px', textAlign: 'center' }}>Unit</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Rate (₹)</th>
                  <th style={{ width: '55px', textAlign: 'right' }}>Disc%</th>
                  <th style={{ width: '85px', textAlign: 'right' }}>Taxable</th>
                  <th style={{ width: '85px', textAlign: 'right' }}>{isInterState ? 'IGST' : 'CGST+SGST'}</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, idx) => {
                  const taxAmt = isInterState 
                    ? (item.igstAmount || 0) 
                    : ((item.cgstAmount || 0) + (item.sgstAmount || 0));

                  return (
                    <tr key={idx}>
                      <td style={{ color: 'var(--muted-text)' }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.name}</div>
                        {item.description && (
                          <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>{item.description}</div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{item.hsnSac}</td>
                      <td style={{ textAlign: 'center' }}>{item.qty}</td>
                      <td style={{ textAlign: 'center' }}>{item.unit}</td>
                      <td style={{ textAlign: 'right' }}>{Number(item.unitPrice).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{item.discountPercent ? `${item.discountPercent}%` : '-'}</td>
                      <td style={{ textAlign: 'right' }}>{Number(item.taxableAmount).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontSize: '12px' }}>
                        <div>{Number(taxAmt).toFixed(2)}</div>
                        <div style={{ fontSize: '10px', color: 'var(--muted-text)' }}>({item.gstRate}%)</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                        {Number(item.totalAmount).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Calculations Breakup & Words Box */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px', marginTop: '10px', flexWrap: 'wrap' }}>
              
              {/* Left Side: Amount in words and Payment Remittance info */}
              <div style={{ flex: '1', minWidth: '280px', fontSize: '12px' }}>
                <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border)', marginBottom: '14px' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted-text)', fontWeight: 700 }}>
                    Invoice Value in Words
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                    {invoice.totalInWords}
                  </div>
                </div>

                {/* Bank NEFT & Mock UPI Transfer Details */}
                <div style={{ border: '1px dashed var(--border)', borderRadius: '6px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>
                    <CreditCard size={15} />
                    <span>Bank & Electronic Remittance Details</span>
                  </div>
                  <div style={{ color: 'var(--text)', lineHeight: 1.5, fontSize: '11px' }}>
                    <div><strong>Bank:</strong> {business?.bankDetails?.bankName || 'N/A'}</div>
                    <div><strong>Account Name:</strong> {business?.bankDetails?.accountHolder || business?.legalName}</div>
                    <div><strong>Account Number:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{business?.bankDetails?.accountNumber || 'N/A'}</span></div>
                    <div><strong>IFSC Code:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{business?.bankDetails?.ifscCode || 'N/A'}</span> • <strong>Branch:</strong> {business?.bankDetails?.branch || 'N/A'}</div>
                    {business?.bankDetails?.upiId && (
                      <div style={{ marginTop: '4px', color: 'var(--secondary)', fontWeight: 600 }}>
                        UPI VPA: <span style={{ fontFamily: 'monospace' }}>{business.bankDetails.upiId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Totals calculation */}
              <div style={{ width: '280px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: 'var(--muted-text)' }}>
                  <span>Total Taxable Value:</span>
                  <span>{formatINR(invoice.totalTaxableAmount)}</span>
                </div>

                {isInterState ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: 'var(--primary)' }}>
                    <span>Integrated GST (IGST):</span>
                    <span>{formatINR(invoice.totalIgstAmount)}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: 'var(--secondary)' }}>
                      <span>Central GST (CGST):</span>
                      <span>{formatINR(invoice.totalCgstAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: 'var(--secondary)' }}>
                      <span>State GST (SGST):</span>
                      <span>{formatINR(invoice.totalSgstAmount)}</span>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: 'var(--muted-text)', borderTop: '1px dashed var(--border)', marginTop: '4px' }}>
                  <span>Total Tax:</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(invoice.totalTaxAmount)}</span>
                </div>

                <div className="double-line-total" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '6px' }}>
                  <span>TOTAL PAYABLE:</span>
                  <span>{formatINR(invoice.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* MANDATORY GST HSN/SAC TAX SUMMARY BREAKUP TABLE */}
            <div style={{ marginTop: '22px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', marginBottom: '6px' }}>
                HSN / SAC Tax Breakup Summary (CBIC Format)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', textAlign: 'right', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
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
                      <td style={{ textAlign: 'left', padding: '6px 8px', fontFamily: 'monospace', fontWeight: 600 }}>{hsn.hsnSac}</td>
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
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{formatINR(hsn.totalTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Terms, Notes & Authorized Signatory Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)'
            }}>
              <div style={{ maxWidth: '480px', fontSize: '11px', color: 'var(--text)' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>Terms & Conditions:</div>
                <div style={{ whiteSpace: 'pre-line', lineHeight: 1.4 }}>
                  {invoice.termsAndConditions || business?.termsAndConditions || 'Standard payment terms apply.'}
                </div>
                {invoice.notes && (
                  <div style={{ marginTop: '8px', fontStyle: 'italic', color: 'var(--muted-text)' }}>
                    Note: {invoice.notes}
                  </div>
                )}
              </div>

              {/* Authorized Signatory */}
              <div style={{ textAlign: 'center', width: '220px' }}>
                <div style={{
                  height: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px'
                }}>
                  <div style={{
                    border: '1px dashed var(--border)',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    color: 'var(--secondary)',
                    fontWeight: 600,
                    fontSize: '11px'
                  }}>
                    ✓ Digitally Signed & Verified
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--primary)', paddingTop: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                  For {business?.legalName || 'Business Entity'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>Authorized Signatory</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
