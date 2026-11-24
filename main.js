/* ===== כוח העל שלנו =====
   כל האיורים מגיעים מקובץ ה-Figma דרך figma-parts.js (SVG בקואורדינטות הבמה, צבעים כ-var(--...)).
   כל התזמונים והצבעים ב-:root שב-style.css, בשמות של Figma.
   עדכון 14.11.26: מקור האמת הוא עמודים 04 (רכיבים) ו-05 (מסכים) בלבד.

   מפת שמות השכבות (Figma בעברית → תפקיד בקוד):
   'קיר' קיר הספרייה · 'ארון' הספרייה עצמה · 'מנורה' המנורה הרגילה (רק בלפני) · 'חור בראש' החור · 'מוח' המוח
   'חוט NN' חוט של אריאל ('רצועת נייר' + 'חוט', קו שבור דרך הצמתים) · 'צומת NN' צומת · 'מספור מדפים'
   'מגירת קטלוג' · 'חלון אור' · 'ענף N' · 'לב פרח' · 'הילת מנורה' · 'מנורת צבעוני'
   'לינוי · קרעים' ('שפת נייר קרועה' + 'חלל' + 'כוכבים' + 'ספר מעופף') · 'ספר מעופף' ('ספר-ציפור' + 'מסלול')
   'לינוי · מנורה מרחפת' (17.11, במקום השעון הנמס) · 'ספרים שנלקחו · הצללה' / 'לינוי · צל מנורה' (24.11)
   'יעל · תגית' · 'יעל · פרח מיובש בספר' · 'יעל · פרח מצויר במחברת של לינוי' · 'יעל · מדבקת פרח על המחשב של אריאל' (24.11) */

const F = window.FIGMA;
const SVG_NS = 'http://www.w3.org/2000/svg';
const stage = document.getElementById('stage');
const scene = document.getElementById('scene');
const rootStyle = getComputedStyle(document.documentElement);
const ms = (name) => parseFloat(rootStyle.getPropertyValue(name));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ===== הדמויות: אובייקט הגדרות אחד לכל דמות ===== */
const CHARACTERS = {
  A: { body: 'bodyA', hole: 'holeA', hands: 'handsA', boxX: 1080, tagX: 1123 },
  B: { body: 'bodyB', hole: 'holeB', hands: 'handsB', boxX: 610, tagX: 652 },
  C: { body: 'bodyC', hole: 'holeC', hands: 'handsC', boxX: 139, tagX: 181 },
};
const ORDER = ['C', 'B', 'A'];  // סדר השכבות כמו במסך 01
const HINT_ORDER = ['A', 'B', 'C'];  // רמז לפעולה: אריאל, יעל, לינוי, וחוזר חלילה

/* ===== העולמות: מה נכנס לאן, ואיך כל יחידה משתנה בהשתלטות =====
   under = על הקיר מאחורי הארון · back = מעל הספרייה, מאחורי הדמויות.
   (14.11: גם החוטים של אריאל מאחורי הדמויות — הם יוצאים מאחורי הראש שלה.)
   units: [בורר, סוג]. סוגים: fade · pop · rip (קרע שנפתח מהראש) · stretch · draw (הקו נמתח) · drawer · branch */
const WORLDS = {
  A: {
    // 17.11: בלי גריד על הקיר ובלי קווי עזר מקווקווים (נמחקו מהפיגמה ומהאתר).
    // המידות 1248/584 — רק כשהדגל ב-content.js (worlds.A.showDimensions) דולק
    back: [
      { part: 'aDrawers', units: [['[data-n="מגירת קטלוג"]', 'drawer']] },
      { part: 'aLamp', units: [[':scope > :not(text)', 'pop'], ['text', 'fade']] },
      ...(CONTENT.worlds.A.showDimensions ? [{ part: 'aDims', units: [[':scope > *', 'stretch']] }] : []),
      {
        part: 'aThreads',
        units: [['[data-n^="חוט "]', 'draw'], ['[data-n^="צומת"]', 'pop'], ['[data-n="מספור מדפים"] > g', 'fade']],
      },
    ],
  },
  B: {
    back: [
      { part: 'bWindows', units: [['[data-n="חלון אור"]', 'fade']] },
      { part: 'bTulip', units: [['[data-n="מנורת צבעוני"]', 'pop']] },
      ...[1, 2, 3, 4, 5].map((i) => ({ part: `bBranch${i}`, units: [[':scope', 'branch']] })),
    ],
  },
  C: {
    // 17.11: בלי שעון נמס ובלי כוכבים/ספירלות/שמשות. הקרעים חושפים חלל, ומהם עפים ספרים.
    // הארון התחתון: שלם, בלי קרעים, כמו בפיגמה.
    // 24.11: הכול בקואורדינטות הבמה (יוצא מחדש מהפריים 05): הקו המקווקוו סביב הספרים שנלקחו (מתחת לקרעים),
    // הקרעים, המנורה המרחפת ושני הספרים שמחוץ לקרעים
    stage: [
      { part: 'cTaken', units: [['[data-n="ספר שנלקח · מתאר"]', 'fade']] },
      { part: 'cTearsNew', units: [[':scope', 'rip']] },
      { part: 'cLampFloat', units: [[':scope', 'pop']] },
      { part: 'cBooksFree', units: [['[data-n="ספר מעופף"]', 'pop']] },
    ],
  },
};

/* לינוי (24.11): חמשת הספרים שעפו מהמדפים — בעולם שלה הם לא מוצגים, ובמקומם קו מתאר מקווקוו ורוד,
   אותו קו כמו המסלול של הספר המעופף (cTaken). המקומות בקואורדינטות הבמה
   (rect של "ספר שנלקח · מתאר" ב-343:7268 + 79). כל צורה בספרייה שיושבת
   כולה בתוך אחד מהם (הספר והפסים שעליו) מקבלת .book-taken ונעלמת רק בעולם של לינוי */
const TAKEN_BOOKS = [[641, 279, 42, 88], [1069, 414, 32, 73], [408, 417, 20, 70], [1120, 294, 26, 73], [557, 525, 20, 82]];

/* יעל (24.11): הרבדים הנסתרים. בלי הסבר ובלי אינטראקציה — מתגלים למי שמסתכלת.
   התגיות יושבות על הענפים וזזות איתם ברוח: כל תגית נכנסת לענף שהחוט שלה יוצא ממנו (לפי הפריים 04).
   הפרח המיובש, השרבוט והמדבקה יושבים על החפצים, בתוך שכבת הידיים של כל דמות (כדי שיגדלו איתה ב-hover) */
const YAEL_TAG_BRANCH = [5, 2, 4];   // סקרנות, חמלה, דמיון → ענף N (נבדק בדפדפן: החוט יוצא מהגבעול שלו)
const YAEL_ON_OBJECTS = [['bDried', 'B'], ['bDoodle', 'C'], ['bSticker', 'A']];

/* ===== פריסת הספרייה (17.11, מסכי "ראש פתוח" בעמוד 05) =====
   החלקים ב-figma-parts.js יוצאו בפריסה הישנה: סקייל 1.06 סביב (720,176) והזזה של 44px.
   במסכים החדשים הספרייה ושכבות העולם בגודל 1:1, ב-y=79. המטריצה ממירה מהישנה לחדשה
   (נמדד: צמתי החוטים במסך 03 מול האתר). הדמויות, הידיים, השולחן והתגים — בלי שינוי */
const WORLD_K = 1 / 1.06;
const WORLD_E = 720 * (1 - WORLD_K);
const WORLD_F = 255 - 220 * WORLD_K;
const WORLD_MATRIX = `matrix(${WORLD_K} 0 0 ${WORLD_K} ${WORLD_E} ${WORLD_F})`;
const toWorld = (x, y) => ({ x: (x - WORLD_E) / WORLD_K, y: (y - WORLD_F) / WORLD_K });

/* אריאל: החוטים והצמתים יוצאים ממרכז הראש (רכיב 395:23241, גרסה = חוטים ממורכזים):
   27.5px ימינה ברכיב = 27.5 × 1.06 ביחידות הייצוא. המספור 01–03 לא זז */
const THREAD_SHIFT = 27.5 * 1.06;

/* טקסט בתוך העולם של אריאל: מתוך content.js, לפי הסדר.
   aDims: מיקום מה-Figma (box = [x, y, w, h]); aThreads, aLamp: הטקסט כבר במקומו בייצוא, רק התוכן מ-content.js */
const WORLD_TEXT = CONTENT.worlds.A;
const TEXT_SPOTS = {
  aThreads: WORLD_TEXT.shelfNumbers.map((text) => ({ text })),
  aDims: [
    { box: [701.5, 188.5, 37, 23], size: 14.8, text: WORLD_TEXT.dimensions.width },
    { box: [18, 500.4, 22.3, 40.3], size: 14.8, text: WORLD_TEXT.dimensions.height, rotate: -90 },
  ],
  aLamp: [{ text: WORLD_TEXT.lampAngle }],
};

/* הגדרות SVG שלא מגיעות מהייצוא */
const SCENE_DEFS = `
  <!-- "חור בראש": צל פנימי קשיח (0, 5.3, בלי טשטוש) — חור בנייר ולא גזיר שמודבק מעליו.
       ×1.3 כי החור כולו מוקטן ב-CSS (--hole-scale-open) ביחס לייצוא -->
  <filter id="hole-inner" x="-10%" y="-10%" width="120%" height="140%" color-interpolation-filters="sRGB">
    <feComponentTransfer in="SourceAlpha" result="inv"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer>
    <feOffset in="inv" dy="6.9" result="off"/>
    <feFlood flood-color="#1b1916"/>
    <feComposite in2="off" operator="in"/>
    <feComposite in2="SourceAlpha" operator="in" result="shade"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shade"/></feMerge>
  </filter>
  <!-- הקרעים של לינוי נפתחים מהראש שלה החוצה (main.js › markUnit 'rip'). קואורדינטות הבמה (24.11) -->
  <clipPath id="linoy-rip"><circle class="rip-circle" cx="276" cy="604"/></clipPath>`;

/* ===== בנייה ===== */
function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.append(node);
  return node;
}

// חלק מ-Figma כקבוצה. ה-innerHTML של אלמנט SVG מפורש כ-SVG
function part(key, parent) {
  const g = el('g', { 'data-part': key }, parent);
  g.innerHTML = F.parts[key];
  return g;
}

function placeTexts(key, root) {
  const spots = TEXT_SPOTS[key];
  root.querySelectorAll('[data-text]').forEach((ph, i) => {
    const spot = spots && spots[i];
    if (!spot) { ph.remove(); return; }
    // ייצוא 14.11: הטקסט כבר <text> במקומו — רק התוכן והסגנון
    if (ph.tagName === 'text') {
      ph.setAttribute('text-anchor', 'middle');
      ph.setAttribute('dominant-baseline', 'central');
      ph.classList.add('world-text');
      ph.textContent = spot.text;
      return;
    }
    const [x, y, w, h] = spot.box;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const t = el('text', {
      x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': spot.size, class: 'world-text',
    });
    t.style.fill = 'var(--accent-a-strong)';
    if (spot.rotate) t.setAttribute('transform', `rotate(${spot.rotate} ${cx} ${cy})`);
    t.textContent = spot.text;
    ph.replaceWith(t);
  });
}

/* תיקונים אחרי הייבוא */
// הספרייה בקואורדינטות הייצוא שמכסות את כל הבמה (אחרי WORLD_MATRIX): 0..1440 × 0..1024 ועוד שוליים
const WORLD_COVER = { x0: -60, x1: 1500, y0: -60, y1: 1140 };
const CLEANUP = {
  ...Object.fromEntries([1, 2, 3, 4, 5].map((i) => [`bBranch${i}`, resizeFlowers])),
};

/* יעל (17.11): הפרחים בפיגמה (מסך 04, 392:8479) גדולים פי ~1.53 מהייצוא, וכל פרח זז מעט כדי להישאר בקצה הענף.
   FLOWERS = מרכז "לב פרח" של כל אחד מ-12 הפרחים בפיגמה, בקואורדינטות הייצוא, וגודל הלב (11.5).
   כל פרח (לב + עלי הכותרת שלו) מוגדל סביב המרכז שלו ומוזז למרכז שבפיגמה */
const FLOWER_HEART = 11.5;
const FLOWERS = [
  [291.3, 247.1], [427.7, 345.4], [719.7, 240.8], [616.8, 357.2], [1078.4, 250.4], [1349.8, 374.5],
  [870.8, 389.2], [1252.9, 247.6], [1367, 555.1], [121.3, 431.1], [79.7, 564.4], [170.8, 389.4],
];
let flowerScale = 1;
function localCenter(p) {
  const b = p.getBBox();
  const m = p.transform.baseVal.consolidate()?.matrix;
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  return m ? { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, w: b.width * Math.hypot(m.a, m.b) } : { x, y, w: b.width };
}
function resizeFlowers(root) {
  const hearts = [...root.querySelectorAll('[data-n="לב פרח"] > path')].map((p) => {
    const c = localCenter(p);
    const target = FLOWERS.reduce((a, f) => (Math.hypot(f[0] - c.x, f[1] - c.y) < Math.hypot(a[0] - c.x, a[1] - c.y) ? f : a));
    return { p, c, target, k: FLOWER_HEART / c.w, parts: [p] };
  });
  if (!hearts.length) return;
  root.querySelectorAll('[data-n="גב פרח"] > path, [data-n="עלי כותרת"] > path').forEach((p) => {
    const c = localCenter(p);
    hearts.reduce((a, h) => (Math.hypot(h.c.x - c.x, h.c.y - c.y) < Math.hypot(a.c.x - c.x, a.c.y - c.y) ? h : a)).parts.push(p);
  });
  for (const h of hearts) {
    flowerScale = h.k;
    const pre = `translate(${h.target[0]} ${h.target[1]}) scale(${h.k.toFixed(4)}) translate(${-h.c.x.toFixed(2)} ${-h.c.y.toFixed(2)})`;
    for (const p of h.parts) p.setAttribute('transform', `${pre} ${p.getAttribute('transform') || ''}`.trim());
  }
}

const worldGroups = { A: [], B: [], C: [] };
const units = { A: [], B: [], C: [] };

function buildWorldLayer(id, entries, parent) {
  const g = el('g', { class: 'world', 'data-w': id }, parent);
  worldGroups[id].push(g);
  for (const entry of entries) {
    const root = part(entry.part, g).firstElementChild;
    placeTexts(entry.part, root);
    CLEANUP[entry.part]?.(root);
    for (const [selector, type] of entry.units) {
      const found = selector === ':scope' ? [root] : root.querySelectorAll(selector);
      found.forEach((u) => markUnit(u, type, id));
    }
  }
  return g;
}

const YAEL_HEAD = { x: 720, y: 618 };   // הענפים יוצאים מכאן (תחילת כל ענף ב-Figma)

function markUnit(u, type, id) {
  if (u.classList.contains('u')) return;
  // לשכבה עם שקיפות משלה: היחידה היא עטיפה, כדי שהשקיפות שלה תישמר
  if (u.hasAttribute('opacity') && u.tagName !== 'g') {
    const wrap = el('g');
    u.before(wrap);
    wrap.append(u);
    u = wrap;
  }
  u.classList.add('u');
  if (type === 'pop') u.classList.add('u-pop');
  if (type === 'drawer') u.classList.add('u-drawer');
  if (type === 'stretch') {
    const b = u.getBBox();
    u.classList.add(b.width >= b.height ? 'u-stretch-x' : 'u-stretch-y');
  }
  if (type === 'rip') {
    // הקרעים של לינוי: נפתחים מהראש שלה החוצה (עיגול חיתוך שגדל), מה שבתוכם מופיע אחרי
    u.classList.add('u-rip');
    u.setAttribute('clip-path', 'url(#linoy-rip)');
    u.querySelectorAll(':scope > [data-n="כוכבים"], :scope > [data-n="ספר מעופף"], :scope > g:not([data-n])')
      .forEach((n) => n.classList.add('tear-inner'));
  }
  if (type === 'tear') {
    // הארון התחתון של לינוי (ללא שינוי): הקרע נקרע מהסדק, מתוח לאורך הציר הארוך שלו
    u.classList.add('u-tear');
    const b = u.getBBox();
    u.style.setProperty('--crack', b.width >= b.height ? '1 0.05' : '0.05 1');
    u.style.setProperty('--crack-0', b.width >= b.height ? '1 0' : '0 1');
    u.querySelectorAll('[data-n="כוכבים"], [data-n="ירח"], :scope > [data-n="כוכב לכת"], :scope > [data-n="ספר מעופף"]')
      .forEach((n) => n.classList.add('tear-inner'));
    u.querySelectorAll('[data-n="קפל נייר"]').forEach((n) => n.classList.add('tear-fold'));
  }
  if (type === 'draw' || type === 'branch') {
    u.classList.add('u-draw');
    const strokes = u.matches('path[stroke]') ? [u] : u.querySelectorAll('path[stroke]');
    strokes.forEach((p) => { p.setAttribute('pathLength', 1); p.classList.add('draw'); });
  }
  if (type === 'branch') {
    // הענף צומח מהראש; עלה או פרח נפתח כשהענף מגיע אליו (לפי המרחק שלו מהראש)
    u.classList.add('u-branch');
    const items = [...u.querySelectorAll('[data-n^="עלים"] > path, [data-n="גב פרח"] > path, [data-n="עלי כותרת"] > path, [data-n="לב פרח"] > path')];
    const dist = items.map((p) => {
      const b = p.getBBox();
      const m = p.transform.baseVal.consolidate()?.matrix;
      const x = (m ? m.e : 0) + b.x + b.width / 2;
      const y = (m ? m.f : 0) + b.y + b.height / 2;
      return Math.hypot(x - YAEL_HEAD.x, y - YAEL_HEAD.y);
    });
    const max = Math.max(...dist, 1);
    items.forEach((p, i) => {
      p.classList.add('after');
      p.style.setProperty('--reach', (dist[i] / max).toFixed(3));
    });
  }
  units[id].push(u);
}

// כל צורה שצבועה במשתנה הופכת ל"צביעה": style במקום attribute, כדי שה-transition יעבוד
function makePaintable(root) {
  root.querySelectorAll('[fill^="var("], [stroke^="var("]').forEach((node) => {
    const fill = node.getAttribute('fill');
    const stroke = node.getAttribute('stroke');
    if (fill && fill.startsWith('var(')) node.style.fill = fill;
    if (stroke && stroke.startsWith('var(')) node.style.stroke = stroke;
    node.classList.add('p');
  });
}

/* ===== צל "גזירי נייר" (עדכון 14.11) =====
   צל אחד בכל הסצנה: שחור 25%, היסט 1px ימינה, בלי טשטוש (0.2px ב-Figma — לא נראה בגודל הזה).
   במקום פילטר לכל צורה: עותק של הצורה, בשחור 25%, מוזז 1px, ממש מאחוריה. זה בדיוק אותו מראה
   (גם הצל שצורה מטילה על צורה סמוכה, כמו ספר על ספר), בלי עלות של פילטר בזמן המעבר לעולם.
   על מה: כל צורה מלאה (בדיוק כמו בפיגמה, שכבה-שכבה). בלי: קווים דקים, טקסט, גריד, קווי מידה, החוטים, הקרעים */
const SHADOW_SCOPES = [
  '[data-part="library"] [data-n="ארון"]', '.lamp-before',
  '[data-part^="body"]', '[data-part^="hole"] [data-n="מוח"]', '[data-part^="hands"]', '[data-part="table"]',
  '[data-part="aDrawers"]', '[data-part="bWindows"]', '[data-part="bTulip"]', '[data-part^="bBranch"]',
];
const SHADOW_SHAPES = 'path, rect, circle, ellipse, polygon';
const SHADOW_OFFSET = { '[data-part^="hole"]': 1.3 };   // החור מוקטן ×1/1.3 ב-CSS: ההיסט על המסך נשאר 1px

function paperShadows() {
  const shapes = new Set();
  for (const scope of SHADOW_SCOPES) scene.querySelectorAll(scope).forEach((g) => g.querySelectorAll(SHADOW_SHAPES).forEach((n) => shapes.add(n)));
  // בחלקים שיוצאו ב-14.11 הצל מסומן בשכבה עצמה (data-fx="d"), בדיוק לפי Figma
  scene.querySelectorAll(`[data-fx*="d"]`).forEach((n) => (n.matches(SHADOW_SHAPES) ? [n] : n.querySelectorAll(SHADOW_SHAPES)).forEach((s) => shapes.add(s)));
  let count = 0;
  for (const n of shapes) {
    if (n.closest('.glow, [data-n="מסלול"], [data-n="חור"], .pc')) continue;
    if (n.matches('[data-n="חור"]') || n.hasAttribute('opacity') || n.hasAttribute('fill-opacity')) continue;
    if (getComputedStyle(n).display === 'none') continue;
    const fill = n.getAttribute('fill') || n.style.fill || '';
    const stroke = n.getAttribute('stroke') || n.style.stroke || '';
    const hasFill = fill && fill !== 'none';
    const hasStroke = stroke && stroke !== 'none';
    // שכבות-על שקופות ("צל", "שכבת ביניים", "over") — לא גזיר נייר
    if (/paper-shade|-over\)|shade\)/.test(fill)) continue;
    // קו דק בלי מילוי (גבעול, שורות בספר, מידות) — בלי צל
    if (!hasFill && (!hasStroke || Number(n.getAttribute('stroke-width') || 1) < 3)) continue;
    const c = n.cloneNode(false);
    c.removeAttribute('data-n');
    c.removeAttribute('data-fx');
    c.classList.remove('p');
    c.classList.add('pc');
    if (hasFill) c.style.fill = 'var(--paper-cut)';
    if (hasStroke) c.style.stroke = 'var(--paper-cut)';
    const scoped = Object.entries(SHADOW_OFFSET).find(([sel]) => n.closest(sel));
    const dx = scoped ? scoped[1] : 1;
    c.setAttribute('transform', `translate(${dx} 0) ${n.getAttribute('transform') || ''}`.trim());
    n.before(c);
    count++;
  }
  return count;
}

/* לינוי: הספרים שנלקחו (TAKEN_BOOKS). המיקום נמדד על המסך, בקואורדינטות הבמה (הספרייה עם WORLD_MATRIX) */
function markTakenBooks(library) {
  const toStage = scene.getScreenCTM().inverse();
  library.querySelectorAll('[data-n="ארון"] :is(path, rect)').forEach((n) => {
    const b = n.getBBox();
    const m = toStage.multiply(n.getScreenCTM());
    const pts = [[b.x, b.y], [b.x + b.width, b.y + b.height]].map(([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }));
    const box = [Math.min(pts[0].x, pts[1].x), Math.min(pts[0].y, pts[1].y), Math.max(pts[0].x, pts[1].x), Math.max(pts[0].y, pts[1].y)];
    const inside = TAKEN_BOOKS.some(([x, y, w, h]) => box[0] >= x - 1.5 && box[1] >= y - 1.5 && box[2] <= x + w + 1.5 && box[3] <= y + h + 1.5);
    if (inside) n.classList.add('book-taken');
  });
}

/* יעל: התגיות (בקואורדינטות הבמה) נכנסות לענף שלהן, שהוא בקואורדינטות הייצוא — עם המטריצה ההפוכה של WORLD_MATRIX.
   הן נפתחות כשהענף כמעט סיים לצמוח, כמו העלים והפרחים בקצוות */
const WORLD_INVERSE = `matrix(${1 / WORLD_K} 0 0 ${1 / WORLD_K} ${-WORLD_E / WORLD_K} ${-WORLD_F / WORLD_K})`;
function placeYaelTags() {
  const holder = el('g');
  holder.innerHTML = F.parts.bTags;
  holder.querySelectorAll('text[data-word]').forEach((t) => {
    t.textContent = CONTENT.worlds.B.tags[Number(t.dataset.word)];
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.classList.add('yael-tag-text');
  });
  [...holder.firstElementChild.children].forEach((tag, i) => {
    const branch = scene.querySelector(`[data-part="bBranch${YAEL_TAG_BRANCH[i]}"] > g`);
    if (!branch) return;
    const g = el('g', { 'data-part': 'bTag', transform: WORLD_INVERSE }, branch);
    g.append(tag);
    tag.classList.add('after');
    tag.style.setProperty('--reach', '0.9');
  });
}

const chars = {};  // id -> { groups: [body, hands], brain, button }

function buildScene() {
  document.getElementById('scene-defs').innerHTML = F.defs + SCENE_DEFS;

  // סדר ה-z כמו בפיגמה: ספרייה · עולם אריאל · עולם יעל · עולם לינוי · גופי הדמויות · שולחן · ידיים וחפץ.
  // (נמדד 14.11: פיצול ל-SVG נפרדים לכל שכבה לא שיפר את קצב הפריימים — נשאר SVG אחד)
  const layer = (name) => el('g', { class: `layer-${name}` }, scene);

  // 1. הספרייה. הקיר חלק בכל העולמות (17.11: בלי גריד ובלי דוגמה)
  const libraryLayer = layer('library');
  libraryLayer.setAttribute('transform', WORLD_MATRIX);
  const library = part('library', libraryLayer);
  const wall = library.querySelector('[data-n="קיר"]');
  // הקיר הוא רקע של כל הבמה, עד הקצה העליון (ולא רק של הספרייה)
  wall.querySelectorAll('rect').forEach((r) => {
    r.setAttribute('x', WORLD_COVER.x0); r.setAttribute('y', WORLD_COVER.y0);
    r.setAttribute('width', WORLD_COVER.x1 - WORLD_COVER.x0); r.setAttribute('height', WORLD_COVER.y1 - WORLD_COVER.y0);
  });
  library.querySelector('[data-n="מנורה"]')?.classList.add('lamp-before');
  // 17.11: הפסים על גב הספרים נסוגים לרקע יחד עם הספרים (style.css › --book-band-*)
  for (const tone of ['dark', 'light']) {
    library.querySelectorAll(`[fill="var(--lib-band-${tone})"]`).forEach((n) => n.setAttribute('fill', `var(--book-band-${tone})`));
  }
  markTakenBooks(library);

  // 2. העולמות מאחורי הדמויות (כולל החוטים של אריאל) — שכבה לכל עולם, כך שהרוח של יעל
  //    או הזרימה של אריאל מציירות מחדש רק את העולם שלהן
  for (const id of ['A', 'B', 'C']) {
    if (!WORLDS[id].back) continue;
    const g = layer(`world-${id}`);
    g.setAttribute('transform', WORLD_MATRIX);
    buildWorldLayer(id, WORLDS[id].back, g);
  }
  // אריאל: החוטים והצמתים ממורכזים על הראש (המספור נשאר)
  scene.querySelector('[data-part="aThreads"] [data-n="צמתים"]')?.setAttribute('transform', `translate(${THREAD_SHIFT} 0)`);
  // לינוי: חלקים בקואורדינטות הבמה (המנורה המרחפת והספרים), מאחורי הדמויות
  for (const id of ['A', 'B', 'C']) if (WORLDS[id].stage) buildWorldLayer(id, WORLDS[id].stage, layer(`world-${id}-stage`));

  // 3. גופי הדמויות + החור בראש
  const bodies = layer('bodies');
  // hover: הדמות גדלה ממרכז הבסיס שלה (על השולחן)
  const charOrigin = (g, id) => g.style.setProperty('transform-origin', `${CHARACTERS[id].boxX + 110}px 839px`);
  for (const id of ORDER) {
    const g = el('g', { class: 'char', 'data-char': id }, bodies);
    charOrigin(g, id);
    part(CHARACTERS[id].body, g);
    const hole = part(CHARACTERS[id].hole, g);
    hole.classList.add('hole');
    // "חור": המילוי עם צל פנימי, השפה (stroke מחוץ לצורה) בנפרד — הצל הפנימי רק בתוך החור
    const opening = hole.querySelector('[data-n="חור"]');
    if (opening) {
      const rim = opening.cloneNode(false);
      rim.removeAttribute('data-n');
      rim.setAttribute('fill', 'none');
      opening.before(rim);
      opening.removeAttribute('stroke');
      opening.setAttribute('filter', 'url(#hole-inner)');
    }
    const brain = hole.querySelector('[data-n="מוח"]');
    brain.classList.add('brain');
    chars[id] = { groups: [g], brain };
  }

  // 4. השולחן (עם חזית מלאה שמסתירה את הרגליים), 5. ידיים וחפץ
  part('table', layer('table'));
  // מסך 05: צל המנורה המרחפת נשאר על השולחן (לא זז עם הריחוף), והספר המעופף הימני עף מעל השולחן (מתחת לידיים)
  const front = buildWorldLayer('C', [{ part: 'cLampShadow', units: [[':scope', 'fade']] }], layer('world-C-front'));
  const freeBooks = scene.querySelectorAll('[data-part="cBooksFree"] [data-n="ספר מעופף"]');
  if (freeBooks.length > 1) front.append(freeBooks[freeBooks.length - 1]);
  const hands = layer('hands');
  for (const id of ORDER) {
    const g = el('g', { class: 'char', 'data-char': id }, hands);
    charOrigin(g, id);
    part(CHARACTERS[id].hands, g);
    chars[id].groups.push(g);
  }
  // יעל: פרח מיובש בספר שלה, שרבוט במחברת של לינוי, מדבקה על המחשב של אריאל
  for (const [key, owner] of YAEL_ON_OBJECTS) buildWorldLayer('B', [{ part: key, units: [[':scope', 'pop']] }], chars[owner].groups[1]);
  placeYaelTags();

  // אפקטי העומק הישנים (עמוד 06) מסומנים בייצוא של הדמויות — לא בשימוש יותר
  scene.querySelectorAll('[data-fxs]').forEach((n) => n.removeAttribute('data-fxs'));
  makePaintable(scene);
}

/* ===== מסגור וטקסט מ-content.js ===== */
function buildFrame() {
  document.title = CONTENT.title;

  const h = document.getElementById('headline');
  const l1 = document.createElement('span');
  l1.className = 'line1';
  l1.textContent = CONTENT.headline.line1;
  const l2 = document.createElement('span');
  l2.className = 'line2';
  l2.append(CONTENT.headline.line2);
  const strong = document.createElement('strong');
  strong.textContent = CONTENT.headline.line2Strong;
  l2.append(strong, CONTENT.headline.line2End);
  h.replaceChildren(l1, l2);

  // תג שם (389:599): מצב = שם / "מה אני רואה?" (hover וברמז) / "כוח" (422:587: בעלת העולם —
  // שם הדמות למעלה ושם הכוח בצבע העולם למטה, התג גדל ל-232×94 כלפי מטה)
  const tags = document.getElementById('tags');
  const hit = document.getElementById('hit');
  for (const id of ORDER) {
    const { name, power } = CONTENT.characters[id];
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.style.left = `${CHARACTERS[id].tagX}px`;
    const nameEl = document.createElement('span');
    nameEl.className = 'tag-name';
    nameEl.textContent = name;
    const ask = document.createElement('span');
    ask.className = 'tag-ask';
    ask.textContent = CONTENT.tagAsk;
    ask.setAttribute('aria-hidden', 'true');
    const powerEl = document.createElement('span');
    powerEl.className = 'tag-power';
    powerEl.textContent = power;
    tag.append(nameEl, ask, powerEl);
    tags.append(tag);
    chars[id].tag = tag;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.char = id;
    btn.style.left = `${CHARACTERS[id].boxX}px`;
    btn.setAttribute('aria-label', CONTENT.characterAria(name));
    btn.setAttribute('aria-pressed', 'false');
    hit.append(btn);
    chars[id].button = btn;
  }

  const bm = document.getElementById('bookmark');
  bm.setAttribute('aria-label', CONTENT.bookmark.aria);
  bm.innerHTML = `
    <span class="bookmark-ribbon"></span>
    <svg class="bookmark-arrow" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M5.8 14 H22.1 M22.1 14 L15.1 7 M22.1 14 L15.1 21" fill="none"
        stroke="var(--color-bg-page)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="bookmark-label"></span>`;
  bm.querySelector('.bookmark-label').textContent = CONTENT.bookmark.label;
}

/* ===== מצב: מקור אמת אחד. פתיחה, סגירה והחלפה עוברים דרך setActive ===== */
let activeId = null;
let paintables = [];

function scatter(list, maxDelay) {
  for (const node of list) node.style.setProperty('--d', `${Math.round(Math.random() * maxDelay)}ms`);
}

function setActive(nextId) {
  if (nextId === activeId) return;
  const spread = ms('--motion-takeover-spread');
  const revertSpread = ms('--motion-revert') * ms('--revert-spread-ratio');
  const opening = nextId !== null;

  scatter(paintables, opening ? spread : revertSpread);
  scatter(document.querySelectorAll('.lamp-before'), opening ? spread : revertSpread);
  if (activeId) scatter(units[activeId], revertSpread);
  if (nextId) scatter(units[nextId], spread);
  if (activeId) threads?.leave();

  // אחרי שהמעבר נגמר: hover על דמות בתוך עולם מחליף צבעים מיד (בלי ההשהיה האקראית של ההשתלטות)
  stage.classList.remove('is-settled');
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => stage.classList.add('is-settled'), (opening ? ms('--motion-takeover') + spread : ms('--motion-revert')) + 50);

  activeId = nextId;
  if (opening) {
    stage.dataset.mode = nextId;
    scheduleHint(nextId);
    stopPeek();   // אחרי הכניסה הראשונה לעולם — הרמז מתבטל לגמרי עד רענון הדף
  } else {
    delete stage.dataset.mode;
    cancelHint();
  }
  stage.classList.toggle('has-world', opening);

  // העולם שנסגר מקבל is-closing לזמן החזרה, כדי שהקרעים ייסגרו חזרה (ולא יהבהבו בטעינה)
  for (const id of Object.keys(worldGroups)) {
    for (const g of worldGroups[id]) {
      const wasOpen = g.classList.contains('is-open');
      g.classList.toggle('is-open', id === nextId);
      if (wasOpen && id !== nextId) {
        g.classList.add('is-closing');
        clearTimeout(g._closing);
        g._closing = setTimeout(() => g.classList.remove('is-closing'), ms('--motion-revert') + 100);
      } else if (id === nextId) {
        g.classList.remove('is-closing');
      }
    }
  }
  for (const [id, c] of Object.entries(chars)) {
    for (const g of c.groups) g.classList.toggle('is-active', id === nextId);
    c.tag.classList.toggle('is-active', id === nextId);
    c.button.setAttribute('aria-pressed', String(id === nextId));
  }
}
let settleTimer = 0;

/* ===== hover ===== */
let hoverId = null;
let hoveredOnce = false;

// hover שנמשך --peek-hover-intent (חצי שנייה) עוצר את הרמז; ריחוף מקרי לא
let hoverIntent = 0;
function setHover(id) {
  if (id === hoverId) return;
  hoverId = id;
  clearTimeout(hoverIntent);
  if (id) hoverIntent = setTimeout(() => { hoveredOnce = true; }, ms('--peek-hover-intent'));
  for (const [cid, c] of Object.entries(chars)) {
    for (const g of c.groups) g.classList.toggle('is-hover', cid === id);
    c.tag.classList.toggle('is-hover', cid === id);
  }
}

/* ===== רמז לפעולה (16.11 / 17.11) =====
   כשהעכבר לא זז ואין hover, דמות אחת מתרוממת מהדף 4px והצל שלה מעמיק (2,6, טשטוש 10, 22%),
   ובזמן שהיא למעלה התג שלה מתחלף ל"מה אני רואה?". בלי לפתוח את הראש ובלי מוח.
   סדר קבוע: אריאל, יעל, לינוי, וחוזר חלילה. הראשונה אחרי --motion-peek-first, ואז כל --motion-peek-interval.
   נעצר: hover של חצי שנייה ומעלה; חוזר אחרי --motion-peek-idle בלי תזוזה.
   אחרי הכניסה הראשונה לעולם — מתבטל לגמרי עד רענון הדף. לא רץ ב-prefers-reduced-motion */
let peekTimer = 0;
let peekFirst = 0;
let peekIndex = 0;
let lastActivity = performance.now();
function noteActivity() { lastActivity = performance.now(); }
const peekTargets = (c) => [...c.groups, c.tag];
function clearPeek() { Object.values(chars).forEach((c) => peekTargets(c).forEach((g) => g.classList.remove('is-peek'))); }
function peekOnce() {
  if (activeId || hoverId) return;
  if (hoveredOnce && performance.now() - lastActivity < ms('--motion-peek-idle')) return;
  const c = chars[HINT_ORDER[peekIndex % HINT_ORDER.length]];
  peekIndex++;
  peekTargets(c).forEach((g) => g.classList.add('is-peek'));
  setTimeout(() => peekTargets(c).forEach((g) => g.classList.remove('is-peek')), ms('--motion-hint-lift') + ms('--peek-hold'));
}
function startPeek() {
  if (reducedMotion) return;
  peekFirst = setTimeout(peekOnce, ms('--motion-peek-first'));
  peekTimer = setInterval(peekOnce, ms('--motion-peek-interval'));
}
function stopPeek() { clearTimeout(peekFirst); clearInterval(peekTimer); peekTimer = 0; clearPeek(); }

/* רמז בתוך העולם (שיפור 11.11): אם העכבר לא זז ~3 שניות אחרי שהעולם נפתח, המיקרו-אינטראקציה
   של העולם מודגמת פעם אחת על האלמנט הקרוב למרכז הספרייה. תזוזת עכבר מבטלת. לא ב-reduced-motion */
let hintTimer = 0;
const HINT_CENTER = { x: 720, y: 330 };
function cancelHint() { clearTimeout(hintTimer); hintTimer = 0; }
function scheduleHint(id) {
  cancelHint();
  if (reducedMotion) return;
  const delay = ms('--motion-takeover') + ms('--motion-takeover-spread') + ms('--motion-world-hint-idle');
  hintTimer = setTimeout(() => { if (activeId === id) playHint(id); }, delay);
}
function closestTo(list, point) {
  let best = null;
  let bestD = Infinity;
  for (const item of list) {
    const c = stageCenter(item);
    const d = Math.hypot(c.x - point.x, c.y - point.y);
    if (d < bestD) { best = item; bestD = d; }
  }
  return best && stageCenter(best);
}
function playHint(id) {
  if (id === 'A') {
    const c = closestTo(document.querySelectorAll('[data-part="aThreads"] [data-n^="צומת"]'), HINT_CENTER);
    if (!c) return;
    threads?.move(c.x + 30, c.y + 30);
    setTimeout(() => { if (activeId === 'A') threads?.leave(); }, 700);
  } else if (id === 'B') {
    const c = closestTo(glows.map((g) => g.el), HINT_CENTER);
    if (!c) return;
    lightFlowers(c.x, c.y);
    setTimeout(() => { if (activeId === 'B') lightFlowers(-999, -999); }, 1200);
  } else if (id === 'C') {
    const c = closestTo(books.map((b) => b.ref), HINT_CENTER);
    if (!c) return;
    nearest(books, c.x, c.y, 'orbit');
    setTimeout(() => { if (activeId === 'C') nearest(books, -999, -999, 'orbit'); }, 1200);
  }
}

/* ===== אריאל: החוטים נמתחים לכיוון העכבר =====
   כל חוט הוא קו שבור דרך הצמתים (מניפה שיוצאת מאחורי הראש). כל מקטע בין שני צמתים נמתח בנפרד
   לכיוון העכבר (קשת עדינה) וחוזר בקפיץ; הצמתים עצמם נשארים במקום */
let threads = null;
function setupThreads() {
  const root = document.querySelector('[data-part="aThreads"]');
  if (!root) return;
  const reach = 140;   // px: רדיוס הרגישות
  const pull = 24;     // px: משיכה מקסימלית
  const stiffness = 0.12;
  const damping = 0.78;

  const list = [...root.querySelectorAll('[data-n^="חוט "]')].map((g) => {
    const paths = [...g.querySelectorAll(':scope > path')];
    const t = paths[0].getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
    const nums = paths[0].getAttribute('d').match(/-?[\d.]+/g).map(Number);
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: Number(t[1]) + nums[i] + THREAD_SHIFT, y: Number(t[2]) + nums[i + 1] });
    paths.forEach((p) => p.removeAttribute('transform'));
    // נקודות זרימה: נקודות קטנות ובהירות בתוך החוט האדום (לא מכסות אותו)
    const flow = el('path', { class: 'flow' });
    paths[paths.length - 1].after(flow);
    const segs = pts.slice(1).map((b, i) => ({ a: pts[i], b, ox: 0, oy: 0, vx: 0, vy: 0, tx: 0, ty: 0 }));
    return { start: pts[0], segs, paths: [...paths, flow] };
  });
  const segs = list.flatMap((l) => l.segs);

  let mouse = null;
  let frame = 0;
  const render = () => {
    for (const l of list) {
      let d = `M${l.start.x} ${l.start.y}`;
      for (const s of l.segs) {
        const cx = (s.a.x + s.b.x) / 2 + s.ox * 2;
        const cy = (s.a.y + s.b.y) / 2 + s.oy * 2;
        d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${s.b.x} ${s.b.y}`;
      }
      for (const p of l.paths) p.setAttribute('d', d);
    }
  };
  const tick = () => {
    let moving = Boolean(mouse);
    for (const s of segs) {
      s.tx = 0; s.ty = 0;
      if (mouse) {
        const vx = s.b.x - s.a.x;
        const vy = s.b.y - s.a.y;
        const t = Math.max(0, Math.min(1, ((mouse.x - s.a.x) * vx + (mouse.y - s.a.y) * vy) / (vx * vx + vy * vy)));
        const dx = mouse.x - (s.a.x + vx * t);
        const dy = mouse.y - (s.a.y + vy * t);
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < reach) {
          const amount = Math.min(dist, pull) * (1 - dist / reach) * 4 * t * (1 - t);
          s.tx = (dx / dist) * amount;
          s.ty = (dy / dist) * amount;
        }
      }
      s.vx = (s.vx + (s.tx - s.ox) * stiffness) * damping;
      s.vy = (s.vy + (s.ty - s.oy) * stiffness) * damping;
      s.ox += s.vx;
      s.oy += s.vy;
      if (Math.abs(s.ox) + Math.abs(s.oy) + Math.abs(s.vx) + Math.abs(s.vy) > 0.02) moving = true;
    }
    render();
    frame = moving ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => { if (!frame) frame = requestAnimationFrame(tick); };
  render();
  threads = {
    // x, y בקואורדינטות הבמה; החוטים בקואורדינטות הייצוא (WORLD_MATRIX)
    move(x, y) { mouse = toWorld(x, y); wake(); },
    leave() { mouse = null; wake(); },
  };
}

/* ===== יעל: רוח בענפים, אור בפרח הקרוב ===== */
const glows = [];
function setupYael() {
  [2.2, 2.6, 2.9, 3.3, 2.4].forEach((dur, i) => {
    const branch = document.querySelector(`[data-part="bBranch${i + 1}"] > g`);
    if (!branch) return;
    branch.classList.add('wind');
    branch.style.setProperty('--wind-dur', `${dur}s`);
    branch.style.setProperty('--wind-delay', `${-i * 0.7}s`);
    branch.style.setProperty('--wind-angle', `${1.0 + (i % 3) * 0.2}deg`);
  });
  // אור פרח לכל פרח (לפי "לב פרח"), כולל פרחים בקצוות שאין להם שכבת אור ב-Figma.
  // ההילה נבנית מאחורי הפרח בצבעי האור של יעל, בתוך הענף (כדי שתזוז עם הרוח)
  document.querySelectorAll('[data-n="אור פרחים · hover"]').forEach((g) => g.remove());
  document.querySelectorAll('[data-part^="bBranch"] > g').forEach((branch) => {
    const back = branch.querySelector('[data-n="גב פרח"]');
    branch.querySelectorAll('[data-n="לב פרח"] > path').forEach((p) => {
      const b = p.getBBox();
      const m = p.transform.baseVal.consolidate()?.matrix;
      const x = (m ? m.e : 0) + b.x + b.width / 2;
      const y = (m ? m.f : 0) + b.y + b.height / 2;
      const halo = el('g', { class: 'glow' });
      // ההילה גדלה יחד עם הפרח (17.11: "אור פרח" בפיגמה מוגדל באותו יחס).
      // 24.11: לכל אחד משני העיגולים צל גזירי נייר משלו ("צל עדין גזירי נייר" ב-89:550) — אותו עותק בשחור 25%
      // מוזז 1px כמו ב-paperShadows, בתוך ההילה, כך שהוא גדל וזז יחד עם העיגול
      for (const [r, fill] of [[40, 'var(--yael-light)'], [24, 'var(--yael-light-2)']]) {
        const attrs = { cx: x, cy: y, r: r * flowerScale };
        el('circle', { ...attrs, cx: x + 1, class: 'pc', style: 'fill: var(--paper-cut)' }, halo);
        el('circle', { ...attrs, fill }, halo);
      }
      back.before(halo);
      glows.push({ el: halo });
    });
  });
  // הצבעוני: אותה הילה על המנורה (r 8 → 30)
  const tulip = document.querySelector('[data-n="הילת מנורה"]');
  if (tulip) {
    tulip.classList.add('glow');
    tulip.style.setProperty('--glow-scale', 3.75);
    glows.push({ el: tulip });
  }
}

// מרכז אלמנט בקואורדינטות הבמה, לפי המיקום שלו על המסך בפועל (כולל רוח, ריחוף והסקייל של הבמה).
// כך המרחק נכון בכל גודל חלון (הבאג הישן: getBBox בקואורדינטות מקומיות)
function stageCenter(node) {
  const r = node.getBoundingClientRect();
  return stagePoint({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
}

// כל פרח שקרוב לעכבר נדלק; העוצמה לפי המרחק (קרוב = הילה מלאה). כמה בבת אחת
const GLOW_RADIUS = 260;
function lightFlowers(x, y) {
  for (const g of glows) {
    const c = stageCenter(g.el);
    const k = Math.max(0, 1 - Math.hypot(c.x - x, c.y - y) / GLOW_RADIUS);
    g.el.style.setProperty('--glow', k.toFixed(3));
  }
}

/* ===== לינוי: ספרים מרחפים ומנפנפים, מסלול לספר הקרוב ===== */
const books = [];
function setupLinoy() {
  // כל ספר (בקרעים ובארון התחתון) מרחף במסלול קטן ומנפנף בכריכות
  document.querySelectorAll('[data-n="ספר מעופף"]').forEach((book, i) => {
    const wings = book.querySelector('[data-n="ספר-ציפור"]');
    wings.classList.add('flap', 'book-tilt');
    wings.style.setProperty('--flap-delay', `${-i * 0.4}s`);
    const hover = el('g', { class: 'hover-float' });
    book.before(hover);
    hover.append(book);
    hover.style.setProperty('--float-dur', `${3 + (i % 3) * 0.5}s`);
    hover.style.setProperty('--float-delay', `${-i * 0.9}s`);
    book.querySelector('[data-n="מסלול"]')?.classList.add('orbit-path');
    books.push({ el: book, ref: wings, r: 120 });
  });
  // המנורה המרחפת (17.11): התנתקה מהשולחן ומרחפת לאט, כמו הספרים
  const lamp = document.querySelector('[data-part="cLampFloat"] [data-n="מנורה מרחפת"]');
  if (lamp) {
    lamp.classList.add('hover-float');
    lamp.style.setProperty('--float-dur', '4.5s');
  }
}

// קרבה, לא רק פגיעה: האלמנט הקרוב לעכבר בטווח שלו
function nearest(list, x, y, cls) {
  let best = null;
  let bestD = Infinity;
  for (const item of list) {
    const c = stageCenter(item.ref);
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < item.r && d < bestD) { best = item; bestD = d; }
  }
  for (const item of list) item.el.classList.toggle(cls, item === best);
}

/* ===== אירועים ===== */
function stagePoint(event) {
  const rect = stage.getBoundingClientRect();
  const scale = rect.width / stage.offsetWidth;
  return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
}

function bindEvents() {
  // כל תזוזה (גם בשוליים מחוץ לבמה), לחיצה או מקש = לא idle
  for (const type of ['pointermove', 'pointerdown', 'keydown']) window.addEventListener(type, noteActivity, { passive: true });

  stage.addEventListener('pointermove', (event) => {
    cancelHint();   // המשתמשת כבר חוקרת — אין צורך ברמז
    const c = event.target.closest('.char');
    setHover(c ? c.dataset.char : null);
    const { x, y } = stagePoint(event);
    if (activeId === 'A') threads?.move(x, y);
    if (activeId === 'B') lightFlowers(x, y);
    if (activeId === 'C') nearest(books, x, y, 'orbit');
  });
  stage.addEventListener('pointerleave', () => {
    setHover(null);
    threads?.leave();
    lightFlowers(-999, -999);
    nearest(books, -999, -999, 'orbit');
  });

  // לחיצה על כל הדמות פותחת את העולם שלה; לחיצה עליה כשהעולם שלה פתוח סוגרת;
  // לחיצה על דמות אחרת כשעולם פתוח = מעבר ישיר. משוב לחיצה: המוח נמעך מיד
  const release = () => Object.values(chars).forEach((c) => c.groups.forEach((g) => g.classList.remove('is-press')));
  stage.addEventListener('pointerdown', (event) => {
    const c = event.target.closest('.char');
    if (c) chars[c.dataset.char].groups.forEach((g) => g.classList.add('is-press'));
  });
  window.addEventListener('pointerup', release);
  stage.addEventListener('pointerleave', release);

  stage.addEventListener('click', (event) => {
    const c = event.target.closest('.char');
    if (!c) return;
    const id = c.dataset.char;
    setActive(activeId === id ? null : id);
  });

  document.getElementById('bookmark').addEventListener('click', () => setActive(null));

  // מקלדת: focus = מצב hover, Enter = לחיצה, Esc = חזרה
  for (const [id, c] of Object.entries(chars)) {
    c.button.addEventListener('focus', () => setHover(id));
    c.button.addEventListener('blur', () => setHover(null));
    c.button.addEventListener('click', () => setActive(activeId === id ? null : id));
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setActive(null);
  });

  window.addEventListener('resize', fitStage);
}

/* ===== התאמת הבמה לחלון ===== */
function fitStage() {
  const scale = Math.min(window.innerWidth / stage.offsetWidth, window.innerHeight / stage.offsetHeight);
  document.documentElement.style.setProperty('--stage-scale', scale);
}

function init() {
  // בזמן הבנייה בלי מעברים: אחרת מאות עלים, פרחים ויחידות "מתכווצים" לאפס ברגע הטעינה (עבודה מיותרת)
  stage.classList.add('is-building');
  buildScene();
  buildFrame();
  paintables = [...scene.querySelectorAll('.p'), ...document.querySelectorAll('.tag, .bookmark-ribbon')];
  setupThreads();
  setupYael();
  setupLinoy();
  paperShadows();   // אחרון: הצל הוא עותק של כל צורה, כולל המחלקות שנקבעו בשלבים הקודמים
  getComputedStyle(scene.querySelector('.layer-bodies')).opacity;   // מחשב את המצב ההתחלתי לפני שמחזירים את המעברים
  stage.classList.remove('is-building');
  bindEvents();
  fitStage();
  startPeek();
}

init();
