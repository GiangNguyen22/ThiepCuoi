document.documentElement.classList.add('js');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let weddingDate = new Date('2026-11-28T00:00:00+07:00');
const countdownParts = {
  days: document.querySelector('[data-days]'),
  hours: document.querySelector('[data-hours]'),
  minutes: document.querySelector('[data-minutes]'),
};

function updateCountdown() {
  const remaining = Math.max(0, weddingDate.getTime() - Date.now());
  const totalMinutes = Math.floor(remaining / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  countdownParts.days.textContent = String(days).padStart(2, '0');
  countdownParts.hours.textContent = String(hours).padStart(2, '0');
  countdownParts.minutes.textContent = String(minutes).padStart(2, '0');
}

updateCountdown();
window.setInterval(updateCountdown, 60000);

const toast = document.querySelector('[data-toast]');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function getShareUrlInfo() {
  const canonicalEl = document.querySelector('link[rel="canonical"]');
  const canonicalHref = canonicalEl ? canonicalEl.getAttribute('href')?.trim() : '';

  const isLocalHost = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.protocol === 'file:';

  // Live production environment:
  if (!isLocalHost && window.location.protocol.startsWith('http')) {
    const liveUrl = window.location.origin + window.location.pathname;
    return {
      url: liveUrl,
      displayUrl: liveUrl,
      isLocal: false,
      isConfigured: true,
      source: 'live'
    };
  }

  // Local environment with a valid production canonical URL configured:
  const hasValidCanonical = canonicalHref &&
                            !canonicalHref.includes('localhost') &&
                            !canonicalHref.includes('127.0.0.1') &&
                            canonicalHref.startsWith('http');

  if (hasValidCanonical) {
    return {
      url: canonicalHref,
      displayUrl: canonicalHref,
      isLocal: isLocalHost,
      isConfigured: true,
      source: 'canonical'
    };
  }

  // Local without configured canonical production URL:
  return {
    url: isLocalHost ? window.location.href : '',
    displayUrl: isLocalHost ? window.location.href : 'Chưa cấu hình URL',
    isLocal: isLocalHost,
    isConfigured: false,
    source: 'unconfigured'
  };
}

async function copyToClipboard(text) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

async function shareInvitation() {
  const urlInfo = getShareUrlInfo();
  const targetUrl = urlInfo.url || window.location.href;

  const shareData = {
    title: document.title,
    text: 'Văn Hiền & Thu Hà trân trọng kính mời bạn đến chung vui.',
    url: targetUrl,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }

  const copied = await copyToClipboard(targetUrl);
  if (copied) {
    showToast('Đã sao chép đường link thiệp cưới.');
  } else {
    showToast('Trình duyệt không thể chia sẻ đường link này.');
  }
}

document.querySelectorAll('[data-share]').forEach((button) => {
  button.addEventListener('click', shareInvitation);
});

const qrDialog = document.querySelector('[data-qr-dialog]');
const qrGraphicWrap = document.querySelector('[data-qr-graphic-wrap]');
const qrGraphic = document.querySelector('[data-qr-graphic]');
const qrUrlText = document.querySelector('[data-qr-url-text]');
const qrLocalWarning = document.querySelector('[data-qr-local-warning]');
const qrUnconfiguredAlert = document.querySelector('[data-qr-unconfigured-alert]');
const qrDownloadBtn = document.querySelector('[data-qr-download]');
const qrCopyBtn = document.querySelector('[data-qr-copy-btn]');
let activeQrOpener = null;

function renderQrCode() {
  if (!qrDialog || typeof window.qrcode !== 'function') return;

  const urlInfo = getShareUrlInfo();
  if (qrUrlText) {
    qrUrlText.textContent = urlInfo.displayUrl;
    qrUrlText.title = urlInfo.displayUrl;
  }

  if (urlInfo.isConfigured) {
    if (qrGraphicWrap) qrGraphicWrap.hidden = false;
    if (qrDownloadBtn) qrDownloadBtn.hidden = false;
    if (qrUnconfiguredAlert) qrUnconfiguredAlert.hidden = true;
    if (qrLocalWarning) qrLocalWarning.hidden = !urlInfo.isLocal;

    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(urlInfo.url);
      qr.make();
      qrGraphic.innerHTML = qr.createSvgTag(5, 8);
    } catch {
      qrGraphic.textContent = 'Không thể tạo mã QR cho đường link này.';
    }
  } else {
    if (qrGraphicWrap) qrGraphicWrap.hidden = true;
    if (qrDownloadBtn) qrDownloadBtn.hidden = true;
    if (qrLocalWarning) qrLocalWarning.hidden = true;
    if (qrUnconfiguredAlert) qrUnconfiguredAlert.hidden = false;
  }
}

function downloadQrImage() {
  const urlInfo = getShareUrlInfo();
  if (!urlInfo.isConfigured || typeof window.qrcode !== 'function') return;

  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(urlInfo.url);
    qr.make();

    const moduleCount = qr.getModuleCount();
    const cellSize = 8;
    const margin = 32;
    const canvasSize = moduleCount * cellSize + margin * 2;
    const footerHeight = 56;

    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize + footerHeight;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // QR Cells
    ctx.fillStyle = '#203b33';
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize, cellSize);
        }
      }
    }

    // Outer subtle border
    ctx.strokeStyle = 'rgba(32, 59, 51, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);

    // Captions
    ctx.fillStyle = '#203b33';
    ctx.font = '600 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Văn Hiền & Thu Hà — Thiệp cưới', canvasSize / 2, canvasSize + 24);

    ctx.fillStyle = '#6e7e77';
    ctx.font = '11px sans-serif';
    ctx.fillText('Quét mã để mở trang thiệp cưới', canvasSize / 2, canvasSize + 42);

    const link = document.createElement('a');
    link.download = 'thiep-cuoi-van-hien-thu-ha-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Đang tải ảnh mã QR thiệp cưới...');
  } catch {
    showToast('Không thể tạo file ảnh tải về.');
  }
}

function openQrDialog(triggerBtn) {
  if (!qrDialog || typeof qrDialog.showModal !== 'function') return;
  activeQrOpener = triggerBtn || null;
  renderQrCode();
  qrDialog.showModal();
}

function closeQrDialog() {
  if (qrDialog && qrDialog.open) {
    qrDialog.close();
  }
}

document.querySelectorAll('[data-qr-open]').forEach((btn) => {
  btn.addEventListener('click', () => openQrDialog(btn));
});

document.querySelectorAll('[data-qr-close]').forEach((btn) => {
  btn.addEventListener('click', closeQrDialog);
});

if (qrDialog) {
  qrDialog.addEventListener('click', (event) => {
    if (!event.target.closest('.qr-dialog__card')) closeQrDialog();
  });
  qrDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeQrDialog();
  });
  qrDialog.addEventListener('close', () => {
    activeQrOpener?.focus();
    activeQrOpener = null;
  });
}

if (qrDownloadBtn) {
  qrDownloadBtn.addEventListener('click', downloadQrImage);
}

if (qrCopyBtn) {
  qrCopyBtn.addEventListener('click', async () => {
    const urlInfo = getShareUrlInfo();
    const copyTarget = urlInfo.url || window.location.href;
    const copied = await copyToClipboard(copyTarget);
    if (copied) {
      showToast('Đã sao chép liên kết thiệp cưới.');
    } else {
      showToast('Không thể sao chép liên kết.');
    }
  });
}

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

// ==========================================
// LARGE WEDDING PHOTO SLIDESHOW & LIGHTBOX MODULE
// ==========================================
const lightbox = document.querySelector('[data-lightbox]');
const lightboxImage = document.querySelector('[data-lightbox-image]');
const lightboxError = document.querySelector('[data-lightbox-error]');
const lightboxCaption = document.querySelector('[data-lightbox-caption]');
const lightboxCount = document.querySelector('[data-lightbox-count]');
const lightboxPrevious = document.querySelector('[data-lightbox-previous]');
const lightboxNext = document.querySelector('[data-lightbox-next]');
const lightboxCloseBtn = document.querySelector('[data-lightbox-close]');

let activeLightboxIndex = 0;
let activeTriggerElement = null;
let lightboxTouchStartX = 0;
let lightboxTouchStartY = 0;

const weddingSlideshow = (() => {
  const container = document.querySelector('[data-slideshow]') || document.querySelector('[data-editorial-gallery]') || document.querySelector('[data-carousel]');
  const stage = document.querySelector('[data-slideshow-stage]') || document.querySelector('[data-gallery-viewport]') || document.querySelector('[data-carousel-stage]');
  const track = document.querySelector('[data-slideshow-track]') || document.querySelector('[data-gallery-track]') || document.querySelector('[data-carousel-track]');
  const prevBtn = document.querySelector('[data-slideshow-prev]') || document.querySelector('[data-gallery-prev]') || document.querySelector('[data-carousel-prev]');
  const nextBtn = document.querySelector('[data-slideshow-next]') || document.querySelector('[data-gallery-next]') || document.querySelector('[data-carousel-next]');
  const dotsContainer = document.querySelector('[data-slideshow-dots]') || document.querySelector('[data-carousel-dots]');
  const counterCurrent = document.querySelector('[data-counter-current]');
  const counterTotal = document.querySelector('[data-counter-total]');
  const titleDisplay = document.querySelector('[data-slideshow-title]');
  const toggleBtn = document.querySelector('[data-slideshow-toggle]');
  const toggleIcon = document.querySelector('[data-toggle-icon]');
  const emptyMessage = document.querySelector('[data-gallery-empty]');

  let currentIndex = 0;
  let slides = [];
  let items = []; // [{ src, caption, alt, index }]
  let autoplayTimer = null;
  const autoplayDelay = 3000; // 3.0 seconds per slide
  let isHoveringControls = false;
  let isPausedManually = false;
  let isLightboxOpen = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initFromDOM() {
    slides = Array.from(track ? track.querySelectorAll('.slideshow-slide, .editorial-card, .carousel-slide') : []);
    items = slides.map((slide, idx) => {
      const img = slide.querySelector('img');
      const caption = slide.querySelector('.slideshow-slide__badge')?.textContent.trim()
        || slide.getAttribute('aria-label')
        || '';
      const src = img?.getAttribute('src') || '';
      const alt = img?.getAttribute('alt') || caption || 'Khoảnh khắc cưới';
      return { src, caption: img?.getAttribute('alt') || caption, alt, index: idx };
    });

    if (items.length === 0) {
      if (emptyMessage) emptyMessage.hidden = false;
      return;
    }
    if (emptyMessage) emptyMessage.hidden = true;

    renderDots();
    updateCounter();
    updateSlideDisplay();
    bindEvents();
    startAutoplay();
  }

  function renderDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    items.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `slideshow-dot ${idx === currentIndex ? 'is-active' : ''}`;
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Xem ảnh số ${idx + 1}`);
      dot.setAttribute('aria-selected', String(idx === currentIndex));
      dot.addEventListener('click', () => {
        goTo(idx);
        restartAutoplayTimer();
      });
      dotsContainer.appendChild(dot);
    });
  }

  function updateCounter() {
    if (counterCurrent) counterCurrent.textContent = String(items.length > 0 ? currentIndex + 1 : 0);
    if (counterTotal) counterTotal.textContent = String(items.length);
    if (emptyMessage) emptyMessage.hidden = items.length > 0;
  }

  function updateSlideDisplay(prevIndex = -1) {
    slides.forEach((slide, idx) => {
      slide.classList.remove('is-leaving');
      if (idx === currentIndex) {
        slide.classList.add('is-active');
        slide.setAttribute('aria-hidden', 'false');
      } else if (idx === prevIndex) {
        slide.classList.remove('is-active');
        slide.classList.add('is-leaving');
        slide.setAttribute('aria-hidden', 'true');
      } else {
        slide.classList.remove('is-active');
        slide.setAttribute('aria-hidden', 'true');
      }
    });

    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.slideshow-dot');
      dots.forEach((dot, idx) => {
        const isActive = idx === currentIndex;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-selected', String(isActive));
      });
    }

    if (counterCurrent) {
      counterCurrent.textContent = String(currentIndex + 1);
    }

    if (titleDisplay && items[currentIndex]) {
      titleDisplay.style.opacity = '0';
      setTimeout(() => {
        if (items[currentIndex]) {
          titleDisplay.textContent = items[currentIndex].caption || items[currentIndex].alt || `Khoảnh khắc ${currentIndex + 1}`;
          titleDisplay.style.opacity = '1';
        }
      }, 200);
    }
  }

  function goTo(index) {
    if (items.length === 0) return;
    const prevIndex = currentIndex;
    if (index >= items.length) {
      currentIndex = 0;
    } else if (index < 0) {
      currentIndex = items.length - 1;
    } else {
      currentIndex = index;
    }

    if (prevIndex === currentIndex && slides.some(s => s.classList.contains('is-active'))) {
      return;
    }

    updateSlideDisplay(prevIndex);
  }

  function next() {
    goTo(currentIndex + 1);
  }

  function prev() {
    goTo(currentIndex - 1);
  }

  function startAutoplay() {
    stopAutoplay();
    if (isPausedManually || items.length <= 1) return;
    autoplayTimer = window.setInterval(() => {
      if (!isLightboxOpen && !isPausedManually && !isHoveringControls && !isSwiping) {
        next();
      }
    }, autoplayDelay);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function restartAutoplayTimer() {
    stopAutoplay();
    startAutoplay();
  }

  function togglePlayPause() {
    isPausedManually = !isPausedManually;
    if (toggleIcon) {
      toggleIcon.textContent = isPausedManually ? '▶' : '⏸';
    }
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', isPausedManually ? 'Tiếp tục tự động chuyển ảnh' : 'Tạm dừng tự động chuyển ảnh');
    }
    if (isPausedManually) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  }

  function bindEvents() {
    if (!stage) return;

    prevBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      prev();
      restartAutoplayTimer();
    });

    nextBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      next();
      restartAutoplayTimer();
    });

    toggleBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      togglePlayPause();
    });

    // Pause autoplay when hovering navigation controls so users can click comfortably
    [prevBtn, nextBtn, dotsContainer, toggleBtn].forEach(control => {
      if (!control) return;
      control.addEventListener('mouseenter', () => { isHoveringControls = true; });
      control.addEventListener('mouseleave', () => { isHoveringControls = false; });
    });

    // Keyboard navigation when stage has focus
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
        restartAutoplayTimer();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
        restartAutoplayTimer();
      }
    });

    // Touch swipe for mobile
    stage.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length === 0) return;
      isSwiping = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    stage.addEventListener('touchend', (e) => {
      if (!isSwiping) return;
      isSwiping = false;
      const touchEndX = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : touchStartX;
      const touchEndY = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : touchStartY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) >= 40) {
        if (diffX < 0) {
          next();
        } else {
          prev();
        }
        restartAutoplayTimer();
      }
    }, { passive: true });

    bindSlideTriggers();
  }

  function bindSlideTriggers() {
    slides.forEach((slide, idx) => {
      const trigger = slide.querySelector('[data-slideshow-trigger], [data-gallery-trigger]');
      if (trigger) {
        trigger.onclick = (e) => {
          e.preventDefault();
          openLightbox(idx, trigger);
        };
      }
    });
  }

  function loadItems(newItems) {
    if (!Array.isArray(newItems) || newItems.length === 0) return;
    if (!track) return;

    items = newItems.map((item, idx) => ({
      src: item.src || item.url || '',
      caption: item.caption || '',
      alt: item.alt || item.alt_text || item.caption || 'Khoảnh khắc cưới',
      index: idx
    }));

    track.innerHTML = '';
    items.forEach((item, idx) => {
      const slide = document.createElement('figure');
      slide.className = `slideshow-slide ${idx === 0 ? 'is-active' : ''}`;
      slide.setAttribute('data-slide-index', String(idx));
      slide.setAttribute('aria-hidden', String(idx !== 0));

      const safeCaption = escapeHtml(item.caption || item.alt);
      const safeAlt = escapeHtml(item.alt);
      const safeSrc = escapeHtml(item.src);

      slide.innerHTML = `
        <button type="button" class="slideshow-slide__btn" aria-label="Mở xem toàn màn hình: ${safeCaption}" data-slideshow-trigger data-index="${idx}">
          <div class="slideshow-slide__frame">
            <img src="${safeSrc}" alt="${safeAlt}" loading="${idx === 0 ? 'eager' : 'lazy'}" class="slideshow-slide__img">
            <span class="slideshow-slide__badge" aria-hidden="true">
              <span class="badge-icon">⤢</span>
              <span class="badge-text">Xem ảnh lớn</span>
            </span>
          </div>
        </button>
      `;

      track.appendChild(slide);
    });

    slides = Array.from(track.querySelectorAll('.slideshow-slide'));
    currentIndex = 0;
    renderDots();
    updateCounter();
    updateSlideDisplay();
    bindSlideTriggers();
    restartAutoplayTimer();
  }

  function getItems() {
    return items;
  }

  function getCurrentIndex() {
    return currentIndex;
  }

  function setLightboxState(isOpen) {
    isLightboxOpen = isOpen;
    if (isOpen) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  }

  return {
    initFromDOM,
    loadItems,
    goTo,
    next,
    prev,
    getItems,
    getCurrentIndex,
    setLightboxState,
    togglePlayPause
  };
})();

// Aliases for backwards compatibility with all scripts and modules
const editorialGallery = weddingSlideshow;
const weddingCarousel = weddingSlideshow;

// Lightbox controller functions
function renderLightboxImage() {
  const items = weddingCarousel.getItems();
  if (!items || items.length === 0) return;

  const item = items[activeLightboxIndex];
  if (!item) return;

  if (lightboxError) lightboxError.hidden = true;
  if (lightboxImage) {
    lightboxImage.hidden = false;
    lightboxImage.alt = item.alt;
    lightboxImage.onload = () => {
      lightboxImage.hidden = false;
      if (lightboxError) lightboxError.hidden = true;
    };
    lightboxImage.onerror = () => {
      lightboxImage.hidden = true;
      if (lightboxError) {
        lightboxError.hidden = false;
        lightboxError.textContent = `Không thể tải ảnh: ${item.alt}`;
      }
    };
    lightboxImage.src = item.src;
  }

  if (lightboxCaption) lightboxCaption.textContent = item.caption || item.alt;
  if (lightboxCount) lightboxCount.textContent = `${activeLightboxIndex + 1} / ${items.length}`;
  if (lightboxPrevious) lightboxPrevious.disabled = items.length < 2;
  if (lightboxNext) lightboxNext.disabled = items.length < 2;
}

function openLightbox(index, triggerElement = null) {
  const items = weddingCarousel.getItems();
  if (!items || items.length === 0) return;

  activeLightboxIndex = (index >= 0 && index < items.length) ? index : 0;
  activeTriggerElement = triggerElement;

  weddingCarousel.setLightboxState(true);
  document.body.style.overflow = 'hidden';

  renderLightboxImage();

  if (lightbox && typeof lightbox.showModal === 'function') {
    if (!lightbox.open) lightbox.showModal();
  }
}

function closeLightbox() {
  if (lightbox && lightbox.open) {
    lightbox.close();
  }
  document.body.style.overflow = '';
  weddingCarousel.setLightboxState(false);
  weddingCarousel.goTo(activeLightboxIndex, true);

  if (activeTriggerElement) {
    activeTriggerElement.focus();
    activeTriggerElement = null;
  }
}

function lightboxNextPhoto() {
  const items = weddingCarousel.getItems();
  if (items.length <= 1) return;
  activeLightboxIndex = (activeLightboxIndex + 1) % items.length;
  renderLightboxImage();
}

function lightboxPrevPhoto() {
  const items = weddingCarousel.getItems();
  if (items.length <= 1) return;
  activeLightboxIndex = (activeLightboxIndex - 1 + items.length) % items.length;
  renderLightboxImage();
}

// Bind lightbox controls once
if (lightbox) {
  lightboxCloseBtn?.addEventListener('click', closeLightbox);
  lightboxPrevious?.addEventListener('click', lightboxPrevPhoto);
  lightboxNext?.addEventListener('click', lightboxNextPhoto);

  lightbox.addEventListener('click', (e) => {
    if (!e.target.closest('.lightbox__figure, .lightbox__control')) {
      closeLightbox();
    }
  });

  lightbox.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeLightbox();
  });

  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      lightboxPrevPhoto();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      lightboxNextPhoto();
    }
  });

  lightbox.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length === 0) return;
    lightboxTouchStartX = e.touches[0].clientX;
    lightboxTouchStartY = e.touches[0].clientY;
  }, { passive: true });

  lightbox.addEventListener('touchend', (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const diffX = e.changedTouches[0].clientX - lightboxTouchStartX;
    const diffY = e.changedTouches[0].clientY - lightboxTouchStartY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX < 0) {
        lightboxNextPhoto();
      } else {
        lightboxPrevPhoto();
      }
    }
  }, { passive: true });
}

// Initialize Carousel from HTML on page load
weddingCarousel.initFromDOM();

// Fetch dynamic media (cover photo, venue photo, album)
async function loadPublicMedia() {
  try {
    const res = await fetch('/api/media');
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success || !json.data) return;

    const { cover_photo, venue_photo, album } = json.data;

    // 1. Cover Photo
    if (cover_photo && cover_photo.url) {
      const coverImg = document.querySelector('.cover__photo');
      if (coverImg) {
        coverImg.src = cover_photo.url;
        if (cover_photo.alt_text) coverImg.alt = cover_photo.alt_text;
      }
    }

    // 2. Venue Photo
    if (venue_photo && venue_photo.url) {
      const venueImg = document.querySelector('.venue__photo');
      if (venueImg) {
        venueImg.src = venue_photo.url;
        if (venue_photo.alt_text) venueImg.alt = venue_photo.alt_text;
      }
    }

    // 3. Album items
    if (Array.isArray(album) && album.length > 0) {
      weddingCarousel.loadItems(album.map(item => ({
        src: item.url,
        caption: item.caption || '',
        alt: item.alt_text || item.caption || 'Khoảnh khắc cưới'
      })));
    }
  } catch (err) {
    // Non-fatal, keeps static content
  }
}

loadPublicMedia();

// Fetch and apply dynamic wedding content
async function loadPublicContent() {
  try {
    const res = await fetch('/api/content');
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success || !json.data) return;

    const d = json.data;

    // 1. Couple Names
    if (d.groom_name && d.bride_name) {
      const coupleNamesH1 = document.getElementById('couple-names');
      if (coupleNamesH1) {
        coupleNamesH1.innerHTML = `<span>${escapeHtml(d.groom_name)}</span><i aria-hidden="true">&</i><span>${escapeHtml(d.bride_name)}</span>`;
      }

      const heroNames = document.getElementById('main-title');
      if (heroNames) {
        heroNames.innerHTML = `${escapeHtml(d.groom_name)} <span>&</span> ${escapeHtml(d.bride_name)}`;
      }

      const sigNames = document.querySelector('.signature__names');
      if (sigNames) {
        sigNames.textContent = `${d.groom_name} & ${d.bride_name}`;
      }

      const closingNames = document.querySelector('.closing__names');
      if (closingNames) {
        closingNames.innerHTML = `${escapeHtml(d.groom_name)} <span>&</span> ${escapeHtml(d.bride_name)}`;
      }

      const wordmark = document.querySelector('.wordmark');
      if (wordmark) {
        const gInit = d.groom_name.trim().charAt(0).toUpperCase();
        const bInit = d.bride_name.trim().charAt(0).toUpperCase();
        wordmark.innerHTML = `${gInit}<span>&</span>${bInit}`;
      }

      const dateBandOrnament = document.querySelector('.date-band__ornament');
      if (dateBandOrnament) {
        const gInit = d.groom_name.trim().charAt(0).toUpperCase();
        const bInit = d.bride_name.trim().charAt(0).toUpperCase();
        dateBandOrnament.textContent = `${gInit} & ${bInit}`;
      }
    }

    // 2. Date info & countdown
    if (d.event_date_text) {
      const dateBandTitle = document.getElementById('date-title');
      if (dateBandTitle) dateBandTitle.textContent = d.event_date_text;
    }

    if (d.event_date_text || d.lunar_date_text) {
      const coverDate = document.querySelector('.cover__date');
      if (coverDate) {
        const dText = d.event_date_text || '28–29 tháng 11, 2026';
        const lText = d.lunar_date_text || '20–21 tháng 10 âm lịch';
        coverDate.innerHTML = `${escapeHtml(dText)} <span aria-hidden="true">·</span> ${escapeHtml(lText)}`;
      }
    }

    if (d.lunar_date_text) {
      const lunarEl = document.querySelector('.date-band__time');
      if (lunarEl) lunarEl.textContent = d.lunar_date_text;
    }

    if (d.event_date_iso) {
      try {
        const parsed = new Date(d.event_date_iso);
        if (!isNaN(parsed.getTime())) {
          weddingDate = parsed;
          updateCountdown();
        }
      } catch {}
    }

    // 3. Invitation copy
    if (d.invitation_title) {
      const invTitle = document.getElementById('invitation-title');
      if (invTitle) invTitle.textContent = d.invitation_title;
    }

    if (d.invitation_copy) {
      const invCopy = document.querySelector('.invitation__copy');
      if (invCopy) invCopy.textContent = d.invitation_copy;
    }

    // 4. Venue details
    if (d.venue_name) {
      const venueTitle = document.getElementById('venue-title');
      if (venueTitle) venueTitle.textContent = d.venue_name;
    }

    if (d.venue_address) {
      const venueAddr = document.querySelector('.venue__address');
      if (venueAddr) venueAddr.textContent = d.venue_address;
    }

    if (d.venue_note) {
      const venueDesc = document.querySelector('.venue__desc');
      if (venueDesc) venueDesc.textContent = d.venue_note;
    }

    if (d.map_url) {
      const mapLink = document.querySelector('.venue__map-link');
      if (mapLink) {
        mapLink.href = d.map_url;
        mapLink.target = "_blank";
        mapLink.rel = "noreferrer noopener";
      }
    }

    // 5. Schedule timeline
    if (Array.isArray(d.schedule) && d.schedule.length > 0) {
      const timeline = document.querySelector('.timeline');
      if (timeline) {
        timeline.innerHTML = '';
        d.schedule.forEach((item) => {
          const li = document.createElement('li');
          li.className = 'timeline__item reveal is-revealed';

          const time = document.createElement('time');
          time.textContent = item.time || '';

          const div = document.createElement('div');
          const h3 = document.createElement('h3');
          h3.textContent = item.title || '';
          const p = document.createElement('p');
          p.textContent = item.description || '';
          div.appendChild(h3);
          div.appendChild(p);

          const dot = document.createElement('span');
          dot.className = 'timeline__dot';
          dot.setAttribute('aria-hidden', 'true');

          li.appendChild(time);
          li.appendChild(div);
          li.appendChild(dot);
          timeline.appendChild(li);
        });
      }
    }

    // 6. Closing section
    if (d.closing_heading) {
      const closingH2 = document.querySelector('.closing h2');
      if (closingH2) closingH2.textContent = d.closing_heading;
    }

    if (d.closing_names) {
      const closingNames = document.querySelector('.closing__names');
      if (closingNames) closingNames.textContent = d.closing_names;
    }

    if (d.closing_date) {
      const closingDate = document.querySelector('.closing__date');
      if (closingDate) closingDate.textContent = d.closing_date;
    }
  } catch {
    // Non-fatal, preserves bundled static content
  }
}

// Fetch and apply dynamic wedding gift banking & VietQR
async function loadPublicBanking() {
  const giftSection = document.querySelector('[data-gift-section]');
  const giftGrid = document.querySelector('[data-gift-grid]');
  if (!giftSection || !giftGrid) return;

  try {
    const res = await fetch('/api/banking');
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success || !json.data) return;

    const { groom, bride } = json.data;
    const activeAccounts = [];
    if (groom && groom.qr_url) activeAccounts.push({ ...groom, roleLabel: 'Chú Rể' });
    if (bride && bride.qr_url) activeAccounts.push({ ...bride, roleLabel: 'Cô Dâu' });

    if (activeAccounts.length === 0) {
      // Keep section hidden cleanly if no accounts enabled
      giftSection.hidden = true;
      return;
    }

    giftGrid.innerHTML = '';
    activeAccounts.forEach((acc) => {
      const card = document.createElement('article');
      card.className = 'gift__card reveal is-revealed';

      const isBride = acc.role === 'bride';
      const roleBadgeClass = isBride ? 'gift__role-badge gift__role-badge--bride' : 'gift__role-badge';

      card.innerHTML = `
        <span class="${roleBadgeClass}">${escapeHtml(acc.roleLabel)}</span>
        <h3 class="gift__holder-name">${escapeHtml(acc.account_holder)}</h3>
        <p class="gift__bank-name">${escapeHtml(acc.bank_short_name || acc.bank_name)}</p>
        <div class="gift__qr-box">
          <img src="${escapeHtml(acc.qr_url)}" alt="Mã VietQR chuyển khoản mừng cưới ${escapeHtml(acc.roleLabel)}" class="gift__qr-img" loading="lazy">
        </div>
        <div class="gift__account-row">
          <span class="gift__account-num">${escapeHtml(acc.account_number)}</span>
          <button type="button" class="gift__copy-btn" data-copy-acc="${escapeHtml(acc.account_number)}" title="Sao chép số tài khoản">
            <span aria-hidden="true">📋</span> Sao chép
          </button>
        </div>
        <div class="gift__actions">
          <a href="${escapeHtml(acc.qr_url)}" target="_blank" rel="noopener noreferrer" download="VietQR-${escapeHtml(acc.role)}.png" class="btn btn--outline btn--sm gift__download-btn">
            <span aria-hidden="true">↓</span> Tải ảnh QR
          </a>
        </div>
      `;

      // Copy button handler with immediate toast and button feedback
      const copyBtn = card.querySelector('[data-copy-acc]');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(acc.account_number);
            showToast(`Đã sao chép số tài khoản ${acc.account_number}`);
            copyBtn.innerHTML = '<span aria-hidden="true">✓</span> Đã chép';
            setTimeout(() => {
              copyBtn.innerHTML = '<span aria-hidden="true">📋</span> Sao chép';
            }, 2000);
          } catch {
            showToast(`Số tài khoản: ${acc.account_number}`);
          }
        });
      }

      giftGrid.appendChild(card);
    });

    giftSection.hidden = false;
  } catch {
    // Keep section hidden cleanly
    giftSection.hidden = true;
  }
}

loadPublicContent();
loadPublicBanking();

const musicToggle = document.querySelector('[data-music-toggle]');
const musicAudio = document.querySelector('[data-music-audio]');
let isMusicActionPending = false;
let playPromise = null;

function syncMusicUI() {
  if (!musicToggle || !musicAudio) return;
  const isPlaying = !musicAudio.paused && !musicAudio.ended;

  if (isPlaying) {
    musicToggle.classList.add('is-playing');
    musicToggle.classList.remove('is-loading');
    musicToggle.classList.remove('is-error');
    musicToggle.setAttribute('aria-pressed', 'true');
    musicToggle.setAttribute('aria-label', 'Tắt nhạc nền');
    musicToggle.title = 'Tắt nhạc nền';
  } else {
    musicToggle.classList.remove('is-playing');
    musicToggle.setAttribute('aria-pressed', 'false');
    musicToggle.setAttribute('aria-label', 'Bật nhạc nền');
    musicToggle.title = 'Bật nhạc nền';
  }
}

async function toggleMusic() {
  if (!musicToggle || !musicAudio) return;
  if (isMusicActionPending) return;

  isMusicActionPending = true;

  try {
    if (musicAudio.paused) {
      musicToggle.classList.add('is-loading');

      if (!musicAudio.src && musicAudio.dataset.src) {
        musicAudio.src = musicAudio.dataset.src;
      }

      playPromise = musicAudio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      showToast('Đang phát nhạc nền.');
    } else {
      if (playPromise) {
        await playPromise.catch(() => {});
      }
      musicAudio.pause();
      showToast('Đã tắt nhạc nền.');
    }
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return;
    }
    musicToggle.classList.remove('is-playing');
    musicToggle.classList.remove('is-loading');
    showToast('Không thể phát nhạc nền.');
  } finally {
    musicToggle.classList.remove('is-loading');
    isMusicActionPending = false;
    syncMusicUI();
  }
}

if (musicToggle && musicAudio) {
  musicToggle.addEventListener('click', toggleMusic);

  musicAudio.addEventListener('play', syncMusicUI);
  musicAudio.addEventListener('playing', syncMusicUI);
  musicAudio.addEventListener('pause', syncMusicUI);
  musicAudio.addEventListener('ended', syncMusicUI);

  musicAudio.addEventListener('waiting', () => {
    musicToggle.classList.add('is-loading');
  });

  musicAudio.addEventListener('canplay', () => {
    musicToggle.classList.remove('is-loading');
  });

  musicAudio.addEventListener('error', () => {
    isMusicActionPending = false;
    musicToggle.classList.remove('is-loading');
    musicToggle.classList.remove('is-playing');
    musicToggle.classList.add('is-error');
    musicToggle.setAttribute('aria-pressed', 'false');
    musicToggle.setAttribute('aria-label', 'Không thể tải nhạc nền');
    musicToggle.title = 'Không thể tải nhạc nền';
  });
}

// --- RSVP Form Controller ---
const rsvpForm = document.querySelector('[data-rsvp-form]');
const rsvpNameInput = document.querySelector('#rsvp-name');
const rsvpStatusRadios = document.querySelectorAll('[data-rsvp-status]');
const rsvpPartyGroup = document.querySelector('[data-party-group]');
const rsvpPartySelect = document.querySelector('#rsvp-party');
const rsvpSubmitBtn = document.querySelector('[data-rsvp-submit]');
const rsvpSubmitText = document.querySelector('[data-submit-text]');
const rsvpSubmitSpinner = document.querySelector('[data-submit-spinner]');
const rsvpMessage = document.querySelector('[data-rsvp-message]');
let isRsvpSubmitting = false;

function getSelectedStatus() {
  const checked = document.querySelector('[data-rsvp-status]:checked');
  return checked ? checked.value : 'attending';
}

function updatePartyGroupVisibility() {
  if (!rsvpPartyGroup) return;
  const status = getSelectedStatus();
  if (status === 'attending') {
    rsvpPartyGroup.hidden = false;
    rsvpPartySelect?.removeAttribute('disabled');
  } else {
    rsvpPartyGroup.hidden = true;
    rsvpPartySelect?.setAttribute('disabled', 'disabled');
  }
}

function clearFormErrors() {
  document.querySelectorAll('.form-error').forEach((el) => {
    el.hidden = true;
    el.textContent = '';
  });
  document.querySelectorAll('.form-input, .form-select').forEach((el) => {
    el.classList.remove('is-invalid');
    el.removeAttribute('aria-invalid');
  });
}

function showFieldError(fieldName, errorMsg) {
  const errorEl = document.querySelector(`[data-error-for="${fieldName}"]`);
  const inputEl = document.querySelector(`[name="${fieldName}"]`);
  if (errorEl) {
    errorEl.textContent = errorMsg;
    errorEl.hidden = false;
  }
  if (inputEl) {
    inputEl.classList.add('is-invalid');
    inputEl.setAttribute('aria-invalid', 'true');
    inputEl.focus();
  }
}

function showRsvpMessage(text, isSuccess) {
  if (!rsvpMessage) return;
  rsvpMessage.className = `rsvp__message rsvp__message--${isSuccess ? 'success' : 'error'}`;
  rsvpMessage.textContent = text;
  rsvpMessage.hidden = false;
}

function restoreSavedRsvp() {
  try {
    const saved = localStorage.getItem('thiepcuoi_rsvp');
    if (!saved) return;
    const data = JSON.parse(saved);
    if (data.guest_name && rsvpNameInput) {
      rsvpNameInput.value = data.guest_name;
    }
    if (data.status) {
      const radio = document.querySelector(`[data-rsvp-status][value="${data.status}"]`);
      if (radio) {
        radio.checked = true;
        updatePartyGroupVisibility();
      }
    }
    if (data.party_size && rsvpPartySelect) {
      rsvpPartySelect.value = String(data.party_size);
    }
    showRsvpMessage(`Bạn đã gửi phản hồi trước đó (${data.status === 'attending' ? 'Tham dự' : 'Không tham dự'}). Bạn có thể cập nhật lại thông tin bất cứ lúc nào.`, true);
    if (rsvpSubmitText) rsvpSubmitText.textContent = 'Cập nhật phản hồi';
  } catch {
    // Non-fatal
  }
}

async function handleRsvpSubmit(event) {
  event.preventDefault();
  if (isRsvpSubmitting) return;

  clearFormErrors();
  if (rsvpMessage) rsvpMessage.hidden = true;

  const guestName = rsvpNameInput ? rsvpNameInput.value.trim() : '';
  const status = getSelectedStatus();
  const partySize = status === 'attending' ? parseInt(rsvpPartySelect?.value || '1', 10) : 0;
  const hpValue = document.querySelector('#rsvp-hp')?.value || '';

  if (!guestName || guestName.length < 2) {
    showFieldError('guest_name', 'Vui lòng nhập họ và tên (tối thiểu 2 ký tự).');
    return;
  }
  if (guestName.length > 100) {
    showFieldError('guest_name', 'Tên quá dài, tối đa 100 ký tự.');
    return;
  }
  if (status === 'attending' && (isNaN(partySize) || partySize < 1 || partySize > 10)) {
    showFieldError('party_size', 'Vui lòng chọn số lượng người từ 1 đến 10.');
    return;
  }

  isRsvpSubmitting = true;
  if (rsvpSubmitBtn) rsvpSubmitBtn.disabled = true;
  if (rsvpSubmitSpinner) rsvpSubmitSpinner.hidden = false;
  if (rsvpSubmitText) rsvpSubmitText.textContent = 'Đang gửi phản hồi...';

  try {
    const response = await fetch('/api/rsvps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guest_name: guestName,
        status,
        party_size: partySize,
        website: hpValue,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success) {
      showRsvpMessage(result.message || 'Xác nhận tham dự thành công!', true);
      if (rsvpSubmitText) rsvpSubmitText.textContent = 'Cập nhật lại phản hồi';

      try {
        localStorage.setItem('thiepcuoi_rsvp', JSON.stringify({
          guest_name: guestName,
          status,
          party_size: partySize,
          submitted_at: new Date().toISOString(),
        }));
      } catch {
        // Non-fatal
      }
    } else {
      const errorMsg = result.error || 'Có lỗi xảy ra khi lưu phản hồi. Vui lòng thử lại sau.';
      showRsvpMessage(errorMsg, false);
      if (rsvpSubmitText) rsvpSubmitText.textContent = 'Gửi lại xác nhận';
    }
  } catch (netErr) {
    showRsvpMessage('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.', false);
    if (rsvpSubmitText) rsvpSubmitText.textContent = 'Thử lại';
  } finally {
    isRsvpSubmitting = false;
    if (rsvpSubmitBtn) rsvpSubmitBtn.disabled = false;
    if (rsvpSubmitSpinner) rsvpSubmitSpinner.hidden = true;
  }
}

if (rsvpForm) {
  rsvpForm.addEventListener('submit', handleRsvpSubmit);
  rsvpStatusRadios.forEach((radio) => {
    radio.addEventListener('change', updatePartyGroupVisibility);
  });
  updatePartyGroupVisibility();
  restoreSavedRsvp();
}

// --- Wishes Controller ---
const wishForm = document.querySelector('[data-wish-form]');
const wishNameInput = document.querySelector('#wish-name');
const wishMessageInput = document.querySelector('#wish-message');
const wishCharCount = document.querySelector('[data-wish-chars]');
const wishSubmitBtn = document.querySelector('[data-wish-submit]');
const wishSubmitText = document.querySelector('[data-wish-submit-text]');
const wishSpinner = document.querySelector('[data-wish-spinner]');
const wishStatusMessage = document.querySelector('[data-wish-status-message]');
const wishesList = document.querySelector('[data-wishes-list]');
const wishesLoading = document.querySelector('[data-wishes-loading]');
const wishesEmpty = document.querySelector('[data-wishes-empty]');
const wishesPagination = document.querySelector('[data-wishes-pagination]');
const wishesPageInfo = document.querySelector('[data-wishes-page-info]');
const wishesPrevBtn = document.querySelector('[data-wishes-prev]');
const wishesNextBtn = document.querySelector('[data-wishes-next]');

let currentWishPage = 1;
let totalWishPages = 1;
let isWishSubmitting = false;

function formatWishDate(isoString) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return '';
  }
}

function showWishFieldError(fieldName, errorMsg) {
  const errorEl = document.querySelector(`[data-error-for="${fieldName}"]`);
  const inputEl = fieldName === 'wish_guest_name' ? wishNameInput : wishMessageInput;
  if (errorEl) {
    errorEl.textContent = errorMsg;
    errorEl.hidden = false;
  }
  if (inputEl) {
    inputEl.classList.add('is-invalid');
    inputEl.focus();
  }
}

function clearWishErrors() {
  document.querySelectorAll('[data-error-for^="wish_"]').forEach((el) => {
    el.hidden = true;
    el.textContent = '';
  });
  document.querySelectorAll('#wish-name, #wish-message').forEach((el) => {
    el.classList.remove('is-invalid');
  });
}

function showWishMessage(text, isSuccess) {
  if (!wishStatusMessage) return;
  wishStatusMessage.className = `wishes__message wishes__message--${isSuccess ? 'success' : 'error'}`;
  wishStatusMessage.textContent = text;
  wishStatusMessage.hidden = false;
}

async function loadApprovedWishes(page = 1) {
  if (!wishesList) return;
  if (wishesLoading) wishesLoading.hidden = false;
  if (wishesEmpty) wishesEmpty.hidden = true;

  try {
    const response = await fetch(`/api/wishes?page=${page}&limit=6`);
    const result = await response.json().catch(() => ({}));

    if (wishesLoading) wishesLoading.hidden = true;

    if (response.ok && Array.isArray(result.data)) {
      wishesList.innerHTML = '';
      currentWishPage = result.pagination?.page || 1;
      totalWishPages = result.pagination?.totalPages || 1;

      if (result.data.length === 0) {
        if (wishesEmpty) wishesEmpty.hidden = false;
        if (wishesPagination) wishesPagination.hidden = true;
        return;
      }

      if (wishesEmpty) wishesEmpty.hidden = true;

      result.data.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'wish-card';

        const header = document.createElement('div');
        header.className = 'wish-card__header';

        const author = document.createElement('span');
        author.className = 'wish-card__author';
        author.textContent = item.guest_name;

        const time = document.createElement('time');
        time.className = 'wish-card__time';
        time.textContent = formatWishDate(item.created_at);

        header.appendChild(author);
        header.appendChild(time);

        const content = document.createElement('p');
        content.className = 'wish-card__content';
        content.textContent = item.message;

        card.appendChild(header);
        card.appendChild(content);
        wishesList.appendChild(card);
      });

      if (wishesPagination) {
        wishesPagination.hidden = totalWishPages <= 1;
        if (wishesPageInfo) {
          wishesPageInfo.textContent = `${currentWishPage} / ${totalWishPages}`;
        }
        if (wishesPrevBtn) wishesPrevBtn.disabled = currentWishPage <= 1;
        if (wishesNextBtn) wishesNextBtn.disabled = currentWishPage >= totalWishPages;
      }
    } else {
      if (wishesLoading) wishesLoading.textContent = 'Chưa thể tải lời chúc lúc này.';
    }
  } catch {
    if (wishesLoading) {
      wishesLoading.hidden = false;
      wishesLoading.textContent = 'Lỗi kết nối khi tải danh sách lời chúc.';
    }
  }
}

async function handleWishSubmit(event) {
  event.preventDefault();
  if (isWishSubmitting) return;

  clearWishErrors();
  if (wishStatusMessage) wishStatusMessage.hidden = true;

  const guestName = wishNameInput ? wishNameInput.value.trim() : '';
  const message = wishMessageInput ? wishMessageInput.value.trim() : '';
  const hpValue = document.querySelector('#wish-hp')?.value || '';

  if (!guestName || guestName.length < 2) {
    showWishFieldError('wish_guest_name', 'Vui lòng nhập tên của bạn (tối thiểu 2 ký tự).');
    return;
  }
  if (guestName.length > 100) {
    showWishFieldError('wish_guest_name', 'Tên quá dài, tối đa 100 ký tự.');
    return;
  }
  if (!message || message.length < 3) {
    showWishFieldError('wish_message', 'Vui lòng nhập lời chúc (tối thiểu 3 ký tự).');
    return;
  }
  if (message.length > 1000) {
    showWishFieldError('wish_message', 'Lời chúc tối đa 1000 ký tự.');
    return;
  }

  isWishSubmitting = true;
  if (wishSubmitBtn) wishSubmitBtn.disabled = true;
  if (wishSpinner) wishSpinner.hidden = false;
  if (wishSubmitText) wishSubmitText.textContent = 'Đang gửi lời chúc...';

  try {
    const response = await fetch('/api/wishes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guest_name: guestName,
        message,
        website: hpValue,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success) {
      showWishMessage(result.message || 'Cảm ơn bạn đã gửi lời chúc! Lời chúc sẽ xuất hiện sau khi được duyệt.', true);
      if (wishMessageInput) wishMessageInput.value = '';
      if (wishCharCount) wishCharCount.textContent = '0';
      if (wishSubmitText) wishSubmitText.textContent = 'Gửi thêm lời chúc';
    } else {
      const errorMsg = result.error || 'Có lỗi xảy ra khi lưu lời chúc. Vui lòng thử lại sau.';
      showWishMessage(errorMsg, false);
      if (wishSubmitText) wishSubmitText.textContent = 'Gửi lại lời chúc';
    }
  } catch {
    showWishMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại.', false);
    if (wishSubmitText) wishSubmitText.textContent = 'Thử lại';
  } finally {
    isWishSubmitting = false;
    if (wishSubmitBtn) wishSubmitBtn.disabled = false;
    if (wishSpinner) wishSpinner.hidden = true;
  }
}

if (wishForm) {
  wishForm.addEventListener('submit', handleWishSubmit);
  wishMessageInput?.addEventListener('input', () => {
    if (wishCharCount) {
      wishCharCount.textContent = String(wishMessageInput.value.length);
    }
  });

  wishesPrevBtn?.addEventListener('click', () => {
    if (currentWishPage > 1) {
      loadApprovedWishes(currentWishPage - 1);
    }
  });

  wishesNextBtn?.addEventListener('click', () => {
    if (currentWishPage < totalWishPages) {
      loadApprovedWishes(currentWishPage + 1);
    }
  });

  loadApprovedWishes(1);
}
