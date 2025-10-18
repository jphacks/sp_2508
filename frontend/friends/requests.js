document.addEventListener("DOMContentLoaded", function () {
  const checkBtn = document.getElementById("check-requests");
  const reqDialog = document.getElementById("requests-dialog");
  const closeReqBtn = document.getElementById("close-requests");
  const reqList = document.getElementById("requests-list");
  const reqOverlay = document.getElementById("requests-fallback-overlay");
  const reqListFb = document.getElementById("requests-list-fb");
  const closeReqFb = document.getElementById("close-requests-fb");

  function nodeListToArray(selector, root=document) {
    return Array.from(root.querySelectorAll(selector));
  }

  // ダミーデータ（将来はサーバから取得）
  const dummyRequests = {
    sent: [
      { id: "u100", name: "山田 太郎", note: "メッセージ: よろしく" },
      { id: "u101", name: "佐々木 香", note: "送信日: 2025-10-01" }
    ],
    received: [
      { id: "u200", name: "中村 次郎", note: "受信日: 2025-10-03" }
    ]
  };

  function renderRequests(view, targetList) {
    if (!targetList) return;
    targetList.innerHTML = "";
    const items = dummyRequests[view] || [];
    if (items.length === 0) {
      const li = document.createElement("li");
      li.textContent = "該当する申請はありません。";
      targetList.appendChild(li);
      return;
    }
    items.forEach((it) => {
      const li = document.createElement("li");
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = it.name;
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = it.note || it.id;
      li.appendChild(name);
      li.appendChild(meta);
      targetList.appendChild(li);
    });
  }

  function setupTabs(root, listEl) {
    const tabs = nodeListToArray(".req-tab", root);
    tabs.forEach((t) => {
      t.addEventListener("click", () => {
        tabs.forEach((x) => {
          x.classList.remove("active");
          x.setAttribute("aria-pressed", "false");
        });
        t.classList.add("active");
        t.setAttribute("aria-pressed", "true");
        const view = t.dataset.view || "sent";
        renderRequests(view, listEl);
      });
    });
  }

  if (checkBtn) {
    checkBtn.addEventListener("click", () => {
      if (reqDialog && typeof reqDialog.showModal === "function") {
        reqDialog.showModal();
        renderRequests("sent", reqList);
        setupTabs(reqDialog, reqList);
      } else if (reqOverlay) {
        reqOverlay.classList.add("active");
        reqOverlay.setAttribute("aria-hidden", "false");
        renderRequests("sent", reqListFb);
        setupTabs(reqOverlay, reqListFb);
      }
    });
  }

  if (closeReqBtn && reqDialog) {
    closeReqBtn.addEventListener("click", () => {
      try { reqDialog.close(); } catch(e) {}
      if (checkBtn) checkBtn.focus();
    });
  }
  if (closeReqFb && reqOverlay) {
    closeReqFb.addEventListener("click", () => {
      reqOverlay.classList.remove("active");
      reqOverlay.setAttribute("aria-hidden", "true");
      if (checkBtn) checkBtn.focus();
    });
  }
});
