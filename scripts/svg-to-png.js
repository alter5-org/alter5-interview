// Render alter-logo-white.svg to a crisp 2x PNG sized for email use
// (~140px wide × ~33px tall @1x, so 280×66 @2x).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PROJECT = '/Users/salvacarrillo/Desktop/Alter5_Interview-SWArchitect/alter5-interview';
const SVG_SRC = path.join(PROJECT, 'alter-logo-white.svg');
const PNG_OUT = path.join(PROJECT, 'ds/alter5-logo-white.png');

// Target display size for the email header. 140x33 keeps it proportional to
// the 530x124 source (~4.24:1) and similar weight to the old text wordmark.
const W = 280; // 2x of 140
const H = 66;  // 2x of ~33 (124 * 140 / 530 ≈ 32.8)

(async () => {
  const svg = fs.readFileSync(SVG_SRC, 'utf8');
  const html = `<!doctype html><html><head><style>
    html,body{margin:0;padding:0;background:#13285B;}
    svg{display:block;width:${W}px;height:${H}px;}
  </style></head><body>${svg}</body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(html);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: PNG_OUT, omitBackground: false, clip: { x: 0, y: 0, width: W, height: H } });
  await browser.close();
  console.log(`Wrote ${PNG_OUT}`);
})();
