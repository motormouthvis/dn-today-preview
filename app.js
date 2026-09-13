(function () {
  const data = window.DN_TODAY;
  const board = document.getElementById("board");
  const customersView = document.getElementById("customers-view");
  const dateEl = document.getElementById("board-date");
  const statusEl = document.getElementById("board-status");
  const drawerRoot = document.querySelector(".drawer-root");
  const drawer = document.getElementById("drawer");
  const drawerTitle = document.getElementById("drawer-title");
  const drawerKicker = document.getElementById("drawer-kicker");
  const drawerBody = document.getElementById("drawer-body");
  const storeKey = "dn-today-customers";
  const api = window.DNCustomers;
  let lastFocus = null;
  let importPlan = null;
  let recap = null;

  function seedCustomers() {
    return data.customers.directory.map((row) => ({ ...row }));
  }

  function loadCustomers() {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (_err) {
      /* demo storage only */
    }
    return seedCustomers();
  }

  function saveCustomers(rows) {
    localStorage.setItem(storeKey, JSON.stringify(rows));
  }

  let customers = loadCustomers();

  function nyDate() {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: data.timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date());
  }

  function nyIso() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: data.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function toneRank(tone) {
    return { ok: 0, watch: 1, alert: 2 }[tone] || 0;
  }

  function overall() {
    const tones = [
      data.product.status,
      data.customers.status,
      data.pipeline.status,
      data.followup.status,
    ];
    const worst = tones.sort((a, b) => toneRank(b) - toneRank(a))[0];
    return {
      tone: worst,
      label: worst === "ok" ? "All clear" : "Needs a look",
    };
  }

  function badge(kind) {
    if (kind === "live") {
      return '<span class="badge" data-kind="live" data-tone="ok">Live</span>';
    }
    return '<span class="badge" data-tone="watch">Example data</span>';
  }

  function banner(kind) {
    return kind === "example"
      ? '<p class="banner">Example data — not live accounts</p>'
      : "";
  }

  function rowButton(id, itemId, label, meta, value, tone) {
    return `
      <button class="row" type="button" data-open="${id}" data-item="${itemId}">
        <span>
          <p class="row__label tone-dot" data-tone="${tone || "ok"}">${label}</p>
          ${meta ? `<p class="row__meta">${meta}</p>` : ""}
        </span>
        <p class="row__value">${value}</p>
      </button>`;
  }

  function productTile() {
    const p = data.product;
    const envRows = p.environments
      .map((env) =>
        rowButton(p.id, env.id, env.name, env.card, env.version, env.tone)
      )
      .join("");
    return `
      <article class="tile" data-tile="${p.id}">
        <div class="tile__bar" data-tone="${p.status}"></div>
        <button class="tile__head" type="button" data-open="${p.id}">
          <span>
            <h2 class="tile__title">Product</h2>
            <p class="tile__glance">${p.glance}</p>
          </span>
          ${badge("live")}
        </button>
        ${envRows}
        ${rowButton(p.id, p.qa.id, "Overnight QA Action", "Log noise / Walk & Bike watch only", p.qa.action, p.qa.tone)}
        ${rowButton(p.id, p.lastShip.id, "Last ship", p.lastShip.summary, "PR 125", "ok")}
      </article>`;
  }

  function customersTile() {
    const c = data.customers;
    const regions = c.regions
      .map(
        (r) => `
        <button class="region" type="button" data-open="${c.id}" data-item="${r.id}">
          <span class="row__meta">${r.label}</span>
          <strong>${r.count}</strong>
          <span class="row__meta">${r.short} realtors</span>
        </button>`
      )
      .join("");
    const problems = c.problems
      .map((p) => rowButton(c.id, p.id, p.title, p.who, "Watch", p.tone))
      .join("");
    return `
      <article class="tile" data-tile="${c.id}">
        <div class="tile__bar" data-tone="${c.status}"></div>
        <button class="tile__head" type="button" data-open="${c.id}">
          <span>
            <h2 class="tile__title">Customers</h2>
            <p class="tile__glance">${c.glance}</p>
          </span>
          ${badge("example")}
        </button>
        ${banner("example")}
        <a class="row list-link" href="#customers">
          <span>
            <p class="row__label">Open customer list & import</p>
            <p class="row__meta">Example roster · CSV in the browser only</p>
          </span>
          <p class="row__value">${customers.length}</p>
        </a>
        <div class="regions">${regions}</div>
        ${problems}
        ${rowButton(c.id, c.stuck.id, c.stuck.title, c.stuck.who, "Stuck", c.stuck.tone)}
      </article>`;
  }

  function pipelineTile() {
    const p = data.pipeline;
    const funnel = p.funnel
      .map((step) => {
        const extra =
          step.split &&
          `${step.split.generic} generic / ${step.split.personalized} personalized`;
        return `
          <button type="button" data-open="${p.id}" data-item="${step.id}" title="${extra || step.label}">
            <b>${step.count}</b>
            <span>${step.label}</span>
          </button>`;
      })
      .join("");
    const rows = p.rows
      .slice(0, 3)
      .map((row) =>
        rowButton(
          p.id,
          row.id,
          row.who,
          `${row.kind} · ${row.video}`,
          row.stages[row.stages.length - 1],
          row.stages.includes("booked") ? "ok" : "watch"
        )
      )
      .join("");
    return `
      <article class="tile" data-tile="${p.id}">
        <div class="tile__bar" data-tone="${p.status}"></div>
        <button class="tile__head" type="button" data-open="${p.id}">
          <span>
            <h2 class="tile__title">Pipeline</h2>
            <p class="tile__glance">${p.glance}</p>
          </span>
          ${badge("example")}
        </button>
        ${banner("example")}
        <div class="funnel">${funnel}</div>
        ${rows}
      </article>`;
  }

  function followupTile() {
    const f = data.followup;
    const rows = f.items
      .map((item) =>
        rowButton(f.id, item.id, item.action, `${item.owner} · ${item.due}`, item.due, item.tone)
      )
      .join("");
    return `
      <article class="tile" data-tile="${f.id}">
        <div class="tile__bar" data-tone="${f.status}"></div>
        <button class="tile__head" type="button" data-open="${f.id}">
          <span>
            <h2 class="tile__title">Follow-up</h2>
            <p class="tile__glance">${f.glance}</p>
          </span>
          ${badge("example")}
        </button>
        ${banner("example")}
        ${rows}
      </article>`;
  }

  function detail(itemId, tone, title, body, extra) {
    return `
      <section class="detail" data-item="${itemId}" data-tone="${tone}" data-active="false">
        <p class="kicker tone-dot" data-tone="${tone}">${tone}</p>
        <h3>${title}</h3>
        <p>${body}</p>
        ${extra || ""}
      </section>`;
  }

  function chips(list) {
    return `<div class="chips">${list
      .map((c) => `<span class="chip" data-tone="${c.tone || "ok"}">${c.label}</span>`)
      .join("")}</div>`;
  }

  function drawerHtml(id) {
    if (id === "product") {
      const p = data.product;
      return [
        `<p>${data.productScope} Live numbers as of ${data.asOf}.</p>`,
        ...p.environments.map((env) =>
          detail(env.id, env.tone, `${env.name} ${env.version}`, env.note)
        ),
        detail(p.qa.id, p.qa.tone, "Overnight QA Action: none", p.qa.detail),
        detail(p.lastShip.id, "ok", "Last ship", p.lastShip.detail),
      ].join("");
    }

    if (id === "customers") {
      const c = data.customers;
      const regionBits = c.regions
        .map((r) =>
          detail(
            r.id,
            "watch",
            `${r.label} · ${r.count}`,
            `Example count of ${r.short} realtor accounts. Not a live roster.`
          )
        )
        .join("");
      return [
        `<p>Example data only. Names are invented so they cannot be mistaken for live accounts.</p>`,
        `<p><a class="text-link" href="#customers">Open the example customer list and import</a></p>`,
        regionBits,
        ...c.problems.map((p) => detail(p.id, p.tone, p.title, `${p.who}. ${p.detail}`)),
        detail(c.stuck.id, c.stuck.tone, c.stuck.title, `${c.stuck.who}. ${c.stuck.detail}`),
      ].join("");
    }

    if (id === "pipeline") {
      const p = data.pipeline;
      const funnelBits = p.funnel
        .map((step) => {
          const split = step.split
            ? ` ${step.split.generic} generic, ${step.split.personalized} personalized.`
            : "";
          return detail(
            step.id,
            "watch",
            `${step.label}: ${step.count}`,
            `Example funnel step.${split} Not live mailbox counts.`
          );
        })
        .join("");
      const rows = p.rows
        .map((row) =>
          detail(
            row.id,
            row.stages.includes("booked") ? "ok" : "watch",
            row.who,
            `Video: “${row.video}”.`,
            chips([
              { label: row.kind, tone: row.kind === "personalized" ? "ok" : "watch" },
              ...row.stages.map((s) => ({ label: s, tone: "ok" })),
            ])
          )
        )
        .join("");
      return `<p>Example realtor outreach. No live mailbox and no email or calendar connectors.</p>${funnelBits}${rows}`;
    }

    const f = data.followup;
    const items = f.items
      .map((item) =>
        detail(
          item.id,
          item.tone,
          item.action,
          `Owner: ${item.owner} (${item.ownerRole}). Due ${item.due}.`,
          chips([{ label: item.owner, tone: item.tone }, { label: item.due, tone: item.tone }])
        )
      )
      .join("");
    return `<p>Example next actions. Myles is marketing and makes the calls. Bill runs the company. Dream Neighborhood is product / support.</p>${items}`;
  }

  function titles(id) {
    return {
      product: ["Live product", "Product"],
      customers: ["Example data", "Customers"],
      pipeline: ["Example data", "Pipeline"],
      followup: ["Example data", "Follow-up"],
    }[id];
  }

  function openDrawer(id, itemId) {
    const [kicker, title] = titles(id);
    lastFocus = document.activeElement;
    drawerKicker.textContent = kicker;
    drawerTitle.textContent = title;
    drawerBody.innerHTML = drawerHtml(id);
    drawerBody.querySelectorAll(".detail").forEach((el) => {
      el.dataset.active = String(el.dataset.item === itemId);
    });
    drawerRoot.hidden = false;
    document.body.style.overflow = "hidden";
    const active = drawerBody.querySelector('[data-active="true"]');
    drawer.focus();
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  function closeDrawer() {
    drawerRoot.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function onOpenClick(event) {
    const opener = event.target.closest("[data-open]");
    if (!opener) return;
    openDrawer(opener.dataset.open, opener.dataset.item);
  }

  function customerRows() {
    return customers
      .map(
        (row) => `
        <button class="row" type="button" data-customer="${row.id}">
          <span>
            <p class="row__label">${row.name}</p>
            <p class="row__meta">${row.email || "No email"} · ${row.phone || "No phone"}</p>
          </span>
          <p class="row__value">${row.region || ""}</p>
        </button>`
      )
      .join("");
  }

  function customersScreen() {
    const recapHtml = recap
      ? `<p class="recap">Added ${recap.added}, updated ${recap.updated}, skipped ${recap.skipped}, duplicates merged ${recap.merged}.</p>`
      : "";
    return `
      <div class="customers-head">
        <a class="back" href="#today">← Today</a>
        <h2>Customers</h2>
        <p class="tile__glance">${customers.length} example records · browser only</p>
      </div>
      <p class="banner">Example data — not live accounts</p>
      ${recapHtml}
      <div class="import-bar">
        <button type="button" class="btn" data-sample-import>Try sample import</button>
        <label class="btn btn--ghost">
          Import CSV
          <input id="csv-file" type="file" accept=".csv,text/csv" hidden />
        </label>
        <button type="button" class="btn btn--ghost" data-reset-customers>Reset example list</button>
      </div>
      <p class="hint">Columns: name, email, website, phone, notes. Match on email first, then website host. Same person is an Update, not a second card. Conflicts wait for Confirm / Keep existing.</p>
      <div class="tile customers-list">
        <div class="tile__bar" data-tone="watch"></div>
        ${customerRows()}
      </div>`;
  }

  function reviewHtml(plan) {
    const cards = plan.items
      .map((item, index) => {
        const title = item.incoming.name || item.existing?.name || "Untitled";
        const why = item.reason ? `Matched on ${item.reason}` : "New example record";
        const fills = item.fills.length
          ? `<p>Empty fields to fill: ${item.fills.join(", ")}.</p>`
          : "";
        const conflicts = item.conflicts
          .map((conflict) => {
            const key = `${index}:${conflict.field}`;
            return `
              <div class="choice">
                <p><strong>${conflict.field}</strong> — pick one</p>
                <label><input type="radio" name="${key}" value="existing" /> Keep existing: ${conflict.existing}</label>
                <label><input type="radio" name="${key}" value="incoming" checked /> Confirm import: ${conflict.incoming}</label>
              </div>`;
          })
          .join("");
        const kindLabel = {
          add: "New",
          update: "Update",
          conflict: "Needs a choice",
          skip: "No change",
        }[item.kind];
        return `
          <section class="detail" data-kind="${item.kind}">
            <p class="kicker">${kindLabel}${item.merged ? ` · ${item.merged} file duplicate collapsed` : ""}</p>
            <h3>${title}</h3>
            <p>${why}</p>
            ${fills}
            ${conflicts}
          </section>`;
      })
      .join("");
    return `
      <p>Review before anything is written. Nothing leaves this phone.</p>
      <p>${plan.added} new · ${plan.updated} updates · ${plan.conflicts} need a choice · ${plan.skipped} unchanged · ${plan.merged} duplicates merged in the file.</p>
      ${cards}
      <button type="button" class="btn" data-apply-import>Apply import</button>`;
  }

  function openReview(plan) {
    importPlan = plan;
    drawerKicker.textContent = "Example data";
    drawerTitle.textContent = "Import review";
    drawerBody.innerHTML = reviewHtml(plan);
    drawerRoot.hidden = false;
    document.body.style.overflow = "hidden";
    drawer.focus();
  }

  function runCsv(text) {
    const rows = api.parseCsv(text);
    if (!rows.length) {
      recap = { added: 0, updated: 0, skipped: 0, merged: 0 };
      render();
      return;
    }
    openReview(api.planImport(customers, rows));
  }

  function applyReview() {
    if (!importPlan) return;
    const choices = {};
    drawerBody.querySelectorAll('input[type="radio"]:checked').forEach((input) => {
      choices[input.name] = input.value;
    });
    const result = api.applyImport(customers, importPlan, choices);
    customers = result.customers;
    recap = result.recap;
    saveCustomers(customers);
    importPlan = null;
    closeDrawer();
    location.hash = "customers";
    render();
  }

  function customerDetail(id) {
    const row = customers.find((item) => item.id === id);
    if (!row) return;
    drawerKicker.textContent = "Example data";
    drawerTitle.textContent = row.name;
    drawerBody.innerHTML = `
      <section class="detail" data-active="true">
        <p>${row.notes || "No notes."}</p>
        <p>Email: ${row.email || "—"}</p>
        <p>Website: ${row.website || "—"}</p>
        <p>Phone: ${row.phone || "—"}</p>
        <p>Region: ${row.region || "—"}</p>
      </section>`;
    drawerRoot.hidden = false;
    document.body.style.overflow = "hidden";
    drawer.focus();
  }

  function isCustomers() {
    return location.hash.replace(/^#/, "") === "customers";
  }

  function render() {
    dateEl.dateTime = nyIso();
    dateEl.textContent = nyDate();
    const boardStatus = overall();
    statusEl.dataset.tone = boardStatus.tone;
    statusEl.textContent = boardStatus.label;
    const customersMode = isCustomers();
    board.hidden = customersMode;
    customersView.hidden = !customersMode;
    document.querySelector(".board-note").hidden = customersMode;
    if (customersMode) {
      customersView.innerHTML = customersScreen();
    } else {
      board.innerHTML =
        productTile() + customersTile() + pipelineTile() + followupTile();
    }
    window.scrollTo(0, 0);
  }

  render();
  window.addEventListener("hashchange", () => {
    closeDrawer();
    render();
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]")) {
      closeDrawer();
      return;
    }
    if (event.target.closest("[data-reset-customers]")) {
      customers = seedCustomers();
      saveCustomers(customers);
      recap = null;
      render();
      return;
    }
    if (event.target.closest("[data-sample-import]")) {
      runCsv(api.SAMPLE_CSV);
      return;
    }
    if (event.target.closest("[data-apply-import]")) {
      applyReview();
      return;
    }
    const person = event.target.closest("[data-customer]");
    if (person) {
      customerDetail(person.dataset.customer);
      return;
    }
    onOpenClick(event);
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "csv-file" && event.target.files?.[0]) {
      event.target.files[0].text().then(runCsv);
      event.target.value = "";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !drawerRoot.hidden) closeDrawer();
  });
})();
