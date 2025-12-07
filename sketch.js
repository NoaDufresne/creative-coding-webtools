let cols, rows, field;
let margin = 500;
let baseGraphics;
let ribbonsGraphics = null;
let params;
let ribbonGrid;
let updateRibbonsTimeout;
let cachedFlowLines = new Map();
let startPointsGlobal;
let pixelTmp = null;
let pixelSortRunning = false;
let pixelSortIndex = 0;
let pixelSortDone = false;
let pixelSortAnimationId = null;


// SETUP
function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  const container = document.querySelector('.canvas-container') || document.body;
  canvas.parent(container);
  canvas.id('flow-field-canvas');
  canvas.style('position', 'fixed');
  canvas.style('z-index', '0');

  colorMode(HSB, 360, 100, 100, 100);
  noiseDetail(6, 0.45);
  noLoop();

  params = {
    flowScale: 0.03,
    numSteps: 1000,
    lineDensity: 0.4,
    discontinuity: false,
    showFlowLines: true,
    showRibbons: true,
    ribbonDensity: 0.45,
    ribbonWidth: 22,
    ribbonOpacity: 50,
    ribbonColors: ["#3125a1", "#FE582A", "#4534c9"],
    bgColor: "#ffffff",
    pixelSort: { enabled: false, axis: "horizontal", threshold: 50 }
  };

  setupSidebarControls();
  initSliderHandles();
  setupTextToggles();
  setupCollapsibleSections();

  const toggleBtn = document.getElementById("toggle-btn");
  const openBtn = document.getElementById("open-sidebar-btn");
  const sidebar = document.getElementById("sidebar");

  if (toggleBtn) toggleBtn.addEventListener("click", () => { sidebar.classList.toggle("collapsed"); updateOpenButtonVisibility(); });
  if (openBtn) openBtn.addEventListener("click", () => { sidebar.classList.remove("collapsed"); updateOpenButtonVisibility(); });

  updateOpenButtonVisibility();
  regenerate();
}

// sidebar visibility (to delete?)
function updateOpenButtonVisibility() {
  const sidebar = document.getElementById("sidebar");
  const openBtn = document.getElementById("open-sidebar-btn");
  if (!sidebar || !openBtn) return;
  if (sidebar.classList.contains("collapsed")) openBtn.classList.add("show"); else openBtn.classList.remove("show");
}

function debouncedRibbonUpdate() {
  clearTimeout(updateRibbonsTimeout);
  updateRibbonsTimeout = setTimeout(() => {
    requestAnimationFrame(() => {
      updateRibbonsOnly();
      if (params.pixelSort.enabled) startPixelSortProgress();
    });
  }, 40);
}

// Perlin noise flow field
function regenerate() {
  cachedFlowLines.clear();
  randomSeed(floor(random(10000)));
  noiseSeed(floor(random(10000)));

  if (!baseGraphics) baseGraphics = createGraphics(width, height);
  baseGraphics.resizeCanvas(width, height);
  baseGraphics.colorMode(HSB, 360, 100, 100, 100);
  baseGraphics.clear();
  baseGraphics.noFill();
  baseGraphics.noStroke();

  if (!ribbonsGraphics) ribbonsGraphics = createGraphics(width, height);
  else ribbonsGraphics.resizeCanvas(width, height);
  ribbonsGraphics.clear();
  ribbonsGraphics.colorMode(HSB, 360, 100, 100, 100);
  ribbonsGraphics.noStroke();

  let leftX = -margin, topY = -margin, rightX = width + margin, bottomY = height + margin;
  let baseCell = 18;
  let cellSize = max(10, Math.round(baseCell * (0.02 / params.flowScale)));
  cols = floor((rightX - leftX) / cellSize);
  rows = floor((bottomY - topY) / cellSize);

  let discontinuityQuantum = params.discontinuity ? (PI / 4) : 0;

  field = Array.from({ length: cols }, (_, i) => Array.from({ length: rows }, (_, j) => {
    let n = noise(i * params.flowScale, j * params.flowScale);
    let angle = map(n, 0, 1, 0, TWO_PI);
    if (discontinuityQuantum > 1e-6) angle = round(angle / discontinuityQuantum) * discontinuityQuantum;
    return angle;
  }));

  let spacing = Math.max(8, Math.round(map(params.lineDensity, 0.02, 0.6, 110, 10)));
  let startPoints = [];
  for (let y = 0; y < height; y += spacing) {
    let row = [];
    for (let x = 0; x < width; x += spacing) {
      row.push(createVector(x + random(-spacing * 0.25, spacing * 0.25), y + random(-spacing * 0.25, spacing * 0.25)));
    }
    startPoints.push(row);
  }

  cachedFlowLines.clear();
  for (let j = 0; j < startPoints.length; j++) {
    const row = startPoints[j];
    for (let i = 0; i < row.length; i++) {
      const p = row[i];
      const key = `${i},${j}`;
      const pts = traceFlowRaw(p.x, p.y, leftX, topY, cellSize);
      cachedFlowLines.set(key, pts);
    }
  }

  if (params.showFlowLines) {
    baseGraphics.clear();
    baseGraphics.stroke(0, 0, 0, 18);
    baseGraphics.strokeWeight(1);
    for (let j = 0; j < startPoints.length; j++) {
      for (let i = 0; i < startPoints[j].length; i++) {
        const key = `${i},${j}`;
        const pts = cachedFlowLines.get(key);
        if (pts && pts.length > 1) drawFlowLineFromPts(baseGraphics, pts);
      }
    }
  } else baseGraphics.clear();

  ribbonsGraphics.clear();
  if (params.showRibbons) drawAllRibbons(ribbonsGraphics, startPoints, leftX, topY, cellSize);

  startPointsGlobal = startPoints;
  window.startPoints = startPoints;
  window.leftX = leftX;
  window.topY = topY;
  window.cellSize = cellSize;

  renderComposite();

  if (params.pixelSort.enabled) startPixelSortProgress(); else stopPixelSortProgress();
}

// curved paths
function traceFlowRaw(sx, sy, leftX, topY, cellSize) {
  let x = sx, y = sy, pts = [], lastAngle = 0;
  const farLimit = max(width, height) * 6;
  const stepLength = 2.2;
  const sampleField = (px, py) => {
    let col = floor((px - leftX) / cellSize), row = floor((py - topY) / cellSize);
    return (col >= 0 && col < cols && row >= 0 && row < rows) ? field[col][row] : lastAngle;
  };
  const maxSteps = Math.min(params.numSteps, 1200);
  for (let i = 0; i < maxSteps; i++) {
    pts.push(createVector(x, y));
    let angle = sampleField(x, y);
    lastAngle = angle;
    x += cos(angle) * stepLength;
    y += sin(angle) * stepLength;
    if (abs(x - sx) > farLimit || abs(y - sy) > farLimit) break;
    if (!isFinite(x) || !isFinite(y) || abs(x) > 1e6 || abs(y) > 1e6) break;
  }
  return pts.length > 6 ? heavySmooth(pts, params.discontinuity) : pts;
}

// smoother lines
function heavySmooth(pts, discontinuityFlag) {
  const n = pts.length;
  const out = [];
  const w = discontinuityFlag ? 2 : 4;
  for (let i = 0; i < n; i++) {
    let ax = 0, ay = 0, cnt = 0;
    for (let j = -w; j <= w; j++) {
      const k = constrain(i + j, 0, n - 1);
      ax += pts[k].x; ay += pts[k].y; cnt++;
    }
    out.push(createVector(ax / cnt, ay / cnt));
  }
  return out;
}

// Dessine les lignes
function drawFlowLineFromPts(pg, pts) {
  pg.beginShape();
  const curveTightness = map(Number(params.discontinuity), 0, 1, 0.65, 0.25);
  pg.curveTightness(curveTightness);
  let step = 1;
  if (pts.length > 800) step = 2;
  if (pts.length > 1600) step = 3;
  if (pts.length > 3000) step = 4;
  for (let i = 0; i < pts.length; i += step) pg.curveVertex(pts[i].x, pts[i].y);
  pg.curveVertex(pts[pts.length - 1].x, pts[pts.length - 1].y);
  pg.endShape();
}

// formesde couleur
function drawAllRibbons(pg, startPoints, leftX, topY, cellSize) {
  ribbonGrid = new Set();
  if (!startPoints || startPoints.length < 2) return;
  const rows = startPoints.length;
  const cols = startPoints[0] ? startPoints[0].length : 0;
  if (rows < 2 || cols < 2) return;

  const density = constrain(params.ribbonDensity, 0.0, 1.0);
  const totalPositions = rows * cols;
  const amp = 1 + Math.pow(density, 0.9) * 7.5;
  let desiredCount = Math.round(density * totalPositions * amp);
  const maxPossible = Math.max(1, totalPositions * 2);
  desiredCount = Math.min(desiredCount, maxPossible);

  if (density >= 0.98) {
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const useHorizontal = (i + j) % 2 === 0;
        let keyA, keyB;
        if (useHorizontal && i < cols - 1) { keyA = `${i},${j}`; keyB = `${i + 1},${j}`; }
        else if (j < rows - 1) { keyA = `${i},${j}`; keyB = `${i},${j + 1}`; }
        else continue;
        const curveA = cachedFlowLines.get(keyA);
        const curveB = cachedFlowLines.get(keyB);
        if (curveA && curveB) drawRibbonFromCurves(pg, curveA, curveB);
      }
    }

    for (let j = 0; j < rows - 2; j += 2) {
      for (let i = 0; i < cols - 2; i += 2) {
        const keyA = `${i},${j}`, keyB = `${i + 2},${j + 1}`;
        const curveA = cachedFlowLines.get(keyA);
        const curveB = cachedFlowLines.get(keyB);
        if (curveA && curveB) drawRibbonFromCurves(pg, curveA, curveB);
      }
    }
    return;
  }

  const candidates = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) candidates.push({ i, j });


  const selected = [];
  const minDistPx = Math.max(params.ribbonWidth * 0.6, 10);

  for (let idx = 0; idx < candidates.length && selected.length < desiredCount; idx++) {
    const { i, j } = candidates[idx];
    const p = startPoints[j] && startPoints[j][i];
    if (!p) continue;
    let ok = true;
    for (let s = 0; s < selected.length; s++) {
      const sp = startPoints[selected[s].j][selected[s].i];
      if (dist(p.x, p.y, sp.x, sp.y) < minDistPx) { ok = false; break; }
    }
    if (ok) selected.push({ i, j });
  }

  for (let k = 0; k < selected.length; k++) {
    const s = selected[k];
    const r = (k + s.i + s.j) % 6;
    let keyA, keyB;
    if (r === 0 && s.i < cols - 2) { keyA = `${s.i},${s.j}`; keyB = `${s.i + 2},${s.j}`; }
    else if (r === 1 && s.j < rows - 2) { keyA = `${s.i},${s.j}`; keyB = `${s.i},${s.j + 2}`; }
    else if (r === 2 && s.i < cols - 1) { keyA = `${s.i},${s.j}`; keyB = `${s.i + 1},${s.j}`; }
    else if (s.j < rows - 1) { keyA = `${s.i},${s.j}`; keyB = `${s.i},${s.j + 1}`; }
    else continue;
    const curveA = cachedFlowLines.get(keyA), curveB = cachedFlowLines.get(keyB);
    if (curveA && curveB) drawRibbonFromCurves(pg, curveA, curveB);
  }
}

// ribbons between lines
function drawRibbonFromCurves(pg, curveA, curveB) {
  const n = min(curveA.length, curveB.length);
  if (n < 8) return;
  const alpha = Math.round(constrain(params.ribbonOpacity, 0, 100) * 2.55);
  const opacityHex = alpha.toString(16).padStart(2, '0').toUpperCase();
  const chosenColor = random(params.ribbonColors);
  pg.fill(chosenColor + opacityHex);
  pg.noStroke();
  pg.curveTightness(0.08);
  const ribbonWidth = params.ribbonWidth;
  const step = Math.max(1, Math.floor(n / 240));
  const subA = [], subB = [];
  for (let i = 0; i < n; i += step) { subA.push(curveA[i]); subB.push(curveB[i]); }
  if (subA.length === 0 || subA[subA.length - 1] !== curveA[n - 1]) { subA.push(curveA[n - 1]); subB.push(curveB[n - 1]); }
  const m = subA.length;
  pg.beginShape();
  for (let i = 0; i < m; i++) {
    const pA = subA[i], pB = subB[i];
    let dir = p5.Vector.sub(pB, pA); if (dir.mag() === 0) dir = createVector(1, 0); dir.normalize();
    let w = ribbonWidth * sin((i / m) * PI) * (0.9 + params.ribbonDensity * 0.6);
    let perp = createVector(-dir.y, dir.x).mult(w * 0.5);
    pg.curveVertex(pA.x + perp.x, pA.y + perp.y);
  }
  for (let i = m - 1; i >= 0; i--) {
    const pA = subA[i], pB = subB[i];
    let dir = p5.Vector.sub(pB, pA); if (dir.mag() === 0) dir = createVector(1, 0); dir.normalize();
    let w = ribbonWidth * sin((i / m) * PI) * (0.9 + params.ribbonDensity * 0.6);
    let perp = createVector(-dir.y, dir.x).mult(w * 0.5);
    pg.curveVertex(pA.x - perp.x, pA.y - perp.y);
  }
  pg.endShape(CLOSE);
}

// les formes se dessinent par dessus le flow field existant
function updateRibbonsOnly() {
  if (!startPointsGlobal) return;
  ribbonsGraphics.clear(); ribbonsGraphics.noStroke();
  if (params.showRibbons) drawAllRibbons(ribbonsGraphics, startPointsGlobal, window.leftX, window.topY, window.cellSize);
  renderComposite();
}
function renderComposite() {
  push(); colorMode(RGB, 255); background(params.bgColor); pop();
  image(baseGraphics, 0, 0); image(ribbonsGraphics, 0, 0);
}

// PIXEL SORT: starts pixel sort
function startPixelSortProgress() {
  stopPixelSortProgress();
  if (!pixelTmp) pixelTmp = createGraphics(width, height);
  pixelTmp.clear();
  pixelTmp.colorMode(RGB, 255);
  pixelTmp.background(params.bgColor);
  pixelTmp.image(baseGraphics, 0, 0);
  pixelTmp.image(ribbonsGraphics, 0, 0);
  pixelSortRunning = true; pixelSortDone = false; pixelSortIndex = 0;
  pixelSortAnimationId = requestAnimationFrame(pixelSortStep);
}

// PIXEL SORT: Stop 
function stopPixelSortProgress() {
  pixelSortRunning = false; pixelSortDone = false;
  if (pixelSortAnimationId) { cancelAnimationFrame(pixelSortAnimationId); pixelSortAnimationId = null; }
}

// PIXEL SORT: speed
function pixelSortStep() {
  if (!pixelSortRunning) return;
  if (!pixelTmp) { startPixelSortProgress(); return; }
  const ctx = pixelTmp.drawingContext; const backingW = ctx.canvas.width; const backingH = ctx.canvas.height;
  const linesPerFrame = 4;
  try {
    const currentAxis = params.pixelSort.axis;
    for (let i = 0; i < linesPerFrame; i++) {
      if (currentAxis === "horizontal") {
        if (pixelSortIndex >= backingW) { pixelSortDone = true; break; }
        processSortColumn(ctx, pixelSortIndex, backingW, backingH);
        pixelSortIndex++;
      } else {
        if (pixelSortIndex >= backingH) { pixelSortDone = true; break; }
        processSortRow(ctx, pixelSortIndex, backingW, backingH);
        pixelSortIndex++;
      }
    }
  } catch (err) { console.warn("pixel sort step error:", err); pixelSortDone = true; }
  push(); colorMode(RGB, 255); background(params.bgColor); pop();
  image(pixelTmp, 0, 0);
  if (!pixelSortDone) pixelSortAnimationId = requestAnimationFrame(pixelSortStep);
  else { pixelSortRunning = false; pixelSortAnimationId = null; }
}

// PIXEL SORT: columns
function processSortColumn(ctx, x, backingW, backingH) {
  const sw = 1, sh = backingH;
  const imgData = ctx.getImageData(x, 0, sw, sh);
  const data = imgData.data;
  const threshold = params.pixelSort.threshold;
  let y = 0;
  while (y < sh) {
    while (y < sh) {
      const idx = (y * sw + 0) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const lum = Math.max(r, g, b);
      if (lum > threshold) break; y++;
    }
    let startY = y;
    while (y < sh) {
      const idx = (y * sw + 0) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const lum = Math.max(r, g, b);
      if (lum <= threshold) break; y++;
    }
    let endY = y - 1;
    if (endY > startY) {
      const segment = [];
      for (let i = startY; i <= endY; i++) {
        const idx = (i * sw + 0) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        const lum = Math.max(r, g, b);
        segment.push({ r, g, b, a, lum });
      }
      segment.sort((a, b) => a.lum - b.lum);
      let k = 0;
      for (let i = startY; i <= endY; i++) {
        const idx = (i * sw + 0) * 4;
        const s = segment[k++];
        data[idx] = s.r; data[idx + 1] = s.g; data[idx + 2] = s.b; data[idx + 3] = s.a;
      }
    }
    y++;
  }
  ctx.putImageData(imgData, x, 0);
}

// PIXEL SORT: rows
function processSortRow(ctx, y, backingW, backingH) {
  const sw = backingW, sh = 1;
  const imgData = ctx.getImageData(0, y, sw, sh);
  const data = imgData.data;
  const threshold = params.pixelSort.threshold;
  let x = 0;
  while (x < sw) {
    while (x < sw) {
      const idx = (0 * sw + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const lum = Math.max(r, g, b);
      if (lum > threshold) break; x++;
    }
    let startX = x;
    while (x < sw) {
      const idx = (0 * sw + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const lum = Math.max(r, g, b);
      if (lum <= threshold) break; x++;
    }
    let endX = x - 1;
    if (endX > startX) {
      const segment = [];
      for (let i = startX; i <= endX; i++) {
        const idx = (0 * sw + i) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        const lum = Math.max(r, g, b);
        segment.push({ r, g, b, a, lum });
      }
      segment.sort((a, b) => a.lum - b.lum);
      let k = 0;
      for (let i = startX; i <= endX; i++) {
        const idx = (0 * sw + i) * 4;
        const s = segment[k++];
        data[idx] = s.r; data[idx + 1] = s.g; data[idx + 2] = s.b; data[idx + 3] = s.a;
      }
    }
    x++;
  }
  ctx.putImageData(imgData, 0, y);
}

// window resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  regenerate();
}

function redrawBaseGraphics() {
  if (!baseGraphics) return;
  
  baseGraphics.clear();
  
  if (params.showFlowLines && cachedFlowLines.size > 0) {
    baseGraphics.stroke(0, 0, 0, 18);
    baseGraphics.strokeWeight(1);
    
    const startPoints = startPointsGlobal || [];
    for (let j = 0; j < startPoints.length; j++) {
      for (let i = 0; i < startPoints[j].length; i++) {
        const key = `${i},${j}`;
        const pts = cachedFlowLines.get(key);
        if (pts && pts.length > 1) drawFlowLineFromPts(baseGraphics, pts);
      }
    }
  }
  
  renderComposite();
}