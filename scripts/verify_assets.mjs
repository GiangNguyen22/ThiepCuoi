const BASE = 'http://localhost:8788';

const assets = [
  '/',
  '/admin.html',
  '/styles.css',
  '/admin.css',
  '/app.js',
  '/admin.js',
  '/favicon.svg',
  '/vendor/qrcode.js',
  '/images/couple.webp',
  '/images/bouquet.webp',
  '/images/celebration.webp',
  '/images/cover.webp',
  '/music/canon-in-d.mp3',
  '/api/content',
  '/api/banking',
  '/api/media',
  '/api/wishes'
];

async function check() {
  console.log('--- KIEM TRA TOAN BO TAI NGUYEN STATIC VA API ---');
  let allOk = true;
  for (const a of assets) {
    try {
      const res = await fetch(`${BASE}${a}`);
      const type = res.headers.get('content-type') || 'unknown';
      const size = res.headers.get('content-length') || '?';
      console.log(`[${res.status}] ${a} (${type}, ${size} bytes)`);
      if (!res.ok) allOk = false;
    } catch (e) {
      console.error(`[ERROR] ${a}:`, e.message);
      allOk = false;
    }
  }
  if (!allOk) {
    console.error('Co tai nguyen bi loi!');
    process.exit(1);
  }
  console.log('\n=> Tat ca tai nguyen static va API deu tra ve 200 OK!');
}

check();
