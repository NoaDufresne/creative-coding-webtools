/* global dat */
let cols, rows, field;
let margin = 200;
let params;
let baseGraphics; // store the ribbons and lines here

function setup() {
  createCanvas(800, 800);
  colorMode(HSB, 360, 100, 100, 100);
  noLoop();
  noiseDetail(4, 0.5);

  params = {
    resolution: 25,
    stepLength: 3,
    numSteps: 300,
    ribbonDensity: 0.08,
    ribbonWidth: 30,
    showFlowLines: true,
    pixelSort: false,
    sortIntensity: 0.3,
    regenerate: regenerate,
    applyPixelSort: applyPixelSort
  };

  const gui = new dat.GUI();
  gui.width = 260;
  gui.add(params, "resolution", 10, 60, 1).onChange(regenerate);
  gui.add(params, "stepLength", 1, 6, 0.1).onChange(regenerate);
  gui.add(params, "numSteps", 50, 600, 10).onChange(regenerate);
  gui.add(params, "ribbonDensity", 0.02, 0.3, 0.01).onChange(regenerate);
  gui.add(params, "ribbonWidth", 5, 60, 1).onChange(regenerate);
  gui.add(params, "showFlowLines").onChange(regenerate);
  gui.add(params, "pixelSort").onChange(applyPixelSort);
  gui.add(params, "sortIntensity", 0, 1, 0.01).onChange(applyPixelSort);
  gui.add(params, "regenerate");

  regenerate();
}

function regenerate() {
  background(255);
  randomSeed(floor(random(10000)));
  noiseSeed(floor(random(10000)));

  baseGraphics = createGraphics(width, height);
  baseGraphics.colorMode(HSB, 360, 100, 100, 100);
  baseGraphics.noiseDetail(4, 0.5);

  let leftX = -margin;
  let rightX = width + margin;
  let topY = -margin;
  let bottomY = height + margin;

  cols = floor((rightX - leftX) / params.resolution);
  rows = floor((bottomY - topY) / params.resolution);
  field = [];

  for (let i = 0; i < cols; i++) {
    field[i] = [];
    for (let j = 0; j < rows; j++) {
      let n = noise(i * 0.08, j * 0.08);
      let angle = map(n, 0, 1, 0, TWO_PI);
      field[i][j] = angle;
    }
  }

  let spacing = params.resolution * 2;
  let startPoints = [];
  for (let y = 0; y < height; y += spacing) {
    let row = [];
    for (let x = 0; x < width; x += spacing) {
      row.push(createVector(x, y));
    }
    startPoints.push(row);
  }

  if (params.showFlowLines) {
    baseGraphics.stroke(0, 20);
    baseGraphics.noFill();
    for (let row of startPoints) {
      for (let p of row) {
        drawFlowLine(baseGraphics, p.x, p.y, leftX, topY);
      }
    }
  }

  baseGraphics.noStroke();
  for (let y = 0; y < startPoints.length - 1; y++) {
    for (let x = 0; x < startPoints[y].length - 1; x++) {
      if (random() < params.ribbonDensity) {
        drawSmoothRibbon(baseGraphics, startPoints[y][x], startPoints[y + 1][x], leftX, topY);
      }
    }
  }

  image(baseGraphics, 0, 0);

  if (params.pixelSort) applyPixelSort();
}

function drawFlowLine(pg, sx, sy, leftX, topY) {
  let pts = traceFlow(sx, sy, leftX, topY);
  pg.noFill();
  pg.beginShape();
  for (let v of pts) pg.curveVertex(v.x, v.y);
  pg.endShape();
}

function traceFlow(sx, sy, leftX, topY) {
  let x = sx;
  let y = sy;
  let points = [];
  for (let i = 0; i < params.numSteps; i++) {
    points.push(createVector(x, y));
    let col = floor((x - leftX) / params.resolution);
    let row = floor((y - topY) / params.resolution);
    if (col < 0 || col >= cols || row < 0 || row >= rows) break;
    let angle = field[col][row];
    x += cos(angle) * params.stepLength;
    y += sin(angle) * params.stepLength;
  }
  return points;
}

function drawSmoothRibbon(pg, startA, startB, leftX, topY) {
  let curveA = traceFlow(startA.x, startA.y, leftX, topY);
  let curveB = traceFlow(startB.x, startB.y, leftX, topY);

  let n = min(curveA.length, curveB.length);
  if (n < 30) return;

  let hueBase = map(noise(startA.x * 0.002, startA.y * 0.002), 0, 1, 150, 300);
  let col = color(hueBase + random(-20, 20), random(40, 80), random(60, 100), 40);
  pg.fill(col);

  pg.beginShape();
  for (let i = 0; i < n; i++) {
    let t = i / n;
    let taper = sin(t * PI);
    let w = params.ribbonWidth * taper;
    let pA = curveA[i];
    let pB = curveB[i];
    let dir = p5.Vector.sub(pB, pA).normalize();
    let perp = createVector(-dir.y, dir.x).mult(w / 2);
    pg.curveVertex(pA.x + perp.x, pA.y + perp.y);
  }
  for (let i = n - 1; i >= 0; i--) {
    let t = i / n;
    let taper = sin(t * PI);
    let w = params.ribbonWidth * taper;
    let pA = curveA[i];
    let pB = curveB[i];
    let dir = p5.Vector.sub(pB, pA).normalize();
    let perp = createVector(-dir.y, dir.x).mult(w / 2);
    pg.curveVertex(pA.x - perp.x, pA.y - perp.y);
  }
  pg.endShape(CLOSE);
}

function applyPixelSort() {
  // only apply on drawn areas (ribbons + flow lines)
  let img = get();
  img.loadPixels();

  let intensity = constrain(params.sortIntensity, 0, 1);
  let rowCount = int(map(intensity, 0, 1, 20, height / 2));
  let segmentWidth = int(map(intensity, 0, 1, 10, width / 5));

  for (let i = 0; i < rowCount; i++) {
    let y = int(random(height));
    let startX = int(random(width - segmentWidth));
    let endX = startX + segmentWidth;

    let pixelsRow = [];
    for (let x = startX; x < endX; x++) {
      let idx = 4 * (y * width + x);
      let r = img.pixels[idx];
      let g = img.pixels[idx + 1];
      let b = img.pixels[idx + 2];
      let a = img.pixels[idx + 3];
      pixelsRow.push({ r, g, b, a, bright: (r + g + b) / 3 });
    }

    pixelsRow.sort((a, b) => a.bright - b.bright);

    for (let x = startX; x < endX; x++) {
      let idx = 4 * (y * width + x);
      let c = pixelsRow[x - startX];
      img.pixels[idx] = c.r;
      img.pixels[idx + 1] = c.g;
      img.pixels[idx + 2] = c.b;
      img.pixels[idx + 3] = c.a;
    }
  }

  img.updatePixels();
  image(img, 0, 0);
}
