// Image route for /months-image — returns an SVG calendar sized to width/height query params
function parseDim(value: string | null | undefined, fallback: number) {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(100, Math.min(10000, Math.round(n)));
}

function onlyDate(ts: Date) {
  return new Date(ts.getFullYear(), ts.getMonth(), ts.getDate()).getTime();
}

function monthShortNames() {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
}

function generateSvg(width: number, height: number) {
  // iPhone 16 Plus lock screen safe area
  const safeX = 80;
  const safeY = 420;
  const safeW = 1210 - 80; // 1130
  const safeH = 2396 - 420; // 1976

  // Calendar maximum allowed within safe zone
  const calMaxW = 1130;
  const calMaxH = 1800;

  // Calendar size — fit inside safe area and max dimensions
  const calW = Math.min(calMaxW, safeW);
  const calH = Math.min(calMaxH, safeH);

  // internal inset padding to account for iOS wallpaper zoom
  // (increase horizontal inset so calendar has more side padding on lock-screen)
  const insetPadX = Math.round(calW * 0.1);
  const insetPadY = Math.round(calH * 0.05);

  // calendar origin (centered horizontally in canvas, vertically within safe area)
  const calOriginX = safeX + Math.round((safeW - calW) / 2);
  const calOriginY = safeY + Math.round((safeH - calH) / 2);

  // drawing grid size inside calendar after inset padding
  const gridW = calW - insetPadX * 2;
  const gridH = calH - insetPadY * 2 - Math.round(calH * 0.04); // reserve small footer area
  const cols = 3;
  const rows = 4;
  const cellW = Math.floor(gridW / cols);
  const cellH = Math.floor(gridH / rows);

  const year = new Date().getFullYear();
  const today = onlyDate(new Date());
  const monthNames = monthShortNames();

  let svg = '';
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  // ensure SVG fallback has a red background when returned directly
  svg += `<rect width="100%" height="100%" fill="#1A1A1A" />`;
  // NOTE: intentionally do not draw any background rectangles, panels, frames or gradients.
  // The final PNG will be created by compositing this SVG over a solid Sharp background
  // so the canvas color is uniform as required.

  // increase month label size for better legibility on lock screens
  const monthLabelHeight = Math.max(20, Math.round(Math.min(width, height) * 0.028));
  const dotFillFuture = '#555555';
  const dotFillPast = '#ffffff';
  const dotFillToday = '#ff3b3b';
  // brighter, higher-contrast label color for lock-screen readability
  const labelFill = '#e6eef3';

  for (let m = 0; m < 12; m++) {
  const col = m % cols;
  const row = Math.floor(m / cols);
  // local cell positions inside the calendar drawing area (integers)
  const localCellX = Math.round(insetPadX + col * cellW + Math.round((gridW / cols - cellW) / 2));
  const localCellY = Math.round(insetPadY + row * cellH + Math.round((gridH / rows - cellH) / 2));
  const cellX = calOriginX + localCellX;
  const cellY = calOriginY + localCellY;

    const labelX = cellX + cellW / 2;
    const labelY = cellY + monthLabelHeight * 0.8;
    svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" font-size="${Math.max(10, Math.round(monthLabelHeight * 0.9))}" fill="${labelFill}">${monthNames[m]}</text>`;

    const innerPad = Math.round(Math.min(cellW, cellH) * 0.06);
    const daysAreaX = cellX + innerPad;
    const daysAreaY = cellY + monthLabelHeight + innerPad;
    const daysAreaW = cellW - innerPad * 2;
    const daysAreaH = cellH - monthLabelHeight - innerPad * 2;

    const firstDay = new Date(year, m, 1).getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const weeks = Math.ceil((firstDay + daysInMonth) / 7);

    const maxCols = 7;
    const maxRows = Math.max(weeks, 1);
  const spacingRatio = 0.4;
  // compute dot diameter to fit, using a reasonable minimum for legibility
  const maxDiam = Math.floor(Math.min(daysAreaW / (maxCols + (maxCols - 1) * spacingRatio), daysAreaH / (maxRows + (maxRows - 1) * spacingRatio)));
  const diam = Math.max(2, maxDiam);
  let radius = Math.floor(diam / 2);
  if (radius % 2 !== 0) radius = Math.max(2, radius - 1);
  const dotDiameter = radius * 2;
  const availableH = daysAreaH - dotDiameter * maxRows;
  const gapX = Math.round(dotDiameter * spacingRatio);
  const naturalGapY = maxRows > 1 ? availableH / (maxRows - 1) : 0;
  const gapY = Math.max(2, Math.min(Math.round(naturalGapY), Math.round(dotDiameter * 0.6)));

  // center the dots grid vertically within the days area to avoid large empty stripes
  const totalDaysHeight = maxRows * dotDiameter + Math.max(0, (maxRows - 1) * gapY);
  const offsetY = Math.max(0, Math.round((daysAreaH - totalDaysHeight) / 2));
  const centeredDaysAreaY = daysAreaY + offsetY;

    for (let d = 1; d <= daysInMonth; d++) {
      const index = firstDay + (d - 1);
      const r = Math.floor(index / 7);
      const c = index % 7;
  const cx = Math.round(daysAreaX + c * (dotDiameter + gapX) + dotDiameter / 2);
  const cy = Math.round(daysAreaY + r * (dotDiameter + gapY) + dotDiameter / 2);

      const dt = onlyDate(new Date(year, m, d));
      let fill = dotFillFuture;
      if (dt === today) fill = dotFillToday;
      else if (dt < today) fill = dotFillPast;

  svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" />`;
    }
  }

    try {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    const daysElapsed = Math.floor((onlyDate(now) - onlyDate(start)) / (1000 * 60 * 60 * 24));
    const totalDays = Math.floor((onlyDate(end) - onlyDate(start)) / (1000 * 60 * 60 * 24));
    const daysLeft = totalDays - daysElapsed;
    const percent = Math.floor((daysElapsed / totalDays) * 100);
    const footer = `${daysLeft} days left • ${percent}%`;
  // footer inside calendar area (above bottom inset)
  const footerY = calOriginY + calH - Math.round(insetPadY / 1.5);
  svg += `<text x="${calOriginX + Math.round(calW/2)}" y="${footerY}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" font-size="${Math.max(42, Math.round(Math.min(calW, calH) * 0.018))}" fill="${labelFill}">${footer}</text>`;
  } catch {}

  svg += `</svg>`;
  return svg;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const w = parseDim(url.searchParams.get('width') || url.searchParams.get('w'), 1080);
  const h = parseDim(url.searchParams.get('height') || url.searchParams.get('h'), 2340);
  if (w < 100 || h < 100) return new Response('Invalid dims', { status: 400 });
  try {
    const svg = generateSvg(w, h);
  // filename base (not used when returning inline images)

    // By default: attempt to rasterize to PNG server-side using sharp and return image/png.
    try {
      const sharp = await import('sharp');
      // Create a solid background canvas and composite the SVG on top so the final PNG
      // has a single uniform background color with no panels or gradients.
      const bg = sharp.default({
        create: {
          width: w,
          height: h,
          channels: 4,
          background: '#1A1A1A',
        },
      });
      const svgBuffer = Buffer.from(svg);
      const composed = await bg.composite([{ input: svgBuffer }]).png({ quality: 100 }).toBuffer();
      return new Response(new Uint8Array(composed), {
        headers: { 'Content-Type': 'image/png' },
      });
    } catch {
      const headers = new Headers({ 'Content-Type': 'image/svg+xml; charset=utf-8' });
      return new Response(svg, { headers });
    }
  } catch {
    return new Response('Error', { status: 500 });
  }
}
