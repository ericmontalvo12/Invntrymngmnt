import type { PurchaseOrder, PurchaseOrderItem } from "@/types";

interface POPrintData {
  po: PurchaseOrder & { items: PurchaseOrderItem[] };
  orderedByName: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(n: number): string {
  return n.toFixed(2);
}

export function printPurchaseOrder({ po, orderedByName }: POPrintData) {
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subtotal = po.items.reduce(
    (sum, item) => (item.unit_cost ? sum + item.quantity_ordered * item.unit_cost : sum),
    0
  );
  const taxRate = 0.07;
  const salesTax = subtotal * taxRate;
  const grandTotal = subtotal + salesTax;

  const vendorName = po.vendor?.name ?? "—";
  const vendorAddress = po.vendor?.address ?? "";
  const vendorPhone = po.vendor?.phone ?? "";

  const shipToName = "GENCO";
  const shipToLine1 = po.building?.address ?? "";
  const shipToLine2 = po.apartment_unit ? `Unit/Apartment ${po.apartment_unit}` : "";
  const shipToCity = "";

  const rows = po.items
    .map(
      (item, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td>${item.item_sku}</td>
      <td>${item.item_name}</td>
      <td class="center">${item.quantity_ordered}</td>
      <td class="center">EA</td>
      <td class="right">${item.unit_cost != null ? formatCurrency(item.unit_cost) : "—"}</td>
      <td class="right">${item.unit_cost != null ? formatCurrency(item.quantity_ordered * item.unit_cost) : "—"}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<title>PO ${po.po_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; padding: 24px; }
  h1 { font-size: 22px; font-weight: bold; margin-bottom: 2px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 12px; }
  .header-left { }
  .header-right { text-align: right; }
  .header-right .po-title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
  .company-addr { font-size: 11px; line-height: 1.4; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .meta-box { border: 1px solid #ccc; padding: 10px; }
  .meta-box-title { font-weight: bold; font-size: 10px; text-transform: uppercase; color: #555; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  .meta-box p { line-height: 1.5; }
  .info-row { display: flex; gap: 24px; margin-bottom: 16px; }
  .info-item { }
  .info-label { font-size: 10px; text-transform: uppercase; color: #555; font-weight: bold; }
  .info-value { font-size: 12px; font-weight: 600; }
  .special { margin-bottom: 16px; padding: 8px 10px; border: 1px solid #ccc; background: #fafafa; }
  .special-label { font-size: 10px; text-transform: uppercase; color: #555; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead { background: #222; color: #fff; }
  th { padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; }
  td { padding: 6px 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
  .center { text-align: center; }
  .right { text-align: right; }
  .totals { display: flex; justify-content: flex-end; }
  .totals-table { width: 240px; }
  .totals-table tr td { padding: 4px 8px; font-size: 11px; }
  .totals-table .grand td { font-weight: bold; font-size: 13px; border-top: 2px solid #000; padding-top: 6px; }
  .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 12px; font-size: 10px; color: #666; text-align: center; }
  @media print {
    body { padding: 0; }
    @page { margin: 0.5in; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${shipToName}</h1>
      <div class="company-addr">
        ${shipToLine1 ? `${shipToLine1}<br>` : ""}${shipToLine2 ? `${shipToLine2}<br>` : ""}${shipToCity}
      </div>
    </div>
    <div class="header-right">
      <div class="po-title">PURCHASE ORDER</div>
      <div><strong>PO #:</strong> ${po.po_number}</div>
    </div>
  </div>

  <div class="info-row">
    <div class="info-item">
      <div class="info-label">Purchase Order Date</div>
      <div class="info-value">${formatDate(po.created_at)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Delivery Date</div>
      <div class="info-value">${po.expected_delivery ? formatDate(po.expected_delivery) : "—"}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Printed Date</div>
      <div class="info-value">${now}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Ordered By</div>
      <div class="info-value">${orderedByName}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-box-title">Vendor</div>
      <p><strong>${vendorName}</strong></p>
      ${vendorAddress ? `<p>${vendorAddress}</p>` : ""}
      ${vendorPhone ? `<p>Phone: ${vendorPhone}</p>` : ""}
    </div>
    <div class="meta-box">
      <div class="meta-box-title">Ship To</div>
      <p><strong>${shipToName}</strong></p>
      ${shipToLine1 ? `<p>${shipToLine1}</p>` : ""}
      ${shipToLine2 ? `<p>${shipToLine2}</p>` : ""}
      ${shipToCity ? `<p>${shipToCity}</p>` : ""}
    </div>
  </div>

  ${po.special_instructions ? `<div class="special"><span class="special-label">Special Instructions: </span>${po.special_instructions}</div>` : ""}

  <table>
    <thead>
      <tr>
        <th class="center" style="width:40px">#</th>
        <th>Item #</th>
        <th>Item Name</th>
        <th class="center">Qty</th>
        <th class="center">Unit</th>
        <th class="right">Unit Price</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="totals">
    <table class="totals-table">
      <tr>
        <td class="right">Subtotal:</td>
        <td class="right">$${formatCurrency(subtotal)}</td>
      </tr>
      <tr>
        <td class="right">Sales Tax (${(taxRate * 100).toFixed(0)}%):</td>
        <td class="right">$${formatCurrency(salesTax)}</td>
      </tr>
      <tr class="grand">
        <td class="right">Grand Total:</td>
        <td class="right">$${formatCurrency(grandTotal)}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    This is a computer-generated purchase order. Please reference PO # ${po.po_number} on all correspondence.
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
