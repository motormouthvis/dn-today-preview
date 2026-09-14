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
  const api = window.DNCustomers;
  const listsApi = window.DNLists;
  const campaignsApi = window.DNCampaigns;
  const TABS = ["home", "opportunities", "lists", "customers", "product", "campaigns"];
  const FILTERS = ["total", "videos", "followups", "responded", "a", "b", "c"];
  const peopleKey = "dn-today-customers-v3";
  const listsKey = "dn-today-lists-v3";
  const campaignsKey = "dn-today-campaigns-v1";
  let lastFocus = null;
  let importPlan = null;
  let importTarget = "customers";
  let recap = null;
  let selectedIds = new Set();
  let lastDraft = "";
  let keepScroll = false;
  const progressTimers = {};

  function seedCustomers() {
    return data.customers.directory.map((row) => ({
      ...row,
      meetings: (row.meetings || []).map((meeting) => ({ ...meeting })),
      thread: (row.thread || []).map((entry) => ({ ...entry })),
    }));
  }

  function seedLists() {
    return data.lists.items.map((list) => listsApi.cloneList(list));
  }

  function seedCampaigns() {
    return campaignsApi.seed(data.campaigns.items);
  }

  function loadCustomers() {
    try {
      const raw = localStorage.getItem(peopleKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (_err) {
      /* demo storage only */
    }
    return seedCustomers();
  }

  function loadLists() {
    try {
      const raw = localStorage.getItem(listsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length && parsed[0].members) return parsed;
      }
    } catch (_err) {
      /* demo storage only */
    }
    return seedLists();
  }

  function saveCustomers(rows) {
    localStorage.setItem(peopleKey, JSON.stringify(rows));
  }

  function saveLists(rows) {
    localStorage.setItem(listsKey, JSON.stringify(rows));
  }

  function loadCampaigns() {
    try {
      const raw = localStorage.getItem(campaignsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length && parsed[0].variants) return parsed;
      }
    } catch (_err) {
      /* demo storage only */
    }
    return seedCampaigns();
  }

  function saveCampaigns(rows) {
    localStorage.setItem(campaignsKey, JSON.stringify(rows));
  }

  let customers = loadCustomers();
  let lists = loadLists();
  let campaigns = loadCampaigns();

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

  function personById(id) {
    return customers.find((row) => row.id === id);
  }

  function personName(id) {
    return personById(id)?.name || "Unknown example";
  }

  function fmt(n) {
    return new Intl.NumberFormat("en-US").format(Number(n) || 0);
  }

  function nyWhen(iso) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: data.timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(iso));
  }

  function partnerName(id) {
    return data.views.partners.find((item) => item.id === id)?.name || "Example in-house";
  }

  function totalViews() {
    return customers.reduce((sum, row) => sum + (Number(row.views) || 0), 0);
  }

  function partnerViews() {
    return data.views.partners.map((partner) => ({
      ...partner,
      views: customers
        .filter((row) => (row.partner || "inhouse") === partner.id)
        .reduce((sum, row) => sum + (Number(row.views) || 0), 0),
    }));
  }

  function nextMeeting(row) {
    return (row.meetings || [])[0] || null;
  }

  function addThread(id, type, text, who) {
    const entry = {
      id: `note-${Date.now()}`,
      type,
      at: new Date().toISOString(),
      who: who || "You",
      text,
    };
    customers = customers.map((row) =>
      row.id === id ? { ...row, thread: [entry, ...(row.thread || [])] } : row
    );
    saveCustomers(customers);
    recap = type === "call" ? "Called — not a real phone yet." : "Note added.";
  }

  function badge(kind) {
    if (kind === "live") {
      return '<span class="badge" data-kind="live">Live</span>';
    }
    return '<span class="badge">Example data</span>';
  }

  function banner(text) {
    return `<p class="banner">${text || "Example data — not live accounts"}</p>`;
  }

  function recapHtml() {
    if (!recap) return "";
    if (typeof recap === "string") return `<p class="recap">${recap}</p>`;
    return `<p class="recap">Added ${recap.added}, updated ${recap.updated}, skipped ${recap.skipped}, duplicates merged ${recap.merged}.</p>`;
  }

  function route() {
    const raw = location.hash.replace(/^#/, "").trim();
    const parts = raw.split("/").filter(Boolean);
    const aliases = {
      today: "home",
      followup: "opportunities",
      "follow-up": "opportunities",
      pipeline: "opportunities",
      camp: "campaigns",
      campaign: "campaigns",
    };
    const tabRaw = aliases[parts[0]] || parts[0] || "home";
    const tab = TABS.includes(tabRaw) ? tabRaw : "home";
    if (tab === "opportunities") {
      let listId = lists.some((list) => list.id === parts[1]) ? parts[1] : "";
      let item = "";
      if (listId) {
        item = FILTERS.includes(parts[2]) ? parts[2] : "";
      } else if (FILTERS.includes(parts[1])) {
        listId = lists[0]?.id || "";
        item = parts[1];
      } else {
        listId = lists[0]?.id || "";
      }
      return { tab, listId, item };
    }
    if (tab === "lists") {
      const listId = lists.some((list) => list.id === parts[1]) ? parts[1] : "";
      return { tab, listId, item: listId ? "detail" : "" };
    }
    if (tab === "customers") {
      const customerId = customers.some((row) => row.id === parts[1]) ? parts[1] : "";
      return { tab, listId: "", item: customerId };
    }
    if (tab === "campaigns") {
      const campaignId = campaigns.some((row) => row.id === parts[1]) ? parts[1] : "";
      return { tab, listId: "", item: campaignId };
    }
    return { tab, listId: "", item: parts[1] || "" };
  }

  function hashFor(tab, listId, item) {
    if (tab === "home") return "#home";
    if (tab === "opportunities" && listId && item && item !== "detail") {
      return `#opportunities/${listId}/${item}`;
    }
    if (tab === "opportunities" && listId) return `#opportunities/${listId}`;
    if (tab === "opportunities") return "#opportunities";
    if (tab === "lists" && listId) return `#lists/${listId}`;
    if (tab === "lists") return "#lists";
    if (tab === "customers") return item ? `#customers/${item}` : "#customers";
    if (tab === "product") return item ? `#product/${item}` : "#product";
    if (tab === "campaigns") return item ? `#campaigns/${item}` : "#campaigns";
    return "#home";
  }

  function topicHead(title, kind, glance, extra) {
    return `
      <div class="topic-head">
        <div>
          <h2>${title}</h2>
          ${glance ? `<p class="lede">${glance}</p>` : ""}
        </div>
        ${badge(kind)}
      </div>
      ${extra || ""}`;
  }

  function homeTile(tab, title, kind, number, label, lede, hero) {
    return `
      <a class="tile ${hero ? "tile--hero" : ""}" href="#${tab}">
        <p class="tile__kicker">${title} ${badge(kind)}</p>
        <p class="tile__number">${number}</p>
        <p class="tile__label">${label}</p>
        <p class="tile__lede">${lede}</p>
      </a>`;
  }

  function viewsPanel(opts) {
    const selected = opts.selected;
    const number = selected ? selected.views || 0 : totalViews();
    const label = selected ? "Views for this customer" : "Total views";
    const partnerRows = partnerViews()
      .map(
        (partner) => `
        <a class="row" href="#customers">
          <span>
            <p class="row__label">${partner.name}</p>
            <p class="row__meta">Example partner</p>
          </span>
          <p class="row__value">${fmt(partner.views)}</p>
        </a>`
      )
      .join("");
    return `
      <section class="views ${opts.hero ? "views--hero" : ""}">
        ${banner("Example data — not live views")}
        <p class="kicker">Views</p>
        <p class="tile__number">${fmt(number)}</p>
        <p class="tile__label">${label}</p>
        ${
          selected
            ? `<p class="hint">Partner: ${partnerName(selected.partner)}</p>`
            : `<div class="partners">${partnerRows}</div>`
        }
      </section>`;
  }

  function analyzeButton() {
    return `
      <button type="button" class="analyze-btn" data-analyze>
        Complete analysis
      </button>`;
  }

  function homeScreen() {
    const replied = listsApi.repliedCount(lists);
    const p = data.product;
    const waiting = campaignsApi.proposedCount(campaigns);
    const running = campaignsApi.openCount(campaigns);
    const campNum = waiting || running;
    const campLabel = waiting
      ? waiting === 1
        ? "waiting for OK"
        : "waiting for OK"
      : running === 1
        ? "running (mock)"
        : "running (mock)";
    return [
      analyzeButton(),
      viewsPanel({ hero: true }),
      homeTile(
        "campaigns",
        "Campaigns",
        "example",
        campNum,
        campLabel,
        "DNAi proposes. You say OK. Machine does the rest except calls.",
        true
      ),
      homeTile(
        "opportunities",
        "Opportunities",
        "example",
        replied,
        replied === 1 ? "person replied" : "people replied",
        "Tap to talk. Pick a list, then a number."
      ),
      homeTile(
        "lists",
        "Lists",
        "example",
        lists.length,
        "example lists",
        "LocalLogic, IDX, and School Explorer upgrade."
      ),
      homeTile(
        "customers",
        "Customers",
        "example",
        customers.length,
        customers.length === 1 ? "person" : "people",
        "Everyone we know. Import and dedupe here."
      ),
      homeTile(
        "product",
        "Product",
        "live",
        p.production.version,
        "Neighborhood production",
        `Staging ${p.staging.version} matches · Schools ${p.schools.version}`
      ),
    ].join("");
  }

  function listPicker(currentId, filter) {
    const options = lists
      .map(
        (list) =>
          `<option value="${list.id}" ${list.id === currentId ? "selected" : ""}>${list.name}</option>`
      )
      .join("");
    return `
      <label class="picker">
        <span>Which list?</span>
        <select data-list-picker data-filter="${filter || ""}">${options}</select>
      </label>`;
  }

  function countCard(listId, key, value, label, note) {
    return `
      <a class="count" href="${hashFor("opportunities", listId, key)}">
        <b>${value}</b>
        <span>${label}</span>
        ${note ? `<small>${note}</small>` : ""}
      </a>`;
  }

  function opportunitiesCounts(list) {
    const n = listsApi.counts(list.members);
    return `
      ${topicHead("Opportunities", "example", "Pick a list. Tap a number.")}
      ${banner()}
      ${listPicker(list.id, "")}
      <div class="counts">
        ${countCard(list.id, "total", n.total, "Total")}
        ${countCard(list.id, "videos", n.videos, "Videos sent", `HeyGen: “${list.video}”`)}
        ${countCard(list.id, "followups", n.followups, "Follow-ups sent")}
        ${countCard(list.id, "responded", n.responded, "Responded")}
      </div>
      <div class="counts counts--abc">
        ${countCard(list.id, "a", n.a, "A", data.grades.A)}
        ${countCard(list.id, "b", n.b, "B", data.grades.B)}
        ${countCard(list.id, "c", n.c, "C", data.grades.C)}
      </div>`;
  }

  function memberMeta(member) {
    const bits = [];
    if (member.responded) bits.push("Replied");
    if (member.videoSent) bits.push("Video sent");
    if (member.followupSent) bits.push("Follow-up sent");
    bits.push(`${member.grade} · ${data.grades[member.grade] || ""}`);
    if (member.assignee) {
      const who = data.assignees.find((item) => item.id === member.assignee);
      bits.push(who ? who.name : member.assignee);
    }
    return bits.filter(Boolean).join(" · ");
  }

  function opportunitiesDrill(list, filter) {
    const spec = listsApi.FILTERS[filter] || listsApi.FILTERS.total;
    const members = listsApi.filterMembers(list.members, filter);
    const isReply = filter === "responded";
    const videoNote =
      filter === "videos"
        ? `<p class="video-note">Standard HeyGen video: “${list.video}”</p>`
        : "";
    const rows = members
      .map((member) => {
        const person = personById(member.id);
        if (isReply) {
          const checked = selectedIds.has(member.id) ? "checked" : "";
          return `
            <label class="person">
              <input type="checkbox" data-pick="${member.id}" ${checked} />
              <span>
                <strong>${personName(member.id)}</strong>
                <small>${memberMeta(member)}</small>
              </span>
            </label>`;
        }
        return `
          <button class="row" type="button" data-customer="${member.id}">
            <span>
              <p class="row__label">${personName(member.id)}</p>
              <p class="row__meta">${memberMeta(member)}${person?.email ? ` · ${person.email}` : ""}</p>
            </span>
          </button>`;
      })
      .join("");
    const empty = members.length
      ? ""
      : `<p class="empty">Nobody in this number on this list.</p>`;
    const selectAll = isReply
      ? `
        <div class="select-all">
          <label>
            <input type="checkbox" data-select-all ${
              members.length && members.every((m) => selectedIds.has(m.id)) ? "checked" : ""
            } />
            Select all ${members.length}
          </label>
        </div>`
      : "";
    const actions = isReply
      ? `
        <div class="actions">
          <button type="button" class="btn" data-draft>Draft reply for selected</button>
          <button type="button" class="btn btn--ghost" data-assign>Assign to human</button>
        </div>`
      : "";
    return `
      ${topicHead(spec.label, "example", `${members.length} on ${list.name}`)}
      ${banner()}
      <a class="back" href="${hashFor("opportunities", list.id)}">Back to counts</a>
      ${listPicker(list.id, filter)}
      ${videoNote}
      ${recapHtml()}
      ${selectAll}
      <div class="people">${rows}${empty}</div>
      ${
        isReply
          ? `<p class="hint">One example draft for everyone you check. It does not send.</p>`
          : ""
      }
      ${actions}`;
  }

  function listsIndex() {
    const cards = lists
      .map((list) => {
        const n = listsApi.counts(list.members);
        return `
          <a class="tile" href="${hashFor("lists", list.id)}">
            <p class="tile__kicker">${badge("example")}</p>
            <p class="tile__label">${list.name}</p>
            <p class="tile__number">${n.total}</p>
            <p class="tile__lede">HeyGen: “${list.video}”</p>
          </a>`;
      })
      .join("");
    const potentials = customers
      .map((row) => {
        const meeting = nextMeeting(row);
        return `
          <button class="row" type="button" data-customer="${row.id}">
            <span>
              <p class="row__label">${row.name}</p>
              <p class="row__meta">${
                meeting
                  ? `${nyWhen(meeting.at)} · ${meeting.who}`
                  : "No meeting scheduled"
              }</p>
            </span>
            <p class="row__value">${fmt(row.views || 0)} views</p>
          </button>`;
      })
      .join("");
    return `
      ${topicHead("Lists", "example", "Groups you can talk to. The tool can hold more later.")}
      ${banner()}
      <p class="hint">Each list has one standard HeyGen video. Import into a list. Tap a list to open it.</p>
      <div class="list-cards">${cards}</div>
      <section class="thread-box">
        <h3>Potential customers</h3>
        <p class="hint">Meetings and a notes thread for every interaction. Tap a person.</p>
        <div class="people">${potentials}</div>
      </section>`;
  }

  function listDetail(list) {
    const rows = list.members
      .map((member) => {
        const person = personById(member.id);
        return `
          <button class="row" type="button" data-customer="${member.id}">
            <span>
              <p class="row__label">${personName(member.id)}</p>
              <p class="row__meta">${memberMeta(member)}${person?.phone ? ` · ${person.phone}` : ""}</p>
            </span>
          </button>`;
      })
      .join("");
    return `
      ${topicHead(list.name, "example", list.blurb)}
      ${banner()}
      <a class="back" href="#lists">Back to lists</a>
      <p class="video-note">Standard HeyGen video: “${list.video}”</p>
      ${recapHtml()}
      <div class="import-bar">
        <button type="button" class="btn" data-sample-import data-import-into="${list.id}">Try sample import</button>
        <label class="btn btn--ghost">
          Import CSV
          <input id="csv-file" type="file" accept=".csv,text/csv" hidden data-import-into="${list.id}" />
        </label>
        <a class="btn btn--ghost" href="${hashFor("opportunities", list.id)}">Talk to this list</a>
      </div>
      <p class="hint">Columns: name, email, website, phone, notes. Match on email first, then website host. Review before anything is written.</p>
      <div class="people">${rows}</div>`;
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
    return `
      ${topicHead("Customers", "example", `${customers.length} example records · everyone we know`)}
      ${banner()}
      ${viewsPanel({})}
      ${recapHtml()}
      <div class="import-bar">
        <button type="button" class="btn" data-sample-import data-import-into="customers">Try sample import</button>
        <label class="btn btn--ghost">
          Import CSV
          <input id="csv-file" type="file" accept=".csv,text/csv" hidden data-import-into="customers" />
        </label>
        <button type="button" class="btn btn--ghost" data-reset>Reset example data</button>
      </div>
      <p class="hint">Dedupe across all people. Email first, then website host. Same person is an Update, not a second card. Tap a person for views, meetings, and notes.</p>
      <div class="people">${customerRows()}</div>`;
  }

  function productScreen() {
    const p = data.product;
    const stagingPrs = (p.staging.prs || []).length
      ? p.staging.prs
          .map((pr) => `<p>${pr.title || pr}</p>`)
          .join("")
      : `<p class="empty">${p.staging.empty}</p>`;
    const releases = p.production.releases
      .map(
        (rel) => `
        <details class="release">
          <summary>
            ${rel.version}
            <span>${rel.when}</span>
          </summary>
          <p>${rel.changes}</p>
        </details>`
      )
      .join("");
    return `
      ${topicHead("Product", "live", p.glance)}
      <p class="hint">${data.productScope} Live numbers as of ${data.asOf}.</p>
      <div class="product-cols">
        <section class="detail" data-item="${p.staging.id}">
          <p class="kicker">Staging</p>
          <p class="detail__number">${p.staging.version}</p>
          <h3>Staging</h3>
          <p>${p.staging.note}</p>
          <h4>PRs on staging, not production</h4>
          ${stagingPrs}
          <p class="hint">${p.staging.gitNote}</p>
        </section>
        <section class="detail" data-item="${p.production.id}">
          <p class="kicker">Live</p>
          <p class="detail__number">${p.production.version}</p>
          <h3>Production</h3>
          <p>${p.production.note}</p>
          ${releases}
        </section>
      </div>
      <p class="hint">${p.schools.note}</p>`;
  }

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function statusStrip(row) {
    const idx = campaignsApi.stageIndex(row.status);
    const steps = campaignsApi.STAGES.map((stage, index) => {
      const on = idx >= 0 && index <= idx;
      const current = stage.id === row.status;
      let label = stage.label;
      if (current && (row.status === "sending" || row.status === "tracking") && row.progress) {
        label = `${stage.label} ${row.progress}%`;
      }
      if (current && row.status === "call-queue") {
        label = `Call queue · ${fmt(row.queueSize || row.callQueueEstimate)}`;
      }
      return `<span class="step${on ? " is-on" : ""}${current ? " is-now" : ""}">${label}</span>`;
    }).join("");
    const width =
      row.status === "call-queue" ? 100 : row.status === "list-ready" ? 8 : row.progress || 0;
    return `
      <div class="status-strip" data-stage="${row.status}">
        ${steps}
      </div>
      <div class="bar" aria-hidden="true"><i style="width:${width}%"></i></div>`;
  }

  function campaignCard(row, active) {
    if (row.status === "snoozed") {
      return `
        <article class="campaign campaign--parked" id="camp-${row.id}">
          <p>${esc(row.title)} — not now</p>
          <button type="button" class="btn btn--ghost" data-restore-campaign="${row.id}">Bring back</button>
        </article>`;
    }
    const variants = (row.variants || [])
      .map((variant) => `<li><b>${fmt(variant.count)}</b> ${esc(variant.name)}</li>`)
      .join("");
    const rates = row.rates
      ? `<p class="hint">Mock rates: ${(row.variants || [])
          .map((variant) => `${esc(variant.name)} ${row.rates[variant.id] || "—"}`)
          .join(" · ")}</p>`
      : "";
    const running = campaignsApi.isOpen(row);
    const strip = running ? statusStrip(row) : "";
    const actions = running
      ? ""
      : `
        <div class="actions">
          <button type="button" class="btn" data-ok-campaign="${row.id}">OK — run</button>
          <button type="button" class="btn btn--ghost" data-edit-campaign="${row.id}">Edit</button>
          <button type="button" class="btn btn--ghost" data-snooze-campaign="${row.id}">Not now</button>
        </div>`;
    const hero = row.id === "locallogic-base" && row.status === "proposed" ? " campaign--hero" : "";
    return `
      <article class="campaign${hero}${active ? " campaign--active" : ""}" id="camp-${row.id}" data-active="${
        active ? "true" : "false"
      }">
        ${badge("example")}
        <h3>${esc(row.title)}</h3>
        <p><strong>Who.</strong> ${esc(row.who)}</p>
        <p><strong>Why.</strong> ${esc(row.why)}</p>
        <p><strong>Counts.</strong> ${fmt(row.audience)} people</p>
        <p><strong>Variants.</strong></p>
        <ul>${variants}</ul>
        <p class="video-note">Standard HeyGen video: “${esc(row.video)}”</p>
        <p><strong>Success metric.</strong> ${esc(row.successMetric)}</p>
        <p><strong>Call queue.</strong> about ${fmt(row.callQueueEstimate)} — ${esc(row.callQueueNote)}</p>
        <p class="hint">Sends when wired — mock only</p>
        ${strip}
        ${rates}
        ${actions}
      </article>`;
  }

  function campaignsScreen(focusId) {
    const cards = campaigns.map((row) => campaignCard(row, row.id === focusId)).join("");
    return `
      ${topicHead("Campaigns", "example", data.campaigns.glance)}
      ${banner("Example data — not live AI yet")}
      ${analyzeButton()}
      <p class="hint">DNAi proposes. You say OK. The machine does everything except phone calls.</p>
      ${recapHtml()}
      <div class="campaigns">${cards}</div>`;
  }

  function analyzeHtml() {
    const analysis = campaignsApi.buildAnalysis({
      campaigns,
      lists,
      product: data.product,
      listsApi,
    });
    const where = analysis.where.map((line) => `<p>${esc(line)}</p>`).join("");
    const done = analysis.done.map((line) => `<p>${esc(line)}</p>`).join("");
    const next = analysis.next
      .map(
        (item) => `
        <section class="detail">
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.why)}</p>
          <button type="button" class="btn" data-suggest="${item.id}" data-suggest-action="${item.action}">${esc(
            item.label
          )}</button>
        </section>`
      )
      .join("");
    return `
      ${banner("Example — not live AI yet")}
      <section class="analyze-section">
        <h3>Where we are</h3>
        ${where}
      </section>
      <section class="analyze-section">
        <h3>What we’ve done</h3>
        ${done}
      </section>
      <section class="analyze-section">
        <h3>Suggested next</h3>
        ${next}
      </section>`;
  }

  function openAnalyze() {
    openDrawer("Example — not live AI yet", "Complete analysis", analyzeHtml());
    drawer.classList.add("drawer--analyze");
  }

  function startProgress(id) {
    if (progressTimers[id]) return;
    progressTimers[id] = setInterval(() => {
      const row = campaignsApi.findCampaign(campaigns, id);
      if (!row || !campaignsApi.needsTick(row)) {
        clearInterval(progressTimers[id]);
        delete progressTimers[id];
        return;
      }
      campaigns = campaigns.map((item) => (item.id === id ? campaignsApi.tick(item) : item));
      saveCampaigns(campaigns);
      keepScroll = true;
      if (route().tab === "campaigns") render();
    }, 900);
  }

  function resumeProgress() {
    campaigns.forEach((row) => {
      if (campaignsApi.needsTick(row)) startProgress(row.id);
    });
  }

  function clearProgress() {
    Object.keys(progressTimers).forEach((id) => {
      clearInterval(progressTimers[id]);
      delete progressTimers[id];
    });
  }

  function runCampaign(id) {
    const row = campaignsApi.findCampaign(campaigns, id);
    if (!row) return;
    if (row.status !== "proposed" && row.status !== "snoozed") return;
    const start = row.status === "snoozed" ? campaignsApi.restore(row) : row;
    campaigns = campaigns.map((item) => (item.id === id ? campaignsApi.approve(start) : item));
    saveCampaigns(campaigns);
    recap = "OK — running in this browser. Sends when wired — mock only.";
    startProgress(id);
  }

  function goCampaign(id, shouldRun) {
    if (shouldRun) runCampaign(id);
    const next = hashFor("campaigns", "", id);
    if (location.hash === next) {
      render();
      return;
    }
    location.hash = next;
  }

  function openEditCampaign(id) {
    const row = campaignsApi.findCampaign(campaigns, id);
    if (!row) return;
    openDrawer(
      "Example data",
      "Edit plan",
      `
      ${banner("Example — still mock only")}
      <form class="note-form" data-edit-campaign-form="${id}">
        <label class="picker"><span>Who</span><input name="who" value="${esc(row.who)}" /></label>
        <label class="picker"><span>Why</span><textarea name="why">${esc(row.why)}</textarea></label>
        <button class="btn" type="submit">Save plan</button>
      </form>`
    );
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

  function openDrawer(kicker, title, html) {
    lastFocus = document.activeElement;
    drawerKicker.textContent = kicker;
    drawerTitle.textContent = title;
    drawerBody.innerHTML = html;
    drawerRoot.hidden = false;
    document.body.style.overflow = "hidden";
    drawer.focus();
  }

  function closeDrawer() {
    drawer.classList.remove("drawer--analyze");
    drawerRoot.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function runCsv(text, target) {
    importTarget = target || "customers";
    const rows = api.parseCsv(text);
    if (!rows.length) {
      recap = { added: 0, updated: 0, skipped: 0, merged: 0 };
      render();
      return;
    }
    importPlan = api.planImport(customers, rows);
    openDrawer("Example data", "Import review", reviewHtml(importPlan));
  }

  function applyReview() {
    if (!importPlan) return;
    const choices = {};
    drawerBody.querySelectorAll('input[type="radio"]:checked').forEach((input) => {
      choices[input.name] = input.value;
    });
    const result = api.applyImport(customers, importPlan, choices);
    customers = result.customers;
    saveCustomers(customers);
    if (importTarget && importTarget !== "customers") {
      lists = lists.map((list) =>
        list.id === importTarget ? listsApi.addMembers(list, result.touched) : list
      );
      saveLists(lists);
    }
    recap = result.recap;
    importPlan = null;
    closeDrawer();
    const { tab } = route();
    if (tab !== "customers" && tab !== "lists") location.hash = "#customers";
    render();
  }

  function customerDetailScreen(row) {
    const meetings = row.meetings || [];
    const thread = row.thread || [];
    const meetingRows = meetings.length
      ? meetings
          .map(
            (meeting) => `
          <section class="note">
            <p class="note__type">Meeting</p>
            <p>${meeting.title}</p>
            <small>${nyWhen(meeting.at)} · ${meeting.who}</small>
          </section>`
          )
          .join("")
      : `<p class="empty">No meetings on the calendar.</p>`;
    const notes = thread.length
      ? thread
          .map(
            (entry) => `
          <section class="note">
            <p class="note__type">${entry.type}</p>
            <p>${entry.text}</p>
            <small>${nyWhen(entry.at)} · ${entry.who}</small>
          </section>`
          )
          .join("")
      : `<p class="empty">No notes yet.</p>`;
    return `
      ${topicHead(row.name, "example", "Potential customer")}
      ${banner()}
      <a class="back" href="#customers">Back to customers</a>
      ${recapHtml()}
      ${viewsPanel({ selected: row })}
      <section class="meetings">
        <h3>Meetings</h3>
        ${meetingRows}
      </section>
      <section class="thread-box">
        <h3>Notes</h3>
        <p class="hint">Every email, call, meeting, and video. Add a note. Call logs a note — not a real phone yet.</p>
        <form class="note-form" data-add-note="${row.id}">
          <textarea name="note" required placeholder="Add a note"></textarea>
          <label class="picker">
            <span>Type</span>
            <select name="type">
              <option value="note">Note</option>
              <option value="email">Email</option>
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
              <option value="video">Video</option>
            </select>
          </label>
          <button class="btn" type="submit">Add note</button>
        </form>
        <button type="button" class="btn btn--ghost" data-log-call="${row.id}">Call</button>
        ${notes}
      </section>
      <section class="detail">
        <p>${row.notes || "No summary."}</p>
        <p>Email: ${row.email || "—"}</p>
        <p>Website: ${row.website || "—"}</p>
        <p>Phone: ${row.phone || "—"}</p>
        <p>Region: ${row.region || "—"}</p>
        <p>Partner: ${partnerName(row.partner)}</p>
      </section>`;
  }

  function pickedMembers(list) {
    const visible = listsApi.filterMembers(list.members, "responded");
    const picked = visible.filter((member) => selectedIds.has(member.id));
    return picked.length ? picked : visible;
  }

  function openDraft(list) {
    const picked = pickedMembers(list);
    if (!picked.length) return;
    picked.forEach((member) => selectedIds.add(member.id));
    lastDraft = listsApi.draftReply(picked.map((member) => personName(member.id)));
    openDrawer(
      "Example — does not send",
      "Draft reply",
      `
      ${banner("Example — does not send")}
      <p>One draft for everyone selected. Copy it yourself. This screen does not send email.</p>
      <pre class="draft">${lastDraft}</pre>
      <button type="button" class="btn" data-copy-draft>Copy draft</button>`
    );
  }

  function openAssign(list) {
    const picked = pickedMembers(list);
    if (!picked.length) return;
    picked.forEach((member) => selectedIds.add(member.id));
    const buttons = data.assignees
      .map(
        (who) =>
          `<button type="button" class="btn ${who.id === "myles" ? "" : "btn--ghost"}" data-assign-to="${who.id}">${who.name}<small>${who.role}</small></button>`
      )
      .join("");
    openDrawer(
      "Example data",
      "Assign to human",
      `
      <p>Who should take ${picked.length === 1 ? "this person" : `these ${picked.length} people`}?</p>
      <div class="assign-list">${buttons}</div>`
    );
  }

  function applyAssign(listId, assigneeId) {
    const list = listsApi.findList(lists, listId);
    if (!list) return;
    const picked = pickedMembers(list);
    const who = data.assignees.find((item) => item.id === assigneeId);
    lists = lists.map((item) =>
      item.id === list.id
        ? listsApi.assignMembers(item, picked.map((member) => member.id), assigneeId)
        : item
    );
    saveLists(lists);
    recap = `Assigned ${picked.length} to ${who ? who.name : assigneeId}.`;
    closeDrawer();
    render();
  }

  function markTabs(active) {
    document.querySelectorAll(".tabs a").forEach((link) => {
      const id = link.getAttribute("href").replace(/^#/, "");
      if (id === active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function render() {
    const { tab, listId, item } = route();
    dateEl.dateTime = nyIso();
    dateEl.textContent = nyDate();
    const needsLook = listsApi.respondedUnassigned(lists);
    statusEl.dataset.tone = needsLook ? "watch" : "ok";
    statusEl.textContent = needsLook ? "Needs a look" : "All clear";
    markTabs(tab);
    if (tab !== "opportunities" && tab !== "campaigns" && typeof recap === "string") recap = null;
    const onHome = tab === "home";
    board.hidden = !onHome;
    topic.hidden = onHome;
    document.querySelector(".board-note").hidden = !onHome;
    if (onHome) {
      recap = null;
      selectedIds = new Set();
      board.innerHTML = homeScreen();
      topic.innerHTML = "";
    } else if (tab === "opportunities") {
      const list = listsApi.findList(lists, listId);
      if (item && FILTERS.includes(item)) {
        if (item !== "responded") selectedIds = new Set();
        topic.innerHTML = opportunitiesDrill(list, item);
      } else {
        selectedIds = new Set();
        if (typeof recap !== "string") recap = null;
        topic.innerHTML = opportunitiesCounts(list);
      }
    } else if (tab === "lists") {
      topic.innerHTML =
        item === "detail"
          ? listDetail(listsApi.findList(lists, listId))
          : listsIndex();
    } else if (tab === "customers") {
      const person = item ? personById(item) : null;
      topic.innerHTML = person ? customerDetailScreen(person) : customersScreen();
    } else if (tab === "campaigns") {
      topic.innerHTML = campaignsScreen(item);
    } else {
      topic.innerHTML = productScreen();
    }
    if (keepScroll) {
      keepScroll = false;
      return;
    }
    const active = topic.querySelector('[data-active="true"]');
    if (active) active.scrollIntoView({ block: "nearest" });
    else window.scrollTo(0, 0);
  }

  resumeProgress();
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
    if (event.target.closest("[data-reset]")) {
      customers = seedCustomers();
      lists = seedLists();
      campaigns = seedCampaigns();
      saveCustomers(customers);
      saveLists(lists);
      saveCampaigns(campaigns);
      clearProgress();
      recap = null;
      selectedIds = new Set();
      render();
      return;
    }
    if (event.target.closest("[data-analyze]")) {
      openAnalyze();
      return;
    }
    const okCamp = event.target.closest("[data-ok-campaign]");
    if (okCamp) {
      goCampaign(okCamp.getAttribute("data-ok-campaign"), true);
      return;
    }
    const editCamp = event.target.closest("[data-edit-campaign]");
    if (editCamp) {
      openEditCampaign(editCamp.getAttribute("data-edit-campaign"));
      return;
    }
    const snoozeCamp = event.target.closest("[data-snooze-campaign]");
    if (snoozeCamp) {
      const id = snoozeCamp.getAttribute("data-snooze-campaign");
      campaigns = campaigns.map((item) => (item.id === id ? campaignsApi.snooze(item) : item));
      saveCampaigns(campaigns);
      recap = "Parked for later.";
      keepScroll = true;
      render();
      return;
    }
    const restoreCamp = event.target.closest("[data-restore-campaign]");
    if (restoreCamp) {
      const id = restoreCamp.getAttribute("data-restore-campaign");
      campaigns = campaigns.map((item) => (item.id === id ? campaignsApi.restore(item) : item));
      saveCampaigns(campaigns);
      recap = "Brought back — still waiting for OK.";
      keepScroll = true;
      render();
      return;
    }
    const suggest = event.target.closest("[data-suggest]");
    if (suggest) {
      const id = suggest.getAttribute("data-suggest");
      const action = suggest.getAttribute("data-suggest-action");
      closeDrawer();
      if (action === "lists") {
        location.hash = hashFor("lists", id);
        return;
      }
      goCampaign(id, action === "ok");
      return;
    }
    const sample = event.target.closest("[data-sample-import]");
    if (sample) {
      runCsv(api.SAMPLE_CSV, sample.getAttribute("data-import-into") || "customers");
      return;
    }
    if (event.target.closest("[data-apply-import]")) {
      applyReview();
      return;
    }
    if (event.target.closest("[data-draft]")) {
      openDraft(listsApi.findList(lists, route().listId));
      return;
    }
    if (event.target.closest("[data-assign]") && !event.target.closest("[data-assign-to]")) {
      openAssign(listsApi.findList(lists, route().listId));
      return;
    }
    const assignTo = event.target.closest("[data-assign-to]");
    if (assignTo) {
      applyAssign(route().listId, assignTo.getAttribute("data-assign-to"));
      return;
    }
    if (event.target.closest("[data-copy-draft]")) {
      const text = lastDraft || drawerBody.querySelector(".draft")?.textContent || "";
      if (navigator.clipboard && text) navigator.clipboard.writeText(text);
      const btn = event.target.closest("[data-copy-draft]");
      btn.textContent = "Copied — still does not send";
      return;
    }
    const callBtn = event.target.closest("[data-log-call]");
    if (callBtn) {
      addThread(callBtn.getAttribute("data-log-call"), "call", "Called — not a real phone yet.");
      keepScroll = true;
      render();
      return;
    }
    const person = event.target.closest("[data-customer]");
    if (person) {
      location.hash = hashFor("customers", "", person.dataset.customer);
    }
  });

  document.addEventListener("submit", (event) => {
    const editForm = event.target.closest("[data-edit-campaign-form]");
    if (editForm) {
      event.preventDefault();
      const id = editForm.getAttribute("data-edit-campaign-form");
      campaigns = campaigns.map((item) =>
        item.id === id ? campaignsApi.edit(item, { who: editForm.who.value, why: editForm.why.value }) : item
      );
      saveCampaigns(campaigns);
      recap = "Plan updated — still mock only.";
      closeDrawer();
      keepScroll = true;
      render();
      return;
    }
    const form = event.target.closest("[data-add-note]");
    if (!form) return;
    event.preventDefault();
    const text = String(form.note.value || "").trim();
    if (!text) return;
    addThread(form.getAttribute("data-add-note"), form.type.value || "note", text);
    keepScroll = true;
    render();
  });

  document.addEventListener("change", (event) => {
    const picker = event.target.closest("[data-list-picker]");
    if (picker) {
      const { tab, item } = route();
      const filter = picker.getAttribute("data-filter") || item;
      location.hash = hashFor(
        tab === "lists" ? "opportunities" : tab,
        picker.value,
        filter
      );
      return;
    }
    if (event.target.hasAttribute("data-select-all")) {
      const list = listsApi.findList(lists, route().listId);
      const members = listsApi.filterMembers(list.members, "responded");
      if (event.target.checked) members.forEach((member) => selectedIds.add(member.id));
      else selectedIds = new Set();
      keepScroll = true;
      render();
      return;
    }
    if (event.target.hasAttribute("data-pick")) {
      const id = event.target.getAttribute("data-pick");
      if (event.target.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      return;
    }
    if (event.target.id === "csv-file" && event.target.files?.[0]) {
      const target = event.target.getAttribute("data-import-into") || "customers";
      event.target.files[0].text().then((text) => runCsv(text, target));
      event.target.value = "";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !drawerRoot.hidden) closeDrawer();
  });
})();
