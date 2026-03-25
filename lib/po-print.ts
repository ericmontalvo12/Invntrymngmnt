import type { PurchaseOrder, PurchaseOrderItem } from "@/types";

interface POPrintData {
  po: PurchaseOrder & { items: PurchaseOrderItem[] };
  orderedByName: string;
}

function formatDate(dateStr: string): string {
  const d = dateStr.includes("T") ? new Date(dateStr) : new Date(dateStr + "T00:00:00");
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";
  return `${month} ${day}${suffix} ${year}`;
}

function buildColumn(
  po: PurchaseOrder & { items: PurchaseOrderItem[] },
  orderedByName: string,
  isCopy: boolean,
  now: string,
  subtotal: number,
  salesTax: number,
  grandTotal: number
): string {
  const poLabel = isCopy ? `${po.po_number} ** COPY **` : po.po_number;

  const vendorName = (po.vendor as { name?: string } | null)?.name ?? "—";
  const vendorAddr = (po.vendor as { address?: string } | null)?.address ?? "";
  const vendorPhone = (po.vendor as { phone?: string } | null)?.phone ?? "";

  const shipName = "GENCO";
  const shipLine1 = (po.building as { address?: string } | null)?.address ?? "";
  const shipLine2 = po.apartment_unit ? `Unit/Apartment ${po.apartment_unit}` : "";
  const shipCity = (po.building as { city?: string; state?: string; zip?: string } | null)
    ? [
        (po.building as { city?: string }).city,
        (po.building as { state?: string }).state,
        (po.building as { zip?: string }).zip,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const companyName = "GENCO";
  const companyAddr = "7931 SW 205 ST.";
  const companyAddr2 = "HOUSE";
  const companyCity = "MIAMI, FL 33193";

  const itemRows = po.items
    .map(
      (item, i) => `
      <tr>
        <td class="c">${i + 1}.</td>
        <td>${item.item_sku ?? "—"}</td>
        <td class="item-name-cell">${item.item_name}</td>
        <td class="c">${Number(item.quantity_ordered).toFixed(5)}</td>
        <td class="c">ea</td>
        <td class="r">${item.unit_cost != null ? Number(item.unit_cost).toFixed(5) : "—"}</td>
        <td class="r">${item.unit_cost != null ? (item.quantity_ordered * item.unit_cost).toFixed(2) : "—"}</td>
        <td class="c">Yes</td>
      </tr>`
    )
    .join("");

  const disclaimer = `Prices shown on the purchase order are the amounts we will pay. In case of price
discrepancy, please call our purchasing department at (305) 592-5311 before shipping the
order. Otherwise, we will assume all prices are correct. No back orders allowed.`;

  const footer = `
    <div class="footer-block">
      <div class="footer-inner">
        <div class="disclaimer">${disclaimer}</div>
        <div class="totals">
          <table class="totals-tbl">
            <tr>
              <td class="tl">Sub Total</td>
              <td class="tr tm">$ ${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td class="tl">Sales Tax</td>
              <td class="tr tm">$ ${salesTax.toFixed(2)}</td>
            </tr>
            <tr>
              <td class="tl grand-lbl">Grand Total</td>
              <td class="tr tm grand-val">$ ${grandTotal.toFixed(2)}</td>
            </tr>
          </table>
        </div>
      </div>
      <div class="sig-row">
        <span>Authorized by: <span class="sig-line"></span></span>
        <span style="margin-left:16px">Date: <span class="sig-line short"></span></span>
      </div>
    </div>`;

  return `
    <div class="po-col${isCopy ? " copy-col" : " orig-col"}">
      <!-- HEADER -->
      <div class="po-header">
        <div class="company-block">
          <div class="po-title">PURCHASE ORDER</div>
          <div class="company-name">${companyName}</div>
          <div>${companyAddr}</div>
          <div>${companyAddr2}</div>
          <div>${companyCity}</div>
        </div>
        <div class="meta-block">
          <table class="meta-tbl">
            <tr>
              <td class="mk">Purchase Order #</td>
              <td class="mv">${poLabel}</td>
            </tr>
            <tr>
              <td class="mk">Purchase Order Date</td>
              <td class="mv">${formatDate(po.created_at)}</td>
            </tr>
            <tr>
              <td class="mk">Delivery Date</td>
              <td class="mv">${po.expected_delivery ? formatDate(po.expected_delivery) : "—"}</td>
            </tr>
            <tr>
              <td class="mk">Printed</td>
              <td class="mv">${now}</td>
            </tr>
            <tr>
              <td class="mk">Ordered by</td>
              <td class="mv">${orderedByName}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- VENDOR / SHIP-TO -->
      <div class="addr-grid">
        <div class="addr-box">
          <div class="addr-label">Vendor Information</div>
          <div>${vendorName}</div>
          ${vendorAddr ? `<div>${vendorAddr}</div>` : ""}
          ${vendorPhone ? `<div>${vendorPhone}</div>` : ""}
        </div>
        <div class="addr-box">
          <div class="addr-label">Ship To</div>
          <div>${shipName}</div>
          ${shipLine1 ? `<div>${shipLine1}</div>` : ""}
          ${shipLine2 ? `<div>${shipLine2}</div>` : ""}
          ${shipCity ? `<div>${shipCity}</div>` : ""}
        </div>
      </div>

      <!-- SPECIAL INSTRUCTIONS -->
      ${
        po.special_instructions
          ? `<div class="special-wrap"><span class="special-label">Special Instructions:</span>
             <span class="special-text">${po.special_instructions}</span></div>`
          : ""
      }

      <!-- ITEMS TABLE -->
      <table class="items-tbl">
        <thead>
          <tr>
            <th class="c" style="width:22px">#</th>
            <th style="width:52px">ITEM #</th>
            <th>ITEM NAME</th>
            <th class="c" style="width:58px">QTY</th>
            <th class="c" style="width:24px">Unit</th>
            <th class="r" style="width:52px">Unit Price</th>
            <th class="r" style="width:46px">Ext. Price</th>
            <th class="c" style="width:36px">Taxable</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <!-- SPACER pushes footer to bottom on original only -->
      ${isCopy ? "" : '<div class="spacer"></div>'}

      ${footer}
    </div>`;
}

export function printPurchaseOrder({ po, orderedByName }: POPrintData) {
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subtotal = po.items.reduce(
    (sum, item) =>
      item.unit_cost != null ? sum + item.quantity_ordered * item.unit_cost : sum,
    0
  );
  const taxRate = 0.07;
  const salesTax = subtotal * taxRate;
  const grandTotal = subtotal + salesTax;

  const origCol = buildColumn(po, orderedByName, false, now, subtotal, salesTax, grandTotal);
  const copyCol = buildColumn(po, orderedByName, true, now, subtotal, salesTax, grandTotal);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PO ${po.po_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8.5px;
    color: #000;
    background: #fff;
  }

  /* ── Two-column wrapper ── */
  .po-page {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    min-height: 100vh;
  }
  .po-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid #aaa;
    padding: 8px;
  }
  /* Original: push footer to page bottom */
  .orig-col { min-height: calc(100vh - 22px); }
  .spacer { flex: 1; }

  /* ── Header ── */
  .po-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }
  .po-title {
    font-size: 11px;
    font-weight: bold;
    margin-bottom: 4px;
  }
  .company-block { font-size: 8.5px; line-height: 1.45; }
  .company-name { font-weight: bold; }
  .meta-block { text-align: right; }
  .meta-tbl { font-size: 8px; border-collapse: collapse; }
  .meta-tbl td { padding: 1px 3px; }
  .mk { color: #333; white-space: nowrap; }
  .mv { font-weight: 600; padding-left: 6px !important; white-space: nowrap; }

  /* ── Address grid ── */
  .addr-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border: 1px solid #888;
    margin-bottom: 5px;
  }
  .addr-box {
    padding: 4px 6px;
    font-size: 8px;
    line-height: 1.5;
  }
  .addr-box:first-child { border-right: 1px solid #888; }
  .addr-label {
    font-weight: bold;
    text-decoration: underline;
    margin-bottom: 2px;
  }

  /* ── Special instructions ── */
  .special-wrap {
    margin-bottom: 5px;
    font-size: 8px;
  }
  .special-label { font-weight: bold; }
  .special-text {
    display: inline-block;
    background: #ffff00;
    padding: 1px 4px;
    margin-left: 2px;
    font-weight: bold;
  }

  /* ── Items table ── */
  .items-tbl {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 6px;
    font-size: 8px;
  }
  .items-tbl thead tr {
    background: #000;
    color: #fff;
  }
  .items-tbl th {
    padding: 3px 4px;
    text-align: left;
    font-size: 7.5px;
    font-weight: bold;
    border: 1px solid #555;
  }
  .items-tbl td {
    padding: 3px 4px;
    border: 1px solid #bbb;
    vertical-align: top;
  }
  .items-tbl tbody tr:nth-child(odd) { background: #fff; }
  .items-tbl tbody tr:nth-child(even) { background: #f9f9f9; }
  .item-name-cell { line-height: 1.4; }
  .c { text-align: center; }
  .r { text-align: right; }

  /* ── Footer / totals ── */
  .footer-block { margin-top: 6px; }
  .footer-inner {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    margin-bottom: 6px;
  }
  .disclaimer {
    flex: 1;
    font-size: 7px;
    line-height: 1.45;
    color: #222;
    white-space: pre-line;
  }
  .totals { flex-shrink: 0; }
  .totals-tbl { border-collapse: collapse; font-size: 8px; }
  .totals-tbl td { padding: 2px 5px; }
  .tl { white-space: nowrap; }
  .tr { text-align: right; }
  .tm {
    border: 1px solid #888;
    min-width: 52px;
    font-weight: 600;
  }
  .grand-lbl { font-weight: bold; }
  .grand-val { font-weight: bold; font-size: 9px; }
  .sig-row {
    font-size: 8px;
    margin-top: 8px;
    border-top: 1px solid #888;
    padding-top: 5px;
  }
  .sig-line {
    display: inline-block;
    border-bottom: 1px solid #000;
    width: 100px;
    margin-left: 4px;
  }
  .sig-line.short { width: 50px; }

  /* ── Print ── */
  @media print {
    body { padding: 0; }
    @page { margin: 0.3in; size: letter landscape; }
    .po-page { padding: 0; min-height: 100vh; }
  }
</style>
</head>
<body>
  <div class="po-page">
    ${origCol}
    ${copyCol}
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
