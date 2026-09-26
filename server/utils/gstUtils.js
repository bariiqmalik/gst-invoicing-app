// Indian State Codes mapping for GST
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

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const HSN_REGEX = /^[0-9]{4}([0-9]{2})?([0-9]{2})?$/; // 4, 6, or 8 digits
export const SAC_REGEX = /^99[0-9]{4}$/; // SAC codes always start with 99 and have 6 digits

/**
 * Validate GSTIN structure and optionally verify state code match
 */
export function validateGSTIN(gstin, expectedStateCode = null) {
  if (!gstin) return { valid: false, error: 'GSTIN cannot be empty' };
  const cleaned = gstin.toString().trim().replace(/[\s-]/g, '').toUpperCase();
  if (cleaned.length !== 15) {
    return { 
      valid: false, 
      error: `GSTIN must be exactly 15 characters (currently ${cleaned.length} chars). Example: 27AABCV1234F1Z8` 
    };
  }
  if (!GSTIN_REGEX.test(cleaned)) {
    return { 
      valid: false, 
      error: 'Invalid GSTIN structure. Expected format: 2 digits (state) + 5 letters (PAN) + 4 digits + 1 letter + 1 char + Z + 1 check char' 
    };
  }

  const stateCode = cleaned.substring(0, 2);
  const state = GST_STATES.find(s => s.code === stateCode);
  if (!state) {
    return { valid: false, error: `Invalid GST state code '${stateCode}' in GSTIN` };
  }

  if (expectedStateCode && String(expectedStateCode) !== String(stateCode)) {
    return { 
      valid: false, 
      error: `GSTIN state code (${stateCode} - ${state.name}) does not match selected Place of Supply (${expectedStateCode})` 
    };
  }

  return { valid: true, code: cleaned, stateCode, stateName: state.name, pan: cleaned.substring(2, 12) };
}

/**
 * Validate HSN or SAC code
 */
export function validateHsnSac(code, type = 'SERVICES') {
  if (!code) return { valid: false, error: 'HSN/SAC code cannot be empty' };
  const cleaned = code.toString().trim().replace(/[\s-]/g, '');
  if (type === 'SERVICES' || cleaned.startsWith('99')) {
    if (!SAC_REGEX.test(cleaned)) {
      return { 
        valid: false, 
        error: 'Services SAC code must be exactly 6 digits starting with 99 (e.g. 998311 for IT consultancy)' 
      };
    }
  } else {
    if (!HSN_REGEX.test(cleaned)) {
      return { 
        valid: false, 
        error: 'Goods HSN code must be 4, 6, or 8 digits (e.g. 8471 for computers)' 
      };
    }
  }
  return { valid: true, code: cleaned };
}

/**
 * Convert numbers to Indian Currency Words (Lakhs, Crores)
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

  if (crore > 0) {
    words += convertBelowThousand(crore).trim() + ' Crore ';
  }
  if (lakh > 0) {
    words += convertBelowThousand(lakh).trim() + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertBelowThousand(thousand).trim() + ' Thousand ';
  }
  if (remainder > 0) {
    words += convertBelowThousand(remainder).trim() + ' ';
  }

  words = words.trim() ? words.trim() + ' Rupees' : '';

  if (decimalPart > 0) {
    const paiseWords = convertBelowThousand(decimalPart).trim();
    words += (words ? ' and ' : '') + paiseWords + ' Paise';
  }

  return (words ? words : 'Zero Rupees') + ' Only';
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
