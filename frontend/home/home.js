// homepage.js
// 直近の利用予定を描画するスクリプト
(function () {
  const STORAGE_KEY = "upcomingTrips";
  const API_BASE = "http://127.0.0.1:8000";

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
  let urgentStatusEl = null;
  let driverPollHandle = null; // ドライバーポーリングハンドルをモジュールスコープへ
  let requesterPollHandle = null;

  // localStorage から profile を安全に取得するユーティリティ
  function getStoredProfile() {
    try {
      const raw = localStorage.getItem("userProfile");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error("getStoredProfile parse error", e);
      return null;
    }
  }

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
    console.log('home.js init');
    // lookup DOM nodes here (safer when script timing changes)
    listEl = document.getElementById("upcoming-list");
    emptyEl = document.getElementById("upcoming-empty");
    urgentStatusEl = document.getElementById("urgentStatus");
    if (!listEl || !emptyEl) {
      console.warn('home.js: required DOM elements not found (upcoming-list/upcoming-empty). Aborting render.');
      return;
    }
    // driver notification 要素がない場合は作る（UIが壊れているケースへのフォールバック）
    let notifEl = document.getElementById('driverNotification');
    if (!notifEl) {
      console.warn('driverNotification element not found — creating fallback element');
      notifEl = document.createElement('div');
      notifEl.id = 'driverNotification';
      notifEl.className = 'driver-notification';
      notifEl.style.display = 'none';
      notifEl.innerHTML = '<div class="msg" id="driverNotificationMsg">緊急要請を受信しました</div>' +
                          '<div class="controls"><button id="driverAcceptBtn" class="accept">受ける</button>' +
                          '<button id="driverDeclineBtn" class="decline">無視</button></div>';
      document.body.appendChild(notifEl);
    }
    const notifMsg = document.getElementById('driverNotificationMsg');
    const acceptBtn = document.getElementById('driverAcceptBtn');
    const declineBtn = document.getElementById('driverDeclineBtn');

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

    // ----- 追加: 緊急要請ボタンのバインド -----
    const urgentBtn = document.querySelector('.urgent-btn');
    if (urgentBtn) {
      urgentBtn.addEventListener('click', async () => {
        const originalText = urgentBtn.textContent || '緊急依頼'; // 先に定義して finally で安全に参照
        const raw = localStorage.getItem('userProfile');
        if (!raw) {
          alert('ユーザープロフィールが見つかりません。login ページでプロファイルを保存してください。');
          return;
        }
        let profile;
        try {
          profile = JSON.parse(raw);
        } catch (e) {
          console.error('userProfile JSON parse error', e, raw);
          alert('保存された userProfile が不正です。console を確認してください。');
          return;
        }
        profile.car = false; // 要請者として送る

        // デバッグ: 送信前に payload を出力
        console.log('kinkyu payload ->', profile);
        const body = JSON.stringify(profile);
        console.log('kinkyu body string ->', body);

        urgentBtn.disabled = true;
        urgentBtn.textContent = '送信中…';
        try {
          const res = await fetch(API_BASE + '/kinkyu/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
          });
          console.log('kinkyu response status', res.status, res.statusText);
          const json = await res.json().catch(() => null);
          console.log('kinkyu response json', json);
          if (!res.ok) {
            alert('送信エラー: HTTP ' + res.status + (json && json.error ? ' – ' + json.error : ''));
          } else {
            // UI に要請送信済み / 応答待ちを表示（要請者側）
            if (urgentStatusEl) {
              urgentStatusEl.hidden = false;
              urgentStatusEl.classList.remove('accepted');
              urgentStatusEl.classList.add('waiting');
              urgentStatusEl.textContent = '要請送信済み — ドライバーの応答を待っています...';
            }
             // 要請者として受理確認用ポーリングを開始
             if (requesterPollHandle) clearInterval(requesterPollHandle);
             requesterPollHandle = setInterval(async () => {
               try {
                 const r = await fetch(API_BASE + '/', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ id: profile.id, car: false }),
                 });
                 if (!r.ok) return;
                 const body = await r.json().catch(() => null);
                 if (!body) return;
                 if (body.status === 'accepted' || body.accepted_by) {
                   const accepter = body.accepted_by || body.acceptedBy || '不明';
                   // 要請者画面の緊急カード内に受理メッセージを表示
                   if (urgentStatusEl) {
                     urgentStatusEl.hidden = false;
                     urgentStatusEl.classList.remove('waiting');
                     urgentStatusEl.classList.add('accepted');
                     urgentStatusEl.textContent = `${accepter}さんに受理されました！！`;
                   }
                   clearInterval(requesterPollHandle);
                   requesterPollHandle = null;
                 } else if (body.status === 'waiting') {
                   // waiting のまま（UI は既に waiting 表示）
                   console.log('要請者: ドライバー応答待ち...');
                 } else if (body.status === 'pending') {
                   console.log('要請者: 予約は承認待ちです...');
                 }
               } catch (e) {
                 console.warn('requester poll failed', e);
               }
             }, 2000);
           }
         } catch (e) {
           console.error('fetch failed', e);
           alert('送信に失敗しました（ネットワークエラー）');
         } finally {
           urgentBtn.disabled = false;
           urgentBtn.textContent = originalText;
         }
       });
     }
    // ----- ここまで -----
    // 画面離脱などでポーリングが残らないようにする
    window.addEventListener('beforeunload', () => {
      if (requesterPollHandle) {
        clearInterval(requesterPollHandle);
        requesterPollHandle = null;
      }
    });

    // ----- 追加: ドライバーポーリング（localStorage の userProfile を参照） -----
    // (driverPollHandle はモジュールスコープにある)
    function pollAsDriver(profile) {
      if (!profile || !profile.car) {
        console.log('pollAsDriver: profile missing or not driver', profile);
        return;
      }
      if (driverPollHandle) {
        clearInterval(driverPollHandle);
        driverPollHandle = null;
      }
      console.log('pollAsDriver: start polling as driver for', profile.id);
      // 初回即時実行して以降数秒ごとにポーリング
      async function check() {
        try {
          console.log('driver poll -> sending POST / with', { id: profile.id, car: true });
          const res = await fetch(API_BASE + '/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: profile.id, car: true }),
          });
          console.log('driver poll -> response status', res.status);
          if (!res.ok) {
            console.warn('driver poll -> non-ok response', res.status);
            return;
          }
          const j = await res.json().catch((e) => {
            console.warn('driver poll -> invalid json', e);
            return null;
          });
          console.log('driver poll -> json', j);
          if (j && j.waiting) {
            // 緊急要請が待機中
            showDriverNotification(j.user_id, j.type);
          } else {
            // no waiting: hide notification if visible
            if (notifEl && notifEl.classList && notifEl.classList.contains('show')) {
              console.log('driver poll -> no waiting, hiding notification');
              notifEl.classList.remove('show');
              notifEl.style.display = 'none';
            }
          }
        } catch (e) {
          console.warn('driver poll failed', e);
        }
      }
      check();
      driverPollHandle = setInterval(check, 2500);
    }

    function showDriverNotification(requesterId, type) {
      if (!notifEl) return;
      console.log('showDriverNotification', requesterId, type);
      notifMsg.textContent = requesterId ? `緊急要請: ${requesterId} さんが車を必要としています。受けますか？` : '緊急要請を受信しました。受けますか？';
      // ボタンを確実に有効化して表示
      if (acceptBtn) { acceptBtn.disabled = false; acceptBtn.textContent = '受ける'; }
      if (declineBtn) { declineBtn.disabled = false; declineBtn.textContent = '無視'; }
      notifEl.classList.add('show');
      notifEl.style.display = 'flex';
    }

    // 通知を閉じる（accept/decline 共通で使用）
    function hideDriverNotification() {
      if (!notifEl) return;
      notifEl.classList.remove('show');
      notifEl.style.display = 'none';
      // ボタン状態リセット
      if (acceptBtn) { acceptBtn.disabled = false; acceptBtn.textContent = '受ける'; }
      if (declineBtn) { declineBtn.disabled = false; declineBtn.textContent = '無視'; }
      // （必要なら通知元 user_id をクリアする等の処理をここに追加）
    }

    // 受理ボタン: /accept/ を叩く
    if (acceptBtn) {
      acceptBtn.addEventListener('click', async () => {
        // ここで profile を必ず取得する（未定義参照を防ぐ）
        const profile = getStoredProfile();
        if (!profile || !profile.car) {
          alert('ドライバープロフィールが見つかりません。プロフィールで car=true を設定してください。');
          return;
        }
        acceptBtn.disabled = true;
        acceptBtn.textContent = '受理中…';
        // 受理するときは要請中のユーザー id を渡すのが望ましいが、
        // サーバ実装に合わせて driver id だけ送る形にしている。
        try {
          console.log('accept -> sending POST /accept/ with', { id: profile.id, car: true });
          const res = await fetch(API_BASE + '/accept/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: profile.id, car: true }),
          });
          const j = await res.json().catch(() => null);
          console.log('accept -> response', res.status, j);
          if (!res.ok) {
            alert('受理エラー: HTTP ' + res.status + (j && j.error ? ' – ' + j.error : ''));
          } else {
            // 成功時は通知を消す
            if (j && j.for_user) {
              console.log('accepted for', j.for_user);
            }
            hideDriverNotification();
          }
        } catch (e) {
          console.error('accept fetch failed', e);
          alert('受理に失敗しました（ネットワークエラー）');
        } finally {
          // ボタン状態を戻す（UI が閉じられれば意味はないが安全処理）
          acceptBtn.disabled = false;
          acceptBtn.textContent = '受ける';
        }
      });
    }
    else {
      console.warn('driverAcceptBtn not found');
    }
    if (declineBtn) {
      declineBtn.addEventListener('click', () => {
        // 単に閉じる。押せない場合は disabled 状態を解除してみる
        declineBtn.disabled = false;
        hideDriverNotification();
      });
    }
    else {
      console.warn('driverDeclineBtn not found');
    }

    // ページ初期化時に localStorage を見てドライバーモードならポーリング開始
    const initialProfile = getStoredProfile();
    console.log('initialProfile', initialProfile);
    if (initialProfile && initialProfile.car) {
      pollAsDriver(initialProfile);
    } else {
      console.log('not driver at init; will listen to storage events');
    }
     window.addEventListener('storage', (ev) => {
       if (ev.key !== 'userProfile') return;
       const p = getStoredProfile();
       if (p && p.car) {
         pollAsDriver(p);
       } else {
         if (driverPollHandle) {
           clearInterval(driverPollHandle);
           driverPollHandle = null;
         }
         hideDriverNotification();
       }
     });
    // ----- ドライバーポーリングここまで -----
 
   }
   
   // 初期化
   document.addEventListener("DOMContentLoaded", init);
})();
