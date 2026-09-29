import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  RotateCw, ZoomIn, ZoomOut, RotateCcw, Download, Copy, Check, 
  Box, Eye, Sparkles, Sliders 
} from "lucide-react";
import { Shape3DType, Point3D, Edge3D } from "./types";

interface Geometry3DViewerProps {
  initialShape?: Shape3DType;
  title?: string;
  subtitle?: string;
  onSelectShape?: (shape: Shape3DType) => void;
}

export const Geometry3DViewer: React.FC<Geometry3DViewerProps> = ({
  initialShape = "pyramid_quad",
  title = "Công cụ vẽ Hình học không gian (3D Geometry)",
  subtitle = "Chuẩn quy cách SGK Toán: Nét liền (nhìn thấy), nét đứt (khuất)"
}) => {
  const [shape, setShape] = useState<Shape3DType>(initialShape);
  const [pitch, setPitch] = useState<number>(22); // elevation angle in degrees
  const [yaw, setYaw] = useState<number>(35);   // azimuth angle in degrees
  const [zoom, setZoom] = useState<number>(1);
  const [showAltitude, setShowAltitude] = useState<boolean>(true);
  const [showDiagonals, setShowDiagonals] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastMouse, setLastMouse] = useState<{ x: number; y: number } | null>(null);

  // Generate 3D Model Vertices & Edges
  const getModel = useCallback((type: Shape3DType, withAltitude: boolean, withDiagonals: boolean) => {
    let vertices: Point3D[] = [];
    let edges: Edge3D[] = [];

    if (type === "pyramid_quad") {
      // S.ABCD (Chóp tứ giác)
      vertices = [
        { id: "A", x: -2, y: 1.2, z: 0, label: "A", labelOffset: { x: -14, y: 0 } },
        { id: "B", x: -0.5, y: -1.2, z: 0, label: "B", labelOffset: { x: -8, y: 14 } },
        { id: "C", x: 2.5, y: -1.2, z: 0, label: "C", labelOffset: { x: 10, y: 14 } },
        { id: "D", x: 1.2, y: 1.2, z: 0, label: "D", labelOffset: { x: 12, y: -4 } },
        { id: "S", x: -0.8, y: 0.2, z: 3.2, label: "S", labelOffset: { x: 0, y: -14 } }
      ];

      edges = [
        // Base
        { from: "A", to: "B", dashed: false },
        { from: "B", to: "C", dashed: false },
        { from: "C", to: "D", dashed: false },
        { from: "D", to: "A", dashed: true }, // back edge hidden
        // Lateral edges
        { from: "S", to: "A", dashed: true }, // hidden lateral edge
        { from: "S", to: "B", dashed: false },
        { from: "S", to: "C", dashed: false },
        { from: "S", to: "D", dashed: false }
      ];

      if (withDiagonals) {
        edges.push(
          { from: "A", to: "C", dashed: true, color: "#94a3b8" },
          { from: "B", to: "D", dashed: true, color: "#94a3b8" }
        );
      }
    } else if (type === "pyramid_triangle") {
      // S.ABC (Chóp tam giác)
      vertices = [
        { id: "A", x: -1.8, y: -1.2, z: 0, label: "A", labelOffset: { x: -14, y: 8 } },
        { id: "B", x: 0.4, y: -1.4, z: 0, label: "B", labelOffset: { x: 0, y: 14 } },
        { id: "C", x: 2.2, y: 0.6, z: 0, label: "C", labelOffset: { x: 14, y: 0 } },
        { id: "S", x: -0.2, y: 0.2, z: 3.0, label: "S", labelOffset: { x: 0, y: -14 } }
      ];

      edges = [
        { from: "A", to: "B", dashed: false },
        { from: "B", to: "C", dashed: false },
        { from: "A", to: "C", dashed: true }, // hidden back base
        { from: "S", to: "A", dashed: false },
        { from: "S", to: "B", dashed: false },
        { from: "S", to: "C", dashed: false }
      ];
    } else if (type === "pyramid_regular_quad") {
      // Chóp tứ giác đều S.ABCD, SO vuông góc đáy
      vertices = [
        { id: "A", x: -1.8, y: 1.0, z: 0, label: "A", labelOffset: { x: -14, y: 0 } },
        { id: "B", x: -0.6, y: -1.2, z: 0, label: "B", labelOffset: { x: -8, y: 14 } },
        { id: "C", x: 2.0, y: -1.2, z: 0, label: "C", labelOffset: { x: 10, y: 14 } },
        { id: "D", x: 1.0, y: 1.0, z: 0, label: "D", labelOffset: { x: 12, y: -4 } },
        { id: "O", x: 0.15, y: -0.1, z: 0, label: "O", labelOffset: { x: 8, y: 8 } },
        { id: "S", x: 0.15, y: -0.1, z: 3.4, label: "S", labelOffset: { x: 0, y: -14 } }
      ];

      edges = [
        { from: "A", to: "B", dashed: false },
        { from: "B", to: "C", dashed: false },
        { from: "C", to: "D", dashed: false },
        { from: "D", to: "A", dashed: true },
        { from: "S", to: "A", dashed: true },
        { from: "S", to: "B", dashed: false },
        { from: "S", to: "C", dashed: false },
        { from: "S", to: "D", dashed: false }
      ];

      if (withDiagonals) {
        edges.push(
          { from: "A", to: "C", dashed: true, color: "#94a3b8" },
          { from: "B", to: "D", dashed: true, color: "#94a3b8" }
        );
      }

      if (withAltitude) {
        edges.push({ from: "S", to: "O", dashed: true, color: "#ef4444", style: "altitude" });
      }
    } else if (type === "pyramid_regular_tri") {
      // Chóp tam giác đều S.ABC, SO vuông góc đáy
      vertices = [
        { id: "A", x: -1.8, y: -1.2, z: 0, label: "A", labelOffset: { x: -14, y: 8 } },
        { id: "B", x: 0.5, y: -1.4, z: 0, label: "B", labelOffset: { x: 0, y: 14 } },
        { id: "C", x: 2.2, y: 0.8, z: 0, label: "C", labelOffset: { x: 14, y: 0 } },
        { id: "O", x: 0.3, y: -0.6, z: 0, label: "O", labelOffset: { x: 6, y: 10 } },
        { id: "S", x: 0.3, y: -0.6, z: 3.2, label: "S", labelOffset: { x: 0, y: -14 } }
      ];

      edges = [
        { from: "A", to: "B", dashed: false },
        { from: "B", to: "C", dashed: false },
        { from: "A", to: "C", dashed: true },
        { from: "S", to: "A", dashed: false },
        { from: "S", to: "B", dashed: false },
        { from: "S", to: "C", dashed: false }
      ];

      if (withAltitude) {
        edges.push({ from: "S", to: "O", dashed: true, color: "#ef4444", style: "altitude" });
      }
    } else if (type === "prism_triangular") {
      // Lăng trụ tam giác ABC.A'B'C'
      vertices = [
        // Bottom base
        { id: "A", x: -1.6, y: -1.0, z: -1.4, label: "A", labelOffset: { x: -12, y: 8 } },
        { id: "B", x: 0.5, y: -1.2, z: -1.4, label: "B", labelOffset: { x: 0, y: 12 } },
        { id: "C", x: 1.8, y: 0.6, z: -1.4, label: "C", labelOffset: { x: 12, y: 0 } },
        // Top base
        { id: "A1", x: -1.6, y: -1.0, z: 1.4, label: "A'", labelOffset: { x: -12, y: -8 } },
        { id: "B1", x: 0.5, y: -1.2, z: 1.4, label: "B'", labelOffset: { x: 0, y: -12 } },
        { id: "C1", x: 1.8, y: 0.6, z: 1.4, label: "C'", labelOffset: { x: 12, y: -4 } }
      ];

      edges = [
        // Bottom base
        { from: "A", to: "B", dashed: false },
        { from: "B", to: "C", dashed: false },
        { from: "A", to: "C", dashed: true }, // hidden
        // Top base
        { from: "A1", to: "B1", dashed: false },
        { from: "B1", to: "C1", dashed: false },
        { from: "A1", to: "C1", dashed: false },
        // Lateral edges
        { from: "A", to: "A1", dashed: false },
        { from: "B", to: "B1", dashed: false },
        { from: "C", to: "C1", dashed: false }
      ];
    } else {
      // Cuboid / Cube ABCD.A'B'C'D'
      vertices = [
        // Bottom
        { id: "A", x: -1.6, y: 0.8, z: -1.2, label: "A", labelOffset: { x: -12, y: 0 } },
        { id: "B", x: -0.6, y: -1.0, z: -1.2, label: "B", labelOffset: { x: -8, y: 12 } },
        { id: "C", x: 1.8, y: -1.0, z: -1.2, label: "C", labelOffset: { x: 10, y: 12 } },
        { id: "D", x: 0.8, y: 0.8, z: -1.2, label: "D", labelOffset: { x: 12, y: -4 } },
        // Top
        { id: "A1", x: -1.6, y: 0.8, z: 1.4, label: "A'", labelOffset: { x: -12, y: -6 } },
        { id: "B1", x: -0.6, y: -1.0, z: 1.4, label: "B'", labelOffset: { x: -8, y: -10 } },
        { id: "C1", x: 1.8, y: -1.0, z: 1.4, label: "C'", labelOffset: { x: 10, y: -10 } },
        { id: "D1", x: 0.8, y: 0.8, z: 1.4, label: "D'", labelOffset: { x: 12, y: -6 } }
      ];

      edges = [
        // Bottom
        { from: "A", to: "B", dashed: true },
        { from: "B", to: "C", dashed: false },
        { from: "C", to: "D", dashed: false },
        { from: "D", to: "A", dashed: true },
        // Top
        { from: "A1", to: "B1", dashed: false },
        { from: "B1", to: "C1", dashed: false },
        { from: "C1", to: "D1", dashed: false },
        { from: "D1", to: "A1", dashed: false },
        // Vertical
        { from: "A", to: "A1", dashed: true },
        { from: "B", to: "B1", dashed: false },
        { from: "C", to: "C1", dashed: false },
        { from: "D", to: "D1", dashed: false }
      ];
    }

    return { vertices, edges };
  }, []);

  // 3D Projection to 2D Canvas
  const project3D = useCallback((pt: Point3D, w: number, h: number) => {
    const radYaw = (yaw * Math.PI) / 180;
    const radPitch = (pitch * Math.PI) / 180;

    // Rotate around Z axis (Yaw)
    const x1 = pt.x * Math.cos(radYaw) - pt.y * Math.sin(radYaw);
    const y1 = pt.x * Math.sin(radYaw) + pt.y * Math.cos(radYaw);
    const z1 = pt.z;

    // Rotate around X axis (Pitch)
    const x2 = x1;
    const y2 = y1 * Math.cos(radPitch) - z1 * Math.sin(radPitch);
    const z2 = y1 * Math.sin(radPitch) + z1 * Math.cos(radPitch);

    // Orthographic projection scaled by zoom
    const scale = Math.min(w, h) * 0.18 * zoom;
    const px = w / 2 + x2 * scale;
    const py = h / 2 - z2 * scale;

    return { px, py, depth: y2 };
  }, [pitch, yaw, zoom]);

  // Render Canvas
  const render = useCallback((targetCanvas: HTMLCanvasElement, exportMode = false) => {
    const ctx = targetCanvas.getContext("2d");
    if (!ctx) return;

    const dpr = exportMode ? 3 : (window.devicePixelRatio || 1);
    const w = exportMode ? 1200 : (targetCanvas.clientWidth || 600);
    const h = exportMode ? 880 : 440;

    if (exportMode) {
      targetCanvas.width = w;
      targetCanvas.height = h;
    } else {
      targetCanvas.width = w * dpr;
      targetCanvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    const drawW = exportMode ? w : targetCanvas.clientWidth || 600;
    const drawH = exportMode ? h : 440;

    // Clean background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, drawW, drawH);

    const { vertices, edges } = getModel(shape, showAltitude, showDiagonals);

    // Map of projected points
    const projMap = new Map<string, { px: number; py: number }>();
    vertices.forEach(v => {
      const proj = project3D(v, drawW, drawH);
      projMap.set(v.id, proj);
    });

    // 1. Draw Edges
    edges.forEach(edge => {
      const p1 = projMap.get(edge.from);
      const p2 = projMap.get(edge.to);
      if (!p1 || !p2) return;

      ctx.save();
      ctx.lineWidth = edge.style === "altitude" ? 2.2 : 1.8;
      ctx.strokeStyle = edge.color || "#1e293b"; // slate-800

      if (edge.dashed) {
        ctx.setLineDash([6, 5]); // Standard dashed line for hidden edges
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
      ctx.restore();
    });

    // 2. Draw Vertices & Labels
    vertices.forEach(v => {
      const p = projMap.get(v.id);
      if (!p) return;

      ctx.save();
      // Vertex dot
      ctx.beginPath();
      ctx.arc(p.px, p.py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = v.id === "S" ? "#2563eb" : v.id === "O" ? "#ef4444" : "#0f172a";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Vertex Label
      ctx.font = "bold 13px 'Times New Roman', serif";
      ctx.fillStyle = "#0f172a";

      const offsetX = v.labelOffset?.x || 8;
      const offsetY = v.labelOffset?.y || -8;

      ctx.fillText(v.label, p.px + offsetX, p.py + offsetY);
      ctx.restore();
    });

    // Watermark / SGK standard tag
    ctx.save();
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Quy ước SGK: Nét đứt (khuất) - Nét liền (nhìn thấy)", 16, drawH - 16);
    ctx.restore();
  }, [shape, showAltitude, showDiagonals, getModel, project3D]);

  // Redraw when state updates
  useEffect(() => {
    if (canvasRef.current) {
      render(canvasRef.current);
    }
  }, [render]);

  // Window resize observer
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        render(canvasRef.current);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [render]);

  // Mouse handlers for dragging 3D rotation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !lastMouse) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;

    setYaw(prev => (prev + dx * 0.5) % 360);
    setPitch(prev => Math.max(-80, Math.min(80, prev - dy * 0.5)));

    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setLastMouse(null);
  };

  // Export PNG
  const handleExportPNG = () => {
    const exportCanvas = document.createElement("canvas");
    render(exportCanvas, true);

    const link = document.createElement("a");
    link.download = `hinh_hoc_khong_gian_${shape}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  };

  // Copy Image
  const handleCopyImage = async () => {
    const exportCanvas = document.createElement("canvas");
    render(exportCanvas, true);

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
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col gap-4 p-4 sm:p-5">
      {/* Header & Shape Selection */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Box className="w-4 h-4 text-purple-600" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyImage}
            className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Sao chép ảnh vào clipboard để dán vào Word"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Đã chép ảnh!" : "Sao chép ảnh"}</span>
          </button>

          <button
            onClick={handleExportPNG}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải PNG</span>
          </button>
        </div>
      </div>

      {/* Preset Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { id: "pyramid_quad" as Shape3DType, label: "Chóp tứ giác (S.ABCD)" },
          { id: "pyramid_triangle" as Shape3DType, label: "Chóp tam giác (S.ABC)" },
          { id: "pyramid_regular_quad" as Shape3DType, label: "Chóp tứ giác đều (SO ⊥ đáy)" },
          { id: "pyramid_regular_tri" as Shape3DType, label: "Chóp tam giác đều (SO ⊥ đáy)" },
          { id: "prism_triangular" as Shape3DType, label: "Lăng trụ tam giác (ABC.A'B'C')" },
          { id: "cuboid" as Shape3DType, label: "Hình hộp chữ nhật / Lập phương" }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setShape(item.id)}
            className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
              shape === item.id
                ? "bg-purple-50 border-purple-300 text-purple-900 font-bold shadow-2xs"
                : "border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Canvas Viewport & Rotation Controls */}
      <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "420px" }}
          className="cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* View Controls Toolbar */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs border border-slate-200 p-1 rounded-xl shadow-xs flex items-center gap-1">
          <button
            onClick={() => setZoom(prev => Math.min(2.0, prev + 0.15))}
            className="p-1 text-slate-600 hover:text-purple-600 rounded"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.6, prev - 0.15))}
            className="p-1 text-slate-600 hover:text-purple-600 rounded"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setPitch(22);
              setYaw(35);
              setZoom(1);
            }}
            className="p-1 text-slate-600 hover:text-purple-600 rounded"
            title="Khôi phục góc nhìn"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Options overlay */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={showAltitude}
              onChange={e => setShowAltitude(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>Đường cao (SO)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={showDiagonals}
              onChange={e => setShowDiagonals(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>Đường chéo đáy</span>
          </label>
        </div>
      </div>
    </div>
  );
};
