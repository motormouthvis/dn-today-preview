/* Customer list + CSV import. Browser-only demo state. No mailbox. */

(function (root) {
  const FIELDS = ["name", "email", "website", "phone", "notes"];

  function normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  }

  function websiteHost(website) {
    const raw = String(website || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
      return url.hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      return raw
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0]
        .toLowerCase();
    }
  }

  function matchReason(a, b) {
    const ea = normalizeEmail(a.email);
    const eb = normalizeEmail(b.email);
    if (ea && eb && ea === eb) return "email";
    const ha = websiteHost(a.website);
    const hb = websiteHost(b.website);
    if (ha && hb && ha === hb) return "website";
    return null;
  }

  function blank(value) {
    return !String(value || "").trim();
  }

  function trimRow(row) {
    const next = { ...row, id: row.id || "" };
    FIELDS.forEach((field) => {
      next[field] = String(row[field] || "").trim();
    });
    return next;
  }

  function isEmptyRow(row) {
    const t = trimRow(row);
    return FIELDS.every((field) => !t[field]);
  }

  function uniqueConflicts(list) {
    const seen = new Map();
    (list || []).forEach((conflict) => {
      if (conflict && conflict.field && !seen.has(conflict.field)) {
        seen.set(conflict.field, conflict);
      }
    });
    return Array.from(seen.values());
  }

  function mergePair(base, extra) {
    const left = trimRow(base);
    const right = trimRow(extra);
    const record = { ...left };
    const fills = [];
    const conflicts = [];
    FIELDS.forEach((field) => {
      if (blank(right[field])) return;
      if (blank(left[field])) {
        record[field] = right[field];
        fills.push(field);
        return;
      }
      if (left[field] !== right[field]) {
        conflicts.push({
          field,
          existing: left[field],
          incoming: right[field],
        });
      }
    });
    return { record, fills, conflicts: uniqueConflicts(conflicts) };
  }

  function parseCsv(text) {
    const rows = [];
    let cell = "";
    let row = [];
    let inQuotes = false;
    const source = String(text || "").replace(/^\uFEFF/, "");
    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      const next = source[i + 1];
      if (ch === '"' && inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        row.push(cell);
        cell = "";
      } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (ch === "\r" && next === "\n") i += 1;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }
    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }
    if (!rows.length) return [];
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    return rows
      .slice(1)
      .map((values) => {
        const item = {};
        headers.forEach((header, index) => {
          if (FIELDS.includes(header)) item[header] = values[index] || "";
        });
        return trimRow(item);
      })
      .filter((item) => !isEmptyRow(item));
  }

  function collapseImport(rows) {
    const groups = [];
    rows.forEach((row) => {
      const incoming = trimRow(row);
      const hit = groups.find((group) => matchReason(group.record, incoming));
      if (!hit) {
        groups.push({
          record: incoming,
          fills: [],
          conflicts: [],
          merged: 0,
          reason: null,
        });
        return;
      }
      const merged = mergePair(hit.record, incoming);
      hit.record = merged.record;
      hit.fills = hit.fills.concat(merged.fills);
      hit.conflicts = uniqueConflicts(hit.conflicts.concat(merged.conflicts));
      hit.merged += 1;
      hit.reason = matchReason(hit.record, incoming) || hit.reason;
    });
    return groups;
  }

  function planImport(existing, incomingRows) {
    const collapsed = collapseImport(incomingRows);
    const used = new Set();
    const items = collapsed.map((group) => {
      const found = existing.find(
        (customer, index) =>
          !used.has(index) && matchReason(customer, group.record)
      );
      if (!found) {
        return {
          kind: "add",
          incoming: group.record,
          fills: [],
          conflicts: uniqueConflicts(group.conflicts),
          merged: group.merged,
          reason: group.reason,
        };
      }
      used.add(existing.indexOf(found));
      const merged = mergePair(found, group.record);
      const conflicts = uniqueConflicts(merged.conflicts.concat(group.conflicts));
      const kind = conflicts.length
        ? "conflict"
        : merged.fills.length
          ? "update"
          : "skip";
      return {
        kind,
        existing: trimRow(found),
        incoming: group.record,
        proposed: merged.record,
        fills: merged.fills,
        conflicts,
        merged: group.merged,
        reason: matchReason(found, group.record),
      };
    });
    return {
      items,
      added: items.filter((item) => item.kind === "add").length,
      updated: items.filter((item) => item.kind === "update").length,
      conflicts: items.filter((item) => item.kind === "conflict").length,
      merged: collapsed.reduce((sum, group) => sum + group.merged, 0),
      skipped: items.filter((item) => item.kind === "skip").length,
    };
  }

  function applyImport(existing, plan, choices) {
    const next = existing.map((row) => trimRow(row));
    let added = 0;
    let updated = 0;
    let skipped = 0;
    plan.items.forEach((item, index) => {
      if (item.kind === "skip") {
        skipped += 1;
        return;
      }
      if (item.kind === "add") {
        const record = { ...item.incoming, id: `imported-${Date.now()}-${index}` };
        if (item.conflicts.length) {
          item.conflicts.forEach((conflict) => {
            if (choices[`${index}:${conflict.field}`] === "existing") {
              record[conflict.field] = conflict.existing;
            } else {
              record[conflict.field] = conflict.incoming;
            }
          });
        }
        next.push(record);
        added += 1;
        return;
      }
      const target = next.find((row) => row.id === item.existing.id);
      if (!target) {
        skipped += 1;
        return;
      }
      FIELDS.forEach((field) => {
        const fill = item.fills.includes(field);
        const conflict = item.conflicts.find((entry) => entry.field === field);
        if (conflict) {
          const pick = choices[`${index}:${field}`] || "incoming";
          target[field] = pick === "existing" ? conflict.existing : conflict.incoming;
          return;
        }
        if (fill) target[field] = item.proposed[field];
      });
      updated += 1;
    });
    return {
      customers: next,
      recap: {
        added,
        updated,
        skipped,
        merged: plan.merged,
      },
    };
  }

  const SAMPLE_CSV = [
    "name,email,website,phone,notes",
    "Example Realty — West,west@example-realty.test,https://west.example-realty.test,(555) 010-2099,",
    "Example Realty — West,west@example-realty.test,https://west.example-realty.test,(555) 010-2001,",
    "Example Homes — Cedar,cedar@example-homes.test,https://cedar.example-homes.test,(555) 010-4001,New SE office",
    "Example Group — Harbor,,https://harbor.example-group.test,(555) 010-3002,",
    "Example Partner — Candy Lane,candy@example-partner.test,https://candy.example-partner.test,(555) 010-1111,",
  ].join("\n");

  root.DNCustomers = {
    FIELDS,
    normalizeEmail,
    websiteHost,
    matchReason,
    parseCsv,
    collapseImport,
    planImport,
    applyImport,
    SAMPLE_CSV,
  };
})(typeof window !== "undefined" ? window : globalThis);
