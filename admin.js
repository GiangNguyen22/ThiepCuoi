/**
 * Admin Dashboard & Authentication Logic
 * ThiepCuoiV2 - Strict server-side verification and safe DOM rendering
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const authView = document.getElementById("auth-view");
  const dashboardView = document.getElementById("dashboard-view");
  const loginForm = document.getElementById("login-form");
  const loginBtn = document.getElementById("login-btn");
  const loginAlert = document.getElementById("login-alert");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const adminUsernameDisplay = document.getElementById("admin-username-display");
  const logoutBtn = document.getElementById("logout-btn");
  const toast = document.getElementById("toast");

  // Stats elements
  const statRsvpTotal = document.getElementById("stat-rsvp-total");
  const statRsvpAttending = document.getElementById("stat-rsvp-attending");
  const statRsvpDeclined = document.getElementById("stat-rsvp-declined");
  const statGuestCount = document.getElementById("stat-guest-count");
  const statWishesTotal = document.getElementById("stat-wishes-total");
  const statWishesPending = document.getElementById("stat-wishes-pending");
  const statMediaTotal = document.getElementById("stat-media-total");
  const statAlbumCount = document.getElementById("stat-album-count");
  const tabRsvpCount = document.getElementById("tab-rsvp-count");
  const tabWishesPendingCount = document.getElementById("tab-wishes-pending-count");
  const tabMediaCount = document.getElementById("tab-media-count");

  // Tabs
  const tabRsvps = document.getElementById("tab-rsvps");
  const tabWishes = document.getElementById("tab-wishes");
  const tabMedia = document.getElementById("tab-media");
  const tabContent = document.getElementById("tab-content");
  const tabBanking = document.getElementById("tab-banking");
  const panelRsvps = document.getElementById("panel-rsvps");
  const panelWishes = document.getElementById("panel-wishes");
  const panelMedia = document.getElementById("panel-media");
  const panelContent = document.getElementById("panel-content");
  const panelBanking = document.getElementById("panel-banking");

  // Content panel elements
  const contentGroomName = document.getElementById("content-groom-name");
  const contentBrideName = document.getElementById("content-bride-name");
  const contentEventDateText = document.getElementById("content-event-date-text");
  const contentLunarDateText = document.getElementById("content-lunar-date-text");
  const contentEventDateIso = document.getElementById("content-event-date-iso");
  const contentInvitationTitle = document.getElementById("content-invitation-title");
  const contentInvitationCopy = document.getElementById("content-invitation-copy");
  const contentVenueName = document.getElementById("content-venue-name");
  const contentVenueNote = document.getElementById("content-venue-note");
  const contentVenueAddress = document.getElementById("content-venue-address");
  const contentMapUrl = document.getElementById("content-map-url");
  const scheduleAddBtn = document.getElementById("schedule-add-btn");
  const scheduleItemsList = document.getElementById("schedule-items-list");
  const contentClosingHeading = document.getElementById("content-closing-heading");
  const contentClosingNames = document.getElementById("content-closing-names");
  const contentClosingDate = document.getElementById("content-closing-date");
  const contentRefreshBtn = document.getElementById("content-refresh-btn");
  const contentSaveBtn = document.getElementById("content-save-btn");
  const contentSaveBtnBottom = document.getElementById("content-save-btn-bottom");

  // Banking panel elements
  const bankingRefreshBtn = document.getElementById("banking-refresh-btn");
  const bankingSaveBtn = document.getElementById("banking-save-btn");
  const bankingSaveBtnBottom = document.getElementById("banking-save-btn-bottom");
  const bankGroomEnabled = document.getElementById("bank-groom-enabled");
  const bankGroomBin = document.getElementById("bank-groom-bin");
  const bankGroomAccountNumber = document.getElementById("bank-groom-account-number");
  const bankGroomAccountHolder = document.getElementById("bank-groom-account-holder");
  const bankGroomTransferNote = document.getElementById("bank-groom-transfer-note");
  const bankGroomQrBox = document.getElementById("bank-groom-qr-box");
  const bankBrideEnabled = document.getElementById("bank-bride-enabled");
  const bankBrideBin = document.getElementById("bank-bride-bin");
  const bankBrideAccountNumber = document.getElementById("bank-bride-account-number");
  const bankBrideAccountHolder = document.getElementById("bank-bride-account-holder");
  const bankBrideTransferNote = document.getElementById("bank-bride-transfer-note");
  const bankBrideQrBox = document.getElementById("bank-bride-qr-box");

  // Media Elements
  const subtabLibBtn = document.getElementById("subtab-lib-btn");
  const subtabAlbumBtn = document.getElementById("subtab-album-btn");
  const subtabLibView = document.getElementById("subtab-lib-view");
  const subtabAlbumView = document.getElementById("subtab-album-view");
  const libCountBadge = document.getElementById("lib-count-badge");
  const albumCountBadge = document.getElementById("album-count-badge");
  const uploadDropzone = document.getElementById("upload-dropzone");
  const mediaFileInput = document.getElementById("media-file-input");
  const mediaBrowseBtn = document.getElementById("media-browse-btn");
  const uploadPreviewArea = document.getElementById("upload-preview-area");
  const previewCount = document.getElementById("preview-count");
  const uploadPreviewGrid = document.getElementById("upload-preview-grid");
  const uploadConfirmBtn = document.getElementById("upload-confirm-btn");
  const uploadCancelBtn = document.getElementById("upload-cancel-btn");
  const mediaLibraryGrid = document.getElementById("media-library-grid");
  const mediaAlbumGrid = document.getElementById("media-album-grid");
  const mediaRefreshBtn = document.getElementById("media-refresh-btn");
  const albumRefreshBtn = document.getElementById("album-refresh-btn");
  const mediaFilterBtns = document.querySelectorAll("[data-media-filter]");

  // RSVP panel elements
  const rsvpTableBody = document.getElementById("rsvp-table-body");
  const rsvpSearchInput = document.getElementById("rsvp-search-input");
  const rsvpRefreshBtn = document.getElementById("rsvp-refresh-btn");
  const rsvpPrevBtn = document.getElementById("rsvp-prev-btn");
  const rsvpNextBtn = document.getElementById("rsvp-next-btn");
  const rsvpPageInfo = document.getElementById("rsvp-page-info");
  const rsvpFilterBtns = document.querySelectorAll("[data-rsvp-filter]");

  // Wishes panel elements
  const wishesList = document.getElementById("wishes-list");
  const wishSearchInput = document.getElementById("wish-search-input");
  const wishRefreshBtn = document.getElementById("wish-refresh-btn");
  const wishPrevBtn = document.getElementById("wish-prev-btn");
  const wishNextBtn = document.getElementById("wish-next-btn");
  const wishPageInfo = document.getElementById("wish-page-info");
  const wishFilterBtns = document.querySelectorAll("[data-wish-filter]");

  // State
  let selectedFilesToUpload = [];
  let mediaState = {
    filter: "all",
    library: [],
    album: []
  };

  let rsvpState = {
    page: 1,
    limit: 15,
    filter: "all",
    search: "",
    totalPages: 1
  };

  let wishState = {
    page: 1,
    limit: 15,
    filter: "all",
    search: "",
    totalPages: 1
  };

  let toastTimer = null;

  // Toast Helper
  function showToast(message, isError = false) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    if (isError) {
      toast.classList.add("toast-error");
    } else {
      toast.classList.remove("toast-error");
    }
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 3500);
  }

  // Safe authenticated fetch wrapper
  async function adminFetch(url, options = {}) {
    const token = sessionStorage.getItem("admin_token");
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      headers.set("X-Admin-Token", token);
    }
    headers.set("X-Requested-With", "XMLHttpRequest");

    const fetchOptions = {
      ...options,
      credentials: "include",
      headers
    };

    try {
      const response = await fetch(url, fetchOptions);

      // If session expired or unauthorized on protected routes
      if (response.status === 401 && !url.endsWith("/session")) {
        sessionStorage.removeItem("admin_token");
        showAuthView("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
        throw new Error("Unauthorized");
      }

      return response;
    } catch (err) {
      throw err;
    }
  }

  function setActiveTab(activeName) {
    const tabs = [
      { name: "rsvps", tab: tabRsvps, panel: panelRsvps },
      { name: "wishes", tab: tabWishes, panel: panelWishes },
      { name: "media", tab: tabMedia, panel: panelMedia },
      { name: "content", tab: tabContent, panel: panelContent },
      { name: "banking", tab: tabBanking, panel: panelBanking }
    ];

    tabs.forEach(({ name, tab, panel }) => {
      const isActive = name === activeName;
      if (tab) {
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
      }
      if (panel) {
        panel.hidden = !isActive;
      }
    });
  }

  // Button loading state helper
  function setButtonLoading(btn, isLoading, loadingText = "Đang lưu...", defaultText = "Lưu") {
    if (!btn) return;
    btn.disabled = isLoading;
    const btnText = btn.querySelector(".btn-text");
    const btnSpinner = btn.querySelector(".btn-spinner");
    if (isLoading) {
      if (btnText) {
        btn.dataset.origText = btnText.textContent;
        btnText.textContent = loadingText;
      }
      if (btnSpinner) btnSpinner.hidden = false;
    } else {
      if (btnText) {
        btnText.textContent = btn.dataset.origText || defaultText;
      }
      if (btnSpinner) btnSpinner.hidden = true;
    }
  }

  // Reset all dashboard statistics, tables, lists, search inputs, and filters
  function resetDashboardData() {
    // 1. Reset user greeting and form fields
    adminUsernameDisplay.textContent = "Admin";
    usernameInput.value = "";
    passwordInput.value = "";

    // 2. Reset stats counters
    statRsvpTotal.textContent = "0";
    statRsvpAttending.textContent = "0";
    statRsvpDeclined.textContent = "0";
    statGuestCount.textContent = "0";
    statWishesTotal.textContent = "0";
    statWishesPending.textContent = "0";
    statMediaTotal.textContent = "0";
    statAlbumCount.textContent = "0";
    tabRsvpCount.textContent = "0";
    tabWishesPendingCount.textContent = "0";
    tabMediaCount.textContent = "0";
    libCountBadge.textContent = "0";
    albumCountBadge.textContent = "0";

    // 3. Clear rendered RSVP rows, wishes cards, and media
    rsvpTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Đang tải dữ liệu...</td></tr>';
    wishesList.innerHTML = '<div class="empty-state">Đang tải danh sách lời chúc...</div>';
    mediaLibraryGrid.innerHTML = '<div class="empty-state">Đang tải thư viện ảnh...</div>';
    mediaAlbumGrid.innerHTML = '<div class="empty-state">Chưa có ảnh nào trong album cưới.</div>';
    uploadPreviewGrid.innerHTML = '';
    uploadPreviewArea.hidden = true;
    mediaFileInput.value = '';
    selectedFilesToUpload = [];

    // 4. Reset search queries and filter active pills
    rsvpSearchInput.value = "";
    wishSearchInput.value = "";
    rsvpFilterBtns.forEach((b) => b.classList.toggle("active", b.getAttribute("data-rsvp-filter") === "all"));
    wishFilterBtns.forEach((b) => b.classList.toggle("active", b.getAttribute("data-wish-filter") === "all"));
    mediaFilterBtns.forEach((b) => b.classList.toggle("active", b.getAttribute("data-media-filter") === "all"));

    // 5. Reset pagination indicators & disable buttons
    rsvpPageInfo.textContent = "Trang 1 / 1";
    wishPageInfo.textContent = "Trang 1 / 1";
    rsvpPrevBtn.disabled = true;
    rsvpNextBtn.disabled = true;
    wishPrevBtn.disabled = true;
    wishNextBtn.disabled = true;

    // 6. Reset state variables
    rsvpState = { page: 1, limit: 15, filter: "all", search: "", totalPages: 1 };
    wishState = { page: 1, limit: 15, filter: "all", search: "", totalPages: 1 };
    mediaState = { filter: "all", library: [], album: [] };

    // 7. Reset active tab to Tab 1 (RSVP)
    setActiveTab("rsvps");

    // Reset subtabs in media panel
    subtabLibBtn.classList.add("active");
    subtabAlbumBtn.classList.remove("active");
    subtabLibView.hidden = false;
    subtabAlbumView.hidden = true;

    // 8. Reset content and banking inputs
    if (contentGroomName) contentGroomName.value = "";
    if (contentBrideName) contentBrideName.value = "";
    if (contentEventDateText) contentEventDateText.value = "";
    if (contentLunarDateText) contentLunarDateText.value = "";
    if (contentEventDateIso) contentEventDateIso.value = "";
    if (contentInvitationTitle) contentInvitationTitle.value = "";
    if (contentInvitationCopy) contentInvitationCopy.value = "";
    if (contentVenueName) contentVenueName.value = "";
    if (contentVenueNote) contentVenueNote.value = "";
    if (contentVenueAddress) contentVenueAddress.value = "";
    if (contentMapUrl) contentMapUrl.value = "";
    if (contentClosingHeading) contentClosingHeading.value = "";
    if (contentClosingNames) contentClosingNames.value = "";
    if (contentClosingDate) contentClosingDate.value = "";
    activeScheduleList = [];
    if (scheduleItemsList) scheduleItemsList.innerHTML = "";

    if (bankGroomEnabled) bankGroomEnabled.checked = false;
    if (bankGroomBin) bankGroomBin.value = "";
    if (bankGroomAccountNumber) bankGroomAccountNumber.value = "";
    if (bankGroomAccountHolder) bankGroomAccountHolder.value = "";
    if (bankGroomTransferNote) bankGroomTransferNote.value = "";
    if (bankGroomQrBox) bankGroomQrBox.innerHTML = '<span class="qr-placeholder-text">Điền đủ thông tin để tạo mã QR</span>';

    if (bankBrideEnabled) bankBrideEnabled.checked = false;
    if (bankBrideBin) bankBrideBin.value = "";
    if (bankBrideAccountNumber) bankBrideAccountNumber.value = "";
    if (bankBrideAccountHolder) bankBrideAccountHolder.value = "";
    if (bankBrideTransferNote) bankBrideTransferNote.value = "";
    if (bankBrideQrBox) bankBrideQrBox.innerHTML = '<span class="qr-placeholder-text">Điền đủ thông tin để tạo mã QR</span>';
  }

  // View Switchers
  function showAuthView(errorMessage = "") {
    dashboardView.hidden = true;
    authView.hidden = false;
    if (errorMessage) {
      loginAlert.textContent = errorMessage;
      loginAlert.hidden = false;
    } else {
      loginAlert.hidden = true;
    }
    resetDashboardData();
  }

  function showDashboardView(username) {
    authView.hidden = true;
    dashboardView.hidden = false;
    adminUsernameDisplay.textContent = username || "Admin";
    loadDashboardData();
  }

  // Format date helper (safe Vietnamese format)
  function formatDate(isoString) {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch {
      return isoString;
    }
  }

  // Format bytes helper
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  // Load All Dashboard Data
  async function loadDashboardData() {
    await Promise.all([
      loadStats(),
      loadRsvps(),
      loadWishes(),
      loadMediaLibrary(),
      loadAlbumItems(),
      loadAdminContent(),
      loadAdminBanking()
    ]);
  }

  // 1. Stats Loading
  async function loadStats() {
    try {
      const res = await adminFetch("/api/admin/stats");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.stats) return;

      const { rsvp, wishes, media } = data.stats;
      statRsvpTotal.textContent = rsvp.total.toLocaleString("vi-VN");
      statRsvpAttending.textContent = rsvp.attending.toLocaleString("vi-VN");
      statRsvpDeclined.textContent = rsvp.declined.toLocaleString("vi-VN");
      statGuestCount.textContent = rsvp.total_guests.toLocaleString("vi-VN");
      statWishesTotal.textContent = wishes.total.toLocaleString("vi-VN");
      statWishesPending.textContent = wishes.pending.toLocaleString("vi-VN");

      if (media) {
        statMediaTotal.textContent = media.total_images.toLocaleString("vi-VN");
        statAlbumCount.textContent = media.album_count.toLocaleString("vi-VN");
        tabMediaCount.textContent = media.total_images.toLocaleString("vi-VN");
        libCountBadge.textContent = media.total_images.toLocaleString("vi-VN");
        albumCountBadge.textContent = media.album_count.toLocaleString("vi-VN");
      }

      tabRsvpCount.textContent = rsvp.total.toLocaleString("vi-VN");
      tabWishesPendingCount.textContent = wishes.pending.toLocaleString("vi-VN");
    } catch (err) {
      console.warn("Failed to load stats:", err);
    }
  }

  // 2. RSVP Loading
  async function loadRsvps() {
    rsvpTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Đang tải dữ liệu RSVP...</td></tr>';
    try {
      const query = new URLSearchParams({
        status: rsvpState.filter,
        page: rsvpState.page,
        limit: rsvpState.limit,
        search: rsvpState.search
      });

      const res = await adminFetch(`/api/admin/rsvps?${query.toString()}`);
      if (!res.ok) {
        rsvpTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Không thể tải dữ liệu RSVP.</td></tr>';
        return;
      }

      const data = await res.json();
      const list = data.data || [];
      const pagination = data.pagination || { page: 1, totalPages: 1, total: 0 };

      rsvpState.totalPages = pagination.totalPages;
      rsvpPageInfo.textContent = `Trang ${pagination.page} / ${pagination.totalPages} (Tổng ${pagination.total})`;
      rsvpPrevBtn.disabled = pagination.page <= 1;
      rsvpNextBtn.disabled = pagination.page >= pagination.totalPages;

      if (list.length === 0) {
        rsvpTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Chưa có phản hồi nào phù hợp bộ lọc.</td></tr>';
        return;
      }

      rsvpTableBody.innerHTML = "";
      list.forEach((item, index) => {
        const tr = document.createElement("tr");

        const tdIndex = document.createElement("td");
        tdIndex.textContent = ((pagination.page - 1) * pagination.limit + index + 1).toString();

        const tdName = document.createElement("td");
        const strongName = document.createElement("strong");
        strongName.textContent = item.guest_name;
        tdName.appendChild(strongName);

        const tdStatus = document.createElement("td");
        const spanStatus = document.createElement("span");
        if (item.status === "attending") {
          spanStatus.className = "badge badge-attending";
          spanStatus.textContent = "Tham dự";
        } else {
          spanStatus.className = "badge badge-declined";
          spanStatus.textContent = "Không tham dự";
        }
        tdStatus.appendChild(spanStatus);

        const tdParty = document.createElement("td");
        tdParty.textContent = item.status === "attending" ? `${item.party_size} người` : "-";

        const tdDate = document.createElement("td");
        tdDate.textContent = formatDate(item.created_at);

        tr.appendChild(tdIndex);
        tr.appendChild(tdName);
        tr.appendChild(tdStatus);
        tr.appendChild(tdParty);
        tr.appendChild(tdDate);

        rsvpTableBody.appendChild(tr);
      });
    } catch (err) {
      rsvpTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Lỗi khi tải dữ liệu. Vui lòng thử lại.</td></tr>';
    }
  }

  // 3. Wishes Loading
  async function loadWishes() {
    wishesList.innerHTML = '<div class="empty-state">Đang tải danh sách lời chúc...</div>';
    try {
      const query = new URLSearchParams({
        status: wishState.filter,
        page: wishState.page,
        limit: wishState.limit,
        search: wishState.search
      });

      const res = await adminFetch(`/api/admin/wishes?${query.toString()}`);
      if (!res.ok) {
        wishesList.innerHTML = '<div class="empty-state">Không thể tải danh sách lời chúc.</div>';
        return;
      }

      const data = await res.json();
      const list = data.data || [];
      const pagination = data.pagination || { page: 1, totalPages: 1, total: 0 };

      wishState.totalPages = pagination.totalPages;
      wishPageInfo.textContent = `Trang ${pagination.page} / ${pagination.totalPages} (Tổng ${pagination.total})`;
      wishPrevBtn.disabled = pagination.page <= 1;
      wishNextBtn.disabled = pagination.page >= pagination.totalPages;

      if (list.length === 0) {
        wishesList.innerHTML = '<div class="empty-state">Không có lời chúc nào phù hợp với bộ lọc.</div>';
        return;
      }

      wishesList.innerHTML = "";
      list.forEach((item) => {
        const card = document.createElement("article");
        card.className = "wish-item";

        // Header
        const header = document.createElement("div");
        header.className = "wish-item-header";

        const author = document.createElement("span");
        author.className = "wish-author";
        author.textContent = item.guest_name;

        const meta = document.createElement("div");
        meta.className = "wish-meta";

        const dateSpan = document.createElement("span");
        dateSpan.textContent = formatDate(item.created_at);

        const statusBadge = document.createElement("span");
        statusBadge.className = `badge badge-${item.status}`;
        if (item.status === "approved") {
          statusBadge.textContent = "Đã duyệt";
        } else if (item.status === "hidden") {
          statusBadge.textContent = "Đã ẩn";
        } else {
          statusBadge.textContent = "Chờ duyệt";
        }

        meta.appendChild(dateSpan);
        meta.appendChild(statusBadge);

        header.appendChild(author);
        header.appendChild(meta);

        // Body message (safely formatted)
        const body = document.createElement("div");
        body.className = "wish-body";
        body.textContent = item.message;

        // Actions
        const actions = document.createElement("div");
        actions.className = "wish-actions";

        if (item.status !== "approved") {
          const approveBtn = document.createElement("button");
          approveBtn.type = "button";
          approveBtn.className = "btn btn-secondary btn-sm";
          approveBtn.textContent = "Duyệt hiển thị";
          approveBtn.addEventListener("click", () => updateWishStatus(item.id, "approved"));
          actions.appendChild(approveBtn);
        }

        if (item.status !== "hidden") {
          const hideBtn = document.createElement("button");
          hideBtn.type = "button";
          hideBtn.className = "btn btn-outline btn-sm";
          hideBtn.textContent = "Ẩn lời chúc";
          hideBtn.addEventListener("click", () => updateWishStatus(item.id, "hidden"));
          actions.appendChild(hideBtn);
        }

        card.appendChild(header);
        card.appendChild(body);
        if (actions.children.length > 0) {
          card.appendChild(actions);
        }

        wishesList.appendChild(card);
      });
    } catch (err) {
      wishesList.innerHTML = '<div class="empty-state">Lỗi khi tải danh sách lời chúc. Vui lòng thử lại.</div>';
    }
  }

  // 4. Update Wish Status
  async function updateWishStatus(wishId, newStatus) {
    try {
      const res = await adminFetch(`/api/admin/wishes/${wishId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể cập nhật lời chúc.", true);
        return;
      }

      showToast(data.message || "Đã cập nhật trạng thái lời chúc thành công.");
      await Promise.all([loadStats(), loadWishes()]);
    } catch (err) {
      showToast("Lỗi kết nối khi cập nhật lời chúc.", true);
    }
  }

  // 5. Media Management Functions
  async function loadMediaLibrary() {
    mediaLibraryGrid.innerHTML = '<div class="empty-state">Đang tải thư viện ảnh...</div>';
    try {
      const res = await adminFetch("/api/admin/images");
      if (!res.ok) {
        mediaLibraryGrid.innerHTML = '<div class="empty-state">Không thể tải danh sách ảnh.</div>';
        return;
      }
      const data = await res.json();
      mediaState.library = data.data || [];
      renderMediaLibrary();
    } catch (err) {
      mediaLibraryGrid.innerHTML = '<div class="empty-state">Lỗi kết nối khi tải thư viện ảnh.</div>';
    }
  }

  function renderMediaLibrary() {
    let list = mediaState.library;

    if (mediaState.filter === "cover") {
      list = list.filter(item => item.used_in_cover);
    } else if (mediaState.filter === "album") {
      list = list.filter(item => item.used_in_album);
    } else if (mediaState.filter === "unused") {
      list = list.filter(item => !item.used_in_cover && !item.used_in_album && !item.used_in_venue);
    }

    if (list.length === 0) {
      mediaLibraryGrid.innerHTML = '<div class="empty-state">Không có hình ảnh nào phù hợp bộ lọc.</div>';
      return;
    }

    mediaLibraryGrid.innerHTML = "";
    list.forEach((item) => {
      const card = document.createElement("article");
      card.className = "media-card";

      // Thumbnail wrapper
      const imgWrap = document.createElement("div");
      imgWrap.className = "media-card-imgwrap";
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = item.alt_text || item.original_name;
      img.loading = "lazy";
      imgWrap.appendChild(img);

      // Card body
      const body = document.createElement("div");
      body.className = "media-card-body";

      const name = document.createElement("p");
      name.className = "media-card-name";
      name.title = item.original_name;
      name.textContent = item.original_name;

      const meta = document.createElement("div");
      meta.className = "media-card-meta";
      const sizeSpan = document.createElement("span");
      sizeSpan.textContent = formatBytes(item.file_size);
      const dateSpan = document.createElement("span");
      dateSpan.textContent = formatDate(item.created_at);
      meta.appendChild(sizeSpan);
      meta.appendChild(dateSpan);

      // Badges
      const badges = document.createElement("div");
      badges.className = "media-card-badges";

      if (item.used_in_cover) {
        const b = document.createElement("span");
        b.className = "badge badge-cover";
        b.textContent = "Ảnh bìa";
        badges.appendChild(b);
      }
      if (item.used_in_album) {
        const b = document.createElement("span");
        b.className = "badge badge-album";
        b.textContent = "Trong Album";
        badges.appendChild(b);
      }
      if (item.used_in_venue) {
        const b = document.createElement("span");
        b.className = "badge badge-venue";
        b.textContent = "Ảnh sự kiện";
        badges.appendChild(b);
      }
      if (!item.used_in_cover && !item.used_in_album && !item.used_in_venue) {
        const b = document.createElement("span");
        b.className = "badge badge-unused";
        b.textContent = "Chưa dùng";
        badges.appendChild(b);
      }

      // Actions
      const actions = document.createElement("div");
      actions.className = "media-card-actions";

      // 1. Cover Photo Button
      const coverBtn = document.createElement("button");
      coverBtn.type = "button";
      if (item.used_in_cover) {
        coverBtn.className = "btn btn-outline btn-sm";
        coverBtn.textContent = "Gỡ ảnh bìa";
        coverBtn.addEventListener("click", () => assignMediaSlot("cover_photo", null));
      } else {
        coverBtn.className = "btn btn-secondary btn-sm";
        coverBtn.textContent = "Đặt ảnh bìa";
        coverBtn.addEventListener("click", () => assignMediaSlot("cover_photo", item.id));
      }

      // 2. Add to Album Button
      const albumBtn = document.createElement("button");
      albumBtn.type = "button";
      if (item.used_in_album) {
        albumBtn.className = "btn btn-outline btn-sm";
        albumBtn.textContent = "Đã trong Album";
        albumBtn.disabled = true;
      } else {
        albumBtn.className = "btn btn-secondary btn-sm";
        albumBtn.textContent = "+ Album";
        albumBtn.addEventListener("click", () => addImageToAlbum(item.id));
      }

      // 3. Delete Button
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-outline btn-sm";
      deleteBtn.textContent = "Xóa";

      const isUsed = item.used_in_cover || item.used_in_album || item.used_in_venue;
      if (isUsed) {
        deleteBtn.disabled = true;
        deleteBtn.title = "Không thể xóa ảnh đang được sử dụng";
      } else {
        deleteBtn.addEventListener("click", () => deleteImage(item.id, item.original_name));
      }

      actions.appendChild(coverBtn);
      actions.appendChild(albumBtn);
      actions.appendChild(deleteBtn);

      body.appendChild(name);
      body.appendChild(meta);
      body.appendChild(badges);
      body.appendChild(actions);

      card.appendChild(imgWrap);
      card.appendChild(body);
      mediaLibraryGrid.appendChild(card);
    });
  }

  async function assignMediaSlot(slotName, imageId) {
    try {
      const res = await adminFetch("/api/admin/media/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_name: slotName, image_id: imageId })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể cập nhật vị trí ảnh.", true);
        return;
      }
      showToast(data.message || "Đã cập nhật vị trí ảnh thành công.");
      await Promise.all([loadStats(), loadMediaLibrary()]);
    } catch {
      showToast("Lỗi khi cập nhật vị trí ảnh.", true);
    }
  }

  async function addImageToAlbum(imageId) {
    try {
      const res = await adminFetch("/api/admin/album", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: imageId })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể thêm ảnh vào Album.", true);
        return;
      }
      showToast(data.message || "Đã thêm ảnh vào Album cưới.");
      await Promise.all([loadStats(), loadMediaLibrary(), loadAlbumItems()]);
    } catch {
      showToast("Lỗi khi thêm ảnh vào Album.", true);
    }
  }

  async function deleteImage(imageId, filename) {
    if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn hình ảnh "${filename}" không? Hành động này không thể hoàn tác.`)) {
      return;
    }
    try {
      const res = await adminFetch(`/api/admin/images/${imageId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể xóa hình ảnh.", true);
        return;
      }
      showToast(data.message || "Đã xóa ảnh thành công.");
      await Promise.all([loadStats(), loadMediaLibrary()]);
    } catch {
      showToast("Lỗi khi gửi yêu cầu xóa ảnh.", true);
    }
  }

  // 6. Album Management Functions
  async function loadAlbumItems() {
    mediaAlbumGrid.innerHTML = '<div class="empty-state">Đang tải danh sách Album cưới...</div>';
    try {
      const res = await adminFetch("/api/admin/album");
      if (!res.ok) {
        mediaAlbumGrid.innerHTML = '<div class="empty-state">Không thể tải Album cưới.</div>';
        return;
      }
      const data = await res.json();
      mediaState.album = data.data || [];
      renderAlbumItems();
    } catch {
      mediaAlbumGrid.innerHTML = '<div class="empty-state">Lỗi kết nối khi tải Album cưới.</div>';
    }
  }

  function renderAlbumItems() {
    const list = mediaState.album;
    if (list.length === 0) {
      mediaAlbumGrid.innerHTML = '<div class="empty-state">Chưa có ảnh nào trong Album cưới. Hãy chuyển sang tab "Thư viện ảnh" và chọn "+ Album"!</div>';
      return;
    }

    mediaAlbumGrid.innerHTML = "";
    list.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "album-card";

      const thumb = document.createElement("img");
      thumb.className = "album-card-thumb";
      thumb.src = item.url;
      thumb.alt = item.caption || item.alt_text || item.original_name;
      thumb.loading = "lazy";

      const details = document.createElement("div");
      details.className = "album-card-details";

      const orderBadge = document.createElement("p");
      orderBadge.className = "album-order-badge";
      orderBadge.textContent = `Vị trí #${index + 1}`;

      const captionP = document.createElement("p");
      captionP.className = "album-card-caption";
      captionP.textContent = item.caption || item.original_name;
      captionP.title = item.caption || item.original_name;

      const actions = document.createElement("div");
      actions.className = "album-card-actions";

      // Move Up
      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "btn btn-outline btn-sm";
      upBtn.textContent = "▲ Lên";
      upBtn.disabled = index === 0;
      upBtn.addEventListener("click", () => moveAlbumItem(index, -1));

      // Move Down
      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "btn btn-outline btn-sm";
      downBtn.textContent = "▼ Xuống";
      downBtn.disabled = index === list.length - 1;
      downBtn.addEventListener("click", () => moveAlbumItem(index, 1));

      // Toggle Visibility
      const visBtn = document.createElement("button");
      visBtn.type = "button";
      visBtn.className = item.is_visible ? "btn btn-secondary btn-sm" : "btn btn-outline btn-sm";
      visBtn.textContent = item.is_visible ? "👁 Đang hiện" : "🙈 Đã ẩn";
      visBtn.addEventListener("click", () => toggleAlbumVisibility(item.id, !item.is_visible));

      // Remove from Album
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-outline btn-sm";
      removeBtn.textContent = "Gỡ khỏi album";
      removeBtn.addEventListener("click", () => removeAlbumItem(item.id));

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      actions.appendChild(visBtn);
      actions.appendChild(removeBtn);

      details.appendChild(orderBadge);
      details.appendChild(captionP);
      details.appendChild(actions);

      card.appendChild(thumb);
      card.appendChild(details);
      mediaAlbumGrid.appendChild(card);
    });
  }

  async function moveAlbumItem(index, offset) {
    const list = [...mediaState.album];
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    mediaState.album = list;
    renderAlbumItems();

    try {
      const itemIds = list.map(x => x.id);
      const res = await adminFetch("/api/admin/album/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_ids: itemIds })
      });
      if (!res.ok) {
        showToast("Không thể lưu thứ tự album.", true);
        await loadAlbumItems();
      } else {
        showToast("Đã lưu thứ tự Album thành công.");
      }
    } catch {
      showToast("Lỗi kết nối khi lưu thứ tự album.", true);
    }
  }

  async function toggleAlbumVisibility(albumItemId, nextVisible) {
    try {
      const res = await adminFetch(`/api/admin/album/${albumItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_visible: nextVisible })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể cập nhật trạng thái hiển thị.", true);
        return;
      }
      showToast(nextVisible ? "Ảnh đã được bật hiển thị trên thiệp cưới." : "Ảnh đã được ẩn khỏi thiệp cưới.");
      await Promise.all([loadStats(), loadAlbumItems()]);
    } catch {
      showToast("Lỗi khi cập nhật trạng thái hiển thị.", true);
    }
  }

  async function removeAlbumItem(albumItemId) {
    if (!confirm("Gỡ ảnh này khỏi Album cưới? (Ảnh gốc vẫn sẽ được lưu trữ an toàn trong Thư viện)")) {
      return;
    }
    try {
      const res = await adminFetch(`/api/admin/album/${albumItemId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể gỡ ảnh khỏi album.", true);
        return;
      }
      showToast(data.message || "Đã gỡ ảnh khỏi album cưới.");
      await Promise.all([loadStats(), loadAlbumItems(), loadMediaLibrary()]);
    } catch {
      showToast("Lỗi khi gỡ ảnh khỏi album.", true);
    }
  }

  // 7. Upload Previews and Submission
  function handleFilesSelected(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const validFiles = [];

    for (const f of files) {
      if (!allowedTypes.includes(f.type)) {
        showToast(`File "${f.name}" không hợp lệ. Chỉ chấp nhận JPEG, PNG, WebP.`, true);
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        showToast(`File "${f.name}" quá lớn (${formatBytes(f.size)}). Tối đa 5MB.`, true);
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) return;

    if (selectedFilesToUpload.length + validFiles.length > 10) {
      showToast("Chỉ được chọn tối đa 10 ảnh trong một lần tải lên.", true);
      return;
    }

    selectedFilesToUpload.push(...validFiles);
    renderUploadPreviews();
  }

  function renderUploadPreviews() {
    if (selectedFilesToUpload.length === 0) {
      uploadPreviewArea.hidden = true;
      uploadPreviewGrid.innerHTML = "";
      previewCount.textContent = "0";
      return;
    }

    uploadPreviewArea.hidden = false;
    previewCount.textContent = selectedFilesToUpload.length.toString();
    uploadPreviewGrid.innerHTML = "";

    selectedFilesToUpload.forEach((file, idx) => {
      const item = document.createElement("div");
      item.className = "preview-item";

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = file.name;

      const info = document.createElement("div");
      info.className = "preview-item-info";
      info.textContent = `${file.name} (${formatBytes(file.size)})`;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "preview-item-remove";
      removeBtn.setAttribute("aria-label", `Bỏ chọn ${file.name}`);
      removeBtn.innerHTML = "&times;";
      removeBtn.addEventListener("click", () => {
        selectedFilesToUpload.splice(idx, 1);
        renderUploadPreviews();
      });

      item.appendChild(img);
      item.appendChild(info);
      item.appendChild(removeBtn);
      uploadPreviewGrid.appendChild(item);
    });
  }

  async function executeUpload() {
    if (selectedFilesToUpload.length === 0) return;

    uploadConfirmBtn.disabled = true;
    uploadCancelBtn.disabled = true;
    const btnText = uploadConfirmBtn.querySelector(".btn-text");
    const btnSpinner = uploadConfirmBtn.querySelector(".btn-spinner");
    btnText.textContent = "Đang tải lên...";
    btnSpinner.hidden = false;

    const formData = new FormData();
    selectedFilesToUpload.forEach(file => {
      formData.append("files", file);
    });

    try {
      const token = sessionStorage.getItem("admin_token");
      const headers = new Headers();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
        headers.set("X-Admin-Token", token);
      }
      headers.set("X-Requested-With", "XMLHttpRequest");

      const res = await fetch("/api/admin/images/upload", {
        method: "POST",
        credentials: "include",
        headers,
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Tải lên ảnh thất bại.", true);
        return;
      }

      showToast(data.message || `Đã tải lên thành công ${selectedFilesToUpload.length} hình ảnh.`);
      selectedFilesToUpload = [];
      renderUploadPreviews();
      mediaFileInput.value = "";
      await Promise.all([loadStats(), loadMediaLibrary()]);
    } catch {
      showToast("Lỗi kết nối khi tải lên ảnh.", true);
    } finally {
      uploadConfirmBtn.disabled = false;
      uploadCancelBtn.disabled = false;
      btnText.textContent = "Bắt đầu tải lên";
      btnSpinner.hidden = true;
    }
  }

  // ==========================================
  // 8. Content Management (Nội Dung Thiệp)
  // ==========================================
  let activeScheduleList = [];

  function renderScheduleRows() {
    scheduleItemsList.innerHTML = "";
    if (!activeScheduleList.length) {
      scheduleItemsList.innerHTML = '<div class="schedule-empty">Chưa có mốc thời gian nào. Hãy nhấn "+ Thêm mốc sự kiện" để bổ sung.</div>';
      return;
    }

    activeScheduleList.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "schedule-item-row";

      const timeInput = document.createElement("input");
      timeInput.type = "text";
      timeInput.className = "form-input schedule-time-input";
      timeInput.placeholder = "Giờ (11:00)";
      timeInput.value = item.time || "";
      timeInput.setAttribute("aria-label", "Thời gian");
      timeInput.addEventListener("input", (e) => {
        activeScheduleList[index].time = e.target.value;
      });

      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.className = "form-input schedule-title-input";
      titleInput.placeholder = "Tiêu đề sự kiện";
      titleInput.value = item.title || "";
      titleInput.setAttribute("aria-label", "Tiêu đề sự kiện");
      titleInput.addEventListener("input", (e) => {
        activeScheduleList[index].title = e.target.value;
      });

      const descInput = document.createElement("input");
      descInput.type = "text";
      descInput.className = "form-input schedule-desc-input";
      descInput.placeholder = "Mô tả chi tiết";
      descInput.value = item.description || "";
      descInput.setAttribute("aria-label", "Mô tả chi tiết");
      descInput.addEventListener("input", (e) => {
        activeScheduleList[index].description = e.target.value;
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "schedule-item-del-btn";
      delBtn.innerHTML = "✕";
      delBtn.title = "Xóa mốc sự kiện này";
      delBtn.setAttribute("aria-label", "Xóa mốc sự kiện");
      delBtn.addEventListener("click", () => {
        activeScheduleList.splice(index, 1);
        renderScheduleRows();
      });

      row.appendChild(timeInput);
      row.appendChild(titleInput);
      row.appendChild(descInput);
      row.appendChild(delBtn);

      scheduleItemsList.appendChild(row);
    });
  }

  async function loadAdminContent() {
    try {
      const res = await adminFetch("/api/admin/content");
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success || !json.data) return;

      const d = json.data;
      contentGroomName.value = d.groom_name || "";
      contentBrideName.value = d.bride_name || "";
      contentEventDateText.value = d.event_date_text || "";
      contentLunarDateText.value = d.lunar_date_text || "";

      if (d.event_date_iso) {
        try {
          const dt = new Date(d.event_date_iso);
          if (!isNaN(dt.getTime())) {
            const pad = (n) => String(n).padStart(2, "0");
            const localIso = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
            contentEventDateIso.value = localIso;
          }
        } catch {
          contentEventDateIso.value = "";
        }
      } else {
        contentEventDateIso.value = "";
      }

      contentInvitationTitle.value = d.invitation_title || "";
      contentInvitationCopy.value = d.invitation_copy || "";
      contentVenueName.value = d.venue_name || "";
      contentVenueNote.value = d.venue_note || "";
      contentVenueAddress.value = d.venue_address || "";
      contentMapUrl.value = d.map_url || "";
      contentClosingHeading.value = d.closing_heading || "";
      contentClosingNames.value = d.closing_names || "";
      contentClosingDate.value = d.closing_date || "";

      activeScheduleList = Array.isArray(d.schedule) ? [...d.schedule] : [];
      renderScheduleRows();
    } catch (err) {
      console.warn("Failed to load content:", err);
    }
  }

  async function saveAdminContent(triggerBtn) {
    const groom_name = contentGroomName.value.trim();
    const bride_name = contentBrideName.value.trim();

    if (!groom_name || !bride_name) {
      showToast("Tên cô dâu và chú rể không được để trống.", true);
      return;
    }

    const payload = {
      groom_name,
      bride_name,
      event_date_text: contentEventDateText.value.trim(),
      lunar_date_text: contentLunarDateText.value.trim(),
      event_date_iso: contentEventDateIso.value ? new Date(contentEventDateIso.value).toISOString() : "",
      invitation_title: contentInvitationTitle.value.trim(),
      invitation_copy: contentInvitationCopy.value.trim(),
      venue_name: contentVenueName.value.trim(),
      venue_note: contentVenueNote.value.trim(),
      venue_address: contentVenueAddress.value.trim(),
      map_url: contentMapUrl.value.trim(),
      schedule: activeScheduleList.filter(item => item.time || item.title || item.description),
      closing_heading: contentClosingHeading.value.trim(),
      closing_names: contentClosingNames.value.trim(),
      closing_date: contentClosingDate.value.trim()
    };

    setButtonLoading(triggerBtn, true);
    try {
      const res = await adminFetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "Không thể lưu nội dung thiệp.", true);
        return;
      }
      showToast("Lưu nội dung thiệp thành công!");
    } catch (err) {
      showToast("Đã xảy ra lỗi khi lưu nội dung thiệp.", true);
    } finally {
      setButtonLoading(triggerBtn, false);
    }
  }

  // ==========================================
  // 9. Banking & VietQR Management (Mừng Cưới)
  // ==========================================
  let supportedBanksList = [];

  function populateBankSelect(selectEl, selectedBin) {
    selectEl.innerHTML = '<option value="">-- Chọn ngân hàng --</option>';
    supportedBanksList.forEach((b) => {
      const opt = document.createElement("option");
      opt.value = b.bin;
      opt.textContent = `${b.shortName} - ${b.name}`;
      if (b.bin === selectedBin) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  function updateLiveQrPreview(role) {
    const isGroom = role === "groom";
    const bin = isGroom ? bankGroomBin.value : bankBrideBin.value;
    const accNum = isGroom ? bankGroomAccountNumber.value.trim() : bankBrideAccountNumber.value.trim();
    const holder = isGroom ? bankGroomAccountHolder.value.trim() : bankBrideAccountHolder.value.trim();
    const note = isGroom ? bankGroomTransferNote.value.trim() : bankBrideTransferNote.value.trim();
    const qrBox = isGroom ? bankGroomQrBox : bankBrideQrBox;

    if (!bin || !accNum || accNum.length < 6) {
      qrBox.innerHTML = '<span class="qr-placeholder-text">Điền đủ ngân hàng & số tài khoản để tạo mã QR</span>';
      return;
    }

    const cleanHolder = holder
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

    const cleanNote = (note || "Mung cuoi")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase()
      .slice(0, 50);

    const params = new URLSearchParams();
    if (cleanHolder) params.set("accountName", cleanHolder);
    if (cleanNote) params.set("addInfo", cleanNote);

    const qrUrl = `https://img.vietqr.io/image/${bin}-${encodeURIComponent(accNum)}-compact2.png?${params.toString()}`;

    qrBox.innerHTML = `<img src="${qrUrl}" alt="Mã VietQR xem trước" loading="lazy">`;
  }

  async function loadAdminBanking() {
    try {
      const res = await adminFetch("/api/admin/banking");
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success || !json.data) return;

      const { accounts, supported_banks } = json.data;
      supportedBanksList = supported_banks || [];

      const groom = accounts.find((a) => a.role === "groom") || {};
      const bride = accounts.find((a) => a.role === "bride") || {};

      populateBankSelect(bankGroomBin, groom.bank_bin);
      bankGroomEnabled.checked = Boolean(groom.enabled);
      bankGroomAccountNumber.value = groom.account_number || "";
      bankGroomAccountHolder.value = groom.account_holder || "";
      bankGroomTransferNote.value = groom.transfer_note || "Mung cuoi Chu Re";
      updateLiveQrPreview("groom");

      populateBankSelect(bankBrideBin, bride.bank_bin);
      bankBrideEnabled.checked = Boolean(bride.enabled);
      bankBrideAccountNumber.value = bride.account_number || "";
      bankBrideAccountHolder.value = bride.account_holder || "";
      bankBrideTransferNote.value = bride.transfer_note || "Mung cuoi Co Dau";
      updateLiveQrPreview("bride");
    } catch (err) {
      console.warn("Failed to load banking:", err);
    }
  }

  async function saveAdminBanking(triggerBtn) {
    const groomAcc = {
      role: "groom",
      enabled: bankGroomEnabled.checked,
      bank_bin: bankGroomBin.value,
      account_number: bankGroomAccountNumber.value.trim(),
      account_holder: bankGroomAccountHolder.value.trim(),
      transfer_note: bankGroomTransferNote.value.trim()
    };

    const brideAcc = {
      role: "bride",
      enabled: bankBrideEnabled.checked,
      bank_bin: bankBrideBin.value,
      account_number: bankBrideAccountNumber.value.trim(),
      account_holder: bankBrideAccountHolder.value.trim(),
      transfer_note: bankBrideTransferNote.value.trim()
    };

    if (groomAcc.enabled) {
      if (!groomAcc.bank_bin) {
        showToast("Vui lòng chọn ngân hàng cho Chú Rể.", true);
        return;
      }
      if (!groomAcc.account_number || !/^[a-zA-Z0-9]{6,25}$/.test(groomAcc.account_number)) {
        showToast("Số tài khoản Chú Rể không hợp lệ (6-25 ký tự).", true);
        return;
      }
      if (!groomAcc.account_holder) {
        showToast("Vui lòng nhập tên chủ tài khoản Chú Rể.", true);
        return;
      }
    }

    if (brideAcc.enabled) {
      if (!brideAcc.bank_bin) {
        showToast("Vui lòng chọn ngân hàng cho Cô Dâu.", true);
        return;
      }
      if (!brideAcc.account_number || !/^[a-zA-Z0-9]{6,25}$/.test(brideAcc.account_number)) {
        showToast("Số tài khoản Cô Dâu không hợp lệ (6-25 ký tự).", true);
        return;
      }
      if (!brideAcc.account_holder) {
        showToast("Vui lòng nhập tên chủ tài khoản Cô Dâu.", true);
        return;
      }
    }

    setButtonLoading(triggerBtn, true);
    try {
      const res = await adminFetch("/api/admin/banking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts: [groomAcc, brideAcc] })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "Không thể lưu thông tin mừng cưới.", true);
        return;
      }
      showToast("Lưu thông tin mừng cưới thành công!");
      await loadAdminBanking();
    } catch (err) {
      showToast("Đã xảy ra lỗi khi lưu thông tin mừng cưới.", true);
    } finally {
      setButtonLoading(triggerBtn, false);
    }
  }

  // Event Listeners: Login Form
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginAlert.hidden = true;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      loginAlert.textContent = "Vui lòng nhập tên đăng nhập và mật khẩu.";
      loginAlert.hidden = false;
      return;
    }

    loginBtn.disabled = true;
    const btnText = loginBtn.querySelector(".btn-text");
    const btnSpinner = loginBtn.querySelector(".btn-spinner");
    btnText.textContent = "Đang kiểm tra...";
    btnSpinner.hidden = false;

    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        loginAlert.textContent = data.error || "Tên đăng nhập hoặc mật khẩu không chính xác.";
        loginAlert.hidden = false;
        return;
      }

      // Login success
      sessionStorage.setItem("admin_token", data.token);
      showDashboardView(data.username);
      showToast(`Chào mừng trở lại, ${data.username}!`);
    } catch (err) {
      loginAlert.textContent = "Không thể kết nối đến máy chủ. Vui lòng thử lại.";
      loginAlert.hidden = false;
    } finally {
      loginBtn.disabled = false;
      btnText.textContent = "Đăng nhập";
      btnSpinner.hidden = true;
    }
  });

  // Event Listeners: Logout Button
  logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;
    try {
      await adminFetch("/api/admin/session", { method: "DELETE" });
    } catch {}
    sessionStorage.removeItem("admin_token");
    logoutBtn.disabled = false;
    showAuthView();
    showToast("Đã đăng xuất thành công.");
  });

  // Tab switching
  tabRsvps.addEventListener("click", () => setActiveTab("rsvps"));
  tabWishes.addEventListener("click", () => setActiveTab("wishes"));
  tabMedia.addEventListener("click", () => setActiveTab("media"));
  tabContent.addEventListener("click", () => setActiveTab("content"));
  tabBanking.addEventListener("click", () => setActiveTab("banking"));

  // Content Management Event Listeners
  scheduleAddBtn.addEventListener("click", () => {
    activeScheduleList.push({ time: "", title: "", description: "" });
    renderScheduleRows();
  });

  contentRefreshBtn.addEventListener("click", loadAdminContent);
  contentSaveBtn.addEventListener("click", () => saveAdminContent(contentSaveBtn));
  contentSaveBtnBottom.addEventListener("click", () => saveAdminContent(contentSaveBtnBottom));

  // Banking Management Event Listeners
  bankingRefreshBtn.addEventListener("click", loadAdminBanking);
  bankingSaveBtn.addEventListener("click", () => saveAdminBanking(bankingSaveBtn));
  bankingSaveBtnBottom.addEventListener("click", () => saveAdminBanking(bankingSaveBtnBottom));

  [bankGroomBin, bankGroomAccountNumber, bankGroomAccountHolder, bankGroomTransferNote].forEach((el) => {
    if (el) {
      el.addEventListener("input", () => updateLiveQrPreview("groom"));
      el.addEventListener("change", () => updateLiveQrPreview("groom"));
    }
  });

  [bankBrideBin, bankBrideAccountNumber, bankBrideAccountHolder, bankBrideTransferNote].forEach((el) => {
    if (el) {
      el.addEventListener("input", () => updateLiveQrPreview("bride"));
      el.addEventListener("change", () => updateLiveQrPreview("bride"));
    }
  });

  // Media Subtabs switching
  subtabLibBtn.addEventListener("click", () => {
    subtabLibBtn.classList.add("active");
    subtabAlbumBtn.classList.remove("active");
    subtabLibView.hidden = false;
    subtabAlbumView.hidden = true;
  });

  subtabAlbumBtn.addEventListener("click", () => {
    subtabAlbumBtn.classList.add("active");
    subtabLibBtn.classList.remove("active");
    subtabAlbumView.hidden = false;
    subtabLibView.hidden = true;
    loadAlbumItems();
  });

  // Media filters
  mediaFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      mediaFilterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mediaState.filter = btn.getAttribute("data-media-filter");
      renderMediaLibrary();
    });
  });

  mediaRefreshBtn.addEventListener("click", () => {
    loadStats();
    loadMediaLibrary();
  });

  albumRefreshBtn.addEventListener("click", () => {
    loadStats();
    loadAlbumItems();
  });

  // Upload Dropzone & Browse button
  mediaBrowseBtn.addEventListener("click", () => {
    mediaFileInput.click();
  });

  uploadDropzone.addEventListener("click", (e) => {
    if (e.target !== mediaBrowseBtn) {
      mediaFileInput.click();
    }
  });

  mediaFileInput.addEventListener("change", (e) => {
    handleFilesSelected(e.target.files);
  });

  uploadDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadDropzone.classList.add("dragover");
  });

  uploadDropzone.addEventListener("dragleave", () => {
    uploadDropzone.classList.remove("dragover");
  });

  uploadDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadDropzone.classList.remove("dragover");
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  });

  uploadConfirmBtn.addEventListener("click", executeUpload);
  uploadCancelBtn.addEventListener("click", () => {
    selectedFilesToUpload = [];
    renderUploadPreviews();
    mediaFileInput.value = "";
  });

  // RSVP Filters & Pagination
  rsvpFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      rsvpFilterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      rsvpState.filter = btn.getAttribute("data-rsvp-filter");
      rsvpState.page = 1;
      loadRsvps();
    });
  });

  let rsvpSearchTimeout = null;
  rsvpSearchInput.addEventListener("input", () => {
    if (rsvpSearchTimeout) clearTimeout(rsvpSearchTimeout);
    rsvpSearchTimeout = setTimeout(() => {
      rsvpState.search = rsvpSearchInput.value.trim();
      rsvpState.page = 1;
      loadRsvps();
    }, 400);
  });

  rsvpRefreshBtn.addEventListener("click", () => {
    loadStats();
    loadRsvps();
  });

  rsvpPrevBtn.addEventListener("click", () => {
    if (rsvpState.page > 1) {
      rsvpState.page--;
      loadRsvps();
    }
  });

  rsvpNextBtn.addEventListener("click", () => {
    if (rsvpState.page < rsvpState.totalPages) {
      rsvpState.page++;
      loadRsvps();
    }
  });

  // Wishes Filters & Pagination
  wishFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      wishFilterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      wishState.filter = btn.getAttribute("data-wish-filter");
      wishState.page = 1;
      loadWishes();
    });
  });

  let wishSearchTimeout = null;
  wishSearchInput.addEventListener("input", () => {
    if (wishSearchTimeout) clearTimeout(wishSearchTimeout);
    wishSearchTimeout = setTimeout(() => {
      wishState.search = wishSearchInput.value.trim();
      wishState.page = 1;
      loadWishes();
    }, 400);
  });

  wishRefreshBtn.addEventListener("click", () => {
    loadStats();
    loadWishes();
  });

  wishPrevBtn.addEventListener("click", () => {
    if (wishState.page > 1) {
      wishState.page--;
      loadWishes();
    }
  });

  wishNextBtn.addEventListener("click", () => {
    if (wishState.page < wishState.totalPages) {
      wishState.page++;
      loadWishes();
    }
  });

  // Initial Auth Check
  async function checkInitialAuth() {
    try {
      const res = await adminFetch("/api/admin/session", { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          showDashboardView(data.username);
          return;
        }
      }
    } catch {}
    showAuthView();
  }

  checkInitialAuth();
});
