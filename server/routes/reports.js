import express from 'express';
import { authenticateToken } from './auth.js';
import ExcelJS from 'exceljs';

const router = express.Router();

/**
 * GET /api/reports/gst-summary?month=MM&year=YYYY
 * Aggregate invoice data for the given month and year, filtered by workspace_id.
 */
router.get('/gst-summary', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (isNaN(m) || m < 1 || m > 12 || isNaN(y) || y.toString().length !== 4) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid month or year. Month must be 1-12, year must be four digits.' 
      });
    }

    const startDate = `${y}-${m.toString().padStart(2, '0')}-01`;
    const endDate = new Date(y, m, 0).toISOString().split('T')[0]; // last day of month

    const invoices = await req.db.invoices.find({
      invoiceDate: { $gte: startDate, $lte: endDate }
    });

    let totalTaxableValue = 0;
    let totalIgst = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalB2bTaxable = 0;
    let totalB2cTaxable = 0;
    let b2bCount = 0;
    let b2cCount = 0;

    invoices.forEach(inv => {
      totalTaxableValue += inv.totalTaxableAmount || 0;
      totalIgst += inv.totalIgstAmount || 0;
      totalCgst += inv.totalCgstAmount || 0;
      totalSgst += inv.totalSgstAmount || 0;

      const isB2B = inv.customerDetails?.gstin && inv.customerDetails.gstin.trim() !== '';
      if (isB2B) {
        totalB2bTaxable += inv.totalTaxableAmount || 0;
        b2bCount++;
      } else {
        totalB2cTaxable += inv.totalTaxableAmount || 0;
        b2cCount++;
      }
    });

    const netOutputTaxLiability = totalIgst + totalCgst + totalSgst;

    res.json({
      success: true,
      data: {
        month: m,
        year: y,
        totalOutwardTaxableValue: totalTaxableValue,
        totalIgstCollected: totalIgst,
        totalCgstCollected: totalCgst,
        totalSgstCollected: totalSgst,
        netOutputTaxLiability,
        b2b: {
          count: b2bCount,
          taxableValue: totalB2bTaxable
        },
        b2c: {
          count: b2cCount,
          taxableValue: totalB2cTaxable
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/reports/gstr1-export?month=MM&year=YYYY
 * Generate an Excel file matching GSTR-1 schema (simplified).
 */
router.get('/gstr1-export', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (isNaN(m) || m < 1 || m > 12 || isNaN(y) || y.toString().length !== 4) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid month or year. Month must be 1-12, year must be four digits.' 
      });
    }

    const startDate = `${y}-${m.toString().padStart(2, '0')}-01`;
    const endDate = new Date(y, m, 0).toISOString().split('T')[0];

    const invoices = await req.db.invoices.find({
      invoiceDate: { $gte: startDate, $lte: endDate }
    });

    // Separate B2B and B2C
    const b2bInvoices = [];
    const b2cInvoices = [];

    invoices.forEach(inv => {
      const isB2B = inv.customerDetails?.gstin && inv.customerDetails.gstin.trim() !== '';
      if (isB2B) {
        b2bInvoices.push(inv);
      } else {
        b2cInvoices.push(inv);
      }
    });

    // Prepare B2B data: aggregate by invoice and rate
    const b2bRows = [];
    b2bInvoices.forEach(inv => {
      // Group items by rate
      const rateMap = {};
      inv.items.forEach(item => {
        const rate = item.gstRate || 0;
        if (!rateMap[rate]) {
          rateMap[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        }
        rateMap[rate].taxable += item.taxableAmount || 0;
        rateMap[rate].cgst += item.cgstAmount || 0;
        rateMap[rate].sgst += item.sgstAmount || 0;
        rateMap[rate].igst += item.igstAmount || 0;
      });

      Object.keys(rateMap).forEach(rateStr => {
        const rate = parseFloat(rateStr);
        const { taxable, cgst, sgst, igst } = rateMap[rate];
        b2bRows.push({
          invoiceNo: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          placeOfSupply: inv.placeOfSupplyStateCode,
          reverseCharge: inv.reverseCharge ? 'Y' : 'N',
          invoiceType: 'Regular',
          customerGstin: inv.customerDetails.gstin || '',
          rate,
          taxableValue: taxable,
          cgst,
          sgst,
          igst,
          cess: 0
        });
      });
    });

    // Prepare B2C data: aggregate by stateCode and rate
    const b2cRateMap = {}; // stateCode -> rate -> { taxable, cgst, sgst, igst }
    b2cInvoices.forEach(inv => {
      const stateCode = inv.placeOfSupplyStateCode;
      inv.items.forEach(item => {
        const rate = item.gstRate || 0;
        if (!b2cRateMap[stateCode]) {
          b2cRateMap[stateCode] = {};
        }
        if (!b2cRateMap[stateCode][rate]) {
          b2cRateMap[stateCode][rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        }
        b2cRateMap[stateCode][rate].taxable += item.taxableAmount || 0;
        b2cRateMap[stateCode][rate].cgst += item.cgstAmount || 0;
        b2cRateMap[stateCode][rate].sgst += item.sgstAmount || 0;
        b2cRateMap[stateCode][rate].igst += item.igstAmount || 0;
      });
    });

    const b2cRows = [];
    Object.keys(b2cRateMap).forEach(stateCode => {
      Object.keys(b2cRateMap[stateCode]).forEach(rateStr => {
        const rate = parseFloat(rateStr);
        const { taxable, cgst, sgst, igst } = b2cRateMap[stateCode][rate];
        b2cRows.push({
          placeOfSupply: stateCode,
          rate,
          taxableValue: taxable,
          cgst,
          sgst,
          igst,
          cess: 0
        });
      });
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GST Invoicing App';
    workbook.lastModifiedBy = 'GST Invoicing App';
    workbook.created = new Date();
    workbook.modified = new Date();

    // B2B Sheet
    const b2bSheet = workbook.addWorksheet('B2B Invoices');
    b2bSheet.columns = [
      { header: 'Invoice No', key: 'invoiceNo', width: 15 },
      { header: 'Invoice Date', key: 'invoiceDate', width: 15 },
      { header: 'Place of Supply', key: 'placeOfSupply', width: 15 },
      { header: 'Reverse Charge', key: 'reverseCharge', width: 12 },
      { header: 'Invoice Type', key: 'invoiceType', width: 15 },
      { header: 'Customer GSTIN', key: 'customerGstin', width: 15 },
      { header: 'Rate (%)', key: 'rate', width: 10 },
      { header: 'Taxable Value', key: 'taxableValue', width: 15 },
      { header: 'CGST', key: 'cgst', width: 12 },
      { header: 'SGST', key: 'sgst', width: 12 },
      { header: 'IGST', key: 'igst', width: 12 },
      { header: 'Ces', key: 'cess', width: 10 }
    ];
    b2bSheet.addRows(b2bRows);

    // B2C Sheet
    const b2cSheet = workbook.addWorksheet('B2C Invoices');
    b2cSheet.columns = [
      { header: 'Place of Supply (State Code)', key: 'placeOfSupply', width: 20 },
      { header: 'Rate (%)', key: 'rate', width: 10 },
      { header: 'Taxable Value', key: 'taxableValue', width: 15 },
      { header: 'CGST', key: 'cgst', width: 12 },
      { header: 'SGST', key: 'sgst', width: 12 },
      { header: 'IGST', key: 'igst', width: 12 },
      { header: 'Ces', key: 'cess', width: 10 }
    ];
    b2cSheet.addRows(b2cRows);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set headers for file download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=GSTR1_${y}${m.toString().padStart(2, '0')}.xlsx`
    );

    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;