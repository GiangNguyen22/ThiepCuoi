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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-auto-'));
  const port = 9334;

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

    console.log('=== TEST A: Autoplay in Action ===');
    const t0State = await evalJS(`
      (() => {
        const active = document.querySelector('.slideshow-slide.is-active');
        const counter = document.querySelector('[data-slideshow-counter]');
        return {
          activeIndex: active?.getAttribute('data-slide-index'),
          counter: counter?.textContent?.trim()
        };
      })()
    `);
    console.log('Initial slide at t=0s:', t0State);

    console.log('Waiting 4.5 seconds for autoplay to advance...');
    await sleep(4500);

    const t1State = await evalJS(`
      (() => {
        const active = document.querySelector('.slideshow-slide.is-active');
        const counter = document.querySelector('[data-slideshow-counter]');
        return {
          activeIndex: active?.getAttribute('data-slide-index'),
          counter: counter?.textContent?.trim()
        };
      })()
    `);
    console.log('Slide at t=4.5s:', t1State);

    if (t0State.activeIndex === t1State.activeIndex) {
      throw new Error(`Autoplay did not advance: t0=${t0State.activeIndex}, t1=${t1State.activeIndex}`);
    }
    console.log('=> Autoplay successfully advanced slide automatically!');

    console.log('\n=== TEST B: Bride QR Bank Account Info ===');
    const bankingInfo = await evalJS(`
      (() => {
        const cards = Array.from(document.querySelectorAll('.gift__card'));
        return cards.map(c => ({
          role: c.querySelector('.gift__role-badge')?.textContent?.trim(),
          holder: c.querySelector('.gift__holder-name')?.textContent?.trim(),
          bank: c.querySelector('.gift__bank-name')?.textContent?.trim(),
          account: c.querySelector('.gift__account-num')?.textContent?.trim(),
          qrSrc: c.querySelector('.gift__qr-img')?.src
        }));
      })()
    `);
    console.log('Banking cards in DOM:', JSON.stringify(bankingInfo, null, 2));

    const brideCard = bankingInfo.find(c => c.role?.includes('Cô Dâu'));
    if (!brideCard) throw new Error('Bride bank card not found in DOM');
    if (brideCard.holder !== 'NGUYEN THU HA') {
      throw new Error(`Expected bride holder 'NGUYEN THU HA', got '${brideCard.holder}'`);
    }
    if (!brideCard.qrSrc.includes('NGUYEN+THU+HA')) {
      throw new Error(`Expected bride QR url to contain 'NGUYEN+THU+HA', got ${brideCard.qrSrc}`);
    }
    console.log('=> Bride QR & Account Holder successfully set to NGUYEN THU HA!');

    console.log('\n🎉 ALL TESTS PASSED! 🎉');
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
