(function () {
  const data = window.DN_TODAY;
  const board = document.getElementById("board");
  const topic = document.getElementById("topic");
  const dateEl = document.getElementById("board-date");
  const statusEl = document.getElementById("board-status");
  const drawerRoot = document.querySelector(".drawer-root");
  const drawer = document.getElementById("drawer");
  const drawerTitle = document.getElementById("drawer-title");
  const drawerKicker = document.getElementById("drawer-kicker");
  const drawerBody = document.getElementById("drawer-body");
  const storeKey = "dn-today-customers";
  const api = window.DNCustomers;
  const TABS = ["home", "product", "customers", "pipeline", "follow-up"];
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

  function route() {
    const raw = location.hash.replace(/^#/, "").trim();
    const [tabRaw, item] = raw.split("/");
    const aliases = {
      "": "home",
      today: "home",
      followup: "follow-up",
    };
    const tab = aliases[tabRaw] || (TABS.includes(tabRaw) ? tabRaw : "home");
    return { tab, item: item || "" };
  }

  function rowLink(tab, itemId, label, meta, value, tone) {
    return `
      <a class="row" href="#${tab}${itemId ? `/${itemId}` : ""}">
        <span>
          <p class="row__label tone-dot" data-tone="${tone || "ok"}">${label}</p>
          ${meta ? `<p class="row__meta">${meta}</p>` : ""}
        </span>
        <p class="row__value">${value}</p>
      </a>`;
  }

  function productTile() {
    const p = data.product;
    const envRows = p.environments
      .map((env) =>
        rowLink("product", env.id, env.name, env.card, env.version, env.tone)
      )
      .join("");
    return `
      <article class="tile" data-tile="${p.id}">
        <div class="tile__bar" data-tone="${p.status}"></div>
        <a class="tile__head" href="#product">
          <span>
            <h2 class="tile__title">Product</h2>
            <p class="tile__glance">${p.glance}</p>
          </span>
          ${badge("live")}
        </a>
        ${envRows}
        ${rowLink("product", p.qa.id, "Overnight QA Action", "Log noise / Walk & Bike watch only", p.qa.action, p.qa.tone)}
        ${rowLink("product", p.lastShip.id, "Last ship", p.lastShip.summary, "PR 125", "ok")}
      </article>`;
  }

  function customersTile() {
    const c = data.customers;
    const regions = c.regions
      .map(
        (r) => `
        <a class="region" href="#customers/${r.id}">
          <span class="row__meta">${r.label}</span>
          <strong>${r.count}</strong>
          <span class="row__meta">${r.short} realtors</span>
        </a>`
      )
      .join("");
    const problems = c.problems
      .map((p) => rowLink("customers", p.id, p.title, p.who, "Watch", p.tone))
      .join("");
    return `
      <article class="tile" data-tile="${c.id}">
        <div class="tile__bar" data-tone="${c.status}"></div>
        <a class="tile__head" href="#customers">
          <span>
            <h2 class="tile__title">Customers</h2>
            <p class="tile__glance">${c.glance}</p>
          </span>
          ${badge("example")}
        </a>
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
        ${rowLink("customers", c.stuck.id, c.stuck.title, c.stuck.who, "Stuck", c.stuck.tone)}
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
          <a href="#pipeline/${step.id}" title="${extra || step.label}">
            <b>${step.count}</b>
            <span>${step.label}</span>
          </a>`;
      })
      .join("");
    const rows = p.rows
      .slice(0, 3)
      .map((row) =>
        rowLink(
          "pipeline",
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
        <a class="tile__head" href="#pipeline">
          <span>
            <h2 class="tile__title">Pipeline</h2>
            <p class="tile__glance">${p.glance}</p>
          </span>
          ${badge("example")}
        </a>
        ${banner("example")}
        <div class="funnel">${funnel}</div>
        ${rows}
      </article>`;
  }

  function followupTile() {
    const f = data.followup;
    const rows = f.items
      .map((item) =>
        rowLink("follow-up", item.id, item.action, `${item.owner} · ${item.due}`, item.due, item.tone)
      )
      .join("");
    return `
      <article class="tile" data-tile="${f.id}">
        <div class="tile__bar" data-tone="${f.status}"></div>
        <a class="tile__head" href="#follow-up">
          <span>
            <h2 class="tile__title">Follow-up</h2>
            <p class="tile__glance">${f.glance}</p>
          </span>
          ${badge("example")}
        </a>
        ${banner("example")}
        ${rows}
      </article>`;
  }

  function detail(itemId, tone, title, body, extra, activeId) {
    return `
      <section class="detail" data-item="${itemId}" data-tone="${tone}" data-active="${itemId === activeId}">
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

  function topicHead(title, kind, glance) {
    return `
      <div class="topic-head">
        <div>
          <h2>${title}</h2>
          ${glance ? `<p class="tile__glance">${glance}</p>` : ""}
        </div>
        ${badge(kind)}
      </div>`;
  }

  function productScreen(itemId) {
    const p = data.product;
    return [
      topicHead("Product", "live", p.glance),
      `<p class="hint">${data.productScope} Live numbers as of ${data.asOf}.</p>`,
      ...p.environments.map((env) =>
        detail(env.id, env.tone, `${env.name} ${env.version}`, env.note, "", itemId)
      ),
      detail(p.qa.id, p.qa.tone, "Overnight QA Action: none", p.qa.detail, "", itemId),
      detail(p.lastShip.id, "ok", "Last ship", p.lastShip.detail, "", itemId),
    ].join("");
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

  function customersScreen(itemId) {
    const c = data.customers;
    const recapHtml = recap
      ? `<p class="recap">Added ${recap.added}, updated ${recap.updated}, skipped ${recap.skipped}, duplicates merged ${recap.merged}.</p>`
      : "";
    const regions = c.regions
      .map((r) =>
        detail(
          r.id,
          "watch",
          `${r.label} · ${r.count}`,
          `Example count of ${r.short} realtor accounts. Not a live roster.`,
          "",
          itemId
        )
      )
      .join("");
    const issues = [
      ...c.problems.map((p) =>
        detail(p.id, p.tone, p.title, `${p.who}. ${p.detail}`, "", itemId)
      ),
      detail(c.stuck.id, c.stuck.tone, c.stuck.title, `${c.stuck.who}. ${c.stuck.detail}`, "", itemId),
    ].join("");
    return `
      ${topicHead("Customers", "example", `${customers.length} example records · browser only`)}
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
      </div>
      ${regions}
      ${issues}`;
  }

  function pipelineScreen(itemId) {
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
          `Example funnel step.${split} Not live mailbox counts.`,
          "",
          itemId
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
          ]),
          itemId
        )
      )
      .join("");
    return `
      ${topicHead("Pipeline", "example", p.glance)}
      ${banner("example")}
      <p class="hint">Example realtor outreach. No live mailbox and no email or calendar connectors.</p>
      ${funnelBits}${rows}`;
  }

  function followupScreen(itemId) {
    const f = data.followup;
    const items = f.items
      .map((item) =>
        detail(
          item.id,
          item.tone,
          item.action,
          `Owner: ${item.owner} (${item.ownerRole}). Due ${item.due}.`,
          chips([{ label: item.owner, tone: item.tone }, { label: item.due, tone: item.tone }]),
          itemId
        )
      )
      .join("");
    return `
      ${topicHead("Follow-up", "example", f.glance)}
      ${banner("example")}
      <p class="hint">Example next actions. Myles is marketing and makes the calls. Bill runs the company. Dream Neighborhood is product / support.</p>
      ${items}`;
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

  function closeDrawer() {
    drawerRoot.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
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
    if (route().tab !== "customers") location.hash = "customers";
    render();
  }

  function customerDetail(id) {
    const row = customers.find((item) => item.id === id);
    if (!row) return;
    lastFocus = document.activeElement;
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

  function markTabs(active) {
    document.querySelectorAll(".tabs a").forEach((link) => {
      const id = link.getAttribute("href").replace(/^#/, "");
      if (id === active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function render() {
    const { tab, item } = route();
    dateEl.dateTime = nyIso();
    dateEl.textContent = nyDate();
    const boardStatus = overall();
    statusEl.dataset.tone = boardStatus.tone;
    statusEl.textContent = boardStatus.label;
    markTabs(tab);
    const onHome = tab === "home";
    board.hidden = !onHome;
    topic.hidden = onHome;
    document.querySelector(".board-note").hidden = !onHome;
    if (onHome) {
      board.innerHTML =
        productTile() + customersTile() + pipelineTile() + followupTile();
      topic.innerHTML = "";
    } else if (tab === "product") {
      topic.innerHTML = productScreen(item);
    } else if (tab === "customers") {
      topic.innerHTML = customersScreen(item);
    } else if (tab === "pipeline") {
      topic.innerHTML = pipelineScreen(item);
    } else {
      topic.innerHTML = followupScreen(item);
    }
    const active = topic.querySelector('[data-active="true"]');
    if (active) active.scrollIntoView({ block: "nearest" });
    else window.scrollTo(0, 0);
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
    }
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
