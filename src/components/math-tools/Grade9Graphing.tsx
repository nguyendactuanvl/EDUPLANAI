import React, { useState, useMemo } from "react";
import { InteractivePlot } from "./InteractivePlot";
import { MarkdownRenderer, MathSpan } from "../MarkdownRenderer";
import { formatLinearEquation } from "../../lib/mathFormatters";
import { FunctionPlotData, Point2D } from "./types";
import { Sparkles, Calculator, Info } from "lucide-react";

export const Grade9Graphing: React.FC = () => {
  const [activeType, setActiveType] = useState<"line" | "parabola">("line");

  // Line y = ax + b state
  const [lineA, setLineA] = useState<number>(2);
  const [lineB, setLineB] = useState<number>(-3);

  // Parabola y = ax^2 state
  const [parabolaA, setParabolaA] = useState<number>(0.5);

  // Calculate Line Intersections
  const lineAnalysis = useMemo(() => {
    const a = lineA;
    const b = lineB;

    const yIntercept = { x: 0, y: b, label: `B(0; ${b})` };
    const hasXIntercept = Math.abs(a) > 1e-6;
    const xVal = hasXIntercept ? -b / a : 0;
    const xIntercept = hasXIntercept ? { x: Number(xVal.toFixed(2)), y: 0, label: `A(${Number(xVal.toFixed(2))}; 0)` } : null;

    const points: Point2D[] = [
      { x: 0, y: b, label: `B(0; ${b})`, color: "#2563eb", isDashedToAxes: true }
    ];
    if (xIntercept) {
      points.push({ x: xIntercept.x, y: 0, label: `A(${xIntercept.x}; 0)`, color: "#16a34a", isDashedToAxes: true });
    }

    const fnPlot: FunctionPlotData = {
      id: "line",
      fn: (x) => a * x + b,
      color: "#2563eb",
      width: 2.5
    };

    return {
      a, b, yIntercept, xIntercept, hasXIntercept, points, fnPlot
    };
  }, [lineA, lineB]);

  // Calculate Parabola y = ax^2
  const parabolaAnalysis = useMemo(() => {
    const a = parabolaA === 0 ? 1 : parabolaA;
    const xValues = [-2, -1, 0, 1, 2];
    const tablePoints = xValues.map(x => ({
      x,
      y: Number((a * x * x).toFixed(2))
    }));

    const points: Point2D[] = tablePoints.map(p => ({
      x: p.x,
      y: p.y,
      label: p.x === 0 ? "O(0; 0)" : `(${p.x}; ${p.y})`,
      color: p.x === 0 ? "#dc2626" : "#4f46e5",
      isDashedToAxes: true
    }));

    const fnPlot: FunctionPlotData = {
      id: "parabola",
      fn: (x) => a * x * x,
      color: "#4f46e5",
      width: 2.5
    };

    return {
      a, tablePoints, points, fnPlot
    };
  }, [parabolaA]);

  return (
    <div className="space-y-6">
      {/* Type Selector */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveType("line")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeType === "line"
              ? "bg-white text-blue-800 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MathSpan content="1. Đường thẳng $y = ax + b$" />
        </button>
        <button
          onClick={() => setActiveType("parabola")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeType === "parabola"
              ? "bg-white text-indigo-800 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MathSpan content="2. Parabol $y = ax^2$ ($a \ne 0$)" />
        </button>
      </div>

      {/* DẠNG 1: ĐƯỜNG THẲNG y = ax + b */}
      {activeType === "line" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls & Steps (Left Column) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">
                  <MathSpan content="Thiết lập hàm số bậc nhất: $y = ax + b$" />
                </h3>
                <p className="text-xs text-slate-500">
                  <MathSpan content="Nhập các hệ số $a$ (hệ số góc) và $b$ (tung độ gốc)" />
                </p>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    <MathSpan content="Hệ số $a$ (hệ số góc)" />
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lineA}
                    onChange={(e) => setLineA(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    <MathSpan content="Hệ số $b$ (tung độ gốc)" />
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lineB}
                    onChange={(e) => setLineB(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Mẫu đường thẳng thường gặp:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { a: 2, b: -3, label: "y = 2x - 3" },
                    { a: -1, b: 2, label: "y = -x + 2" },
                    { a: 0.5, b: 1, label: "y = 0.5x + 1" },
                    { a: 3, b: 0, label: "y = 3x (qua gốc O)" }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setLineA(preset.a); setLineB(preset.b); }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <MathSpan content={`$${preset.label}$`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Step-by-step pedagogical notes */}
              <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100 space-y-2.5 text-xs text-slate-700">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Các bước xác định đồ thị (SGK Toán 9):</span>
                </div>

                <div>
                  <MarkdownRenderer
                    inline
                    content={`**1. Giao điểm với trục tung $Oy$:** Cho $x = 0 \\implies y = ${lineAnalysis.b}$. Điểm $B(0; ${lineAnalysis.b})$.`}
                  />
                </div>

                <div>
                  <MarkdownRenderer
                    inline
                    content={lineAnalysis.hasXIntercept 
                      ? `**2. Giao điểm với trục hoành $Ox$:** Cho $y = 0 \\implies ${lineAnalysis.a}x + (${lineAnalysis.b}) = 0 \\iff x = ${lineAnalysis.xIntercept?.x}$. Điểm $A(${lineAnalysis.xIntercept?.x}; 0)$.`
                      : `**2. Giao điểm với trục hoành $Ox$:** Đường thẳng song song với trục hoành $Ox$ (vì $a = 0$).`
                    }
                  />
                </div>

                <div>
                  <MarkdownRenderer
                    inline
                    content={lineAnalysis.a > 0
                      ? `**3. Tính chất:** Vì $a = ${lineAnalysis.a} > 0$ nên hàm số đồng biến trên $\\mathbb{R}$ (đường thẳng đi lên từ trái sang phải).`
                      : lineAnalysis.a < 0
                      ? `**3. Tính chất:** Vì $a = ${lineAnalysis.a} < 0$ nên hàm số nghịch biến trên $\\mathbb{R}$ (đường thẳng đi xuống từ trái sang phải).`
                      : `**3. Tính chất:** Hàm hằng $y = ${lineAnalysis.b}$.`
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Graph View (Right Column) */}
          <div className="lg:col-span-7">
            <InteractivePlot
              title={`Đồ thị đường thẳng: y = ${lineA}x ${lineB >= 0 ? "+ " + lineB : "- " + Math.abs(lineB)}`}
              subtitle="Tự động đánh dấu 2 điểm đặc biệt giao với Ox, Oy kèm đường gióng tọa độ"
              functions={[lineAnalysis.fnPlot]}
              points={lineAnalysis.points}
              defaultXRange={[-5, 5]}
              defaultYRange={[-5, 5]}
              height={440}
            />
          </div>
        </div>
      )}

      {/* DẠNG 2: PARABOL y = ax^2 */}
      {activeType === "parabola" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls & Steps (Left Column) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">
                  <MathSpan content="Thiết lập Parabol: $y = ax^2$ ($a \ne 0$)" />
                </h3>
                <p className="text-xs text-slate-500">
                  <MathSpan content="Đồ thị có đỉnh tại gốc tọa độ $O(0;0)$ và nhận trục tung $Oy$ làm trục đối xứng" />
                </p>
              </div>

              {/* Input a */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  <MathSpan content="Hệ số $a$ ($a \ne 0$)" />
                </label>
                <input
                  type="number"
                  step="any"
                  value={parabolaA}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setParabolaA(isNaN(val) ? 1 : val);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Mẫu Parabol thường gặp:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { a: 1, label: "y = x^2" },
                    { a: 0.5, label: "y = 0.5x^2" },
                    { a: 2, label: "y = 2x^2" },
                    { a: -1, label: "y = -x^2" },
                    { a: -0.5, label: "y = -0.5x^2" }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setParabolaA(preset.a)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <MathSpan content={`$${preset.label}$`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* 5 Points Table */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1.5">
                  Bảng giá trị 5 điểm đối xứng (SGK Toán 9):
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-center">
                    <thead className="bg-slate-50 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2 border-r border-slate-200">
                          <MathSpan content="$x$" />
                        </th>
                        {parabolaAnalysis.tablePoints.map((p, idx) => (
                          <th key={idx} className="p-2 border-r last:border-r-0 border-slate-200 font-mono">
                            {p.x}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 font-bold border-r border-slate-200 bg-slate-50">
                          <MathSpan content={`$y = ${parabolaA}x^2$`} />
                        </td>
                        {parabolaAnalysis.tablePoints.map((p, idx) => (
                          <td key={idx} className="p-2 border-r last:border-r-0 border-slate-200 font-mono font-bold text-indigo-700">
                            {p.y}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pedagogical notes */}
              <div className="bg-indigo-50/60 rounded-xl p-4 border border-indigo-100 space-y-2 text-xs text-slate-700">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-600" />
                  <span>Đặc điểm hình học:</span>
                </div>
                <div className="space-y-1">
                  <div>
                    <MarkdownRenderer inline content="• **Đỉnh:** Gốc tọa độ $O(0; 0)$." />
                  </div>
                  <div>
                    <MarkdownRenderer inline content="• **Trục đối xứng:** Trục tung $Oy$ ($x = 0$)." />
                  </div>
                  <div>
                    <MarkdownRenderer
                      inline
                      content={parabolaA > 0 
                        ? `• **Bề lõm:** Vì $a = ${parabolaA} > 0$ nên đồ thị quay bề lõm lên trên, điểm $O(0;0)$ là điểm thấp nhất.`
                        : `• **Bề lõm:** Vì $a = ${parabolaA} < 0$ nên đồ thị quay bề lõm xuống dưới, điểm $O(0;0)$ là điểm cao nhất.`
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Graph View (Right Column) */}
          <div className="lg:col-span-7">
            <InteractivePlot
              title={`Đồ thị Parabol: y = ${parabolaA}x^2`}
              subtitle="5 điểm đối xứng quanh gốc O(0;0) và trục đối xứng Oy"
              functions={[parabolaAnalysis.fnPlot]}
              points={parabolaAnalysis.points}
              defaultXRange={[-4, 4]}
              defaultYRange={parabolaA > 0 ? [-1, 7] : [-7, 1]}
              height={440}
            />
          </div>
        </div>
      )}
    </div>
  );
};
