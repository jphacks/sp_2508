document.addEventListener("DOMContentLoaded", function () {
  const openBtn = document.getElementById("open-add-friend");
  const dialog = document.getElementById("add-friend-dialog");
  const form = document.getElementById("add-friend-form");
  const input = document.getElementById("new-friend-id");
  const cancelBtn = document.getElementById("cancel-add-friend");

  // フォールバック要素
  const overlay = document.getElementById("modal-fallback-overlay");
  const fbInput = document.getElementById("new-friend-id-fb");
  const fbCancel = document.getElementById("cancel-add-friend-fb");
  const fbSubmit = document.getElementById("submit-add-friend-fb");

  function showFallback() {
    if (!overlay) return;
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
    if (fbInput) fbInput.focus();
  }
  function hideFallback() {
    if (!overlay) return;
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    if (openBtn) openBtn.focus();
  }

  if (openBtn) {
    openBtn.addEventListener("click", function () {
      if (dialog && typeof dialog.showModal === "function") {
        dialog.showModal();
        if (input) input.focus();
      } else {
        showFallback();
      }
    });
  }

  if (cancelBtn && dialog) {
    cancelBtn.addEventListener("click", function () {
      if (typeof dialog.close === "function") dialog.close();
      if (openBtn) openBtn.focus();
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // 簡易バリデーション
      if (input && !input.value.trim()) {
        input.focus();
        return;
      }
      try {
        if (typeof dialog.close === "function") dialog.close();
      } catch (err) {}
      if (openBtn) openBtn.focus();
      // ダミー送信の見せかけ
      alert("申請を送信しました（ダミー）");
    });
  }

  // フォールバックの操作（dialog 未サポート時）
  if (fbCancel) fbCancel.addEventListener("click", hideFallback);
  if (fbSubmit) {
    fbSubmit.addEventListener("click", function () {
      if (!fbInput || !fbInput.value.trim()) {
        if (fbInput) fbInput.focus();
        return;
      }
      hideFallback();
      alert("申請を送信しました（ダミー）");
    });
  }
});
