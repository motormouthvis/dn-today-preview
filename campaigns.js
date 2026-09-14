/* Campaign proposals + fake run state. Browser-only. No mailbox. */

(function (root) {
  const STAGES = [
    { id: "list-ready", label: "List ready" },
    { id: "sending", label: "Sending" },
    { id: "tracking", label: "Tracking" },
    { id: "call-queue", label: "Call queue" },
  ];

  function cloneCampaign(row) {
    return {
      ...row,
      variants: (row.variants || []).map((variant) => ({ ...variant })),
      rates: row.rates ? { ...row.rates } : null,
      history: (row.history || []).map((entry) => ({ ...entry })),
    };
  }

  function seed(items) {
    return (items || []).map(cloneCampaign);
  }

  function findCampaign(rows, id) {
    return (rows || []).find((row) => row.id === id) || null;
  }

  function isOpen(row) {
    return ["list-ready", "sending", "tracking", "call-queue"].includes(row.status);
  }

  function isProposed(row) {
    return row.status === "proposed";
  }

  function stamp(text) {
    return { at: new Date().toISOString(), text };
  }

  function approve(row) {
    if (!row) return null;
    const next = cloneCampaign(row);
    if (next.status === "snoozed") next.status = "proposed";
    if (isOpen(next)) return next;
    next.status = "list-ready";
    next.progress = 0;
    next.startedAt = next.startedAt || new Date().toISOString();
    next.history = [...next.history, stamp("OK — list ready (mock)")];
    return next;
  }

  function snooze(row) {
    if (!row) return null;
    const next = cloneCampaign(row);
    if (isOpen(next)) return next;
    next.status = "snoozed";
    next.history = [...next.history, stamp("Not now")];
    return next;
  }

  function restore(row) {
    if (!row) return null;
    const next = cloneCampaign(row);
    if (next.status === "snoozed") {
      next.status = "proposed";
      next.history = [...next.history, stamp("Brought back")];
    }
    return next;
  }

  function edit(row, fields) {
    if (!row) return null;
    const next = cloneCampaign(row);
    const who = String(fields?.who || "").trim();
    const why = String(fields?.why || "").trim();
    if (who) next.who = who;
    if (why) next.why = why;
    next.history = [...next.history, stamp("Plan edited")];
    return next;
  }

  function fakeRates(row) {
    const rates = {};
    (row.variants || []).forEach((variant, index) => {
      rates[variant.id] = `${[4.2, 2.1, 0.8][index] ?? 1.5}%`;
    });
    return rates;
  }

  function tick(row) {
    if (!row) return null;
    const next = cloneCampaign(row);
    if (next.status === "list-ready") {
      next.status = "sending";
      next.progress = 15;
      next.history = [...next.history, stamp("Sending (mock — nothing left the phone)")];
      return next;
    }
    if (next.status === "sending") {
      next.progress = Math.min(100, (next.progress || 0) + 25);
      if (next.progress >= 100) {
        next.status = "tracking";
        next.progress = 20;
        next.rates = fakeRates(next);
        next.history = [...next.history, stamp("Tracking response rates (mock)")];
      }
      return next;
    }
    if (next.status === "tracking") {
      next.progress = Math.min(100, (next.progress || 0) + 40);
      if (next.progress >= 100) {
        next.status = "call-queue";
        next.progress = 100;
        next.queueSize = next.callQueueEstimate;
        next.history = [
          ...next.history,
          stamp(
            `Call queue ready — ${next.callQueueEstimate} (replies first, then non-replies)`
          ),
        ];
      }
      return next;
    }
    return next;
  }

  function needsTick(row) {
    return !!(row && ["list-ready", "sending", "tracking"].includes(row.status));
  }

  function stageIndex(status) {
    return STAGES.findIndex((stage) => stage.id === status);
  }

  function openCount(rows) {
    return (rows || []).filter(isOpen).length;
  }

  function proposedCount(rows) {
    return (rows || []).filter(isProposed).length;
  }

  function callQueueTotal(rows) {
    return (rows || []).reduce((sum, row) => {
      if (row.status === "call-queue") {
        return sum + (Number(row.queueSize || row.callQueueEstimate) || 0);
      }
      return sum;
    }, 0);
  }

  function buildAnalysis({ campaigns, lists, product, listsApi }) {
    const rows = campaigns || [];
    const open = rows.filter(isOpen);
    const proposed = rows.filter(isProposed);
    const queue = callQueueTotal(rows);
    const listLines = (lists || []).map((list) => {
      const n = listsApi.counts(list.members);
      return `${list.name}: ${n.total} people`;
    });

    const where = [
      `Neighborhood production ${product.production.version} is live. Staging ${product.staging.version} matches it. Schools ${product.schools.version} is unchanged.`,
      open.length
        ? `${open.length === 1 ? "1 campaign is" : `${open.length} campaigns are`} running in this browser: ${open
            .map((row) => row.title)
            .join(", ")}.`
        : proposed.length
          ? `No campaigns are running yet. ${proposed.length} ${
              proposed.length === 1 ? "proposal is" : "proposals are"
            } waiting for your OK.`
          : "No campaigns are running, and nothing is waiting for an OK.",
      `Lists on file: ${listLines.join("; ")}.`,
      queue
        ? `Call queue: about ${queue} people (replies first, then non-replies). The phone is still human — this screen only lines them up.`
        : "Call queue is empty until a campaign finishes tracking.",
    ];

    const listWork = (lists || []).map((list) => {
      const n = listsApi.counts(list.members);
      return `${list.name}: ${n.videos} videos sent, ${n.followups} follow-ups, ${n.responded} replies.`;
    });
    const campWork = rows
      .filter((row) => row.history && row.history.length)
      .map((row) => `${row.title}: ${row.history[row.history.length - 1].text}.`);
    const done = [
      ...listWork,
      ...(campWork.length ? campWork : ["No campaign has been OK’d yet in this browser."]),
      "Nothing has been emailed. This mock never sends.",
    ];

    const next = [];
    rows.forEach((row) => {
      if (row.status === "proposed" || row.status === "snoozed") {
        next.push({
          id: row.id,
          title: row.title,
          why: row.why,
          action: "ok",
          label: "OK — run this",
        });
      } else if (row.status === "call-queue") {
        next.push({
          id: row.id,
          title: `Next plan after ${row.title}`,
          why: row.planAfter,
          action: "open",
          label: "Open on Campaigns",
        });
      }
    });
    if (next.length < 2) {
      next.push({
        id: "schools-upgrade",
        title: "School Explorer upgrade wave",
        why: "Six example offices on the free School Explorer list. Send the standard upgrade video, then queue calls on replies.",
        action: "lists",
        label: "Open that list",
      });
    }

    return { where, done, next: next.slice(0, 4) };
  }

  root.DNCampaigns = {
    STAGES,
    cloneCampaign,
    seed,
    findCampaign,
    isOpen,
    isProposed,
    approve,
    snooze,
    restore,
    edit,
    tick,
    needsTick,
    stageIndex,
    openCount,
    proposedCount,
    callQueueTotal,
    buildAnalysis,
  };
})(typeof window !== "undefined" ? window : globalThis);
