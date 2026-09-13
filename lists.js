/* Lists + opportunity counts. Browser-only example state. No mailbox. */

(function (root) {
  const FILTERS = {
    total: { id: "total", label: "Total", test: () => true },
    videos: { id: "videos", label: "Videos sent", test: (m) => !!m.videoSent },
    followups: { id: "followups", label: "Follow-ups sent", test: (m) => !!m.followupSent },
    responded: { id: "responded", label: "Responded", test: (m) => !!m.responded },
    a: { id: "a", label: "A", test: (m) => m.grade === "A" },
    b: { id: "b", label: "B", test: (m) => m.grade === "B" },
    c: { id: "c", label: "C", test: (m) => m.grade === "C" },
  };

  function cloneList(list) {
    return {
      ...list,
      members: (list.members || []).map((member) => ({ ...member })),
    };
  }

  function counts(members) {
    const list = members || [];
    return {
      total: list.length,
      videos: list.filter((member) => member.videoSent).length,
      followups: list.filter((member) => member.followupSent).length,
      responded: list.filter((member) => member.responded).length,
      a: list.filter((member) => member.grade === "A").length,
      b: list.filter((member) => member.grade === "B").length,
      c: list.filter((member) => member.grade === "C").length,
    };
  }

  function filterMembers(members, filterId) {
    const spec = FILTERS[filterId] || FILTERS.total;
    return (members || []).filter(spec.test);
  }

  function emptyMember(id) {
    return {
      id,
      videoSent: false,
      followupSent: false,
      responded: false,
      grade: "C",
      assignee: "",
    };
  }

  function addMembers(list, ids) {
    const next = cloneList(list);
    const have = new Set(next.members.map((member) => member.id));
    (ids || []).forEach((id) => {
      if (!id || have.has(id)) return;
      next.members.push(emptyMember(id));
      have.add(id);
    });
    return next;
  }

  function assignMembers(list, ids, assignee) {
    const set = new Set(ids || []);
    return {
      ...list,
      members: (list.members || []).map((member) =>
        set.has(member.id) ? { ...member, assignee: assignee || "" } : { ...member }
      ),
    };
  }

  function andJoin(names) {
    const clean = (names || []).filter(Boolean);
    if (!clean.length) return "the selected people";
    if (clean.length === 1) return clean[0];
    if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
    return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
  }

  function draftReply(names) {
    const who = andJoin(names);
    return [
      `Thanks for writing back — this note is for ${who}.`,
      "",
      "Happy to walk you through Neighborhood Explorer on a listing and how it sits next to School Explorer.",
      "",
      "Example draft — does not send.",
    ].join("\n");
  }

  function respondedUnassigned(lists) {
    return (lists || []).some((list) =>
      (list.members || []).some((member) => member.responded && !member.assignee)
    );
  }

  function repliedCount(lists) {
    const ids = new Set();
    (lists || []).forEach((list) => {
      (list.members || []).forEach((member) => {
        if (member.responded) ids.add(member.id);
      });
    });
    return ids.size;
  }

  function findList(lists, id) {
    return (lists || []).find((list) => list.id === id) || (lists || [])[0] || null;
  }

  root.DNLists = {
    FILTERS,
    counts,
    filterMembers,
    emptyMember,
    addMembers,
    assignMembers,
    draftReply,
    andJoin,
    respondedUnassigned,
    repliedCount,
    findList,
    cloneList,
  };
})(typeof window !== "undefined" ? window : globalThis);
