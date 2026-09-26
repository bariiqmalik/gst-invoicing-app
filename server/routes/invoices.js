import express from 'express';
import { db } from '../models/index.js';
import { authenticateToken } from './auth.js';
import { validateGSTIN, validateHsnSac, numberToIndianWords } from '../utils/gstUtils.js';

const router = express.Router();

/**
 * Helper to calculate line items and invoice totals according to Indian GST rules
 */
export function calculateGstInvoice(items, businessStateCode, posStateCode, reverseCharge = false) {
  const isInterState = businessStateCode !== posStateCode;

  let totalTaxableAmount = 0;
  let totalCgstAmount = 0;
  let totalSgstAmount = 0;
  let totalIgstAmount = 0;

  const processedItems = items.map((item, index) => {
    const qty = Number(item.qty) || 1;
    const unitPrice = Number(item.unitPrice) || 0;
    const discountPercent = Number(item.discountPercent) || 0;

    const baseAmount = qty * unitPrice;
    const discountAmount = Math.round((baseAmount * (discountPercent / 100)) * 100) / 100;
    const taxableAmount = Math.round((baseAmount - discountAmount) * 100) / 100;

    const gstRate = Number(item.gstRate) || 0;
    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (!reverseCharge) {
      if (isInterState) {
        igstRate = gstRate;
        igstAmount = Math.round((taxableAmount * (igstRate / 100)) * 100) / 100;
      } else {
        cgstRate = gstRate / 2;
        cgstAmount = Math.round((taxableAmount * (cgstRate / 100)) * 100) / 100;
        sgstRate = gstRate / 2;
        sgstAmount = Math.round((taxableAmount * (sgstRate / 100)) * 100) / 100;
      }
    }

    const totalAmount = Math.round((taxableAmount + cgstAmount + sgstAmount + igstAmount) * 100) / 100;

    totalTaxableAmount += taxableAmount;
    totalCgstAmount += cgstAmount;
    totalSgstAmount += sgstAmount;
    totalIgstAmount += igstAmount;

    return {
      catalogItemId: item.catalogItemId || null,
      name: item.name || `Item ${index + 1}`,
      description: item.description || '',
      type: item.type || 'SERVICES',
      hsnSac: item.hsnSac,
      qty,
      unit: item.unit || 'NOS',
      unitPrice,
      discountPercent,
      discountAmount,
      taxableAmount,
      gstRate,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalAmount
    };
  });

  totalTaxableAmount = Math.round(totalTaxableAmount * 100) / 100;
  totalCgstAmount = Math.round(totalCgstAmount * 100) / 100;
  totalSgstAmount = Math.round(totalSgstAmount * 100) / 100;
  totalIgstAmount = Math.round(totalIgstAmount * 100) / 100;
  const totalTaxAmount = Math.round((totalCgstAmount + totalSgstAmount + totalIgstAmount) * 100) / 100;
  const grandTotal = Math.round((totalTaxableAmount + totalTaxAmount) * 100) / 100;
  const totalInWords = numberToIndianWords(grandTotal);

  return {
    isInterState,
    items: processedItems,
    totalTaxableAmount,
    totalCgstAmount,
    totalSgstAmount,
    totalIgstAmount,
    totalTaxAmount,
    grandTotal,
    totalInWords
  };
}

// GET /api/invoices (search, filter, pagination)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, status, startDate, endDate } = req.query;
    let invoices = await db.invoices.find();

    // In-memory filter
    if (search) {
      const q = search.toLowerCase();
      invoices = invoices.filter(inv => 
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.customerDetails?.name && inv.customerDetails.name.toLowerCase().includes(q)) ||
        (inv.customerDetails?.companyName && inv.customerDetails.companyName.toLowerCase().includes(q)) ||
        (inv.customerDetails?.gstin && inv.customerDetails.gstin.toLowerCase().includes(q))
      );
    }

    if (status && status !== 'All') {
      invoices = invoices.filter(inv => inv.status === status);
    }

    if (startDate) {
      invoices = invoices.filter(inv => inv.invoiceDate >= startDate);
    }

    if (endDate) {
      invoices = invoices.filter(inv => inv.invoiceDate <= endDate);
    }

    res.json({ success: true, invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/invoices/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const invoice = await db.invoices.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    const business = await db.business.getProfile();
    res.json({ success: true, invoice, business });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/invoices (Create new invoice with strict GST validation)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      invoiceNumber,
      invoiceDate,
      dueDate,
      customerId,
      customerDetails,
      placeOfSupply,
      placeOfSupplyStateCode,
      reverseCharge,
      items,
      notes,
      termsAndConditions,
      status
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'At least one line item is required' });
    }

    if (!placeOfSupply || !placeOfSupplyStateCode) {
      return res.status(400).json({ success: false, message: 'Place of Supply and State Code are mandatory for GST' });
    }

    if (!customerDetails || !customerDetails.name) {
      return res.status(400).json({ success: false, message: 'Customer details are required' });
    }

    // Validate Customer GSTIN if present
    if (customerDetails.gstin && customerDetails.gstin.trim()) {
      const gstinVal = validateGSTIN(customerDetails.gstin, placeOfSupplyStateCode);
      if (!gstinVal.valid) {
        return res.status(400).json({ 
          success: false, 
          message: `Customer GSTIN validation error: ${gstinVal.error}` 
        });
      }
      customerDetails.gstin = customerDetails.gstin.trim().toUpperCase();
    }

    // Validate each item HSN/SAC code before issuance
    for (let i = 0; i < items.length; i++) {
      const itm = items[i];
      if (!itm.hsnSac) {
        return res.status(400).json({ 
          success: false, 
          message: `Line ${i + 1} (${itm.name || 'Item'}): HSN/SAC code is mandatory for GST compliance.` 
        });
      }
      const hsnVal = validateHsnSac(itm.hsnSac, itm.type || 'SERVICES');
      if (!hsnVal.valid) {
        return res.status(400).json({ 
          success: false, 
          message: `Line ${i + 1} (${itm.name || 'Item'}): ${hsnVal.error}` 
        });
      }
      itm.hsnSac = hsnVal.code;
    }

    // Get Business State Code
    const business = await db.business.getProfile();
    const businessStateCode = business.stateCode || '27';

    // Calculate all GST taxes, rates and splits
    const calc = calculateGstInvoice(items, businessStateCode, placeOfSupplyStateCode, !!reverseCharge);

    // Determine invoice number
    let finalInvNum = invoiceNumber;
    if (!finalInvNum) {
      finalInvNum = `${business.invoicePrefix || 'INV-'}${business.nextInvoiceNumber || 101}`;
      await db.business.updateProfile({ nextInvoiceNumber: (business.nextInvoiceNumber || 101) + 1 });
    }

    const newInvoice = await db.invoices.create({
      invoiceNumber: finalInvNum,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      customerId: customerId || null,
      customerDetails,
      placeOfSupply,
      placeOfSupplyStateCode,
      isInterState: calc.isInterState,
      reverseCharge: !!reverseCharge,
      items: calc.items,
      totalTaxableAmount: calc.totalTaxableAmount,
      totalCgstAmount: calc.totalCgstAmount,
      totalSgstAmount: calc.totalSgstAmount,
      totalIgstAmount: calc.totalIgstAmount,
      totalTaxAmount: calc.totalTaxAmount,
      grandTotal: calc.grandTotal,
      totalInWords: calc.totalInWords,
      notes: notes !== undefined ? notes : business.defaultNotes,
      termsAndConditions: termsAndConditions !== undefined ? termsAndConditions : business.termsAndConditions,
      status: status || 'Draft',
      paymentDetails: {
        amountPaid: 0,
        paymentDate: '',
        paymentMethod: '',
        paymentReference: '',
        notes: ''
      },
      emailDelivery: {
        sent: false,
        sentAt: null,
        recipient: customerDetails.email || '',
        messageId: ''
      }
    });

    res.status(201).json({ success: true, invoice: newInvoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/invoices/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await db.invoices.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const {
      invoiceNumber,
      invoiceDate,
      dueDate,
      customerId,
      customerDetails,
      placeOfSupply,
      placeOfSupplyStateCode,
      reverseCharge,
      items,
      notes,
      termsAndConditions,
      status,
      paymentDetails
    } = req.body;

    const business = await db.business.getProfile();
    const businessStateCode = business.stateCode || '27';
    const targetPos = placeOfSupplyStateCode || existing.placeOfSupplyStateCode;

    // Validate customer GSTIN
    if (customerDetails?.gstin && customerDetails.gstin.trim()) {
      const gstinVal = validateGSTIN(customerDetails.gstin, targetPos);
      if (!gstinVal.valid) {
        return res.status(400).json({ 
          success: false, 
          message: `Customer GSTIN validation error: ${gstinVal.error}` 
        });
      }
      customerDetails.gstin = customerDetails.gstin.trim().toUpperCase();
    }

    // Validate HSN/SAC
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const itm = items[i];
        if (!itm.hsnSac) {
          return res.status(400).json({ 
            success: false, 
            message: `Line ${i + 1}: HSN/SAC code is mandatory.` 
          });
        }
        const hsnVal = validateHsnSac(itm.hsnSac, itm.type || 'SERVICES');
        if (!hsnVal.valid) {
          return res.status(400).json({ 
            success: false, 
            message: `Line ${i + 1}: ${hsnVal.error}` 
          });
        }
        itm.hsnSac = hsnVal.code;
      }
    }

    const itemsToCalculate = items || existing.items;
    const isRcm = reverseCharge !== undefined ? !!reverseCharge : existing.reverseCharge;
    const calc = calculateGstInvoice(itemsToCalculate, businessStateCode, targetPos, isRcm);

    const updates = {
      ...(invoiceNumber && { invoiceNumber }),
      ...(invoiceDate && { invoiceDate }),
      ...(dueDate && { dueDate }),
      ...(customerId !== undefined && { customerId }),
      ...(customerDetails && { customerDetails }),
      ...(placeOfSupply && { placeOfSupply }),
      ...(placeOfSupplyStateCode && { placeOfSupplyStateCode }),
      reverseCharge: isRcm,
      isInterState: calc.isInterState,
      items: calc.items,
      totalTaxableAmount: calc.totalTaxableAmount,
      totalCgstAmount: calc.totalCgstAmount,
      totalSgstAmount: calc.totalSgstAmount,
      totalIgstAmount: calc.totalIgstAmount,
      totalTaxAmount: calc.totalTaxAmount,
      grandTotal: calc.grandTotal,
      totalInWords: calc.totalInWords,
      ...(notes !== undefined && { notes }),
      ...(termsAndConditions !== undefined && { termsAndConditions }),
      ...(status && { status }),
      ...(paymentDetails && { paymentDetails })
    };

    const updated = await db.invoices.update(req.params.id, updates);
    res.json({ success: true, invoice: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Record Payment & Update Status (supports both PATCH and POST)
const handleRecordPayment = async (req, res) => {
  try {
    const existing = await db.invoices.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const { amountPaid, paymentDate, paymentMethod, paymentReference, notes } = req.body;
    const paid = Number(amountPaid) || 0;
    const grandTotal = existing.grandTotal;

    let newStatus = existing.status;
    if (paid >= grandTotal) {
      newStatus = 'Paid';
    } else if (paid > 0) {
      newStatus = 'Partial';
    }

    const updated = await db.invoices.update(req.params.id, {
      status: newStatus,
      paymentDetails: {
        amountPaid: paid,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod || 'Bank Transfer',
        paymentReference: paymentReference || '',
        notes: notes || ''
      }
    });

    res.json({ success: true, invoice: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

router.patch('/:id/payment', authenticateToken, handleRecordPayment);
router.post('/:id/payment', authenticateToken, handleRecordPayment);

// DELETE /api/invoices/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await db.invoices.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
