(function () {
   // 表示モードの永続キー
   const VIEW_KEY = "friends_view_mode_v1"; // "all" | "drivers"
 
   // サンプルデータ（実運用ではAPI等から取得してください）
   const initialFriends = [
     { id: "u001", name: "佐藤 太郎", isDriver: true },
     { id: "u002", name: "鈴木 花子", isDriver: false },
     { id: "u003", name: "田中 次郎", isDriver: true },
     { id: "u004", name: "伊藤 三子", isDriver: false }
   ];
 
   // 要素
   const listEl = document.getElementById("friends-list");
   const tpl = document.getElementById("friend-item-tpl");
   const searchInput = document.getElementById("friend-search");
   const clearBtn = document.getElementById("clear-search");
   // 要素（トグル）
   const toggleContainer = document.querySelector(".filter-toggle");
   const toggleButtons = toggleContainer ? Array.from(toggleContainer.querySelectorAll(".toggle-btn")) : [];
   if (!listEl || !tpl || !searchInput || !clearBtn) return;
 
   function loadViewMode() {
     try {
       const v = localStorage.getItem(VIEW_KEY);
       return v === "drivers" ? "drivers" : "all";
     } catch (e) {
       return "all";
     }
   }
   function saveViewMode(mode) {
     try {
       localStorage.setItem(VIEW_KEY, mode);
     } catch (e) { /* ignore */ }
   }
 
   // driver 状態はサーバー/プロフィール由来として読み取り専用扱い
   let friends = initialFriends.map(f => ({ ...f }));
 
   // 現在の表示モード
   let viewMode = loadViewMode();
 
   // UIトグル適用
   function applyToggleUI() {
     if (!toggleButtons.length) return;
     toggleButtons.forEach(btn => {
       const v = btn.dataset.view || "all";
       const active = v === viewMode;
       btn.classList.toggle("active", active);
       btn.setAttribute("aria-pressed", active ? "true" : "false");
     });
   }
 
   // 描画
   function render(filterText = "") {
     const q = String(filterText || "").trim().toLowerCase();
     listEl.innerHTML = "";
     const fragment = document.createDocumentFragment();
 
     const filtered = friends.filter(f => {
       // viewMode が drivers の場合はドライバーのみ
       if (viewMode === "drivers" && !f.isDriver) return false;
       if (!q) return true;
       return f.id.toLowerCase().includes(q) || f.name.toLowerCase().includes(q);
     });
 
     if (filtered.length === 0) {
       const li = document.createElement("li");
       li.textContent = "該当するフレンドがいません。";
       li.style.color = "#666";
       fragment.appendChild(li);
     } else {
       filtered.forEach(f => {
         const clone = tpl.content.firstElementChild.cloneNode(true);
         clone.dataset.id = f.id;
         // 名前とバッジに分けて設定
         const nameTextEl = clone.querySelector(".name-text");
         const badgeEl = clone.querySelector(".driver-badge");
         nameTextEl.textContent = f.name;
         if (f.isDriver) {
           badgeEl.textContent = "ドライバー";
           badgeEl.classList.remove("off");
           badgeEl.style.display = ""; // 表示
           badgeEl.setAttribute("aria-label", "ドライバー");
         } else {
           // 非ドライバーはバッジ自体を表示しない
           badgeEl.textContent = "";
           badgeEl.classList.add("off");
           badgeEl.style.display = "none";
           badgeEl.removeAttribute("aria-label");
         }
         clone.querySelector(".friend-id").textContent = f.id;
         fragment.appendChild(clone);
       });
     }
 
     listEl.appendChild(fragment);
   }
 
   // 検索入力イベント
   searchInput.addEventListener("input", (e) => {
     render(e.target.value);
   });
   clearBtn.addEventListener("click", () => {
     searchInput.value = "";
     render("");
     searchInput.focus();
   });
 
   // トグルのクリック処理
   toggleButtons.forEach(btn => {
     btn.addEventListener("click", () => {
       const v = btn.dataset.view === "drivers" ? "drivers" : "all";
       if (v === viewMode) return;
       viewMode = v;
       saveViewMode(viewMode);
       applyToggleUI();
       render(searchInput.value);
     });
   });
 
   // 初期UI反映（viewMode）
   applyToggleUI();
   // 初回描画
   render();
 
   // 外部からデータ更新などあれば再構築できるように小さな API を露出（必要なら利用）
   window.noritomoFriends = {
     reloadFromSaved: function () {
       // 初期配列を再読み込み（実運用ではAPI再取得等に差し替えてください）
       friends = initialFriends.map(f => ({ ...f }));
       render(searchInput.value);
     },
     getAll: function () { return friends.slice(); }
   };
 })();
