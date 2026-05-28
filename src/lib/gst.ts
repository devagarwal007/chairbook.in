import type { GstPricingMode, GstTaxBreakdown, GstItemTax } from "@/types/gst";

// ============================================================
// Indian States — GST State Code → Name
// ============================================================
export const INDIAN_STATES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

/** All state names sorted alphabetically for dropdown usage */
export const INDIAN_STATE_OPTIONS = Object.entries(INDIAN_STATES)
  .map(([code, name]) => ({ code, name }))
  .filter((s) => s.code !== "97")
  .sort((a, b) => a.name.localeCompare(b.name));

// ============================================================
// GSTIN Validation
// ============================================================
const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGstin(gstin: string): {
  valid: boolean;
  stateCode: string | null;
  stateName: string | null;
} {
  const trimmed = gstin.trim().toUpperCase();
  if (!GSTIN_REGEX.test(trimmed)) {
    return { valid: false, stateCode: null, stateName: null };
  }
  const stateCode = trimmed.substring(0, 2);
  const stateName = INDIAN_STATES[stateCode] || null;
  if (!stateName) {
    return { valid: false, stateCode, stateName: null };
  }
  return { valid: true, stateCode, stateName };
}

export function getStateFromGstinCode(code: string): string | null {
  return INDIAN_STATES[code] || null;
}

// ============================================================
// Financial Year
// ============================================================

/** Returns compact FY string like "2627" for FY 2026-27 */
export function getFinancialYear(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-indexed
  if (month < 4) {
    // Jan-Mar → previous FY
    const startYear = year - 1;
    return startYear.toString().slice(2) + year.toString().slice(2);
  }
  // Apr-Dec → current FY
  const endYear = year + 1;
  return year.toString().slice(2) + endYear.toString().slice(2);
}

/** Returns display-friendly FY like "2026-27" */
export function getFinancialYearDisplay(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (month < 4) {
    return `${year - 1}-${year.toString().slice(2)}`;
  }
  return `${year}-${(year + 1).toString().slice(2)}`;
}

// ============================================================
// Invoice Number
// ============================================================

/** Format: SAL-2627-000001 */
export function formatInvoiceNumber(
  prefix: string,
  fy: string,
  number: number
): string {
  return `${prefix}-${fy}-${String(number).padStart(6, "0")}`;
}

// ============================================================
// Tax Calculation
// ============================================================

/**
 * Calculates GST breakdown for a given amount.
 *
 * - tax_exclusive: GST is added ON TOP of the amount.
 *   taxable = amount, total = amount + tax
 *
 * - tax_inclusive: amount already includes GST.
 *   taxable = amount / (1 + rate/100), total = amount
 */
export function calculateGst(
  amount: number,
  gstRate: number,
  pricingMode: GstPricingMode,
  isIgst: boolean = false
): GstTaxBreakdown {
  if (gstRate <= 0 || amount <= 0) {
    return {
      taxableAmount: amount,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      totalTax: 0,
      grandTotal: amount,
      isIgst,
    };
  }

  let taxableAmount: number;
  let totalTax: number;

  if (pricingMode === "tax_inclusive") {
    // Back-calculate: price includes GST
    taxableAmount = roundTo2(amount / (1 + gstRate / 100));
    totalTax = roundTo2(amount - taxableAmount);
  } else {
    // GST added on top
    taxableAmount = roundTo2(amount);
    totalTax = roundTo2(taxableAmount * (gstRate / 100));
  }

  const halfRate = roundTo2(gstRate / 2);

  if (isIgst) {
    return {
      taxableAmount,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: gstRate,
      igstAmount: totalTax,
      totalTax,
      grandTotal: roundTo2(taxableAmount + totalTax),
      isIgst: true,
    };
  }

  // CGST + SGST (split equally)
  const cgstAmount = roundTo2(taxableAmount * (halfRate / 100));
  const sgstAmount = roundTo2(totalTax - cgstAmount); // ensure no rounding gap

  return {
    taxableAmount,
    cgstRate: halfRate,
    cgstAmount,
    sgstRate: halfRate,
    sgstAmount,
    igstRate: 0,
    igstAmount: 0,
    totalTax,
    grandTotal: roundTo2(taxableAmount + totalTax),
    isIgst: false,
  };
}

/**
 * Calculate per-item GST for invoice line items.
 */
export function calculateItemGst(
  serviceName: string,
  sacCode: string,
  unitPrice: number,
  qty: number,
  gstRate: number,
  pricingMode: GstPricingMode,
  isIgst: boolean = false
): GstItemTax {
  const lineTotal = roundTo2(unitPrice * qty);
  const breakdown = calculateGst(lineTotal, gstRate, pricingMode, isIgst);

  return {
    serviceName,
    sacCode,
    qty,
    unitPrice,
    taxableAmount: breakdown.taxableAmount,
    cgstAmount: breakdown.cgstAmount,
    sgstAmount: breakdown.sgstAmount,
    igstAmount: breakdown.igstAmount,
    totalAmount: breakdown.grandTotal,
  };
}

/**
 * Determine whether IGST should apply.
 * IGST only when customer provides a business GSTIN registered
 * in a different state than the salon.
 */
export function shouldUseIgst(
  salonStateCode: string | null | undefined,
  customerStateCode: string | null | undefined
): boolean {
  if (!salonStateCode || !customerStateCode) return false;
  return salonStateCode !== customerStateCode;
}

// ============================================================
// Helpers
// ============================================================

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}
