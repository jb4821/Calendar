"use client";
import React, { useEffect, useRef } from "react";
import styles from "./styles.module.css";

type SearchParams = { [key: string]: string | string[] | undefined } | undefined;

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 2340;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDim(value: any, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

function onlyDate(ts: Date) {
  return new Date(ts.getFullYear(), ts.getMonth(), ts.getDate()).getTime();
}

export default function CalendarClient({ searchParams }: { searchParams?: SearchParams }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // derive dimensions directly from searchParams to avoid synchronous setState inside effects
  const rawW = searchParams && searchParams.width ? searchParams.width : undefined;
  const rawH = searchParams && searchParams.height ? searchParams.height : undefined;
  const width = parseDim(Array.isArray(rawW) ? rawW[0] : rawW, DEFAULT_WIDTH);
  const height = parseDim(Array.isArray(rawH) ? rawH[0] : rawH, DEFAULT_HEIGHT);

  // Shared draw function so we can render to an offscreen canvas for export
  function drawCalendar(localCtx: CanvasRenderingContext2D, w: number, h: number) {
    localCtx.clearRect(0, 0, w, h);
    localCtx.imageSmoothingEnabled = false;

    // Background
    localCtx.fillStyle = "#0f0f0f";
    localCtx.fillRect(0, 0, w, h);

    const padding = Math.round(Math.min(w, h) * 0.04);
    const gridX = padding;
    const gridY = padding;
    const gridW = w - padding * 2;
    const gridH = h - padding * 2 - Math.round(h * 0.04); // keep small footer room

    const cols = 3;
    const rows = 4;
    const cellW = Math.floor(gridW / cols);
    const cellH = Math.floor(gridH / rows);

    const year = new Date().getFullYear();
    const today = onlyDate(new Date());

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Size scaling
    const monthLabelHeight = Math.max(18, Math.round(Math.min(w, h) * 0.02));

    for (let m = 0; m < 12; m++) {
      const col = m % cols;
      const row = Math.floor(m / cols);
      const cellX = gridX + col * cellW + Math.round((gridW / cols - cellW) / 2);
      const cellY = gridY + row * cellH + Math.round((gridH / rows - cellH) / 2);

      // Draw month label
      localCtx.fillStyle = "#9aa0a6";
      const fontSize = Math.max(12, Math.round(monthLabelHeight * 0.95));
      localCtx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial`;
      localCtx.textAlign = "center";
      localCtx.textBaseline = "top";
      localCtx.fillText(monthNames[m], cellX + cellW / 2, cellY);

      const innerPad = Math.round(Math.min(cellW, cellH) * 0.06);
      const daysAreaX = cellX + innerPad;
      const daysAreaY = cellY + monthLabelHeight + innerPad;
      const daysAreaW = cellW - innerPad * 2;
      const daysAreaH = cellH - monthLabelHeight - innerPad * 2;

      const firstDay = new Date(year, m, 1).getDay(); // Sunday = 0
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      const weeks = Math.ceil((firstDay + daysInMonth) / 7);

      // Layout as classic calendar: columns = 7 (Sun..Sat), rows = weeks
      const maxCols = 7;
      const maxRows = Math.max(weeks, 1);

      // Compute dot size and spacing based on columns x rows using a spacing ratio.
      // This keeps gaps proportional and avoids large empty vertical gaps.
      const spacingRatio = 0.4; // gap = dotSize * spacingRatio
      const dotSize = Math.max(
        4,
        Math.floor(
          Math.min(
            daysAreaW / (maxCols + (maxCols - 1) * spacingRatio),
            daysAreaH / (maxRows + (maxRows - 1) * spacingRatio)
          )
        )
      );
      const availableH = daysAreaH - dotSize * maxRows;
      const gapX = Math.round(dotSize * spacingRatio);
      const naturalGapY = maxRows > 1 ? availableH / (maxRows - 1) : 0;
      const gapY = Math.max(2, Math.min(naturalGapY, dotSize * 0.6));

      // Draw days: place them in rows (week rows) and 7 columns (Sun..Sat)
      for (let d = 1; d <= daysInMonth; d++) {
        const index = firstDay + (d - 1);
        const r = Math.floor(index / 7); // week row (0..weeks-1)
        const c = index % 7; // weekday column (0 = Sun .. 6 = Sat)

        const cx = Math.round(daysAreaX + c * (dotSize + gapX) + dotSize / 2);
        const cy = Math.round(daysAreaY + r * (dotSize + gapY) + dotSize / 2);

        const dt = onlyDate(new Date(year, m, d));
        let fill = "#555555"; // future
        if (dt === today) fill = "#ff3b3b";
        else if (dt < today) fill = "#ffffff";

        localCtx.beginPath();
        localCtx.fillStyle = fill;
        localCtx.arc(cx, cy, dotSize / 2, 0, Math.PI * 2);
        localCtx.fill();
      }
    }

    // Optional footer text (days left + percent of year)
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      const daysElapsed = Math.floor((onlyDate(now) - onlyDate(start)) / (1000 * 60 * 60 * 24));
      const totalDays = Math.floor((onlyDate(end) - onlyDate(start)) / (1000 * 60 * 60 * 24));
      const daysLeft = totalDays - daysElapsed;
      const percent = Math.floor((daysElapsed / totalDays) * 100);
      const footer = `${daysLeft} days left • ${percent}%`;
      localCtx.fillStyle = "#9aa0a6";
      const fsize = Math.max(12, Math.round(Math.min(w, h) * 0.014));
      localCtx.font = `${fsize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial`;
      localCtx.textAlign = "center";
      localCtx.fillText(footer, w / 2, h - padding / 1.5 - fsize);
    } catch {
      // ignore
    }
  }

  // Client-side exact-size PNG download. Produces a PNG with pixel dimensions equal to `width` x `height`.
  function handleDownload() {
    const off = document.createElement("canvas");
    off.width = Math.max(1, width);
    off.height = Math.max(1, height);
    const offCtx = off.getContext("2d");
    if (!offCtx) return;
    // Ensure crisp circles by disabling smoothing
    offCtx.imageSmoothingEnabled = false;
    drawCalendar(offCtx, off.width, off.height);
    off.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const now = new Date();
      const fname = `months_${now.toISOString().slice(0,10)}_${off.width}x${off.height}.png`;
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use device pixel ratio for on-screen canvas for crisp rendering
    const dpr = Math.min(3, Math.max(1, Math.floor(window.devicePixelRatio || 1)));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCalendar(ctx, width, height);
  }, [width, height]);
 

  /*
  function handleDownload() {
    // download implementation is kept here for future use but currently unused.
  }
  */

  return (
    <div className={styles.container} style={{ width, height }}>
      <canvas ref={canvasRef} className={styles.canvas} width={width} height={height} />
      <div className={styles.controls}>
        <button onClick={handleDownload} className={styles.button}>
          Download PNG
        </button>
        <div className={styles.hint}>Produces an exact {width}×{height} PNG</div>
      </div>
    </div>
  );
}
