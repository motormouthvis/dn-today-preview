(function () {
  const data = window.DN_TODAY;
  const board = document.getElementById("board");
  const dateEl = document.getElementById("board-date");
  const statusEl = document.getElementById("board-status");
  const drawerRoot = document.querySelector(".drawer-root");
  const drawer = document.getElementById("drawer");
  const drawerTitle = document.getElementById("drawer-title");
  const drawerKicker = document.getElementById("drawer-kicker");
  const drawerBody = document.getElementById("drawer-body");
  let lastFocus = null;

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

  dateEl.dateTime = nyIso();
  dateEl.textContent = nyDate();
  const boardStatus = overall();
  statusEl.dataset.tone = boardStatus.tone;
  statusEl.textContent = boardStatus.label;

  board.innerHTML =
    productTile() + customersTile() + pipelineTile() + followupTile();

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]")) {
      closeDrawer();
      return;
    }
    onOpenClick(event);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !drawerRoot.hidden) closeDrawer();
  });
})();
