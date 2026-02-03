// Image route for /months — returns an SVG calendar sized to width/height query params
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
  const padding = Math.round(Math.min(width, height) * 0.04);
  const gridW = width - padding * 2;
  const gridH = height - padding * 2 - Math.round(height * 0.04);
  const cols = 3;
  const rows = 4;
  const cellW = Math.floor(gridW / cols);
  const cellH = Math.floor(gridH / rows);

  const year = new Date().getFullYear();
  const today = onlyDate(new Date());
  const monthNames = monthShortNames();

  let svg = '';
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="100%" height="100%" fill="#0f0f0f"/>`;

  const monthLabelHeight = Math.max(14, Math.round(Math.min(width, height) * 0.02));
  const dotFillFuture = '#555555';
  const dotFillPast = '#ffffff';
  const dotFillToday = '#ff3b3b';
  const labelFill = '#9aa0a6';

  for (let m = 0; m < 12; m++) {
    const col = m % cols;
    const row = Math.floor(m / cols);
    const cellX = padding + col * cellW + Math.round((gridW / cols - cellW) / 2);
    const cellY = padding + row * cellH + Math.round((gridH / rows - cellH) / 2);

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
    const dotSize = Math.max(4, Math.floor(Math.min(daysAreaW / (maxCols + (maxCols - 1) * spacingRatio), daysAreaH / (maxRows + (maxRows - 1) * spacingRatio))));
    const availableH = daysAreaH - dotSize * maxRows;
    const gapX = Math.round(dotSize * spacingRatio);
    const naturalGapY = maxRows > 1 ? availableH / (maxRows - 1) : 0;
    const gapY = Math.max(2, Math.min(naturalGapY, dotSize * 0.6));

    for (let d = 1; d <= daysInMonth; d++) {
      const index = firstDay + (d - 1);
      const r = Math.floor(index / 7);
      const c = index % 7;
      const cx = Math.round(daysAreaX + c * (dotSize + gapX) + dotSize / 2);
      const cy = Math.round(daysAreaY + r * (dotSize + gapY) + dotSize / 2);

      const dt = onlyDate(new Date(year, m, d));
      let fill = dotFillFuture;
      if (dt === today) fill = dotFillToday;
      else if (dt < today) fill = dotFillPast;

      svg += `<circle cx="${cx}" cy="${cy}" r="${dotSize/2}" fill="${fill}" />`;
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
    svg += `<text x="${width/2}" y="${height - padding/1.5}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" font-size="${Math.max(10, Math.round(Math.min(width, height) * 0.014))}" fill="${labelFill}">${footer}</text>`;
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
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
}
