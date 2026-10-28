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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-trans-'));
  const port = 9335;

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

    console.log('=== TEST 1: Check Computed Transition Properties ===');
    const transitionStyles = await evalJS(`
      (() => {
        const slide = document.querySelector('.slideshow-slide');
        const comp = window.getComputedStyle(slide);
        return {
          transitionProperty: comp.transitionProperty,
          transitionDuration: comp.transitionDuration,
          transitionTimingFunction: comp.transitionTimingFunction,
          opacity: comp.opacity,
          transform: comp.transform
        };
      })()
    `);
    console.log('Slide 0 Computed Style:', transitionStyles);

    if (transitionStyles.transitionDuration === '0.00001s' || transitionStyles.transitionDuration === '0s') {
      throw new Error(`transitionDuration is crushed! Got: ${transitionStyles.transitionDuration}`);
    }
    console.log('=> Transition duration is active and intact:', transitionStyles.transitionDuration);

    console.log('\n=== TEST 2: Trigger Transition & Check Crossfade Classes ===');
    const midTransition = await evalJS(`
      (() => {
        const nextBtn = document.querySelector('.slideshow-nav--next');
        nextBtn.click();
        const slides = Array.from(document.querySelectorAll('.slideshow-slide'));
        return slides.map((s, idx) => ({
          index: idx,
          className: s.className,
          isActive: s.classList.contains('is-active'),
          isLeaving: s.classList.contains('is-leaving')
        }));
      })()
    `);
    console.log('Slides state immediately after next click:', midTransition);

    const hasActive = midTransition.some(s => s.isActive);
    const hasLeaving = midTransition.some(s => s.isLeaving);
    if (!hasActive || !hasLeaving) {
      throw new Error('Expected both .is-active (incoming) and .is-leaving (outgoing) slides for crossfade!');
    }
    console.log('=> Both incoming and outgoing slides are smoothly transitioning simultaneously!');

    console.log('\n=== TEST 3: Wait for Crossfade to Complete ===');
    await sleep(1000);
    const settledState = await evalJS(`
      (() => {
        const active = document.querySelector('.slideshow-slide.is-active');
        const counter = document.querySelector('[data-slideshow-counter]');
        return {
          activeIndex: active?.getAttribute('data-slide-index'),
          counter: counter?.textContent?.trim()
        };
      })()
    `);
    console.log('Settled state at 1s:', settledState);
    if (settledState.activeIndex !== '1') throw new Error(`Expected activeIndex 1, got ${settledState.activeIndex}`);

    console.log('\n🎉 ALL TRANSITION EFFECT TESTS PASSED! 🎉');
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
