/* ===== כוח העל שלנו =====
   כל האיורים מגיעים מקובץ ה-Figma דרך figma-parts.js (SVG בקואורדינטות הבמה, צבעים כ-var(--...)).
   כל התזמונים והצבעים ב-:root שב-style.css, בשמות של Figma.

   מפת שמות השכבות (Figma בעברית → תפקיד בקוד):
   'קיר' קיר הספרייה · 'מנורה' המנורה הרגילה (רק בלפני) · 'חור בראש' החור · 'מוח' המוח
   'חוט NN' חוט של אריאל ('רצועת נייר' + 'חוט') · 'צומת NN' צומת · 'מספור מדפים' · 'מגירת קטלוג'
   'בועת ניתוח' · 'חלון אור' · 'ענף N' · 'אור פרח' · 'הילת מנורה' · 'מנורת צבעוני'
   'חלון קרוע' · 'קרע N' · 'גלים' · 'ספר מעופף' ('ספר-ציפור' + 'מסלול') */

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

/* ===== העולמות: מה נכנס לאן, ואיך כל יחידה משתנה בהשתלטות =====
   under = על הקיר מאחורי הארון · back = מעל הספרייה, מאחורי הדמויות · front = מעל הדמויות.
   units: [בורר, סוג]. סוגים: fade · pop · tear (overshoot) · stretch · draw (הקו נמתח) · drawer · branch */
const WORLDS = {
  A: {
    under: [{ part: 'aGrid', units: [[':scope > *', 'fade']] }],
    back: [
      { part: 'aDrawers', units: [['[data-n="מגירת קטלוג"]', 'drawer']] },
      { part: 'aLamp', units: [['path', 'draw'], ['text', 'fade']] },
      { part: 'aAnalysis', units: [['rect', 'fade']] },   // רק מסגרות מקווקוות (הבועות נמחקו ב-Figma)
      { part: 'aDims', units: [[':scope > *', 'stretch']] },
    ],
    front: [
      // "פאות · קווי בנייה" מאחורי החוטים: קווים מקווקווים ומשולשים שקופים
      // עמוד 06: קבוצה אחת — "פאות · קווי בנייה" מאחורי החוטים, ואז החוטים (זיגזג), הצמתים והמספור
      {
        part: 'aThreads',
        units: [
          ['[data-n="קו בנייה"]', 'fade'], ['[data-n="פאה"]', 'fade'],
          ['[data-n^="חוט "]', 'draw'], ['[data-n^="צומת"]', 'pop'], ['[data-n="מספור מדפים"] > g', 'fade'],
        ],
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
    // סדר השכבות כמו בספרייה ב-Figma: השעון, הקרעים והספרים, ומעליהם הקרעים בארון —
    // כך שקווי האסוציאציה נעלמים מתחת לשפת הקרע
    back: [
      { part: 'cClock', units: [[':scope', 'pop']] },
      { part: 'cAssoc', units: [['[data-n^="גלים"]', 'draw'], [':scope > g:not([data-n^="גלים"])', 'fade']] },
      ...[1, 2, 3, 4, 5].map((i) => ({ part: `cTear${i}`, units: [[':scope', 'tear']] })),
      { part: 'cPlanet', units: [[':scope', 'pop']] },
      ...[1, 2, 3, 4].map((i) => ({ part: `cBook${i}`, units: [[':scope', 'pop']] })),
      { part: 'cTears', units: [['[data-n="חלון קרוע"]', 'tear']] },
    ],
  },
};

/* טקסט השרטוט של אריאל: במקום ה-placeholders שב-Figma, לפי הסדר, מתוך content.js.
   box = [x, y, w, h] בבמה (מ-Figma) */
const WORLD_TEXT = CONTENT.worlds.A;
const TEXT_SPOTS = {
  aThreads: [
    { box: [1387.2, 268.3, 26, 32], size: 21.2, text: WORLD_TEXT.shelfNumbers[0] },
    { box: [1382.9, 395.5, 30, 32], size: 21.2, text: WORLD_TEXT.shelfNumbers[1] },
    { box: [1383, 522.7, 30, 32], size: 21.2, text: WORLD_TEXT.shelfNumbers[2] },
  ],
  aDims: [
    { box: [701.5, 188.5, 37, 23], size: 14.8, text: WORLD_TEXT.dimensions.width },
    { box: [18, 500.4, 22.3, 40.3], size: 14.8, text: WORLD_TEXT.dimensions.height, rotate: -90 },
  ],
  aLamp: [{ box: [533.4, 796.6, 24, 21], size: 13.8, text: WORLD_TEXT.lampAngle }],
};

/* ===== עומק וצללים (עמוד 06, 8 סגנונות "ניסוי עומק/…") =====
   כל סגנון = פילטר SVG אחד. [סוג, x, y, radius, משתנה]: d = צל חיצוני, i = צל פנימי.
   radius של Figma = פעמיים stdDeviation. הצבע מ-var(--shadow-*), ולכן הצל עובר עם העולם */
const FX = {
  touch: [['d', 0, 2, 2, 'shadow-contact'], ['d', 0, 6, 10, 'shadow-ambient']],          // 1 · מגע
  furniture: [['d', 0, 3, 4, 'shadow-contact'], ['d', 0, 18, 40, 'shadow-ambient']],     // 2 · רהיט
  figure: [['d', 0, 4, 6, 'shadow-contact'], ['d', 0, 22, 44, 'shadow-ambient']],        // 3 · דמות
  float: [['d', 0, 6, 8, 'shadow-contact'], ['d', 0, 30, 60, 'shadow-ambient']],         // 4 · מרחף
  recess: [['i', 0, 18, 22, 'shadow-inner'], ['i', 0, -2, 6, 'shadow-contact']],         // שקע
  panel: [['i', 0, 2, 0, 'shadow-highlight'], ['i', 0, -3, 0, 'shadow-inner'], ['d', 0, 1, 0, 'shadow-contact']], // פאנל
  volume: [['i', 6, 6, 4, 'shadow-volume-light'], ['i', -9, -11, 3, 'shadow-inner']],   // נפח
  book: [['d', -3, 0, 3, 'shadow-contact']],                                             // ספר
  hole: [['i', 0, 23.4, 28.6, 'shadow-inner'], ['i', 0, -2.6, 7.8, 'shadow-contact']],  // "חור בראש" (שקע ×1.3)
  // הקרעים של לינוי: שקע + הצל הפנימי של הקרע עצמו (0,10,16), והצל החיצוני הדק (0,2,3)
  tear: [['i', 0, 18, 22, 'shadow-inner'], ['i', 0, -2, 6, 'shadow-contact'], ['i', 0, 10, 16, 'linoy-tear-inner']],
  tearDrop: [['d', 0, 2, 3, 'linoy-tear-drop']],
};

function fxFilter(id, list, region) {
  let body = '';
  const drops = [];
  const inners = [];
  list.forEach(([kind, dx, dy, r, color], k) => {
    const res = `${id}-${k}`;
    const flood = `<feFlood style="flood-color: var(--${color})"/>`;
    if (kind === 'd') {
      body += `<feGaussianBlur in="SourceAlpha" stdDeviation="${r / 2}"/><feOffset dx="${dx}" dy="${dy}" result="${res}o"/>`
        + `${flood}<feComposite in2="${res}o" operator="in" result="${res}"/>`;
      drops.push(res);
    } else {
      // צל פנימי: האלפא ההפוכה, מטושטשת ומוזזת, נחתכת לצורה עצמה
      body += `<feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer>`
        + `<feGaussianBlur stdDeviation="${r / 2}"/><feOffset dx="${dx}" dy="${dy}" result="${res}o"/>`
        + `${flood}<feComposite in2="${res}o" operator="in"/><feComposite in2="SourceAlpha" operator="in" result="${res}"/>`;
      inners.push(res);
    }
  });
  const merge = [...drops.reverse(), 'SourceGraphic', ...inners].map((r) => `<feMergeNode in="${r}"/>`).join('');
  return `<filter id="${id}" ${region} color-interpolation-filters="sRGB">${body}<feMerge>${merge}</feMerge></filter>`;
}

// כמה מקום הצל צריך סביב הצורה: 3 סטיות תקן של הטשטוש + ההיסט (וגם 30px לתנועה של ילדים: ריחוף, רוח)
const fxPad = (list) => Math.max(...list.map(([, dx, dy, r]) => 1.5 * r + Math.max(Math.abs(dx), Math.abs(dy)))) + 30;

/* איפה כל סגנון מופיע בעמוד 06 (לפי שמות השכבות) */
const DEPTH = [
  ['[data-part="library"] [data-n="ארון"] > rect:first-child', 'furniture'],
  // פאנל על הקבוצה ולא על כל דלת/מגירה: הן לא נוגעות זו בזו, אז התוצאה זהה — ופילטר אחד במקום 48
  ['[data-part="library"] [data-n="ארון תחתון"]', 'panel'],
  ['[data-part="library"] [data-n^="מדף"] > rect:first-child', 'recess'],           // גב מדף
  ['[data-part="library"] [data-n^="ספרים · מדף"]', 'book'],                        // על המדף כולו ולא על כל ספר (ביצועים)
  ['[data-part="library"] [data-n="מנורה"]', 'touch'],
  ['[data-part="table"] > g', 'furniture'],
  ['[data-part="table"] rect[rx]', 'panel'],                                        // משטח השולחן העליון
  ['[data-n="ידיים וחפץ"]', 'touch'],
  // הדמויות (bodyA/B/C, 11.11): הסגנון מגיע מהשכבה עצמה ברכיב "דמות" 239:8969 (data-fxs בייצוא), לא לפי שם.
  // כאן רק הידיים, שעדיין מעמוד 04
  ['[data-part^="hands"] [data-n="בגד · שכבת ביניים"]', 'volume'],
  // החור בראש (וריאנט ראש=פתוח): שקע ×1.3 כאפקט מקומי על "חור בראש"
  ['.hole', 'hole'],
  ['[data-part="aDrawers"] > g', 'panel'],
  ['[data-n="חלון אור"]', 'recess'],
  ['[data-part="aThreads"] [data-n="חוטים"], [data-part="aThreads"] [data-n="צמתים"]', 'float'],
  ['[data-part="aLamp"] > g, [data-part="cClock"] > g, [data-n="מנורת צבעוני"]', 'float'],
  ['[data-part^="bBranch"] > g', 'float'],
  ['[data-n="גלים · רצועת נייר"], [data-n="קווים · רצועת נייר"], [data-n="סימנים · רצועת נייר"]', 'float'],
  ['[data-n="ספר מעופף"]', 'float'],
  ['[data-n="קפל נייר"]', 'touch'],
  ['[data-n="קרע"]', 'tearDrop'],
  ['[data-n="קרע"] > path:first-child', 'tear'],
];

// ביצועים: לכל אלמנט פילטר משלו, עם אזור צמוד לגבולות שלו + המרווח שהצל צריך (ולא אחוזים גורפים).
// פחות פיקסלים לחישוב בכל פריים של המעבר לעולם
function applyDepth() {
  const defs = [];
  let k = 0;
  const targets = [];
  for (const [selector, name] of DEPTH) scene.querySelectorAll(selector).forEach((n) => targets.push([n, name]));
  // שכבות שהסגנון שלהן יוצא מ-Figma עצמה (data-fxs, ייצוא 11.11)
  scene.querySelectorAll('[data-fxs]').forEach((n) => { if (FX[n.dataset.fxs]) targets.push([n, n.dataset.fxs]); });
  for (const [n, name] of targets) {
    const pad = fxPad(FX[name]);
    const b = n.getBBox();
    if (name === 'volume' && b.width < 20) continue;
    const id = `fx-${name}-${k++}`;
    const region = `filterUnits="userSpaceOnUse" x="${Math.floor(b.x - pad)}" y="${Math.floor(b.y - pad)}" `
      + `width="${Math.ceil(b.width + 2 * pad)}" height="${Math.ceil(b.height + 2 * pad)}"`;
    defs.push(fxFilter(id, FX[name], region));
    n.setAttribute('filter', `url(#${id})`);
    n.dataset.fx = name;
  }
  document.getElementById('scene-defs').insertAdjacentHTML('beforeend', defs.join(''));
}

/* הגדרות SVG שלא מגיעות מהייצוא */
const SCENE_DEFS = `
  <!-- מילוי הקרעים של לינוי (עמוד 06): רדיאלי, הצבעים מ-style.css -->
  <radialGradient id="linoy-tear-grad">
    <stop offset="0" style="stop-color: var(--linoy-tear-center)"/>
    <stop offset="0.6" style="stop-color: var(--linoy-tear-mid)"/>
    <stop offset="1" style="stop-color: var(--linoy-tear-edge-deep)"/>
  </radialGradient>
  <!-- אור על הקיר: שקוף במרכז, מתכהה לקצוות בצבע הדיו של העולם -->
  <radialGradient id="wall-light">
    <stop offset="0" style="stop-color: var(--shadow-ink)" stop-opacity="0"/>
    <stop offset="0.55" style="stop-color: var(--shadow-ink)" stop-opacity="0.03"/>
    <stop offset="1" style="stop-color: var(--shadow-ink)" stop-opacity="0.16"/>
  </radialGradient>`;

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
  // לשכבה עם שקיפות משלה (קווי בנייה 70%, פאות 9%): היחידה היא עטיפה, כדי שהשקיפות שלה תישמר
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
  if (type === 'tear') {
    // הקרע נקרע מהסדק: מתוח לאורך הציר הארוך שלו
    u.classList.add('u-tear');
    const b = u.getBBox();
    u.style.setProperty('--crack', b.width >= b.height ? '1 0.05' : '0.05 1');
    u.style.setProperty('--crack-0', b.width >= b.height ? '1 0' : '0 1');
    // מה שבתוך הקרע מופיע רק אחרי שהוא נפתח
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

const chars = {};  // id -> { groups: [body, hands], brain, button }

function buildScene() {
  document.getElementById('scene-defs').innerHTML = F.defs + SCENE_DEFS;

  // 1. הספרייה, ועל הקיר שלה (אחרי 'קיר') שכבות ה-under של העולמות
  const library = part('library', el('g', { class: 'layer-library' }, scene));
  const wall = library.querySelector('[data-n="קיר"]');
  // הקיר הוא רקע של כל הבמה, עד הקצה העליון (ולא רק של הספרייה המוזזת)
  wall.querySelectorAll('rect').forEach((r) => {
    r.setAttribute('x', 0); r.setAttribute('y', 0); r.setAttribute('width', 1440); r.setAttribute('height', 1024);
  });
  // "ניסוי · אור על הקיר" (233:10): 1526×1234 בקואורדינטות הבמה, multiply, מעל הקיר ומתחת לגריד
  el('rect', { class: 'wall-light', x: -43.2, y: -115, width: 1526.4, height: 1234, fill: 'url(#wall-light)' }, wall);
  let anchor = wall;
  for (const id of ['A', 'B', 'C']) {
    if (!WORLDS[id].under) continue;
    const g = el('g');
    anchor.after(g);
    buildWorldLayer(id, WORLDS[id].under, g);
    anchor = g;
  }
  library.querySelector('[data-n="מנורה"]')?.classList.add('lamp-before');

  // 2. העולמות מאחורי הדמויות
  const back = el('g', { class: 'layer-worlds' }, scene);
  for (const id of ['A', 'B', 'C']) if (WORLDS[id].back) buildWorldLayer(id, WORLDS[id].back, back);

  // 3. גופי הדמויות + החור בראש
  const bodies = el('g', { class: 'layer-bodies' }, scene);
  // hover: הדמות גדלה ממרכז הבסיס שלה (על השולחן)
  const charOrigin = (g, id) => g.style.setProperty('transform-origin', `${CHARACTERS[id].boxX + 110}px 839px`);
  for (const id of ORDER) {
    const g = el('g', { class: 'char', 'data-char': id }, bodies);
    charOrigin(g, id);
    part(CHARACTERS[id].body, g);
    const hole = part(CHARACTERS[id].hole, g);
    hole.classList.add('hole');
    const brain = hole.querySelector('[data-n="מוח"]');
    brain.classList.add('brain');
    chars[id] = { groups: [g], brain };
  }

  // 4. השולחן, 5. ידיים וחפץ
  part('table', el('g', { class: 'layer-table' }, scene));
  const hands = el('g', { class: 'layer-hands' }, scene);
  for (const id of ORDER) {
    const g = el('g', { class: 'char', 'data-char': id }, hands);
    charOrigin(g, id);
    part(CHARACTERS[id].hands, g);
    chars[id].groups.push(g);
  }

  // 6. חוטי אריאל, מעל הדמויות
  const front = el('g', { class: 'layer-threads' }, scene);
  for (const id of ['A', 'B', 'C']) if (WORLDS[id].front) buildWorldLayer(id, WORLDS[id].front, front);

  applyDepth();
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
    document.getElementById('power').textContent = CONTENT.characters[nextId].power;
    stopPeek();
  } else {
    delete stage.dataset.mode;
  }
  stage.classList.toggle('has-world', opening);

  // העולם שנסגר מקבל is-closing לזמן החזרה, כדי שהקרעים ייסגרו חזרה לסדק (ולא יהבהבו בטעינה)
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

/* ===== hover, מיקוד והצצה ===== */
let hoverId = null;
let hoveredOnce = false;

function setHover(id) {
  if (id === hoverId) return;
  hoverId = id;
  if (id) { hoveredOnce = true; stopPeek(); }
  for (const [cid, c] of Object.entries(chars)) {
    for (const g of c.groups) g.classList.toggle('is-hover', cid === id);
  }
}

// רמז גילוי: ראש אקראי "מציץ" עד האינטראקציה הראשונה
let peekTimer = 0;
function startPeek() {
  if (reducedMotion) return;
  peekTimer = setInterval(() => {
    if (hoveredOnce || activeId) return stopPeek();
    const ids = Object.keys(chars);
    const c = chars[ids[Math.floor(Math.random() * ids.length)]];
    c.groups.forEach((g) => g.classList.add('is-peek'));
    setTimeout(() => c.groups.forEach((g) => g.classList.remove('is-peek')),
      ms('--motion-hover-open') + ms('--peek-hold'));
  }, ms('--motion-peek-interval'));
}
function stopPeek() { clearInterval(peekTimer); peekTimer = 0; }

/* ===== אריאל: החוטים נמתחים לכיוון העכבר ===== */
let threads = null;
function setupThreads() {
  const root = document.querySelector('[data-part="aThreads"]');
  if (!root) return;
  const reach = 80;    // px: רדיוס הרגישות (טבלת התנועה)
  const pull = 24;     // px: משיכה מקסימלית
  const stiffness = 0.12;
  const damping = 0.78;

  const list = [...root.querySelectorAll('[data-n^="חוט "]')].map((g) => {
    const paths = [...g.querySelectorAll(':scope > path')];
    const t = paths[0].getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
    const nums = paths[0].getAttribute('d').match(/-?[\d.]+/g).map(Number);
    const tx = Number(t[1]);
    const ty = Number(t[2]);
    const a = { x: tx + nums[0], y: ty + nums[1] };
    const b = { x: tx + nums[2], y: ty + nums[3] };
    paths.forEach((p) => p.removeAttribute('transform'));
    // נקודות זרימה: עותק של החוט, מעליו
    const flow = el('path', { class: 'flow' });
    paths[paths.length - 1].after(flow);
    return { a, b, paths: [...paths, flow], ox: 0, oy: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
  });

  let mouse = null;
  let frame = 0;
  const render = () => {
    for (const l of list) {
      const cx = (l.a.x + l.b.x) / 2 + l.ox * 2;
      const cy = (l.a.y + l.b.y) / 2 + l.oy * 2;
      const d = `M${l.a.x} ${l.a.y} Q${cx} ${cy} ${l.b.x} ${l.b.y}`;
      for (const p of l.paths) p.setAttribute('d', d);
    }
  };
  const tick = () => {
    let moving = Boolean(mouse);
    for (const l of list) {
      l.tx = 0; l.ty = 0;
      if (mouse) {
        const vx = l.b.x - l.a.x;
        const vy = l.b.y - l.a.y;
        const t = Math.max(0, Math.min(1, ((mouse.x - l.a.x) * vx + (mouse.y - l.a.y) * vy) / (vx * vx + vy * vy)));
        const dx = mouse.x - (l.a.x + vx * t);
        const dy = mouse.y - (l.a.y + vy * t);
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < reach) {
          const amount = Math.min(dist, pull) * (1 - dist / reach) * 4 * t * (1 - t);
          l.tx = (dx / dist) * amount;
          l.ty = (dy / dist) * amount;
        }
      }
      l.vx = (l.vx + (l.tx - l.ox) * stiffness) * damping;
      l.vy = (l.vy + (l.ty - l.oy) * stiffness) * damping;
      l.ox += l.vx;
      l.oy += l.vy;
      if (Math.abs(l.ox) + Math.abs(l.oy) + Math.abs(l.vx) + Math.abs(l.vy) > 0.02) moving = true;
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
// הילה בסקייל 0 מתכווצת לנקודה — המרכז שלה הוא מרכז הפרח
function stageCenter(node) {
  const r = node.getBoundingClientRect();
  return stagePoint({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
}

// כל פרח שקרוב לעכבר מ-90px נדלק; העוצמה לפי המרחק (קרוב = הילה מלאה). כמה בבת אחת
const GLOW_RADIUS = 260; // 11.11: נדלק כבר מרחוק (היה 150, ובמקור 90)
function lightFlowers(x, y) {
  for (const g of glows) {
    const c = stageCenter(g.el);
    const k = Math.max(0, 1 - Math.hypot(c.x - x, c.y - y) / GLOW_RADIUS);
    g.el.style.setProperty('--glow', k.toFixed(3));
  }
}

/* ===== לינוי: גלים, כנפיים, מסלול לספר הקרוב ===== */
const books = [];
function setupLinoy() {
  ['גלים', 'גלים · רצועת נייר'].forEach((name) => {
    document.querySelectorAll(`[data-n="${name}"] > path`).forEach((p, i) => {
      p.classList.add('ripple');
      p.style.setProperty('--ripple-delay', `${i * 0.75}s`);
    });
  });
  // כל ספר (גם אלה שבתוך הקרעים בארון) מרחף במסלול קטן ומנפנף בכריכות
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
    books.push({ el: book, ref: wings, r: 120 }); // הוגדל 10.11: היה 70
  });
}

// לינוי: כוכבים, ספירלות ושמשות מסתובבים בעדינות במקום כשהעכבר קרוב (עודכן 11.11 — בלי תזוזה)
// כל צורה עטופה ב-<g> משלה: ה-transform-origin של fill-box על ה-<g> הוא מרכז הצורה בפועל
// (על ה-path עצמו המרכז מחושב לפני ה-transform שלו, ולכן הצורה הייתה "עפה").
// רצועת הנייר הלבנה של כל ספירלה/שמש מסתובבת יחד איתה, סביב אותו מרכז.
// סבב באגים 11.11: כניסה לטווח = סיבוב שלם אחד (360°), מצטבר — תמיד קדימה. בטווח נשארת במקום.
const DECOR_RADIUS = ms('--linoy-spin-radius');   // 220px
const decor = [];
function setupLinoyDecor() {
  const root = document.querySelector('[data-part="cAssoc"]');
  if (!root) return;
  const wrap = (n) => { const g = el('g', { class: 'spin' }); n.before(g); g.append(n); return g; };
  const center = (n) => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const strips = [...root.querySelectorAll('[data-n="סימנים · רצועת נייר"] > path')].map((n) => ({ n, c: center(n) }));
  root.querySelectorAll('[data-n="כוכבים"] > *, [data-n="ספירלות"] > *, [data-n="שמשות"] > *').forEach((p) => {
    const c = center(p);
    const strip = strips.find((s) => !s.used && Math.hypot(s.c.x - c.x, s.c.y - c.y) < 3);
    if (strip) strip.used = true;
    const els = [wrap(p)];
    if (strip) els.push(wrap(strip.n));
    decor.push({ ref: els[0], els });
  });
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
  scene.addEventListener('pointermove', (event) => {
    const c = event.target.closest('.char');
    setHover(c ? c.dataset.char : null);
    const { x, y } = stagePoint(event);
    if (activeId === 'A') threads?.move(x, y);
    if (activeId === 'B') lightFlowers(x, y);
    if (activeId === 'C') { nearest(books, x, y, 'orbit'); spinDecor(x, y); }
  });
  scene.addEventListener('pointerleave', () => {
    setHover(null);
    threads?.leave();
    lightFlowers(-999, -999);
    nearest(books, -999, -999, 'orbit');
    spinDecor(-9999, -9999);
  });

  // לחיצה על כל הדמות (לא רק המוח) פותחת את העולם שלה; לחיצה עליה כשהעולם שלה פתוח סוגרת;
  // לחיצה על דמות אחרת כשעולם פתוח = מעבר ישיר. click מגיע רק אם הלחיצה והשחרור על אותה דמות
  scene.addEventListener('click', (event) => {
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
  stage.style.setProperty('--stage-scale', scale);
}

function init() {
  buildScene();
  buildFrame();
  paintables = [...scene.querySelectorAll('.p'), ...document.querySelectorAll('.tag, .bookmark-ribbon')];
  setupThreads();
  setupYael();
  setupLinoy();
  setupLinoyDecor();
  bindEvents();
  fitStage();
  startPeek();
}

init();
