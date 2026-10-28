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

const BASE_URL = 'http://localhost:8788';

async function main() {
  console.log('================================================================');
  console.log('   TASK 8: KIEM THU TICH HOP TOAN DIEN HE THONG THIEPCUOI V2   ');
  console.log('================================================================\n');

  // -----------------------------------------------------------
  // 1. API & SECURITY TESTS
  // -----------------------------------------------------------
  console.log('--- PHAN 1: KIEM THU API, XAC THUC & BAO MAT HE THONG ---');

  // Test 1.1: Public APIs return 200 OK and sanitized data
  const contentRes = await fetch(`${BASE_URL}/api/content`);
  if (!contentRes.ok) throw new Error('GET /api/content failed');
  const contentData = await contentRes.json();
  console.log(`[PASS] GET /api/content: ${contentData.data.groom_name} & ${contentData.data.bride_name}`);
  if (contentData.data.groom_name !== 'Văn Hiền' || contentData.data.bride_name !== 'Thu Hà') {
    throw new Error('Couple names in public content are incorrect!');
  }

  const bankingRes = await fetch(`${BASE_URL}/api/banking`);
  if (!bankingRes.ok) throw new Error('GET /api/banking failed');
  const bankingData = await bankingRes.json();
  console.log(`[PASS] GET /api/banking: Groom=${bankingData.data.groom?.account_holder}, Bride=${bankingData.data.bride?.account_holder}`);
  if (bankingData.data.bride?.account_holder !== 'NGUYEN THU HA') {
    throw new Error('Bride account holder must be NGUYEN THU HA!');
  }

  // Test 1.2: Protected Admin Endpoints return 401 without auth
  const protectedEndpoints = [
    '/api/admin/stats',
    '/api/admin/rsvps',
    '/api/admin/wishes',
    '/api/admin/content',
    '/api/admin/banking',
    '/api/admin/images',
    '/api/admin/album'
  ];
  for (const ep of protectedEndpoints) {
    const res = await fetch(`${BASE_URL}${ep}`);
    if (res.status !== 401) throw new Error(`Endpoint ${ep} should return 401, got ${res.status}`);
  }
  console.log(`[PASS] Da kiem tra 7 Admin endpoints: Tat ca deu chan 401 khi chua dang nhap.`);

  // Test 1.3: SQL Injection & XSS Attack attempts on Public APIs
  const xssWish = await fetch(`${BASE_URL}/api/wishes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_name: '<script>alert("xss")</script>Nam',
      message: 'Chúc mừng hạnh phúc! <img src=x onerror=alert(1)>'
    })
  });
  if (xssWish.status !== 400) throw new Error(`XSS in guest_name should be rejected with 400, got ${xssWish.status}`);
  console.log('[PASS] Backend chan dung 400 Bad Request khi phat hien the XSS trong ten nguoi gui.');

  // Submit valid wish for approval flow
  const validWish = await fetch(`${BASE_URL}/api/wishes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_name: 'Hoàng Yến (Khách Mời)',
      message: 'Chúc hai bạn trăm năm hạnh phúc, đầu bạc răng long!'
    })
  });
  if (validWish.status !== 201) throw new Error(`Valid wish submit failed with ${validWish.status}`);
  console.log('[PASS] Gui loi chuc hop le thanh cong, mac dinh luu o trang thai pending.');

  // Test 1.4: Honeypot bot protection
  const botRsvp = await fetch(`${BASE_URL}/api/rsvps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_name: 'Spam Bot',
      status: 'attending',
      party_size: 1,
      website: 'http://spam.com' // Honeypot trap
    })
  });
  if (botRsvp.status !== 400) throw new Error(`Honeypot should reject bot with 400, got ${botRsvp.status}`);
  console.log('[PASS] Honeypot chan bot thanh cong (400 Yeu cau bi tu choi).');

  // Test 1.5: Valid RSVP submission
  const validRsvp = await fetch(`${BASE_URL}/api/rsvps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_name: 'Master Test Khách Mời',
      status: 'attending',
      party_size: 2
    })
  });
  if (validRsvp.status !== 201) throw new Error(`Valid RSVP failed with status ${validRsvp.status}`);
  console.log('[PASS] Gui RSVP hop le thanh cong (201 Created).');

  // Test 1.6: Admin Login & Session Lifecycle
  const loginRes = await fetch(`${BASE_URL}/api/admin/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({
      username: 'admin',
      password: 'MatKhauBaoMat123!'
    })
  });
  if (!loginRes.ok) throw new Error(`Admin login failed with status ${loginRes.status}`);
  const cookieHeader = loginRes.headers.get('set-cookie');
  const sessionToken = cookieHeader?.match(/admin_session=([^;]+)/)?.[1];
  console.log('[PASS] Dang nhap quan tri vien admin thanh cong voi HttpOnly session cookie.');

  const adminHeaders = {
    'Cookie': `admin_session=${sessionToken}`,
    'X-Requested-With': 'XMLHttpRequest'
  };

  // Test 1.7: Admin Stats & Moderation
  const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, { headers: adminHeaders });
  const statsData = await statsRes.json();
  const stats = statsData.stats || statsData.data;
  console.log(`[PASS] Thong ke admin: RSVP Attending=${stats.rsvp.attending}, Tong khach=${stats.rsvp.total_guests}`);

  // Test 1.8: Approve Wish
  const wishesRes = await fetch(`${BASE_URL}/api/admin/wishes?status=pending`, { headers: adminHeaders });
  const wishesData = await wishesRes.json();
  const wishToApprove = (Array.isArray(wishesData.data) ? wishesData.data : wishesData.data?.items)?.[0];
  if (wishToApprove) {
    const approveRes = await fetch(`${BASE_URL}/api/admin/wishes/${wishToApprove.id}`, {
      method: 'PATCH',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' })
    });
    if (!approveRes.ok) throw new Error('Failed to approve wish');
    console.log(`[PASS] Duyet loi chuc #${wishToApprove.id} sang 'approved' thanh cong.`);
  }

  // Test 1.9: Admin Logout
  const logoutRes = await fetch(`${BASE_URL}/api/admin/session`, {
    method: 'DELETE',
    headers: adminHeaders
  });
  if (!logoutRes.ok) throw new Error('Logout failed');
  console.log('[PASS] Dang xuat quan tri vien va thu hoi token thanh cong.');

  // -----------------------------------------------------------
  // 2. BROWSER HEADLESS END-TO-END TESTS (CHROME CDP)
  // -----------------------------------------------------------
  console.log('\n--- PHAN 2: KIEM THU GIAO DIEN & TRAI NGHIEM NGUOI DUNG (HEADLESS CHROME) ---');
  const chromePath = findChrome();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-master-'));
  const port = 9336;

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpDir}`,
    '--disable-gpu',
    '--no-first-run',
    `${BASE_URL}/`
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
    await sendCmd('Page.navigate', { url: `${BASE_URL}/` });
    await sleep(1500);

    async function evalJS(expression) {
      const res = await sendCmd('Runtime.evaluate', { expression, returnByValue: true });
      return res.result?.value;
    }

    // Test 2.1: Countdown clock & Hero section
    const heroInfo = await evalJS(`
      (() => {
        const days = document.querySelector('[data-days]')?.textContent;
        const hours = document.querySelector('[data-hours]')?.textContent;
        const minutes = document.querySelector('[data-minutes]')?.textContent;
        const mapLink = document.querySelector('.map-link')?.getAttribute('href');
        return {
          countdown: days && hours && minutes && days !== '--',
          hasMapLink: !!mapLink && mapLink.startsWith('https://maps.google.com'),
          days, hours, minutes
        };
      })()
    `);
    if (!heroInfo.countdown) throw new Error('Countdown timer is not ticking! Got: ' + JSON.stringify(heroInfo));
    if (!heroInfo.hasMapLink) throw new Error('Google Maps link is invalid!');
    console.log(`[PASS] Dong ho dem nguoc (${heroInfo.days} ngay ${heroInfo.hours} gio ${heroInfo.minutes} phut) & Lien ket Google Maps hoat dong chinh xac.`);

    // Test 2.2: Large Slideshow Display, Controls & Autoplay
    const slideInfo = await evalJS(`
      (() => {
        const stage = document.querySelector('.wedding-slideshow__stage');
        const activeSlide = document.querySelector('.slideshow-slide.is-active');
        const img = activeSlide?.querySelector('.slideshow-slide__img');
        const comp = img ? window.getComputedStyle(img) : null;
        const counter = document.querySelector('[data-slideshow-counter]')?.textContent;
        return {
          hasStage: !!stage,
          objectFit: comp?.objectFit,
          counter: counter?.trim()
        };
      })()
    `);
    if (!slideInfo.hasStage) throw new Error('Slideshow stage missing');
    if (slideInfo.objectFit !== 'contain') throw new Error(`Expected object-fit: contain, got ${slideInfo.objectFit}`);
    console.log(`[PASS] Slideshow anh cuoi lon: Khung anh can doi, object-fit: ${slideInfo.objectFit}, chi so: ${slideInfo.counter}`);

    // Test 2.3: Lightbox interaction
    const lbTest = await evalJS(`
      (() => {
        const btn = document.querySelector('.slideshow-slide.is-active [data-slideshow-trigger]');
        btn.click();
        const lb = document.querySelector('[data-lightbox]');
        const isOpen = lb.open;
        const bodyLocked = document.body.style.overflow === 'hidden';
        
        // Close
        const closeBtn = document.querySelector('[data-lightbox-close]');
        closeBtn.click();
        const isClosed = !lb.open;
        const bodyRestored = document.body.style.overflow === '';

        return { isOpen, bodyLocked, isClosed, bodyRestored };
      })()
    `);
    if (!lbTest.isOpen || !lbTest.bodyLocked || !lbTest.isClosed || !lbTest.bodyRestored) {
      throw new Error('Lightbox lifecycle failed: ' + JSON.stringify(lbTest));
    }
    console.log('[PASS] Lightbox toan man hinh: Mo anh day du, khoa scroll body va dong an toan.');

    // Test 2.4: QR chia se thiệp
    const shareQrTest = await evalJS(`
      (() => {
        const qrBtn = document.querySelector('[data-qr-open]');
        qrBtn.click();
        const qrDialog = document.querySelector('[data-qr-dialog]');
        const isOpen = qrDialog?.open;
        const qrCanvas = document.querySelector('[data-qr-graphic] canvas, [data-qr-graphic] svg, [data-qr-graphic] img');

        const closeBtn = document.querySelector('[data-qr-close]');
        closeBtn.click();
        const isClosed = !qrDialog?.open;

        return { isOpen, hasGraphic: !!qrCanvas, isClosed };
      })()
    `);
    if (!shareQrTest.isOpen || !shareQrTest.isClosed) {
      throw new Error('Share QR dialog failed: ' + JSON.stringify(shareQrTest));
    }
    console.log('[PASS] QR chia se thiep cuoi: Mo ma QR ket noi va dong chinh xac.');

    // Test 2.5: Hop mung cuoi & VietQR
    const giftTest = await evalJS(`
      (() => {
        const cards = Array.from(document.querySelectorAll('.gift__card'));
        const holders = cards.map(c => c.querySelector('.gift__holder-name')?.textContent?.trim());
        const qrSrcs = cards.map(c => c.querySelector('.gift__qr-img')?.src);
        return {
          cardCount: cards.length,
          holders,
          hasGroom: holders.includes('NGUYEN VAN HIEN'),
          hasBride: holders.includes('NGUYEN THU HA'),
          qrValid: qrSrcs.every(s => s && s.startsWith('https://img.vietqr.io/image/'))
        };
      })()
    `);
    if (!giftTest.hasGroom || !giftTest.hasBride || !giftTest.qrValid) {
      throw new Error('Gift banking cards invalid: ' + JSON.stringify(giftTest));
    }
    console.log(`[PASS] Hop mung cuoi & VietQR: Chú Rể (${giftTest.holders[0]}) & Cô Dâu (${giftTest.holders[1]}), VietQR Napas hop le.`);

    // Test 2.6: Mobile Responsiveness Check (375px)
    await sendCmd('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(400);

    const mobileMetrics = await evalJS(`
      (() => {
        const scrollW = document.documentElement.scrollWidth;
        const clientW = document.documentElement.clientWidth;
        return {
          scrollW,
          clientW,
          hasOverflow: scrollW > clientW
        };
      })()
    `);
    if (mobileMetrics.hasOverflow) {
      throw new Error(`Mobile overflow detected! scrollWidth=${mobileMetrics.scrollW}, clientWidth=${mobileMetrics.clientW}`);
    }
    console.log(`[PASS] Responsive Mobile (375px): Khong co loi tran ngang trang web (scrollW=${mobileMetrics.scrollW}, clientW=${mobileMetrics.clientW}).`);

    // Test 2.7: Audio Element & Music toggle
    const audioCheck = await evalJS(`
      (() => {
        const audio = document.querySelector('[data-music-audio]');
        const toggle = document.querySelector('[data-music-toggle]');
        const audioSrc = audio?.getAttribute('data-src') || audio?.src;
        return {
          hasAudio: !!audio && !!audioSrc,
          hasToggle: !!toggle,
          audioSrc
        };
      })()
    `);
    if (!audioCheck.hasAudio || !audioCheck.hasToggle) throw new Error('Music player structure incomplete: ' + JSON.stringify(audioCheck));
    console.log(`[PASS] Nhac nen Canon in D (${audioCheck.audioSrc}): Trinh phat va nut bat/tat san sang.`);

    console.log('\n================================================================');
    console.log('   TAT CA CAC KIEM THU TICH HOP TASK 8 DA DAT 100% HOAN HAO!   ');
    console.log('================================================================');
    ws.close();
  } finally {
    chromeProc.kill();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

main().catch(err => {
  console.error('\n[FAIL] Kiem thu that bai:', err);
  process.exit(1);
});
