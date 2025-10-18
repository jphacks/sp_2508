// homepage.js
// 直近の利用予定を描画するスクリプト
(function () {
  const STORAGE_KEY = "upcomingTrips";

  const SAMPLE_TRIPS = [
    {
      id: "t1",
      startAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 40 * 60 * 60 * 1000).toISOString(),
      from: "○○大学 正門",
      to: "イオンモール○○",
      driverName: "田中さん（理工3年）",
      status: "confirmed",
    },
    {
      id: "t2",
      startAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      from: "△△駅 東口ロータリー",
      to: "新居（△△市△△町）",
      driverName: "佐藤さん（経済4年）",
      status: "pending",
    },
    {
      id: "t3",
      startAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000).toISOString(),
      from: "○○大学 西門",
      to: "江ノ島",
      driverName: "鈴木さん（情報2年）",
      status: "confirmed",
    },
  ];

  // DOM elements will be looked up during init to avoid timing issues
  let listEl = null;
  let emptyEl = null;

  function loadTrips() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return SAMPLE_TRIPS.slice();
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return SAMPLE_TRIPS.slice();
      return arr;
    } catch (e) {
      return SAMPLE_TRIPS.slice();
    }
  }

  function formatDateRange(startAt, endAt) {
    const s = new Date(startAt);
    const e = new Date(endAt);
    const dow = ["日", "月", "火", "水", "木", "金", "土"]; // 0-6
    const sameDay = s.toDateString() === e.toDateString();
    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    const datePart = `${s.getMonth() + 1}/${pad(s.getDate())} (${dow[s.getDay()]})`;
    const timePart = `${pad(s.getHours())}:${pad(s.getMinutes())} - ${pad(e.getHours())}:${pad(e.getMinutes())}`;
    return sameDay
      ? `${datePart} ${timePart}`
      : `${datePart} ${pad(s.getHours())}:${pad(s.getMinutes())} - ${e.getMonth() + 1}/${pad(e.getDate())} ${pad(e.getHours())}:${pad(e.getMinutes())}`;
  }

  function relativeLabel(dateStr) {
    const target = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thatDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffDays = Math.round((thatDay - today) / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return "今日";
    if (diffDays === 1) return "明日";
    if (diffDays === 2) return "明後日";
    return "";
  }

  function createBadge(status) {
    const span = document.createElement("span");
    span.className = "badge " + (status === "confirmed" ? "badge-success" : status === "pending" ? "badge-warn" : "badge-muted");
    span.textContent = status === "confirmed" ? "確定" : status === "pending" ? "承認待ち" : String(status || "");
    span.setAttribute("aria-label", "ステータス: " + span.textContent);
    return span;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderTrip(trip) {
    const li = document.createElement("li");
    li.className = "trip-card";

    // ステータスバッジ（右上）
    const badge = createBadge(trip.status);
    badge.style.marginLeft = "8px";
    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.justifyContent = "flex-end";
    topRow.appendChild(badge);

    // 日時
    const time = document.createElement("div");
    time.className = "trip-time";
    const rel = relativeLabel(trip.startAt);
    time.textContent = (rel ? rel + " " : "") + formatDateRange(trip.startAt, trip.endAt);

    // どこからどこへ
    const route = document.createElement("div");
    route.className = "trip-route";
    route.innerHTML = `<span class=\"from\">${escapeHtml(trip.from || "未定")}</span> <span class=\"arrow\">→</span> <span class=\"to\">${escapeHtml(trip.to || "未定")}</span>`;

    // ドライバー名
    const driver = document.createElement("div");
    driver.className = "trip-driver";
    driver.textContent = trip.driverName || "ドライバー未定";

    li.appendChild(topRow);
    li.appendChild(time);
    li.appendChild(route);
    li.appendChild(driver);
    return li;
  }

  function init() {
    // lookup DOM nodes here (safer when script timing changes)
    listEl = document.getElementById("upcoming-list");
    emptyEl = document.getElementById("upcoming-empty");
    if (!listEl || !emptyEl) {
      console.warn('home.js: required DOM elements not found (upcoming-list/upcoming-empty). Aborting render.');
      return;
    }
    const now = new Date();
    const trips = loadTrips()
      .filter((t) => {
        const end = new Date(t.endAt);
        return !isNaN(end) && end.getTime() >= now.getTime();
      })
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
      .slice(0, 5);

    if (!trips.length) {
      emptyEl.hidden = false;
      listEl.innerHTML = "";
      return;
    }
    emptyEl.hidden = true;
    listEl.innerHTML = "";
    trips.forEach((t) => listEl.appendChild(renderTrip(t)));
  }

  // 初期化
  document.addEventListener("DOMContentLoaded", init);
})();
