import React, { useState, useMemo } from "react";
import { InteractivePlot } from "./InteractivePlot";
import { VariationTable, VariationTablePoint, VariationInterval } from "./VariationTable";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { FunctionPlotData, Point2D, AsymptoteLine, InequalityConstraint, PolygonVertex } from "./types";
import { Sparkles, Plus, Trash2, CheckCircle2, TrendingUp, Info } from "lucide-react";

export const Grade10Graphing: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"parabola" | "single_ineq" | "system_ineq">("parabola");

  // ==========================================
  // 1. PARABOL TỔNG QUÁT: y = ax^2 + bx + c
  // ==========================================
  const [pA, setPA] = useState<number>(1);
  const [pB, setPB] = useState<number>(-2);
  const [pC, setPC] = useState<number>(-3);

  const parabolaAnalysis = useMemo(() => {
    const a = pA === 0 ? 1 : pA;
    const b = pB;
    const c = pC;

    const delta = b * b - 4 * a * c;
    const xVertex = -b / (2 * a);
    const yVertex = -delta / (4 * a);

    // 5 symmetrical points around vertex
    const step = 1;
    const xPoints = [
      xVertex - 2 * step,
      xVertex - step,
      xVertex,
      xVertex + step,
      xVertex + 2 * step
    ];

    const tablePoints = xPoints.map(x => ({
      x: Number(x.toFixed(2)),
      y: Number((a * x * x + b * x + c).toFixed(2))
    }));

    const points: Point2D[] = [
      {
        x: Number(xVertex.toFixed(2)),
        y: Number(yVertex.toFixed(2)),
        label: `Đỉnh I(${Number(xVertex.toFixed(2))}; ${Number(yVertex.toFixed(2))})`,
        color: "#dc2626",
        isDashedToAxes: true
      },
      {
        x: 0,
        y: c,
        label: `Giao Oy(0; ${c})`,
        color: "#2563eb",
        isDashedToAxes: true
      }
    ];

    // Ox intercepts
    if (delta > 0) {
      const x1 = (-b - Math.sqrt(delta)) / (2 * a);
      const x2 = (-b + Math.sqrt(delta)) / (2 * a);
      points.push(
        { x: Number(x1.toFixed(2)), y: 0, label: `x1=${Number(x1.toFixed(2))}`, color: "#16a34a" },
        { x: Number(x2.toFixed(2)), y: 0, label: `x2=${Number(x2.toFixed(2))}`, color: "#16a34a" }
      );
    } else if (delta === 0) {
      points.push({ x: Number(xVertex.toFixed(2)), y: 0, label: `Tiếp xúc Ox tại x=${Number(xVertex.toFixed(2))}`, color: "#16a34a" });
    }

    // Axis of symmetry line
    const axisLine: AsymptoteLine = {
      type: "vertical",
      value: xVertex,
      label: `Trục đối xứng: x = ${Number(xVertex.toFixed(2))}`,
      color: "#9333ea"
    };

    const fnPlot: FunctionPlotData = {
      id: "general_parabola",
      fn: (x) => a * x * x + b * x + c,
      color: "#2563eb",
      width: 2.5
    };

    // BBT Data
    const bbtPoints: VariationTablePoint[] = a > 0 ? [
      { x: "-\\infty", yVal: "+\\infty", yPosition: "top" },
      { x: Number(xVertex.toFixed(2)).toString(), yPrime: "0", yVal: Number(yVertex.toFixed(2)).toString(), yPosition: "bottom" },
      { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
    ] : [
      { x: "-\\infty", yVal: "-\\infty", yPosition: "bottom" },
      { x: Number(xVertex.toFixed(2)).toString(), yPrime: "0", yVal: Number(yVertex.toFixed(2)).toString(), yPosition: "top" },
      { x: "+\\infty", yVal: "-\\infty", yPosition: "bottom" }
    ];

    const bbtIntervals: VariationInterval[] = a > 0 ? [
      { trend: "decreasing", fromVal: "+\\infty", toVal: Number(yVertex.toFixed(2)).toString(), sign: "-" },
      { trend: "increasing", fromVal: Number(yVertex.toFixed(2)).toString(), toVal: "+\\infty", sign: "+" }
    ] : [
      { trend: "increasing", fromVal: "-\\infty", toVal: Number(yVertex.toFixed(2)).toString(), sign: "+" },
      { trend: "decreasing", fromVal: Number(yVertex.toFixed(2)).toString(), toVal: "-\\infty", sign: "-" }
    ];

    return {
      a, b, c, delta, xVertex, yVertex, tablePoints, points, axisLine, fnPlot, bbtPoints, bbtIntervals
    };
  }, [pA, pB, pC]);

  // ==========================================
  // 2. MIỀN NGHIỆM BẤT PHƯƠNG TRÌNH BẬC NHẤT 2 ẨN
  // ==========================================
  const [sA, setSA] = useState<number>(2);
  const [sB, setSB] = useState<number>(1);
  const [sC, setSC] = useState<number>(-4);
  const [sOp, setSOp] = useState<"<=" | ">=" | "<" | ">">("<=");

  const singleIneqAnalysis = useMemo(() => {
    const ineq: InequalityConstraint = {
      id: "single",
      a: sA,
      b: sB,
      c: sC,
      operator: sOp,
      color: "#2563eb"
    };

    // Test point (prefer (0,0) if c != 0, else (1,0))
    const testPoint = (sC !== 0) ? { x: 0, y: 0 } : { x: 1, y: 0 };
    const valAtTest = sA * testPoint.x + sB * testPoint.y + sC;
    let satisfies = false;
    if (sOp === "<=") satisfies = valAtTest <= 0;
    else if (sOp === ">=") satisfies = valAtTest >= 0;
    else if (sOp === "<") satisfies = valAtTest < 0;
    else if (sOp === ">") satisfies = valAtTest > 0;

    return {
      ineq, testPoint, valAtTest, satisfies
    };
  }, [sA, sB, sC, sOp]);

  // ==========================================
  // 3. HỆ BẤT PHƯƠNG TRÌNH & TỐI ƯU TUYẾN TÍNH
  // ==========================================
  const [systemIneqs, setSystemIneqs] = useState<InequalityConstraint[]>([
    { id: "1", a: 1, b: 0, c: 0, operator: ">=", color: "#0f172a" },       // x >= 0
    { id: "2", a: 0, b: 1, c: 0, operator: ">=", color: "#0f172a" },       // y >= 0
    { id: "3", a: 1, b: 2, c: -10, operator: "<=", color: "#2563eb" },     // x + 2y <= 10
    { id: "4", a: 3, b: 1, c: -15, operator: "<=", color: "#dc2626" }      // 3x + y <= 15
  ]);

  // Objective Function F(x, y) = Ax + By + C
  const [fA, setFA] = useState<number>(4);
  const [fB, setFB] = useState<number>(3);
  const [fC, setFC] = useState<number>(0);

  // Compute Feasible Polygon Vertices
  const linearProgrammingResult = useMemo(() => {
    // Find all intersections between pairs of lines
    const candidates: { x: number; y: number }[] = [];

    for (let i = 0; i < systemIneqs.length; i++) {
      for (let j = i + 1; j < systemIneqs.length; j++) {
        const l1 = systemIneqs[i];
        const l2 = systemIneqs[j];

        const det = l1.a * l2.b - l2.a * l1.b;
        if (Math.abs(det) > 1e-6) {
          const x = (-l1.c * l2.b - -l2.c * l1.b) / det;
          const y = (l1.a * -l2.c - l2.a * -l1.c) / det;

          // Check if this intersection satisfies ALL inequalities in the system
          const satisfiesAll = systemIneqs.every(ineq => {
            const val = ineq.a * x + ineq.b * y + ineq.c;
            if (ineq.operator === "<=") return val <= 1e-5;
            if (ineq.operator === ">=") return val >= -1e-5;
            if (ineq.operator === "<") return val < 1e-5;
            if (ineq.operator === ">") return val > -1e-5;
            return false;
          });

          if (satisfiesAll) {
            // Avoid duplicate points
            const isDuplicate = candidates.some(pt => Math.hypot(pt.x - x, pt.y - y) < 1e-4);
            if (!isDuplicate) {
              candidates.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
            }
          }
        }
      }
    }

    // Sort vertices counter-clockwise around center to form a proper convex polygon
    if (candidates.length >= 3) {
      const centerX = candidates.reduce((s, p) => s + p.x, 0) / candidates.length;
      const centerY = candidates.reduce((s, p) => s + p.y, 0) / candidates.length;
      candidates.sort((a, b) => {
        const angA = Math.atan2(a.y - centerY, a.x - centerX);
        const angB = Math.atan2(b.y - centerY, b.x - centerX);
        return angA - angB;
      });
    }

    // Calculate F(x, y) = Ax + By + C at each vertex
    let maxVal = -Infinity;
    let minVal = Infinity;
    let maxVertex = "";
    let minVertex = "";

    const polygonVertices: PolygonVertex[] = candidates.map((pt, idx) => {
      const label = String.fromCharCode(65 + idx); // A, B, C, D...
      const fVal = Number((fA * pt.x + fB * pt.y + fC).toFixed(2));
      if (fVal > maxVal) {
        maxVal = fVal;
        maxVertex = `${label}(${pt.x}; ${pt.y})`;
      }
      if (fVal < minVal) {
        minVal = fVal;
        minVertex = `${label}(${pt.x}; ${pt.y})`;
      }
      return {
        x: pt.x,
        y: pt.y,
        label,
        fValue: fVal
      };
    });

    // Mark optimal vertices
    polygonVertices.forEach(v => {
      if (v.fValue === maxVal) v.isOptimalMax = true;
      if (v.fValue === minVal) v.isOptimalMin = true;
    });

    return {
      polygonVertices, maxVal, minVal, maxVertex, minVertex
    };
  }, [systemIneqs, fA, fB, fC]);

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab("parabola")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeSubTab === "parabola"
              ? "bg-white text-blue-800 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          1. Parabol tổng quát $y = ax^2 + bx + c$
        </button>
        <button
          onClick={() => setActiveSubTab("single_ineq")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeSubTab === "single_ineq"
              ? "bg-white text-indigo-800 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          2. Miền nghiệm BPT bậc nhất 2 ẩn
        </button>
        <button
          onClick={() => setActiveSubTab("system_ineq")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeSubTab === "system_ineq"
              ? "bg-white text-emerald-800 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          3. Hệ BPT 2 ẩn & Bài toán Tối ưu Tuyến tính
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. PARABOL TỔNG QUÁT                                               */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === "parabola" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">
                  Parabol: $y = ax^2 + bx + c$ ($a \ne 0$)
                </h3>
                <p className="text-xs text-slate-500">Tự động xác định đỉnh $I$, trục đối xứng, BBT và vẽ đồ thị</p>
              </div>

              {/* Input a, b, c */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hệ số $a$</label>
                  <input
                    type="number"
                    step="any"
                    value={pA}
                    onChange={e => setPA(parseFloat(e.target.value) || 1)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hệ số $b$</label>
                  <input
                    type="number"
                    step="any"
                    value={pB}
                    onChange={e => setPB(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hệ số $c$</label>
                  <input
                    type="number"
                    step="any"
                    value={pC}
                    onChange={e => setPC(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Presets */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Mẫu Parabol thực tế:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { a: 1, b: -2, c: -3, label: "y = x^2 - 2x - 3" },
                    { a: -1, b: 4, c: -3, label: "y = -x^2 + 4x - 3" },
                    { a: 0.5, b: -1, c: 2, label: "y = 0.5x^2 - x + 2" }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setPA(p.a); setPB(p.b); setPC(p.c); }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 rounded-lg text-xs font-medium"
                    >
                      ${p.label}$
                    </button>
                  ))}
                </div>
              </div>

              {/* Analytical steps */}
              <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100 space-y-2 text-xs text-slate-700">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Các yếu tố đặc trưng (Toán 10):</span>
                </div>
                <div className="space-y-1.5">
                  <div>• <strong>Đỉnh Parabol:</strong> {`$I\\left(-\\frac{b}{2a}; -\\frac{\\Delta}{4a}\\right) \\implies I(${Number(parabolaAnalysis.xVertex.toFixed(2))}; ${Number(parabolaAnalysis.yVertex.toFixed(2))})$`}.</div>
                  <div>• <strong>Trục đối xứng:</strong> {`$x = -\\frac{b}{2a} = ${Number(parabolaAnalysis.xVertex.toFixed(2))}$`}.</div>
                  <div>• <strong>Biệt thức $\Delta$:</strong> {`$\\Delta = b^2 - 4ac = ${parabolaAnalysis.delta}$`}.</div>
                  <div>• <strong>Bề lõm:</strong> {parabolaAnalysis.a > 0 ? "Quay lên trên (a > 0)" : "Quay xuống dưới (a < 0)"}.</div>
                </div>
              </div>

              {/* 5-points table */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1.5">
                  Bảng giá trị 5 điểm đối xứng:
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-center">
                    <thead className="bg-slate-50 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2 border-r border-slate-200">$x$</th>
                        {parabolaAnalysis.tablePoints.map((pt, idx) => (
                          <th key={idx} className="p-2 border-r last:border-r-0 border-slate-200 font-mono">
                            {pt.x}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 font-bold border-r border-slate-200 bg-slate-50">$y$</td>
                        {parabolaAnalysis.tablePoints.map((pt, idx) => (
                          <td key={idx} className="p-2 border-r last:border-r-0 border-slate-200 font-mono font-bold text-blue-700">
                            {pt.y}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BBT */}
              <VariationTable
                title="Bảng biến thiên Parabol (Toán 10)"
                points={parabolaAnalysis.bbtPoints}
                intervals={parabolaAnalysis.bbtIntervals}
              />
            </div>
          </div>

          <div className="lg:col-span-7">
            <InteractivePlot
              title={`Đồ thị: y = ${pA}x² ${pB >= 0 ? "+ " + pB : "- " + Math.abs(pB)}x ${pC >= 0 ? "+ " + pC : "- " + Math.abs(pC)}`}
              subtitle="Đỉnh I, trục đối xứng và các giao điểm với trục tọa độ"
              functions={[parabolaAnalysis.fnPlot]}
              points={parabolaAnalysis.points}
              asymptotes={[parabolaAnalysis.axisLine]}
              defaultXRange={[parabolaAnalysis.xVertex - 5, parabolaAnalysis.xVertex + 5]}
              defaultYRange={parabolaAnalysis.a > 0 ? [parabolaAnalysis.yVertex - 2, parabolaAnalysis.yVertex + 8] : [parabolaAnalysis.yVertex - 8, parabolaAnalysis.yVertex + 2]}
              height={460}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. MIỀN NGHIỆM BPT BẬC NHẤT 2 ẨN                                   */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === "single_ineq" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">
                  Biểu diễn Miền nghiệm BPT: $ax + by + c \le 0$
                </h3>
                <p className="text-xs text-slate-500">Gạch sọc phần KHÔNG phải miền nghiệm, giữ sáng miền nghiệm</p>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hệ số $a$</label>
                  <input
                    type="number"
                    value={sA}
                    onChange={e => setSA(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hệ số $b$</label>
                  <input
                    type="number"
                    value={sB}
                    onChange={e => setSB(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hệ số $c$</label>
                  <input
                    type="number"
                    value={sC}
                    onChange={e => setSC(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
              </div>

              {/* Operator */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Dấu bất đẳng thức:</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["<=", ">=", "<", ">"] as const).map(op => (
                    <button
                      key={op}
                      onClick={() => setSOp(op)}
                      className={`py-2 rounded-xl border text-sm font-bold transition-all ${
                        sOp === op
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {op === "<=" ? "≤ 0" : op === ">=" ? "≥ 0" : op === "<" ? "< 0" : "> 0"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pedagogical steps */}
              <div className="bg-indigo-50/60 rounded-xl p-4 border border-indigo-100 space-y-2.5 text-xs text-slate-700">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Quy trình xác định miền nghiệm (SGK Toán 10):</span>
                </div>
                <div className="space-y-1">
                  <div><strong>Bước 1:</strong> Vẽ đường thẳng biên $d: {sA}x + {sB}y + {sC} = 0$.</div>
                  <div className="text-slate-500 pl-3">
                    {sOp === "<=" || sOp === ">=" ? "• Vẽ nét liền vì có dấu bằng (biên thuộc miền nghiệm)." : "• Vẽ nét đứt vì dấu ngặt (biên không thuộc miền nghiệm)."}
                  </div>
                </div>
                <div className="space-y-1">
                  <div>
                    <strong>Bước 2:</strong> Chọn điểm thử $M({singleIneqAnalysis.testPoint.x}; {singleIneqAnalysis.testPoint.y})$ không thuộc đường thẳng $d$.
                  </div>
                  <div className="pl-3">
                    Thay vào vế trái: ${sA}({singleIneqAnalysis.testPoint.x}) + {sB}({singleIneqAnalysis.testPoint.y}) + {sC} = {singleIneqAnalysis.valAtTest}$.
                  </div>
                </div>
                <div className="space-y-1">
                  <div><strong>Bước 3:</strong> Kết luận:</div>
                  <div className="pl-3 font-semibold text-indigo-800">
                    {singleIneqAnalysis.satisfies
                      ? `Vì ${singleIneqAnalysis.valAtTest} thỏa mãn BPT nên nửa mặt phẳng chứa điểm M(${singleIneqAnalysis.testPoint.x}; ${singleIneqAnalysis.testPoint.y}) là miền nghiệm.`
                      : `Vì ${singleIneqAnalysis.valAtTest} KHÔNG thỏa mãn BPT nên nửa mặt phẳng KHÔNG chứa điểm M(${singleIneqAnalysis.testPoint.x}; ${singleIneqAnalysis.testPoint.y}) là miền nghiệm.`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <InteractivePlot
              title={`Miền nghiệm BPT: ${sA}x ${sB >= 0 ? "+ " + sB : "- " + Math.abs(sB)}y ${sC >= 0 ? "+ " + sC : "- " + Math.abs(sC)} ${sOp === "<=" ? "≤" : sOp === ">=" ? "≥" : sOp} 0`}
              subtitle="Phần tô màu đỏ nhạt là phần bị gạch bỏ (không thuộc miền nghiệm), phần sáng là miền nghiệm"
              inequalities={[singleIneqAnalysis.ineq]}
              points={[{
                x: singleIneqAnalysis.testPoint.x,
                y: singleIneqAnalysis.testPoint.y,
                label: `Điểm thử M(${singleIneqAnalysis.testPoint.x}; ${singleIneqAnalysis.testPoint.y})`,
                color: singleIneqAnalysis.satisfies ? "#16a34a" : "#dc2626"
              }]}
              defaultXRange={[-6, 6]}
              defaultYRange={[-5, 5]}
              height={460}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. HỆ BẤT PHƯƠNG TRÌNH & BÀI TOÁN TỐI ƯU TUYẾN TÍNH                 */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === "system_ineq" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Hệ BPT & Tối ưu Tuyến tính $F(x, y)$
                  </h3>
                  <p className="text-xs text-slate-500">Tự động tìm miền đa giác nghiệm & tính Max/Min tại các đỉnh</p>
                </div>
                <button
                  onClick={() => {
                    setSystemIneqs([
                      ...systemIneqs,
                      { id: Date.now().toString(), a: 1, b: 1, c: -8, operator: "<=", color: "#059669" }
                    ]);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm BPT
                </button>
              </div>

              {/* List of inequalities */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {systemIneqs.map((ineq, idx) => (
                  <div key={ineq.id} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="font-mono text-slate-400 font-bold w-4">{idx + 1}.</span>
                    <input
                      type="number"
                      value={ineq.a}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setSystemIneqs(systemIneqs.map(i => i.id === ineq.id ? { ...i, a: val } : i));
                      }}
                      className="w-12 px-1.5 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
                    />
                    <span>x +</span>
                    <input
                      type="number"
                      value={ineq.b}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setSystemIneqs(systemIneqs.map(i => i.id === ineq.id ? { ...i, b: val } : i));
                      }}
                      className="w-12 px-1.5 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
                    />
                    <span>y +</span>
                    <input
                      type="number"
                      value={ineq.c}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setSystemIneqs(systemIneqs.map(i => i.id === ineq.id ? { ...i, c: val } : i));
                      }}
                      className="w-14 px-1.5 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
                    />
                    <select
                      value={ineq.operator}
                      onChange={e => {
                        const val = e.target.value as "<=" | ">=" | "<" | ">";
                        setSystemIneqs(systemIneqs.map(i => i.id === ineq.id ? { ...i, operator: val } : i));
                      }}
                      className="px-1 py-1 bg-white border border-slate-300 rounded font-bold"
                    >
                      <option value="<=">≤</option>
                      <option value=">=">≥</option>
                      <option value="<">&lt;</option>
                      <option value=">">&gt;</option>
                    </select>
                    <span>0</span>
                    <button
                      onClick={() => setSystemIneqs(systemIneqs.filter(i => i.id !== ineq.id))}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors ml-auto"
                      title="Xóa BPT"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Objective Function F(x, y) = Ax + By + C */}
              <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-700" />
                    Biểu thức mục tiêu: $F(x, y) = Ax + By + C$
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hệ số $A$</label>
                    <input
                      type="number"
                      value={fA}
                      onChange={e => setFA(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-emerald-300 rounded font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hệ số $B$</label>
                    <input
                      type="number"
                      value={fB}
                      onChange={e => setFB(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-emerald-300 rounded font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hệ số $C$</label>
                    <input
                      type="number"
                      value={fC}
                      onChange={e => setFC(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-emerald-300 rounded font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Table of Vertices & Values */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1.5">
                  Tọa độ các đỉnh của miền đa giác & Giá trị $F(x, y)$:
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-center">
                    <thead className="bg-slate-50 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2 border-r border-slate-200">Đỉnh</th>
                        <th className="p-2 border-r border-slate-200">Tọa độ $(x; y)$</th>
                        <th className="p-2">Giá trị $F(x, y)$</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linearProgrammingResult.polygonVertices.map((v) => (
                        <tr key={v.label} className="border-b last:border-b-0 border-slate-100">
                          <td className="p-2 font-bold border-r border-slate-200">{v.label}</td>
                          <td className="p-2 font-mono border-r border-slate-200">({v.x}; {v.y})</td>
                          <td className="p-2 font-mono font-bold">
                            <span className={v.isOptimalMax ? "text-orange-600" : v.isOptimalMin ? "text-blue-600" : "text-slate-700"}>
                              {v.fValue} {v.isOptimalMax && "(Max)"} {v.isOptimalMin && "(Min)"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Final Conclusions */}
              {linearProgrammingResult.polygonVertices.length > 0 && (
                <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs space-y-1.5">
                  <div className="font-bold text-emerald-400">Kết luận bài toán tối ưu (Định lý đa giác lồi):</div>
                  <div>• Giá trị lớn nhất: $\max F(x, y) = {linearProgrammingResult.maxVal}$ đạt được tại điểm ${linearProgrammingResult.maxVertex}$.</div>
                  <div>• Giá trị nhỏ nhất: $\min F(x, y) = {linearProgrammingResult.minVal}$ đạt được tại điểm ${linearProgrammingResult.minVertex}$.</div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <InteractivePlot
              title="Miền nghiệm đa giác lồi & Điểm tối ưu F(x, y)"
              subtitle="Vùng xanh lá sáng là miền đa giác nghiệm. Vùng xám là vùng bị gạch bỏ."
              inequalities={systemIneqs}
              feasiblePolygon={linearProgrammingResult.polygonVertices}
              defaultXRange={[-2, 12]}
              defaultYRange={[-2, 10]}
              height={480}
            />
          </div>
        </div>
      )}
    </div>
  );
};
