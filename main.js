/* ===== כוח העל שלנו =====
   כל האיורים מגיעים מקובץ ה-Figma דרך figma-parts.js (SVG בקואורדינטות הבמה, צבעים כ-var(--...)).
   כל התזמונים והצבעים ב-:root שב-style.css, בשמות של Figma.
   עדכון 14.11.26: מקור האמת הוא עמודים 04 (רכיבים) ו-05 (מסכים) בלבד.

   מפת שמות השכבות (Figma בעברית → תפקיד בקוד):
   'קיר' קיר הספרייה · 'ארון' הספרייה עצמה · 'מנורה' המנורה הרגילה (רק בלפני) · 'חור בראש' החור · 'מוח' המוח
   'חוט NN' חוט של אריאל ('רצועת נייר' + 'חוט', קו שבור דרך הצמתים) · 'צומת NN' צומת · 'מספור מדפים'
   'מגירת קטלוג' · 'חלון אור' · 'ענף N' · 'לב פרח' · 'הילת מנורה' · 'מנורת צבעוני'
   'לינוי · קרעים' ('שפת נייר קרועה' + 'חלל' + 'כוכבים' + 'ספר מעופף') · 'סימנים · רצועת נייר' (פיסת הנייר של כל סימן)
   'כוכבים' / 'ספירלות' / 'שמשות' · 'ספר מעופף' ('ספר-ציפור' + 'מסלול') · 'חלון קרוע' (הארון התחתון של לינוי) */

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
    under: [{ part: 'aGrid', units: [[':scope > *', 'fade']] }],
    back: [
      { part: 'aDrawers', units: [['[data-n="מגירת קטלוג"]', 'drawer']] },
      { part: 'aLamp', units: [[':scope > :not(text)', 'pop'], ['text', 'fade']] },
      { part: 'aDims', units: [[':scope > *', 'stretch']] },
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
    // סדר השכבות כמו בספרייה ב-Figma: השעון, הסימנים, הקרעים.
    // הארון התחתון: בלי קרעים, כמו בפיגמה (הקרע הישן מאחורי יעל הוסר 14.11)
    back: [
      { part: 'cClock', units: [[':scope', 'pop']] },
      { part: 'cDecor', units: [['[data-n="סימן"]', 'pop']] },
      { part: 'cTearsNew', units: [[':scope', 'rip']] },
    ],
  },
};

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
  <!-- הקרעים של לינוי נפתחים מהראש שלה החוצה (main.js › markUnit 'rip') -->
  <clipPath id="linoy-rip"><circle class="rip-circle" cx="249" cy="590"/></clipPath>`;

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

// מרכז של צורה על המסך (להשוואת מרחקים בלבד)
const screenCenter = (n) => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

/* תיקונים אחרי הייבוא */
const GRID_STEP = 33.9;
const CLEANUP = {
  // איזון צפיפות: בלי קווי הבנייה המקווקווים על הקיר
  aDims: (root) => root.querySelectorAll(':scope > rect[opacity="0.35"]').forEach((r) => r.remove()),
  // הגריד ממשיך עד הקצה העליון של הבמה (כרקע של כל ה-stage, לא רק של הספרייה המוזזת)
  aGrid: (root) => {
    const rects = [...root.querySelectorAll('rect')];
    rects.filter((r) => Number(r.getAttribute('width')) < 2).forEach((r) => { r.setAttribute('y', 0); r.setAttribute('height', 1120); });
    const rows = rects.filter((r) => Number(r.getAttribute('height')) < 2);
    const first = rows.reduce((a, b) => (Number(a.getAttribute('y')) < Number(b.getAttribute('y')) ? a : b));
    for (let y = Number(first.getAttribute('y')) - GRID_STEP; y > -GRID_STEP; y -= GRID_STEP) {
      const r = first.cloneNode();
      r.setAttribute('y', Math.round(y * 10) / 10);
      first.before(r);
    }
  },
  // לינוי: כל סימן (כוכב / ספירלה / שמש) יחד עם פיסת הנייר שלו בקבוצה אחת —
  // כך שהם מסתובבים יחד סביב אותו מרכז בדיוק. ה-<g class="spin"> הפנימי מסתובב, ה-<g> החיצוני הוא יחידת ההשתלטות
  cDecor: (root) => {
    const strips = [...root.querySelectorAll('[data-n="סימנים · רצועת נייר"] > *')].map((n) => ({ n, c: screenCenter(n) }));
    const stripsGroup = root.querySelector('[data-n="סימנים · רצועת נייר"]');
    const marks = [...root.querySelectorAll('[data-n="כוכבים"] > *, [data-n="ספירלות"] > *, [data-n="שמשות"] > *')];
    for (const m of marks) {
      const c = screenCenter(m);
      let best = null;
      let bestD = Infinity;
      for (const s of strips) {
        const d = Math.hypot(s.c.x - c.x, s.c.y - c.y);
        if (!s.used && d < bestD) { best = s; bestD = d; }
      }
      const unit = el('g', { 'data-n': 'סימן' });
      const spin = el('g', { class: 'spin' }, unit);
      if (best) { best.used = true; spin.append(best.n); }
      spin.append(m);
      stripsGroup.before(unit);
    }
    root.querySelectorAll('[data-n="סימנים · רצועת נייר"], [data-n="כוכבים"], [data-n="ספירלות"], [data-n="שמשות"]').forEach((g) => g.remove());
  },
};

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
  '[data-part="cClock"]',
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

const chars = {};  // id -> { groups: [body, hands], brain, button }

function buildScene() {
  document.getElementById('scene-defs').innerHTML = F.defs + SCENE_DEFS;

  // סדר ה-z כמו בפיגמה: ספרייה · עולם אריאל · עולם יעל · עולם לינוי · גופי הדמויות · שולחן · ידיים וחפץ.
  // (נמדד 14.11: פיצול ל-SVG נפרדים לכל שכבה לא שיפר את קצב הפריימים — נשאר SVG אחד)
  const layer = (name) => el('g', { class: `layer-${name}` }, scene);

  // 1. הספרייה, ועל הקיר שלה (אחרי 'קיר') שכבות ה-under של העולמות
  const library = part('library', layer('library'));
  const wall = library.querySelector('[data-n="קיר"]');
  // הקיר הוא רקע של כל הבמה, עד הקצה העליון (ולא רק של הספרייה המוזזת)
  wall.querySelectorAll('rect').forEach((r) => {
    r.setAttribute('x', 0); r.setAttribute('y', 0); r.setAttribute('width', 1440); r.setAttribute('height', 1024);
  });
  let anchor = wall;
  for (const id of ['A', 'B', 'C']) {
    if (!WORLDS[id].under) continue;
    const g = el('g');
    anchor.after(g);
    buildWorldLayer(id, WORLDS[id].under, g);
    anchor = g;
  }
  library.querySelector('[data-n="מנורה"]')?.classList.add('lamp-before');

  // 2. העולמות מאחורי הדמויות (כולל החוטים של אריאל) — שכבה לכל עולם, כך שהרוח של יעל
  //    או הזרימה של אריאל מציירות מחדש רק את העולם שלהן
  for (const id of ['A', 'B', 'C']) if (WORLDS[id].back) buildWorldLayer(id, WORLDS[id].back, layer(`world-${id}`));

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
  const hands = layer('hands');
  for (const id of ORDER) {
    const g = el('g', { class: 'char', 'data-char': id }, hands);
    charOrigin(g, id);
    part(CHARACTERS[id].hands, g);
    chars[id].groups.push(g);
  }

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
  l2.append(strong);
  h.replaceChildren(l1, l2);

  const tags = document.getElementById('tags');
  const hit = document.getElementById('hit');
  for (const id of ORDER) {
    const name = CONTENT.characters[id].name;
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.style.left = `${CHARACTERS[id].tagX}px`;
    tag.textContent = name;
    tags.append(tag);

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
    <span class="bookmark-label"></span>
    <span class="bookmark-sub"></span>`;
  bm.querySelector('.bookmark-label').textContent = CONTENT.bookmark.label;
  bm.querySelector('.bookmark-sub').textContent = CONTENT.bookmark.sub;
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

  activeId = nextId;
  if (opening) {
    stage.dataset.mode = nextId;
    scheduleHint(nextId);
    document.getElementById('power').textContent = CONTENT.characters[nextId].power;
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
    c.button.setAttribute('aria-pressed', String(id === nextId));
  }
}

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
  }
}

/* ===== רמז לפעולה (עדכון 14.11, מחליף את ה"הצצה") =====
   כשהעכבר לא זז ואין hover, הדמויות רק גדלות מעט (×1.04) וחוזרות — בלי לפתוח את הראש ובלי מוח.
   סדר קבוע: אריאל, יעל, לינוי, וחוזר חלילה. הראשונה אחרי --motion-peek-first, ואז כל --motion-peek-interval.
   נעצר: hover של חצי שנייה ומעלה; חוזר אחרי --motion-peek-idle בלי תזוזה.
   אחרי הכניסה הראשונה לעולם — מתבטל לגמרי עד רענון הדף. לא רץ ב-prefers-reduced-motion */
let peekTimer = 0;
let peekFirst = 0;
let peekIndex = 0;
let lastActivity = performance.now();
function noteActivity() { lastActivity = performance.now(); }
function clearPeek() { Object.values(chars).forEach((c) => c.groups.forEach((g) => g.classList.remove('is-peek'))); }
function peekOnce() {
  if (activeId || hoverId) return;
  if (hoveredOnce && performance.now() - lastActivity < ms('--motion-peek-idle')) return;
  const c = chars[HINT_ORDER[peekIndex % HINT_ORDER.length]];
  peekIndex++;
  c.groups.forEach((g) => g.classList.add('is-peek'));
  setTimeout(() => c.groups.forEach((g) => g.classList.remove('is-peek')), ms('--motion-hover-open') + ms('--peek-hold'));
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
    const c = closestTo(decor.map((d) => d.ref), HINT_CENTER);
    if (!c) return;
    spinDecor(c.x, c.y);
    setTimeout(() => { if (activeId === 'C') spinDecor(-9999, -9999); }, 700);
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
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: Number(t[1]) + nums[i], y: Number(t[2]) + nums[i + 1] });
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
    move(x, y) { mouse = { x, y }; wake(); },
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
      el('circle', { cx: x, cy: y, r: 40, fill: 'var(--yael-light)' }, halo);
      el('circle', { cx: x, cy: y, r: 24, fill: 'var(--yael-light-2)' }, halo);
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
}

// לינוי: כוכבים, ספירלות ושמשות — כניסת העכבר לטווח = סיבוב שלם אחד (360°), מצטבר — תמיד קדימה.
// הסימן ופיסת הנייר שלו באותו <g class="spin"> (CLEANUP.cDecor), כך שהם מסתובבים יחד סביב אותו מרכז
const DECOR_RADIUS = ms('--linoy-spin-radius');   // 220px
const decor = [];
function setupLinoyDecor() {
  document.querySelectorAll('[data-part="cDecor"] .spin').forEach((g) => decor.push({ ref: g, els: [g] }));
}
function spinDecor(x, y) {
  for (const d of decor) {
    const c = stageCenter(d.ref);
    const inside = Math.hypot(c.x - x, c.y - y) < DECOR_RADIUS;
    if (inside && !d.inside) {
      d.turns = (d.turns || 0) + 1;
      for (const e of d.els) e.style.setProperty('--spin', `${d.turns * 360}deg`);
    }
    d.inside = inside;
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
    if (activeId === 'C') { nearest(books, x, y, 'orbit'); spinDecor(x, y); }
  });
  stage.addEventListener('pointerleave', () => {
    setHover(null);
    threads?.leave();
    lightFlowers(-999, -999);
    nearest(books, -999, -999, 'orbit');
    spinDecor(-9999, -9999);
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
  setupLinoyDecor();
  paperShadows();   // אחרון: הצל הוא עותק של כל צורה, כולל המחלקות שנקבעו בשלבים הקודמים
  getComputedStyle(scene.querySelector('.layer-bodies')).opacity;   // מחשב את המצב ההתחלתי לפני שמחזירים את המעברים
  stage.classList.remove('is-building');
  bindEvents();
  fitStage();
  startPeek();
}

init();
