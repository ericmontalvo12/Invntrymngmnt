import type { WorkOrder, WorkOrderItem } from "@/types";

interface WOPrintData {
  wo: WorkOrder & { items: WorkOrderItem[] };
}

function formatDate(dateStr: string): string {
  const d = dateStr.length <= 10 ? new Date(dateStr + "T00:00:00") : new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st"
    : day % 10 === 2 && day !== 12 ? "nd"
    : day % 10 === 3 && day !== 13 ? "rd"
    : "th";
  return `${month} ${day}${suffix} ${year}`;
}

function emptyRows(count: number, cols: number): string {
  return Array.from({ length: count })
    .map(() => `<tr>${Array.from({ length: cols }).map(() => `<td>&nbsp;</td>`).join("")}</tr>`)
    .join("");
}

export function printWorkOrder({ wo }: WOPrintData) {
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const isUrgent = wo.priority === "urgent";
  const priorityLabel = wo.priority === "urgent" ? "Emergency"
    : wo.priority === "high" ? "High"
    : wo.priority === "medium" ? "Medium"
    : "Low";

  const buildingName = wo.building?.name ?? "—";
  const buildingAddr = (wo.building as { address?: string } | null)?.address ?? "";
  const buildingCity = (wo.building as { city?: string; state?: string; zip?: string } | null)
    ? [(wo.building as { city?: string }).city, (wo.building as { state?: string }).state, (wo.building as { zip?: string }).zip].filter(Boolean).join(", ")
    : "";
  const unit = wo.apartment_unit ? `Unit ${wo.apartment_unit}` : "";
  const phone = (wo.building as { phone?: string } | null)?.phone ?? "";
  const requestedBy = wo.requested_by ?? "—";
  const assignedTo = wo.assignee?.full_name ?? wo.assignee?.email ?? "—";
  const inspType = wo.inspection_type?.name ?? "—";
  const inspDate = wo.inspection_date ? formatDate(wo.inspection_date) : "—";
  const dueDate = wo.due_date ? formatDate(wo.due_date) : "—";
  const extDue = wo.extended_due_date ? formatDate(wo.extended_due_date) : "—";

  // Pre-populate materials from work order items
  const materialRows = (wo.items ?? []).map((item) => `
    <tr>
      <td>&nbsp;</td>
      <td>${item.item_sku}</td>
      <td>${item.item_name}</td>
      <td class="c">${item.quantity_needed}</td>
      <td class="c">EA</td>
      <td>&nbsp;</td>
    </tr>`).join("") + emptyRows(Math.max(0, 8 - (wo.items?.length ?? 0)), 6);

  const rush = isUrgent
    ? `<div class="rush">RUSH</div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>WO ${wo.wo_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8.5px;
    color: #000;
    background: #fff;
    padding: 14px 18px;
  }

  /* ── RUSH stamp ── */
  .rush {
    position: absolute;
    top: 10px;
    right: 18px;
    font-size: 36px;
    font-weight: 900;
    color: #cc0000;
    letter-spacing: 2px;
    border: 4px solid #cc0000;
    padding: 2px 10px;
    transform: rotate(-4deg);
    opacity: 0.85;
    line-height: 1;
  }

  /* ── Header ── */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
    position: relative;
  }
  .wo-title { font-size: 14px; font-weight: bold; }
  .wo-priority { font-size: 11px; font-weight: bold; margin-top: 2px; }
  .header-meta { font-size: 8px; line-height: 1.8; margin-right: ${isUrgent ? "110px" : "0"}; }
  .header-meta table { border-collapse: collapse; }
  .header-meta td { padding: 0 6px 0 0; }
  .header-meta .mk { color: #333; white-space: nowrap; }
  .header-meta .mv { font-weight: 600; }

  /* ── Info section ── */
  .info-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border: 1px solid #888;
    margin-bottom: 8px;
  }
  .info-left {
    border-right: 1px solid #888;
    font-size: 8.5px;
    line-height: 1.8;
  }
  .info-field {
    display: flex;
    border-bottom: 1px solid #ccc;
    padding: 2px 6px;
  }
  .info-field:last-child { border-bottom: none; }
  .info-field.tall { min-height: 36px; align-items: flex-start; }
  .if-label { color: #444; white-space: nowrap; margin-right: 5px; }
  .if-value { font-weight: 600; }
  .info-right {
    padding: 6px;
    font-size: 8.5px;
  }
  .desc-label { font-weight: bold; font-size: 8px; text-transform: uppercase; margin-bottom: 4px; color: #555; }
  .desc-body { font-size: 9px; line-height: 1.6; white-space: pre-wrap; }

  /* ── Section header ── */
  .section-header {
    background: #000;
    color: #fff;
    font-size: 8px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 3px 6px;
  }

  /* ── Tables ── */
  table.grid {
    width: 100%;
    border-collapse: collapse;
    font-size: 8px;
    margin-bottom: 8px;
  }
  table.grid th {
    background: #ddd;
    border: 1px solid #888;
    padding: 3px 5px;
    text-align: left;
    font-size: 7.5px;
    font-weight: bold;
    text-transform: uppercase;
    white-space: nowrap;
  }
  table.grid td {
    border: 1px solid #bbb;
    padding: 3px 5px;
    height: 16px;
  }
  .c { text-align: center; }
  .r { text-align: right; }

  /* ── Side-by-side tables ── */
  .dual-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 8px;
  }

  /* ── Footer ── */
  .footer-info {
    font-size: 7.5px;
    color: #333;
    border-top: 1px solid #ccc;
    padding-top: 5px;
    margin-top: 6px;
    line-height: 1.6;
  }
  .sig-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    border-top: 2px solid #000;
    padding-top: 8px;
    margin-top: 10px;
    font-size: 8px;
    position: relative;
  }
  .sig-block .sig-label {
    font-weight: bold;
    font-size: 7.5px;
    text-transform: uppercase;
    margin-bottom: 16px;
    color: #333;
  }
  .sig-line {
    display: inline-block;
    border-bottom: 1px solid #000;
    width: 110px;
    margin-left: 3px;
  }
  .sig-line.short { width: 60px; }
  .sig-date { display: block; margin-top: 10px; }
  .rush-footer {
    position: absolute;
    right: 0;
    bottom: 0;
    font-size: 28px;
    font-weight: 900;
    color: #cc0000;
    letter-spacing: 2px;
    border: 3px solid #cc0000;
    padding: 1px 8px;
    transform: rotate(-4deg);
    opacity: 0.85;
    line-height: 1;
  }

  /* ── Print ── */
  @media print {
    body { padding: 0; position: relative; }
    @page { margin: 0.4in; size: letter portrait; }
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="page-header">
    <div>
      <div class="wo-title">WORK ORDER # ${wo.wo_number}</div>
      <div class="wo-priority">Priority: ${priorityLabel}</div>
    </div>
    <div class="header-meta">
      <table>
        <tr><td class="mk">Created</td><td class="mv">${formatDate(wo.created_at)}</td><td style="width:20px"></td><td class="mk">Insp. Ref #</td><td class="mv">—</td></tr>
        <tr><td class="mk">Due</td><td class="mv">${dueDate}</td><td></td><td class="mk">Insp. Due</td><td class="mv">${inspDate}</td></tr>
        <tr><td class="mk">Printed</td><td class="mv">${now}</td><td></td><td class="mk">Insp. Ext.</td><td class="mv">${extDue}</td></tr>
      </table>
    </div>
    ${rush}
  </div>

  <!-- TENANT / DESCRIPTION ROW -->
  <div class="info-row">
    <div class="info-left">
      <div class="info-field">
        <span class="if-label">Tenant&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
        <span class="if-value"></span>
      </div>
      <div class="info-field">
        <span class="if-label">Address&nbsp;&nbsp;&nbsp;&nbsp;:</span>
        <span class="if-value">${buildingAddr}${unit ? `, ${unit}` : ""}</span>
      </div>
      <div class="info-field">
        <span class="if-label">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <span class="if-value">${buildingCity}</span>
      </div>
      <div class="info-field">
        <span class="if-label">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <span class="if-value">${phone}</span>
      </div>
      <div class="info-field">
        <span class="if-label">Project&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
        <span class="if-value">${buildingName}</span>
      </div>
      <div class="info-field">
        <span class="if-label">Requested By:</span>
        <span class="if-value">${requestedBy}</span>
      </div>
      <div class="info-field">
        <span class="if-label">Assigned To&nbsp;:</span>
        <span class="if-value">${assignedTo}</span>
      </div>
      <div class="info-field">
        <span class="if-label">Insp. Type&nbsp;&nbsp;:</span>
        <span class="if-value">${inspType}</span>
      </div>
      <div class="info-field tall">
        <span class="if-label">NOTES&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <span class="if-value" style="white-space:pre-wrap">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;COMPLETED [&nbsp;&nbsp;&nbsp;]</span>
      </div>
    </div>
    <div class="info-right">
      <div class="desc-label">Work Description</div>
      <div class="desc-body">${wo.notes ?? ""}</div>
    </div>
  </div>

  <!-- APPLIANCES -->
  <div class="section-header">Appliances</div>
  <table class="grid" style="margin-top:0">
    <thead>
      <tr>
        <th style="width:30px">QTY</th>
        <th>Item</th>
        <th>Brand</th>
        <th>Model</th>
        <th>Color</th>
        <th>Serial #</th>
      </tr>
    </thead>
    <tbody>${emptyRows(3, 6)}</tbody>
  </table>

  <!-- MATERIALS DELIVERED + LABOR (side by side) -->
  <div class="dual-section">
    <div>
      <div class="section-header">Materials Delivered</div>
      <table class="grid" style="margin-top:0">
        <thead>
          <tr>
            <th style="width:30px">Date</th>
            <th style="width:40px">Item #</th>
            <th>Description</th>
            <th class="c" style="width:28px">QTY</th>
            <th class="c" style="width:28px">Unit</th>
            <th style="width:50px">Signature</th>
          </tr>
        </thead>
        <tbody>${materialRows}</tbody>
      </table>
    </div>
    <div>
      <div class="section-header">Labor</div>
      <table class="grid" style="margin-top:0">
        <thead>
          <tr>
            <th style="width:34px">Date</th>
            <th>Employee</th>
            <th style="width:34px">Start</th>
            <th style="width:34px">End</th>
            <th style="width:28px">BRK</th>
          </tr>
        </thead>
        <tbody>${emptyRows(8, 5)}</tbody>
      </table>
    </div>
  </div>

  <!-- RETURNED MATERIAL + EQUIPMENT RENTAL & KEYS (side by side) -->
  <div class="dual-section">
    <div>
      <div class="section-header">Returned Material</div>
      <table class="grid" style="margin-top:0">
        <thead>
          <tr>
            <th style="width:30px">Date</th>
            <th style="width:40px">Item #</th>
            <th>Description</th>
            <th class="c" style="width:28px">QTY</th>
            <th class="c" style="width:28px">Unit</th>
            <th style="width:50px">Signature</th>
          </tr>
        </thead>
        <tbody>${emptyRows(4, 6)}</tbody>
      </table>
    </div>
    <div>
      <div class="section-header">Equipment Rental &amp; Keys</div>
      <table class="grid" style="margin-top:0">
        <thead>
          <tr>
            <th style="width:34px">Date</th>
            <th>Equipment</th>
            <th style="width:28px">Out</th>
            <th style="width:28px">In</th>
            <th style="width:28px">Days</th>
          </tr>
        </thead>
        <tbody>${emptyRows(4, 5)}</tbody>
      </table>
    </div>
  </div>

  <!-- FOOTER INFO -->
  <div class="footer-info">
    Tenant: ___________________________${buildingAddr ? ` of ${buildingAddr}${unit ? `, ${unit}` : ""}` : ""}
    &nbsp;&nbsp;&nbsp; WO # ${wo.wo_number} &nbsp; Issued ${formatDate(wo.created_at)}
    &nbsp;&nbsp;&nbsp; Description: ${wo.notes ? wo.notes.substring(0, 120) : "—"}
  </div>

  <!-- SIGNATURE ROW -->
  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-label">Tenant&rsquo;s Acceptance</div>
      <span>Signature: <span class="sig-line"></span></span>
      <span class="sig-date">Date: <span class="sig-line short"></span></span>
    </div>
    <div class="sig-block">
      <div class="sig-label">Completed By</div>
      <span>Name: <span class="sig-line"></span></span>
      <span class="sig-date">Date: <span class="sig-line short"></span></span>
    </div>
    <div class="sig-block">
      <div class="sig-label">Approved By</div>
      <span>Name: <span class="sig-line"></span></span>
    </div>
    ${isUrgent ? `<div class="rush-footer">RUSH</div>` : ""}
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
