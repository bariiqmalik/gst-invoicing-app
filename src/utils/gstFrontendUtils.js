export const GST_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (New)' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' }
];

export const CUSTOMER_GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const GSTIN_REGEX = CUSTOMER_GSTIN_REGEX;
export const HSN_REGEX = /^[0-9]{4}([0-9]{2})?([0-9]{2})?$/; // 4, 6, or 8 digits
export const SAC_REGEX = /^99[0-9]{4}$/; // SAC 6 digits starting with 99

/**
 * Normalizes or extracts a 2-digit GST state code from a code, state name, or GSTIN
 */
export function resolveStateCode(input) {
  if (!input && input !== 0) return '';
  const str = String(input).trim();
  if (!str) return '';

  // 1 or 2 digits
  if (/^[0-9]{1,2}$/.test(str)) {
    return str.padStart(2, '0');
  }

  // 15-char GSTIN (first 2 digits are state code)
  if (CUSTOMER_GSTIN_REGEX.test(str) || (str.length === 15 && /^[0-9]{2}/.test(str))) {
    return str.substring(0, 2);
  }

  // Lookup in GST_STATES by code or name
  const match = GST_STATES.find(s => 
    s.code === str || 
    s.code === str.padStart(2, '0') || 
    s.name.toLowerCase() === str.toLowerCase()
  );
  return match ? match.code : str;
}

/**
 * Determines whether supply is intra-state (true) or inter-state (false)
 * Supply is intra-state when supplier state code matches customer / POS state code
 */
export function isIntraStateSupply(supplierStateCode, customerStateCode) {
  const sCode = resolveStateCode(supplierStateCode);
  const cCode = resolveStateCode(customerStateCode);
  return Boolean(sCode && cCode && sCode === cCode);
}

/**
 * Standard regex validator for customer GSTINs.
 * Tests if the given string strictly matches the standard Indian GSTIN regex:
 * ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$
 * @param {string} gstin 
 * @returns {boolean}
 */
export function isValidCustomerGSTIN(gstin) {
  if (!gstin || typeof gstin !== 'string') return false;
  const cleaned = gstin.trim().replace(/[\s-]/g, '').toUpperCase();
  return CUSTOMER_GSTIN_REGEX.test(cleaned);
}

/**
 * Validates a customer GSTIN with detailed error messaging and optional state code verification.
 */
export function validateCustomerGSTIN(gstin, expectedStateCode = null) {
  if (!gstin) return { valid: false, error: 'Customer GSTIN cannot be empty' };
  const cleaned = gstin.toString().trim().replace(/[\s-]/g, '').toUpperCase();
  if (cleaned.length !== 15) {
    return { 
      valid: false, 
      error: `Customer GSTIN must be exactly 15 characters (currently ${cleaned.length} chars). Example: 29AABCT1334M1ZV` 
    };
  }
  if (!CUSTOMER_GSTIN_REGEX.test(cleaned)) {
    return { 
      valid: false, 
      error: 'Invalid customer GSTIN structure. Expected format: 2 digits (state) + 5 letters (PAN) + 4 digits + 1 letter + 1 entity char + Z + 1 check char' 
    };
  }
  const stateCode = cleaned.substring(0, 2);
  const state = GST_STATES.find(s => s.code === stateCode);
  if (!state) {
    return { valid: false, error: `Invalid GST state code '${stateCode}' in customer GSTIN` };
  }
  if (expectedStateCode) {
    const normExpected = resolveStateCode(expectedStateCode);
    if (normExpected && normExpected !== stateCode) {
      return { 
        valid: false, 
        error: `Customer GSTIN state code (${stateCode} - ${state.name}) does not match Place of Supply (${normExpected})` 
      };
    }
  }
  return { 
    valid: true, 
    code: cleaned, 
    stateCode, 
    stateName: state.name, 
    pan: cleaned.substring(2, 12) 
  };
}

/**
 * Backward-compatible alias for validateCustomerGSTIN
 */
export function validateGSTIN(gstin, expectedStateCode = null) {
  return validateCustomerGSTIN(gstin, expectedStateCode);
}

/**
 * Validate HSN or SAC code with graceful sanitization
 */
export function validateHsnSac(code, type = 'SERVICES') {
  if (!code) return { valid: false, error: 'HSN/SAC code cannot be empty' };
  const cleaned = code.toString().trim().replace(/[\s-]/g, '');
  if (type === 'SERVICES' || cleaned.startsWith('99')) {
    if (!SAC_REGEX.test(cleaned)) {
      return { 
        valid: false, 
        error: 'Services SAC code must be exactly 6 digits starting with 99 (e.g. 998311 for IT consultancy, 998314 for software design)' 
      };
    }
  } else {
    if (!HSN_REGEX.test(cleaned)) {
      return { 
        valid: false, 
        error: 'Goods HSN code must be 4, 6, or 8 digits (e.g. 8471 for computers, 84713010 for laptops)' 
      };
    }
  }
  return { valid: true, code: cleaned };
}

/**
 * Format Currency in Indian Numbering System (e.g. ₹ 1,50,000.00)
 */
export function formatINR(val) {
  if (val === null || val === undefined || isNaN(val)) return '₹0.00';
  const num = Math.abs(Number(val)).toFixed(2);
  const parts = num.split('.');
  let integer = parts[0];
  const decimal = parts[1];
  
  const isNegative = Number(val) < 0;

  let lastThree = integer.substring(integer.length - 3);
  const otherNumbers = integer.substring(0, integer.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return (isNegative ? '-₹' : '₹') + formattedInt + '.' + decimal;
}

/**
 * Convert number into Indian Currency Words
 */
export function numberToIndianWords(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Zero Rupees Only';
  const n = Math.round(Number(num) * 100) / 100;
  if (n === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowThousand(val) {
    let str = '';
    let rem = val;
    if (rem >= 100) {
      str += singleDigits[Math.floor(rem / 100)] + ' Hundred ';
      rem %= 100;
    }
    if (rem >= 20) {
      str += tens[Math.floor(rem / 10)] + ' ';
      rem %= 10;
    } else if (rem >= 10) {
      str += teens[rem - 10] + ' ';
      return str;
    }
    if (rem > 0) {
      str += singleDigits[rem] + ' ';
    }
    return str;
  }

  const parts = n.toString().split('.');
  let integerPart = parseInt(parts[0], 10);
  const decimalPart = parts[1] ? parseInt(parts[1].padEnd(2, '0').substring(0, 2), 10) : 0;

  let words = '';

  const crore = Math.floor(integerPart / 10000000);
  integerPart %= 10000000;
  const lakh = Math.floor(integerPart / 100000);
  integerPart %= 100000;
  const thousand = Math.floor(integerPart / 1000);
  integerPart %= 1000;
  const remainder = integerPart;

  if (crore > 0) words += convertBelowThousand(crore).trim() + ' Crore ';
  if (lakh > 0) words += convertBelowThousand(lakh).trim() + ' Lakh ';
  if (thousand > 0) words += convertBelowThousand(thousand).trim() + ' Thousand ';
  if (remainder > 0) words += convertBelowThousand(remainder).trim() + ' ';

  words = words.trim() ? words.trim() + ' Rupees' : '';

  if (decimalPart > 0) {
    const paiseWords = convertBelowThousand(decimalPart).trim();
    words += (words ? ' and ' : '') + paiseWords + ' Paise';
  }

  return (words ? words : 'Zero Rupees') + ' Only';
}

/**
 * Real-time calculation of invoice line items and totals
 */
export function calculateInvoiceTotals(items, businessStateCode, posStateCode, reverseCharge = false) {
  const isInterState = !isIntraStateSupply(businessStateCode, posStateCode);

  let totalTaxableAmount = 0;
  let totalCgstAmount = 0;
  let totalSgstAmount = 0;
  let totalIgstAmount = 0;

  const processedItems = (items || []).map((item) => {
    const qty = Math.max(Number(item.qty) || 1, 0);
    const unitPrice = Math.max(Number(item.unitPrice) || 0, 0);
    const discountPercent = Math.min(Math.max(Number(item.discountPercent) || 0, 0), 100);

    const baseAmount = qty * unitPrice;
    const discountAmount = Math.round((baseAmount * (discountPercent / 100)) * 100) / 100;
    const taxableAmount = Math.max(Math.round((baseAmount - discountAmount) * 100) / 100, 0);

    const gstRate = Math.max(Number(item.gstRate) || 0, 0);
    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (isInterState) {
      // Inter-state supply: Apply full IGST
      igstRate = gstRate;
      cgstRate = 0;
      sgstRate = 0;
      if (!reverseCharge) {
        igstAmount = Math.round((taxableAmount * (igstRate / 100)) * 100) / 100;
        cgstAmount = 0;
        sgstAmount = 0;
      }
    } else {
      // Intra-state supply: Split tax evenly between CGST and SGST
      cgstRate = gstRate / 2;
      sgstRate = gstRate / 2;
      igstRate = 0;
      if (!reverseCharge) {
        cgstAmount = Math.round((taxableAmount * (cgstRate / 100)) * 100) / 100;
        sgstAmount = Math.round((taxableAmount * (sgstRate / 100)) * 100) / 100;
        igstAmount = 0;
      }
    }

    const totalAmount = Math.round((taxableAmount + cgstAmount + sgstAmount + igstAmount) * 100) / 100;

    totalTaxableAmount += taxableAmount;
    totalCgstAmount += cgstAmount;
    totalSgstAmount += sgstAmount;
    totalIgstAmount += igstAmount;

    return {
      ...item,
      qty,
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
