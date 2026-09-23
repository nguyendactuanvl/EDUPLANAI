import React, { useRef, useEffect, useState, useCallback } from "react";
import { 
  ZoomIn, ZoomOut, RotateCcw, Download, Copy, Check, MousePointer, 
  Layers, Maximize2 
} from "lucide-react";
import { FunctionPlotData, Point2D, AsymptoteLine, InequalityConstraint, PolygonVertex } from "./types";

interface InteractivePlotProps {
  functions?: FunctionPlotData[];
  points?: Point2D[];
  asymptotes?: AsymptoteLine[];
  inequalities?: InequalityConstraint[];
  feasiblePolygon?: PolygonVertex[];
  title?: string;
  subtitle?: string;
  defaultXRange?: [number, number];
  defaultYRange?: [number, number];
  width?: number;
  height?: number;
  showGrid?: boolean;
}

export const InteractivePlot: React.FC<InteractivePlotProps> = ({
  functions = [],
  points = [],
  asymptotes = [],
  inequalities = [],
  feasiblePolygon = [],
  title,
  subtitle,
  defaultXRange = [-6, 6],
  defaultYRange = [-5, 5],
  height = 440,
  showGrid = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [xMin, setXMin] = useState(defaultXRange[0]);
  const [xMax, setXMax] = useState(defaultXRange[1]);
  const [yMin, setYMin] = useState(defaultYRange[0]);
  const [yMax, setYMax] = useState(defaultYRange[1]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // Synchronize when default props change
  useEffect(() => {
    setXMin(defaultXRange[0]);
    setXMax(defaultXRange[1]);
    setYMin(defaultYRange[0]);
    setYMax(defaultYRange[1]);
  }, [defaultXRange[0], defaultXRange[1], defaultYRange[0], defaultYRange[1]]);

  // Reset view
  const handleResetView = () => {
    setXMin(defaultXRange[0]);
    setXMax(defaultXRange[1]);
    setYMin(defaultYRange[0]);
    setYMax(defaultYRange[1]);
  };

  // Zoom by factor
  const handleZoom = (factor: number) => {
    const xCenter = (xMin + xMax) / 2;
    const yCenter = (yMin + yMax) / 2;
    const xHalf = ((xMax - xMin) * factor) / 2;
    const yHalf = ((yMax - yMin) * factor) / 2;
    setXMin(xCenter - xHalf);
    setXMax(xCenter + xHalf);
    setYMin(yCenter - yHalf);
    setYMax(yCenter + yHalf);
  };

  // Convert math (x, y) to canvas pixel (px, py)
  const toCanvas = useCallback((x: number, y: number, w: number, h: number) => {
    const px = ((x - xMin) / (xMax - xMin)) * w;
    const py = h - ((y - yMin) / (yMax - yMin)) * h;
    return { px, py };
  }, [xMin, xMax, yMin, yMax]);

  // Convert canvas pixel (px, py) to math (x, y)
  const toMath = useCallback((px: number, py: number, w: number, h: number) => {
    const x = xMin + (px / w) * (xMax - xMin);
    const y = yMin + ((h - py) / h) * (yMax - yMin);
    return { x, y };
  }, [xMin, xMax, yMin, yMax]);

  // Main Draw Function
  const renderCanvas = useCallback((targetCanvas: HTMLCanvasElement, exportMode = false) => {
    const ctx = targetCanvas.getContext("2d");
    if (!ctx) return;

    const dpr = exportMode ? 3 : (window.devicePixelRatio || 1);
    const displayW = targetCanvas.clientWidth || 600;
    const displayH = height;

    if (!exportMode) {
      targetCanvas.width = displayW * dpr;
      targetCanvas.height = displayH * dpr;
      ctx.scale(dpr, dpr);
    }

    const w = displayW;
    const h = displayH;

    // Clear background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // 1. Draw Grid Lines
    if (showGrid) {
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#f1f5f9"; // very light grid

      // Choose nice step (1, 2, 5, 0.5...)
      const xRange = xMax - xMin;
      let step = 1;
      if (xRange > 25) step = 5;
      else if (xRange > 12) step = 2;
      else if (xRange < 4) step = 0.5;

      const firstX = Math.floor(xMin / step) * step;
      for (let x = firstX; x <= xMax; x += step) {
        const { px } = toCanvas(x, 0, w, h);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
        ctx.stroke();
      }

      const firstY = Math.floor(yMin / step) * step;
      for (let y = firstY; y <= yMax; y += step) {
        const { py } = toCanvas(0, y, w, h);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Draw Inequalities Half-planes (Hatching/Shading non-solution)
    if (inequalities.length > 0 && feasiblePolygon.length === 0) {
      // Single or multiple inequalities without explicit polygon
      inequalities.forEach((ineq) => {
        ctx.save();
        ctx.fillStyle = "rgba(239, 68, 68, 0.07)"; // light red for rejected region
        // Sample points across a grid
        const step = 4;
        for (let py = 0; py < h; py += step) {
          for (let px = 0; px < w; px += step) {
            const { x, y } = toMath(px, py, w, h);
            const val = ineq.a * x + ineq.b * y + ineq.c;
            let isSatisfied = false;
            if (ineq.operator === "<=") isSatisfied = val <= 1e-6;
            else if (ineq.operator === ">=") isSatisfied = val >= -1e-6;
            else if (ineq.operator === "<") isSatisfied = val < 0;
            else if (ineq.operator === ">") isSatisfied = val > 0;

            if (!isSatisfied) {
              ctx.fillRect(px, py, step, step);
            }
          }
        }
        ctx.restore();
      });
    }

    // 2.1 Highlight Feasible Polygon if present
    if (feasiblePolygon.length >= 3) {
      ctx.save();
      // First, shade entire plane in soft rejected tint
      ctx.fillStyle = "rgba(148, 163, 184, 0.18)"; // gray/slate for outer area
      ctx.fillRect(0, 0, w, h);

      // Now "cut out" the feasible polygon and fill it with vivid emerald
      ctx.save();
      ctx.beginPath();
      const first = toCanvas(feasiblePolygon[0].x, feasiblePolygon[0].y, w, h);
      ctx.moveTo(first.px, first.py);
      for (let i = 1; i < feasiblePolygon.length; i++) {
        const pt = toCanvas(feasiblePolygon[i].x, feasiblePolygon[i].y, w, h);
        ctx.lineTo(pt.px, pt.py);
      }
      ctx.closePath();

      // Clear the background gray inside polygon
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fill();
      ctx.restore();

      // Re-fill polygon with highlight emerald tint
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(first.px, first.py);
      for (let i = 1; i < feasiblePolygon.length; i++) {
        const pt = toCanvas(feasiblePolygon[i].x, feasiblePolygon[i].y, w, h);
        ctx.lineTo(pt.px, pt.py);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(16, 185, 129, 0.22)"; // translucent emerald
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#059669"; // emerald border
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw Inequality Boundary Lines
    inequalities.forEach((ineq) => {
      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = ineq.color || "#475569";
      if (ineq.operator === "<" || ineq.operator === ">") {
        ctx.setLineDash([5, 4]); // dashed if strict inequality
      }

      // Draw line ax + by + c = 0 across current viewport
      ctx.beginPath();
      if (Math.abs(ineq.b) > 1e-6) {
        const yAtXMin = (-ineq.a * xMin - ineq.c) / ineq.b;
        const yAtXMax = (-ineq.a * xMax - ineq.c) / ineq.b;
        const p1 = toCanvas(xMin, yAtXMin, w, h);
        const p2 = toCanvas(xMax, yAtXMax, w, h);
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
      } else if (Math.abs(ineq.a) > 1e-6) {
        // Vertical line x = -c / a
        const lineX = -ineq.c / ineq.a;
        const p1 = toCanvas(lineX, yMin, w, h);
        const p2 = toCanvas(lineX, yMax, w, h);
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
      }
      ctx.stroke();
      ctx.restore();
    });

    // 4. Draw Coordinate Axes (Ox, Oy)
    const { px: originX, py: originY } = toCanvas(0, 0, w, h);

    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#334155"; // slate-700
    ctx.fillStyle = "#334155";
    ctx.font = "bold 12px sans-serif";

    // Ox Axis
    if (originY >= 0 && originY <= h) {
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(w, originY);
      ctx.stroke();

      // Arrow head for Ox
      ctx.beginPath();
      ctx.moveTo(w - 10, originY - 4);
      ctx.lineTo(w, originY);
      ctx.lineTo(w - 10, originY + 4);
      ctx.fill();

      // Ox label
      ctx.fillText("x", w - 16, originY - 8);
    }

    // Oy Axis
    if (originX >= 0 && originX <= w) {
      ctx.beginPath();
      ctx.moveTo(originX, h);
      ctx.lineTo(originX, 0);
      ctx.stroke();

      // Arrow head for Oy
      ctx.beginPath();
      ctx.moveTo(originX - 4, 10);
      ctx.lineTo(originX, 0);
      ctx.lineTo(originX + 4, 10);
      ctx.fill();

      // Oy label
      ctx.fillText("y", originX + 8, 14);
    }

    // Origin label O
    if (originX >= 0 && originX <= w && originY >= 0 && originY <= h) {
      ctx.fillText("O", originX - 14, originY + 15);
    }

    // Tick Marks & Numbers on Axes
    const xRange = xMax - xMin;
    let tickStep = 1;
    if (xRange > 25) tickStep = 5;
    else if (xRange > 12) tickStep = 2;
    else if (xRange < 4) tickStep = 0.5;

    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#64748b";

    // X ticks
    const firstXTick = Math.floor(xMin / tickStep) * tickStep;
    for (let x = firstXTick; x <= xMax; x += tickStep) {
      if (Math.abs(x) < 1e-4) continue; // skip 0
      const { px } = toCanvas(x, 0, w, h);
      if (originY >= 0 && originY <= h) {
        ctx.beginPath();
        ctx.moveTo(px, originY - 3);
        ctx.lineTo(px, originY + 3);
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillText(Number(x.toFixed(2)).toString(), px, originY + 14);
      }
    }

    // Y ticks
    const firstYTick = Math.floor(yMin / tickStep) * tickStep;
    for (let y = firstYTick; y <= yMax; y += tickStep) {
      if (Math.abs(y) < 1e-4) continue; // skip 0
      const { py } = toCanvas(0, y, w, h);
      if (originX >= 0 && originX <= w) {
        ctx.beginPath();
        ctx.moveTo(originX - 3, py);
        ctx.lineTo(originX + 3, py);
        ctx.stroke();
        ctx.textAlign = "right";
        ctx.fillText(Number(y.toFixed(2)).toString(), originX - 6, py + 3);
      }
    }
    ctx.restore();

    // 5. Draw Asymptotes
    asymptotes.forEach((asymp) => {
      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = asymp.color || "#ef4444"; // red-500

      ctx.beginPath();
      if (asymp.type === "vertical" && typeof asymp.value === "number") {
        const { px } = toCanvas(asymp.value, 0, w, h);
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
        ctx.stroke();

        // Label
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = asymp.color || "#ef4444";
        ctx.fillText(asymp.label, px + 5, 25);
      } else if (asymp.type === "horizontal" && typeof asymp.value === "number") {
        const { py } = toCanvas(0, asymp.value, w, h);
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
        ctx.stroke();

        // Label
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = asymp.color || "#ef4444";
        ctx.fillText(asymp.label, 15, py - 6);
      } else if (asymp.type === "slant" && typeof asymp.m === "number" && typeof asymp.c === "number") {
        const yAtXMin = asymp.m * xMin + asymp.c;
        const yAtXMax = asymp.m * xMax + asymp.c;
        const p1 = toCanvas(xMin, yAtXMin, w, h);
        const p2 = toCanvas(xMax, yAtXMax, w, h);
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();

        // Label
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = asymp.color || "#ef4444";
        const midPoint = toCanvas((xMin + xMax) / 2, asymp.m * ((xMin + xMax) / 2) + asymp.c, w, h);
        ctx.fillText(asymp.label, midPoint.px + 10, midPoint.py - 10);
      }
      ctx.restore();
    });

    // 6. Draw Functions Curves
    functions.forEach((fnData) => {
      ctx.save();
      ctx.lineWidth = fnData.width || 2.5;
      ctx.strokeStyle = fnData.color || "#2563eb"; // blue-600
      if (fnData.dashed) ctx.setLineDash([5, 4]);

      const totalPoints = w * 2; // high-density sampling
      const dx = (xMax - xMin) / totalPoints;
      const discontinuities = fnData.discontinuities || [];

      let isDrawing = false;
      ctx.beginPath();

      for (let i = 0; i <= totalPoints; i++) {
        const x = xMin + i * dx;

        // Skip if x is near a discontinuity
        const isNearDiscontinuity = discontinuities.some(d => Math.abs(x - d) < dx * 1.5);
        if (isNearDiscontinuity) {
          isDrawing = false;
          continue;
        }

        try {
          const y = fnData.fn(x);
          if (isNaN(y) || !isFinite(y)) {
            isDrawing = false;
            continue;
          }

          // Check if y is way out of viewport bounds to avoid vertical artifacts
          const maxAllowedY = yMax + (yMax - yMin) * 2;
          const minAllowedY = yMin - (yMax - yMin) * 2;
          if (y > maxAllowedY || y < minAllowedY) {
            isDrawing = false;
            continue;
          }

          const { px, py } = toCanvas(x, y, w, h);
          if (!isDrawing) {
            ctx.moveTo(px, py);
            isDrawing = true;
          } else {
            ctx.lineTo(px, py);
          }
        } catch {
          isDrawing = false;
        }
      }
      ctx.stroke();
      ctx.restore();
    });

    // 7. Draw Points & Annotations
    const allPoints = [
      ...points,
      ...feasiblePolygon.map(p => ({
        x: p.x,
        y: p.y,
        label: p.label + (p.fValue !== undefined ? ` (${p.x}; ${p.y})` : ""),
        color: p.isOptimalMax ? "#ea580c" : p.isOptimalMin ? "#0284c7" : "#059669",
        isDashedToAxes: true
      }))
    ];

    allPoints.forEach((pt) => {
      const { px, py } = toCanvas(pt.x, pt.y, w, h);
      if (px < -20 || px > w + 20 || py < -20 || py > h + 20) return;

      ctx.save();
      // Dashed projection to axes
      if (pt.isDashedToAxes) {
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "#94a3b8";
        ctx.beginPath();
        // Project to Ox
        ctx.moveTo(px, py);
        ctx.lineTo(px, originY);
        // Project to Oy
        ctx.moveTo(px, py);
        ctx.lineTo(originX, py);
        ctx.stroke();
      }

      // Point circle
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = pt.color || "#ef4444";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Point label with pill background
      if (pt.label) {
        ctx.font = "bold 11px sans-serif";
        const labelText = pt.label;
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width;
        const textHeight = 12;

        const labelX = px + 8;
        const labelY = py - 8;

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(labelX - 3, labelY - textHeight, textWidth + 6, textHeight + 4);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(labelX - 3, labelY - textHeight, textWidth + 6, textHeight + 4);

        ctx.fillStyle = pt.color || "#0f172a";
        ctx.fillText(labelText, labelX, labelY);
      }
      ctx.restore();
    });

    // 8. Draw Mouse Hover Coordinates
    if (hoverCoord && !exportMode) {
      const { px, py } = toCanvas(hoverCoord.x, hoverCoord.y, w, h);
      ctx.save();
      // Small crosshair
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = "#94a3b8";
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();

      // Tooltip pill
      const coordStr = `(${hoverCoord.x.toFixed(2)}; ${hoverCoord.y.toFixed(2)})`;
      ctx.font = "11px monospace";
      const metrics = ctx.measureText(coordStr);
      const pillW = metrics.width + 12;
      const pillH = 20;

      let pillX = px + 12;
      let pillY = py - 12;
      if (pillX + pillW > w) pillX = px - pillW - 12;
      if (pillY - pillH < 0) pillY = py + 24;

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.beginPath();
      ctx.roundRect(pillX, pillY - pillH, pillW, pillH, 4);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillText(coordStr, pillX + 6, pillY - 6);
      ctx.restore();
    }
  }, [
    xMin, xMax, yMin, yMax, height, showGrid,
    functions, points, asymptotes, inequalities, feasiblePolygon,
    hoverCoord, toCanvas, toMath
  ]);

  // Redraw when states change
  useEffect(() => {
    if (canvasRef.current) {
      renderCanvas(canvasRef.current);
    }
  }, [renderCanvas]);

  // Window resize observer
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        renderCanvas(canvasRef.current);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderCanvas]);

  // Mouse Handlers for Dragging & Hover
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const mathPt = toMath(px, py, rect.width, rect.height);
    setHoverCoord(mathPt);

    if (isDragging && dragStart) {
      const dxPixels = e.clientX - dragStart.x;
      const dyPixels = e.clientY - dragStart.y;

      const xSpan = xMax - xMin;
      const ySpan = yMax - yMin;

      const dxMath = (dxPixels / rect.width) * xSpan;
      const dyMath = (dyPixels / rect.height) * ySpan;

      setXMin(prev => prev - dxMath);
      setXMax(prev => prev - dxMath);
      setYMin(prev => prev + dyMath);
      setYMax(prev => prev + dyMath);

      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.12 : 0.88;
    handleZoom(factor);
  };

  // Export PNG 300 DPI
  const handleExportPNG = () => {
    const exportCanvas = document.createElement("canvas");
    const exportW = 1200;
    const exportH = 880;
    exportCanvas.width = exportW;
    exportCanvas.height = exportH;

    renderCanvas(exportCanvas, true);

    const link = document.createElement("a");
    link.download = `${(title || "do_thi_toan_hoc").replace(/\s+/g, "_")}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  };

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 1200;
    exportCanvas.height = 880;
    renderCanvas(exportCanvas, true);

    try {
      exportCanvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        }
      }, "image/png");
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div ref={containerRef} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          {title && <h3 className="text-sm font-bold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Zoom Buttons */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => handleZoom(0.85)}
              className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
              title="Phóng to (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(1.18)}
              className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
              title="Thu nhỏ (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors"
              title="Khôi phục góc nhìn mặc định"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Copy Image button */}
          <button
            onClick={handleCopyImage}
            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Sao chép ảnh đồ thị vào clipboard để dán vào Word/đề thi"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Đã sao chép ảnh!" : "Sao chép ảnh"}</span>
          </button>

          {/* Download PNG button */}
          <button
            onClick={handleExportPNG}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Tải ảnh PNG độ nét cao (in ấn / đề thi)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải PNG</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative w-full overflow-hidden bg-white select-none cursor-grab active:cursor-grabbing">
        <canvas
          ref={canvasRef}
          style={{ height: `${height}px`, width: "100%" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            handleMouseUp();
            setHoverCoord(null);
          }}
          onWheel={handleWheel}
        />

        {/* Floating coordinate helper */}
        <div className="absolute bottom-2 left-2 pointer-events-none bg-slate-900/75 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow">
          {hoverCoord ? `x: ${hoverCoord.x.toFixed(2)} | y: ${hoverCoord.y.toFixed(2)}` : "Di chuyển chuột để xem tọa độ"}
        </div>
      </div>
    </div>
  );
};
