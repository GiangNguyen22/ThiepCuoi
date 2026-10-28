import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'chrome';
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const chromePath = findChrome();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-slideshow-'));
  const port = 9333;

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpDir}`,
    '--disable-gpu',
    '--no-first-run',
    'http://localhost:8788/'
  ], { stdio: 'ignore' });

  try {
    await sleep(2000);
    const resp = await fetch(`http://localhost:${port}/json`);
    const targets = await resp.json();
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const wsUrl = pageTarget?.webSocketDebuggerUrl;
    if (!wsUrl) throw new Error('No debugger WebSocket found');

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let id = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (callbacks.has(data.id)) {
        const { resolve, reject } = callbacks.get(data.id);
        callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };

    function sendCmd(method, params = {}) {
      return new Promise((resolve, reject) => {
        const cmdId = id++;
        callbacks.set(cmdId, { resolve, reject });
        ws.send(JSON.stringify({ id: cmdId, method, params }));
      });
    }

    await sendCmd('Page.enable');
    await sendCmd('Page.navigate', { url: 'http://localhost:8788/' });
    await sleep(1500);

    async function evalJS(expression) {
      const res = await sendCmd('Runtime.evaluate', { expression, returnByValue: true });
      return res.result?.value;
    }

    console.log('=== TEST 1: DOM Elements & Single Large Focal Slide ===');
    const domCheck = await evalJS(`
      (() => {
        const slideshow = document.querySelector('.wedding-slideshow');
        const stage = document.querySelector('.wedding-slideshow__stage');
        const slides = Array.from(document.querySelectorAll('.slideshow-slide'));
        const activeSlides = slides.filter(s => s.classList.contains('is-active'));
        const prevBtn = document.querySelector('.slideshow-nav--prev');
        const nextBtn = document.querySelector('.slideshow-nav--next');
        const counter = document.querySelector('[data-slideshow-counter]');
        const title = document.querySelector('[data-slideshow-title]');
        const playBtn = document.querySelector('[data-slideshow-toggle]');

        return {
          hasSlideshow: !!slideshow,
          hasStage: !!stage,
          totalSlides: slides.length,
          activeCount: activeSlides.length,
          hasPrev: !!prevBtn,
          hasNext: !!nextBtn,
          hasCounter: !!counter,
          counterText: counter?.textContent?.trim()?.replace(/\\s+/g, ' '),
          titleText: title?.textContent?.trim(),
          hasPlayBtn: !!playBtn,
          stageWidth: stage?.offsetWidth,
          stageHeight: stage?.offsetHeight
        };
      })()
    `);
    console.log('DOM check:', JSON.stringify(domCheck, null, 2));
    if (!domCheck.hasSlideshow) throw new Error('Missing .wedding-slideshow');
    if (!domCheck.hasStage) throw new Error('Missing .wedding-slideshow__stage');
    if (domCheck.activeCount !== 1) throw new Error(`Expected exactly 1 active slide, got ${domCheck.activeCount}`);
    if (domCheck.totalSlides < 3) throw new Error(`Expected at least 3 slides, got ${domCheck.totalSlides}`);

    console.log('\n=== TEST 2: Aspect Ratio Safety & Image Preservation ===');
    const imgCheck = await evalJS(`
      (() => {
        const imgs = Array.from(document.querySelectorAll('.slideshow-slide__img'));
        return imgs.map((img, i) => {
          const comp = window.getComputedStyle(img);
          return {
            index: i,
            src: img.src,
            objectFit: comp.objectFit,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
          };
        });
      })()
    `);
    console.log(`Evaluated ${imgCheck.length} images:`);
    for (const img of imgCheck) {
      console.log(`  Slide ${img.index + 1}: object-fit = ${img.objectFit} (natural: ${img.naturalWidth}x${img.naturalHeight})`);
      if (img.objectFit !== 'contain') {
        throw new Error(`Slide ${img.index} must use object-fit: contain!`);
      }
    }

    console.log('\n=== TEST 3: Navigation Controls (Next & Previous) ===');
    const navNext = await evalJS(`
      (() => {
        const nextBtn = document.querySelector('.slideshow-nav--next');
        nextBtn.click();
        const activeSlide = document.querySelector('.slideshow-slide.is-active');
        const counterCurrent = document.querySelector('[data-counter-current]');
        const title = document.querySelector('[data-slideshow-title]');
        return {
          activeSlideIndex: activeSlide?.getAttribute('data-slide-index'),
          currentCount: counterCurrent?.textContent,
          title: title?.textContent
        };
      })()
    `);
    console.log('After Next click:', navNext);
    if (navNext.activeSlideIndex !== '1') throw new Error(`Expected activeSlideIndex 1 after next, got ${navNext.activeSlideIndex}`);
    if (navNext.currentCount !== '2') throw new Error(`Expected currentCount 2 after next, got ${navNext.currentCount}`);

    const navPrev = await evalJS(`
      (() => {
        const prevBtn = document.querySelector('.slideshow-nav--prev');
        prevBtn.click();
        const activeSlide = document.querySelector('.slideshow-slide.is-active');
        const counterCurrent = document.querySelector('[data-counter-current]');
        return {
          activeSlideIndex: activeSlide?.getAttribute('data-slide-index'),
          currentCount: counterCurrent?.textContent
        };
      })()
    `);
    console.log('After Prev click:', navPrev);
    if (navPrev.activeSlideIndex !== '0') throw new Error(`Expected activeSlideIndex 0 after prev, got ${navPrev.activeSlideIndex}`);

    console.log('\n=== TEST 4: Dots Pagination ===');
    const dotClick = await evalJS(`
      (() => {
        const dots = Array.from(document.querySelectorAll('.slideshow-dot'));
        if (dots.length >= 3) {
          dots[2].click();
        }
        const activeSlide = document.querySelector('.slideshow-slide.is-active');
        const counterCurrent = document.querySelector('[data-counter-current]');
        return {
          dotsCount: dots.length,
          activeSlideIndex: activeSlide?.getAttribute('data-slide-index'),
          currentCount: counterCurrent?.textContent,
          isThirdDotActive: dots[2]?.classList.contains('is-active')
        };
      })()
    `);
    console.log('After clicking 3rd dot:', dotClick);
    if (dotClick.activeSlideIndex !== '2') throw new Error(`Expected slide 2 active, got ${dotClick.activeSlideIndex}`);
    if (!dotClick.isThirdDotActive) throw new Error('Third dot should have is-active class');

    console.log('\n=== TEST 5: Keyboard Arrow Navigation ===');
    const keyNav = await evalJS(`
      (() => {
        const stage = document.querySelector('.wedding-slideshow__stage');
        stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        const activeSlide = document.querySelector('.slideshow-slide.is-active');
        return {
          activeSlideIndex: activeSlide?.getAttribute('data-slide-index')
        };
      })()
    `);
    console.log('After ArrowLeft on stage:', keyNav);
    if (keyNav.activeSlideIndex !== '1') throw new Error(`Expected slide 1 active after ArrowLeft, got ${keyNav.activeSlideIndex}`);

    console.log('\n=== TEST 6: Touch Swipe on Stage ===');
    const touchNav = await evalJS(`
      (() => {
        const stage = document.querySelector('.wedding-slideshow__stage');
        const e1 = new Event('touchstart', { bubbles: true });
        e1.touches = [{ clientX: 250, clientY: 100 }];
        stage.dispatchEvent(e1);

        const e2 = new Event('touchend', { bubbles: true });
        e2.changedTouches = [{ clientX: 100, clientY: 100 }];
        stage.dispatchEvent(e2);

        const activeSlide = document.querySelector('.slideshow-slide.is-active');
        return {
          activeSlideIndex: activeSlide?.getAttribute('data-slide-index')
        };
      })()
    `);
    console.log('After touch swipe left:', touchNav);
    if (touchNav.activeSlideIndex !== '2') throw new Error(`Expected slide 2 active after touch swipe left, got ${touchNav.activeSlideIndex}`);

    console.log('\n=== TEST 7: Play / Pause Autoplay Toggle ===');
    const playToggle = await evalJS(`
      (() => {
        const btn = document.querySelector('.slideshow-play-btn');
        const iconBefore = document.querySelector('[data-toggle-icon]').textContent;
        btn.click();
        const iconAfter = document.querySelector('[data-toggle-icon]').textContent;
        btn.click();
        const iconRestored = document.querySelector('[data-toggle-icon]').textContent;
        return { iconBefore, iconAfter, iconRestored };
      })()
    `);
    console.log('Play/Pause toggle test:', playToggle);
    if (playToggle.iconAfter !== '▶') throw new Error(`Expected play icon ▶ when paused, got ${playToggle.iconAfter}`);
    if (playToggle.iconRestored !== '⏸') throw new Error(`Expected pause icon ⏸ when unpaused, got ${playToggle.iconRestored}`);

    console.log('\n=== TEST 8: Lightbox Modal on Main Image Click ===');
    const lbOpen = await evalJS(`
      (() => {
        const activeSlide = document.querySelector('.slideshow-slide.is-active');
        const btn = activeSlide.querySelector('[data-slideshow-trigger]');
        btn.click();
        const lb = document.querySelector('[data-lightbox]');
        const img = document.querySelector('[data-lightbox-image]');
        const count = document.querySelector('[data-lightbox-count]');
        const caption = document.querySelector('[data-lightbox-caption]');
        return {
          isOpen: lb.open,
          bodyOverflow: document.body.style.overflow,
          imgSrc: img.src,
          imgObjectFit: window.getComputedStyle(img).objectFit,
          count: count.textContent,
          caption: caption.textContent
        };
      })()
    `);
    console.log('Lightbox open info:', JSON.stringify(lbOpen, null, 2));
    if (!lbOpen.isOpen) throw new Error('Lightbox did not open on slide click');
    if (lbOpen.bodyOverflow !== 'hidden') throw new Error('Body scroll was not locked to hidden');
    if (lbOpen.imgObjectFit !== 'contain') throw new Error('Lightbox image must have object-fit: contain');

    console.log('\n=== TEST 9: Lightbox Close & State Sync ===');
    const lbClose = await evalJS(`
      (() => {
        const closeBtn = document.querySelector('[data-lightbox-close]');
        closeBtn.click();
        const lb = document.querySelector('[data-lightbox]');
        return {
          isOpen: lb.open,
          bodyOverflow: document.body.style.overflow
        };
      })()
    `);
    console.log('Lightbox close info:', lbClose);
    if (lbClose.isOpen) throw new Error('Lightbox did not close');
    if (lbClose.bodyOverflow === 'hidden') throw new Error('Body scroll was not restored');

    console.log('\n=== TEST 10: Mobile Responsiveness (375px) ===');
    await sendCmd('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(400);

    const mobileCheck = await evalJS(`
      (() => {
        const scrollW = document.documentElement.scrollWidth;
        const clientW = document.documentElement.clientWidth;
        const stage = document.querySelector('.wedding-slideshow__stage');
        const prev = document.querySelector('.slideshow-nav--prev');
        const next = document.querySelector('.slideshow-nav--next');
        return {
          scrollW,
          clientW,
          hasOverflow: scrollW > clientW,
          stageWidth: stage.offsetWidth,
          stageHeight: stage.offsetHeight,
          prevSize: { w: prev.offsetWidth, h: prev.offsetHeight }
        };
      })()
    `);
    console.log('Mobile 375px metrics:', JSON.stringify(mobileCheck, null, 2));
    if (mobileCheck.hasOverflow) {
      throw new Error(`Mobile horizontal overflow! scrollW=${mobileCheck.scrollW}, clientW=${mobileCheck.clientW}`);
    }

    console.log('\n🎉 ALL LARGE WEDDING PHOTO SLIDESHOW TESTS PASSED! 🎉');
    ws.close();
  } finally {
    chromeProc.kill();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
