import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { GstInvoice, GstInvoiceItem } from "@/types/gst";

// Register default font fallback styles if needed, but safe standard Helvetica is standard.
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 30,
    color: "#2C3E50",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "1.5px solid #14B8A6", // Teal accent
    paddingBottom: 10,
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#14B8A6",
    textTransform: "uppercase",
  },
  metaContainer: {
    alignItems: "flex-end",
    textAlign: "right",
  },
  metaText: {
    fontSize: 8,
    color: "#6B7280",
    marginBottom: 2,
  },
  boldMetaText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1F2937",
  },
  addressesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 15,
  },
  addressBox: {
    flex: 1,
    padding: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    border: "0.5px solid #E5E7EB",
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#4B5563",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  businessName: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 8,
    color: "#4B5563",
    lineHeight: 1.3,
    marginBottom: 2,
  },
  tableContainer: {
    marginTop: 10,
    marginBottom: 15,
    border: "0.5px solid #E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottom: "0.5px solid #E5E7EB",
    padding: "6px 8px",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5px solid #E5E7EB",
    padding: "6px 8px",
    alignItems: "center",
  },
  tableRowLast: {
    flexDirection: "row",
    padding: "6px 8px",
    alignItems: "center",
  },
  colSno: { width: "5%", textAlign: "center" },
  colDesc: { width: "35%" },
  colSac: { width: "10%", textAlign: "center" },
  colQty: { width: "8%", textAlign: "center" },
  colRate: { width: "12%", textAlign: "right" },
  colTaxable: { width: "15%", textAlign: "right" },
  colTax: { width: "15%", textAlign: "right" },
  colTotal: { width: "15%", textAlign: "right" },

  totalsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 20,
  },
  paymentTermsBox: {
    flex: 1.2,
    padding: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    border: "0.5px solid #E5E7EB",
    height: "auto",
  },
  summaryBox: {
    flex: 1,
    alignSelf: "flex-end",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottom: "0.5px solid #F3F4F6",
  },
  summaryRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    marginTop: 3,
    borderTop: "1px solid #14B8A6",
    fontWeight: "bold",
    fontSize: 11,
    color: "#14B8A6",
  },
  summaryLabel: {
    color: "#4B5563",
  },
  summaryValue: {
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  summaryValueFinal: {
    fontFamily: "Helvetica-Bold",
    color: "#14B8A6",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    borderTop: "0.5px solid #E5E7EB",
    paddingTop: 10,
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: "#9CA3AF",
    textAlign: "center",
  },
});

interface InvoicePdfProps {
  invoice: GstInvoice;
  items: GstInvoiceItem[];
}

export function InvoicePdf({ invoice, items }: InvoicePdfProps) {
  const isIgst = invoice.is_igst;

  // Format date nicely
  let formattedDate = invoice.invoice_date;
  try {
    formattedDate = new Date(invoice.invoice_date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {}

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.title}>Tax Invoice</Text>
            <Text style={[styles.metaText, { marginTop: 4 }]}>
              Generated under CGST Rules, 2017
            </Text>
          </View>
          <View style={styles.metaContainer}>
            <Text style={styles.boldMetaText}>Invoice No: {invoice.invoice_number}</Text>
            <Text style={styles.metaText}>Date: {formattedDate}</Text>
            <Text style={styles.metaText}>FY: {invoice.financial_year}</Text>
          </View>
        </View>

        {/* Addresses */}
        <View style={styles.addressesContainer}>
          {/* Salon Details */}
          <View style={styles.addressBox}>
            <Text style={styles.sectionTitle}>Billed By (Seller)</Text>
            <Text style={styles.businessName}>{invoice.salon_legal_name}</Text>
            {invoice.salon_gstin && (
              <Text style={[styles.addressText, { fontWeight: "bold" }]}>
                GSTIN: {invoice.salon_gstin}
              </Text>
            )}
            {invoice.salon_address && (
              <Text style={styles.addressText}>{invoice.salon_address}</Text>
            )}
            {invoice.salon_state && (
              <Text style={styles.addressText}>
                State: {invoice.salon_state} (Code: {invoice.salon_state_code})
              </Text>
            )}
          </View>

          {/* Customer Details */}
          <View style={styles.addressBox}>
            <Text style={styles.sectionTitle}>Billed To (Buyer)</Text>
            {invoice.customer_business_name ? (
              <Text style={styles.businessName}>{invoice.customer_business_name}</Text>
            ) : (
              <Text style={styles.businessName}>{invoice.customer_name}</Text>
            )}
            
            {invoice.customer_gstin ? (
              <>
                <Text style={[styles.addressText, { fontWeight: "bold" }]}>
                  GSTIN: {invoice.customer_gstin}
                </Text>
                {invoice.customer_business_name && (
                  <Text style={styles.addressText}>Contact: {invoice.customer_name}</Text>
                )}
              </>
            ) : null}

            {invoice.customer_phone && (
              <Text style={styles.addressText}>Phone: {invoice.customer_phone}</Text>
            )}

            {invoice.customer_billing_address ? (
              <Text style={styles.addressText}>{invoice.customer_billing_address}</Text>
            ) : null}

            {invoice.customer_billing_state ? (
              <Text style={styles.addressText}>
                State: {invoice.customer_billing_state} (Code: {invoice.customer_billing_state_code})
              </Text>
            ) : null}

            {!invoice.customer_gstin && !invoice.customer_billing_address && (
              <Text style={[styles.addressText, { fontStyle: "italic", color: "#9CA3AF" }]}>
                End consumer (B2C Invoice)
              </Text>
            )}
          </View>
        </View>

        {/* Services Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colSno, { fontWeight: "bold" }]}>#</Text>
            <Text style={[styles.colDesc, { fontWeight: "bold" }]}>Description</Text>
            <Text style={[styles.colSac, { fontWeight: "bold" }]}>SAC</Text>
            <Text style={[styles.colQty, { fontWeight: "bold" }]}>Qty</Text>
            <Text style={[styles.colRate, { fontWeight: "bold" }]}>Rate</Text>
            <Text style={[styles.colTaxable, { fontWeight: "bold" }]}>Taxable</Text>
            <Text style={[styles.colTax, { fontWeight: "bold" }]}>Tax ({isIgst ? "IGST" : "CGST+SGST"})</Text>
            <Text style={[styles.colTotal, { fontWeight: "bold" }]}>Total</Text>
          </View>

          {/* Table Rows */}
          {items.map((item, index) => {
            const rowStyle = index === items.length - 1 ? styles.tableRowLast : styles.tableRow;
            const taxAmount = isIgst ? item.igst_amount : (item.cgst_amount + item.sgst_amount);

            return (
              <View key={index} style={rowStyle}>
                <Text style={styles.colSno}>{index + 1}</Text>
                <Text style={styles.colDesc}>{item.service_name}</Text>
                <Text style={styles.colSac}>{item.sac_code}</Text>
                <Text style={styles.colQty}>{item.qty}</Text>
                <Text style={styles.colRate}>₹{Number(item.unit_price).toFixed(2)}</Text>
                <Text style={styles.colTaxable}>₹{Number(item.taxable_amount).toFixed(2)}</Text>
                <Text style={styles.colTax}>₹{Number(taxAmount).toFixed(2)}</Text>
                <Text style={styles.colTotal}>₹{Number(item.total_amount).toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        {/* Summary and Terms */}
        <View style={styles.totalsContainer}>
          {/* Left panel: Info & Payment */}
          <View style={styles.paymentTermsBox}>
            <Text style={[styles.sectionTitle, { fontSize: 7 }]}>Payment Information</Text>
            <Text style={[styles.addressText, { marginBottom: 4 }]}>
              Method: {invoice.payment_method || "Simulated"}
            </Text>
            
            <Text style={[styles.sectionTitle, { fontSize: 7, marginTop: 8 }]}>Terms & Conditions</Text>
            <Text style={[styles.addressText, { fontSize: 7 }]}>
              1. Services once billed are non-refundable.
            </Text>
            <Text style={[styles.addressText, { fontSize: 7 }]}>
              2. This is a computer-generated document. No physical signature is required.
            </Text>
          </View>

          {/* Right panel: Summary Calculation */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxable Subtotal</Text>
              <Text style={styles.summaryValue}>₹{Number(invoice.taxable_amount).toFixed(2)}</Text>
            </View>

            {isIgst ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>IGST ({Number(invoice.igst_rate).toFixed(1)}%)</Text>
                <Text style={styles.summaryValue}>₹{Number(invoice.igst_amount).toFixed(2)}</Text>
              </View>
            ) : (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>CGST ({Number(invoice.cgst_rate).toFixed(1)}%)</Text>
                  <Text style={styles.summaryValue}>₹{Number(invoice.cgst_amount).toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>SGST ({Number(invoice.sgst_rate).toFixed(1)}%)</Text>
                  <Text style={styles.summaryValue}>₹{Number(invoice.sgst_amount).toFixed(2)}</Text>
                </View>
              </>
            )}

            {Number(invoice.discount_amount) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, { color: "#EF4444" }]}>
                  - ₹{Number(invoice.discount_amount).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.summaryRowFinal}>
              <Text style={styles.summaryValueFinal}>Grand Total</Text>
              <Text style={styles.summaryValueFinal}>₹{Number(invoice.total_amount).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for your visit! | {invoice.salon_legal_name}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
