/* DN Today — board snapshot.
   Product figures are live as of 2026-09-13.
   Customers, pipeline, and follow-up are invented examples. */

window.DN_TODAY = {
  asOf: "2026-09-13",
  timezone: "America/New_York",
  productScope:
    "Product is still only the listing popup plus embedded School Explorer and Neighborhood Explorer.",

  product: {
    id: "product",
    title: "Product",
    dataKind: "live",
    status: "ok",
    statusLabel: "All clear",
    glance: "v269 shipped last night · QA none",
    environments: [
      {
        id: "nh-prod",
        name: "Neighborhood production",
        version: "v269",
        card: "Shipped last night · PR 125",
        note: "Shipped last night from main. PR 125.",
        tone: "ok",
      },
      {
        id: "nh-staging",
        name: "Neighborhood staging",
        version: "v753",
        card: "Same ship as production",
        note: "Same Explorer chip scroll, Data Shown, and narrow footer that went to production.",
        tone: "ok",
      },
      {
        id: "schools-prod",
        name: "Schools production",
        version: "v270",
        card: "Not in last night’s Neighborhood ship",
        note: "Not in last night’s Neighborhood ship. Holding steady.",
        tone: "ok",
      },
    ],
    qa: {
      id: "qa",
      action: "none",
      detail:
        "Overnight QA Action: none. Log noise and a Walk & Bike watch only. No new buyer breakage.",
      tone: "ok",
    },
    lastShip: {
      id: "last-ship",
      summary: "Chip scroll + admin Data Shown + narrow embed footer",
      detail:
        "PR 125 merged to main and shipped to Neighborhood production as v269. Buyers get chip arrows and grab-to-scroll when tabs overflow, admin Data Shown boxes that match the real tabs, and a visible narrow-embed footer (provided-by, Terms, Privacy, Data sources).",
    },
  },

  customers: {
    id: "customers",
    title: "Customers",
    dataKind: "example",
    status: "alert",
    statusLabel: "Needs a look",
    glance: "1 buyer stuck · 3 snippet / partner issues",
    regions: [
      { id: "se", label: "Southeast", short: "SE", count: 54 },
      { id: "ne", label: "Northeast", short: "NE", count: 29 },
    ],
    problems: [
      {
        id: "realtcandy-leftover",
        tone: "watch",
        title: "RealtyCandy leftover branding",
        who: "Example Partner — Candy Lane",
        detail:
          "Three Example-named realtor dashboards still show leftover RealtyCandy partner chrome after the leftover-branding fix. Partner leftovers, not a live account list.",
      },
      {
        id: "west-snippet",
        tone: "watch",
        title: "Snippet on an old embed key",
        who: "Example Realty — West",
        detail:
          "Listing template still loads a retired snippet key. School Explorer may appear; Neighborhood Explorer popup may miss the paid panel.",
      },
      {
        id: "piedmont-snippet",
        tone: "watch",
        title: "School Explorer snippet missing",
        who: "Example Homes — Piedmont",
        detail:
          "Sold listing layout kept the Neighborhood Explorer embed and dropped the School Explorer snippet on the new template.",
      },
    ],
    stuck: {
      id: "maple-stuck",
      tone: "alert",
      title: "Buyer stuck on the popup",
      who: "Example Buyer — Maple",
      detail:
        "Popup opened on a Maple Street example listing and never reached the Neighborhood Explorer embed. Buyer saw the first screen only.",
    },
  },

  pipeline: {
    id: "pipeline",
    title: "Pipeline",
    dataKind: "example",
    status: "watch",
    statusLabel: "Needs a look",
    glance: "28 emailed · 1 booked",
    funnel: [
      { id: "emailed", label: "Emailed", count: 28 },
      {
        id: "video",
        label: "Video sent",
        count: 19,
        split: { generic: 12, personalized: 7 },
      },
      { id: "opened", label: "Opened", count: 11 },
      { id: "replied", label: "Replied", count: 4 },
      { id: "booked", label: "Booked", count: 1 },
    ],
    rows: [
      {
        id: "west-video",
        who: "Example Realty — West",
        video: "Neighborhood Explorer on your listings in 30 seconds",
        kind: "personalized",
        stages: ["emailed", "video", "opened"],
      },
      {
        id: "lakeside-video",
        who: "Example Homes — Lakeside",
        video: "What School Explorer shows a buyer",
        kind: "generic",
        stages: ["emailed", "video"],
      },
      {
        id: "harbor-video",
        who: "Example Group — Harbor",
        video: "Why the snippet belongs on every listing",
        kind: "personalized",
        stages: ["emailed", "video", "opened", "replied"],
      },
      {
        id: "oak-video",
        who: "Example Realty — Oak",
        video: "School Explorer + Neighborhood Explorer, side by side",
        kind: "generic",
        stages: ["emailed"],
      },
      {
        id: "ridge-video",
        who: "Example Partners — Ridge",
        video: "A 90-second walk through the listing popup",
        kind: "personalized",
        stages: ["emailed", "video", "opened", "replied", "booked"],
      },
    ],
  },

  followup: {
    id: "followup",
    title: "Follow-up",
    dataKind: "example",
    status: "watch",
    statusLabel: "Needs a look",
    glance: "4 due today · Myles on calls",
    items: [
      {
        id: "fu-west",
        action: "Call Example Realty — West about the leftover snippet",
        owner: "Myles",
        ownerRole: "Marketing — makes the calls",
        due: "Today",
        dueKind: "today",
        tone: "alert",
      },
      {
        id: "fu-harbor",
        action: "Call Example Group — Harbor after they watched the video",
        owner: "Myles",
        ownerRole: "Marketing — makes the calls",
        due: "Today",
        dueKind: "today",
        tone: "watch",
      },
      {
        id: "fu-smoke",
        action: "Confirm Neighborhood production v269 smoke after last night’s ship",
        owner: "Bill",
        ownerRole: "Runs the company",
        due: "Today",
        dueKind: "today",
        tone: "watch",
      },
      {
        id: "fu-maple",
        action: "Check Example Buyer — Maple stuck on the popup",
        owner: "Dream Neighborhood",
        ownerRole: "Product / support",
        due: "Today",
        dueKind: "today",
        tone: "alert",
      },
      {
        id: "fu-piedmont",
        action: "Record a personalized video for Example Homes — Piedmont",
        owner: "Dream Neighborhood",
        ownerRole: "Product / support",
        due: "Mon, Sep 15",
        dueKind: "soon",
        tone: "ok",
      },
    ],
  },
};
