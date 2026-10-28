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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-test-'));
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

    // Enable Page domain and navigate explicitly
    await sendCmd('Page.enable');
    await sendCmd('Page.navigate', { url: 'http://localhost:8788/' });
    await sleep(2000); // Wait for load and scripts to execute

    async function evalJS(expression) {
      const res = await sendCmd('Runtime.evaluate', { expression, returnByValue: true });
      return res.result?.value;
    }

    console.log('=== 1. Checking Editorial Gallery DOM & Classes ===');
    const domInfo = await evalJS(`
      (() => {
        const gallery = document.querySelector('.editorial-gallery');
        const viewport = document.querySelector('.editorial-gallery__viewport');
        const track = document.querySelector('.editorial-gallery__track');
        const cards = Array.from(document.querySelectorAll('.editorial-card'));
        const prev = document.querySelector('.editorial-nav--prev');
        const next = document.querySelector('.editorial-nav--next');
        return {
          hasGallery: !!gallery,
          hasViewport: !!viewport,
          hasTrack: !!track,
          hasPrev: !!prev,
          hasNext: !!next,
          cardCount: cards.length,
          cardClasses: cards.slice(0, 3).map(c => c.className),
          cardDimensions: cards.slice(0, 3).map(c => ({
            width: c.offsetWidth,
            height: c.offsetHeight,
            frameHeight: c.querySelector('.editorial-card__frame')?.offsetHeight
          }))
        };
      })()
    `);
    console.log('DOM Info:', JSON.stringify(domInfo, null, 2));
    if (!domInfo.hasGallery) throw new Error('Missing .editorial-gallery');
    if (!domInfo.hasViewport) throw new Error('Missing .editorial-gallery__viewport');
    if (!domInfo.hasTrack) throw new Error('Missing .editorial-gallery__track');
    if (domInfo.cardCount < 3) throw new Error('Card count < 3');

    console.log('\n=== 2. Checking Image Preservation (object-fit: contain) ===');
    const imgInfo = await evalJS(`
      (() => {
        const imgs = Array.from(document.querySelectorAll('.editorial-card__img'));
        return imgs.map(img => {
          const style = window.getComputedStyle(img);
          return {
            src: img.src,
            objectFit: style.objectFit,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
          };
        });
      })()
    `);
    console.log(`Found ${imgInfo.length} images.`);
    for (let i = 0; i < Math.min(imgInfo.length, 3); i++) {
      console.log(`  Card ${i + 1}: object-fit = ${imgInfo[i].objectFit}`);
      if (imgInfo[i].objectFit !== 'contain') throw new Error(`Image ${i} is not object-fit: contain`);
    }

    console.log('\n=== 3. Checking Nav Controls (Next / Prev) ===');
    const navTest = await evalJS(`
      (() => {
        const nextBtn = document.querySelector('.editorial-nav--next');
        const prevBtn = document.querySelector('.editorial-nav--prev');
        const track = document.querySelector('.editorial-gallery__track');
        const initialTransform = track.style.transform;
        
        nextBtn.click();
        return {
          initialTransform,
          afterNext: track.style.transform
        };
      })()
    `);
    console.log('Nav button test:', navTest);
    await sleep(500); // Wait for smooth stepBy transition
    const stepDoneTransform = await evalJS("document.querySelector('.editorial-gallery__track').style.transform");
    console.log('After stepBy completion:', stepDoneTransform);
    if (!stepDoneTransform.includes('translate3d')) {
      throw new Error('Track transform was not updated after nextBtn click!');
    }

    console.log('\n=== 4. Checking Lightbox Trigger on Click ===');
    const lbOpen = await evalJS(`
      (() => {
        const btn = document.querySelector('.editorial-card__btn');
        btn.click();
        const lb = document.querySelector('[data-lightbox]');
        const img = document.querySelector('[data-lightbox-image]');
        const count = document.querySelector('[data-lightbox-count]');
        return {
          isOpen: lb?.open,
          bodyOverflow: document.body.style.overflow,
          imgSrc: img?.src,
          imgObjectFit: img ? window.getComputedStyle(img).objectFit : '',
          count: count?.textContent
        };
      })()
    `);
    console.log('Lightbox state:', JSON.stringify(lbOpen, null, 2));
    if (!lbOpen.isOpen) throw new Error('Lightbox did not open on card click');
    if (lbOpen.bodyOverflow !== 'hidden') throw new Error('Body scroll was not locked to hidden');
    if (lbOpen.imgObjectFit !== 'contain') throw new Error('Lightbox image is not contain');

    console.log('\n=== 5. Checking Lightbox Close & Scroll Restoration ===');
    const lbClose = await evalJS(`
      (() => {
        const closeBtn = document.querySelector('[data-lightbox-close]');
        closeBtn.click();
        const lb = document.querySelector('[data-lightbox]');
        return {
          isOpen: lb?.open,
          bodyOverflow: document.body.style.overflow
        };
      })()
    `);
    console.log('Lightbox closed state:', JSON.stringify(lbClose, null, 2));
    if (lbClose.isOpen) throw new Error('Lightbox did not close');
    if (lbClose.bodyOverflow === 'hidden') throw new Error('Body scroll was not restored');

    console.log('\n=== 6. Checking Mobile Responsiveness (375px) ===');
    await sendCmd('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(500);

    const mobileCheck = await evalJS(`
      (() => {
        const scrollW = document.documentElement.scrollWidth;
        const clientW = document.documentElement.clientWidth;
        const innerW = window.innerWidth;
        const firstCard = document.querySelector('.editorial-card');
        return {
          scrollW,
          clientW,
          innerW,
          hasOverflow: scrollW > clientW,
          cardWidth: firstCard ? firstCard.offsetWidth : 0
        };
      })()
    `);
    console.log('Mobile 375px metrics:', JSON.stringify(mobileCheck, null, 2));
    if (mobileCheck.hasOverflow) {
      throw new Error(`Mobile horizontal overflow detected: scrollWidth (${mobileCheck.scrollW}) > clientWidth (${mobileCheck.clientW})`);
    }

    console.log('\n🎉 ALL EDITORIAL GALLERY TESTS PASSED SUCCESSFULLY! 🎉');
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
