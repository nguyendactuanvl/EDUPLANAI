import React, { useState, useMemo } from "react";
import { InteractivePlot } from "./InteractivePlot";
import { VariationTable, VariationTablePoint, VariationInterval } from "./VariationTable";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { FunctionPlotData, Point2D, AsymptoteLine } from "./types";
import { Sparkles, BookOpen, Copy, Check, Info } from "lucide-react";

export const Grade12Graphing: React.FC = () => {
  const [funcType, setFuncType] = useState<"cubic" | "rational1_1" | "rational2_1">("cubic");

  // 1. Hàm bậc 3: y = ax^3 + bx^2 + cx + d
  const [c3A, setC3A] = useState<number>(1);
  const [c3B, setC3B] = useState<number>(-3);
  const [c3C, setC3C] = useState<number>(0);
  const [c3D, setC3D] = useState<number>(2);

  // 2. Hàm bậc 1/1: y = (ax + b)/(cx + d)
  const [r1A, setR1A] = useState<number>(2);
  const [r1B, setR1B] = useState<number>(-1);
  const [r1C, setR1C] = useState<number>(1);
  const [r1D, setR1D] = useState<number>(1);

  // 3. Hàm bậc 2/1: y = (ax^2 + bx + c)/(dx + e)
  const [r2A, setR2A] = useState<number>(1);
  const [r2B, setR2B] = useState<number>(1);
  const [r2C, setR2C] = useState<number>(-2);
  const [r2D, setR2D] = useState<number>(1);
  const [r2E, setR2E] = useState<number>(-1);

  const [copiedKSHS, setCopiedKSHS] = useState<boolean>(false);

  // ==========================================
  // ANALYSIS: HÀM BẬC BA
  // ==========================================
  const cubicAnalysis = useMemo(() => {
    const a = c3A === 0 ? 1 : c3A;
    const b = c3B;
    const c = c3C;
    const d = c3D;

    // y' = 3ax^2 + 2bx + c
    const aPrime = 3 * a;
    const bPrime = 2 * b;
    const cPrime = c;
    const deltaPrime = bPrime * bPrime - 4 * aPrime * cPrime;

    // Tâm đối xứng (Điểm uốn): y'' = 6ax + 2b = 0 => x = -b / (3a)
    const xInflection = -b / (3 * a);
    const yInflection = a * Math.pow(xInflection, 3) + b * Math.pow(xInflection, 2) + c * xInflection + d;

    let roots: number[] = [];
    if (deltaPrime > 1e-6) {
      const r1 = (-bPrime - Math.sqrt(deltaPrime)) / (2 * aPrime);
      const r2 = (-bPrime + Math.sqrt(deltaPrime)) / (2 * aPrime);
      roots = [Math.min(r1, r2), Math.max(r1, r2)];
    }

    const points: Point2D[] = [
      {
        x: Number(xInflection.toFixed(2)),
        y: Number(yInflection.toFixed(2)),
        label: `Tâm ĐX I(${Number(xInflection.toFixed(2))}; ${Number(yInflection.toFixed(2))})`,
        color: "#9333ea",
        isDashedToAxes: true
      },
      {
        x: 0,
        y: d,
        label: `Oy(0; ${d})`,
        color: "#2563eb",
        isDashedToAxes: true
      }
    ];

    let extremaMarkdown = "";
    let bbtPoints: VariationTablePoint[] = [];
    let bbtIntervals: VariationInterval[] = [];

    if (roots.length === 2) {
      const [x1, x2] = roots;
      const y1 = a * Math.pow(x1, 3) + b * Math.pow(x1, 2) + c * x1 + d;
      const y2 = a * Math.pow(x2, 3) + b * Math.pow(x2, 2) + c * x2 + d;

      const isFirstMax = a > 0;
      points.push(
        {
          x: Number(x1.toFixed(2)),
          y: Number(y1.toFixed(2)),
          label: isFirstMax ? `CĐ(${Number(x1.toFixed(2))}; ${Number(y1.toFixed(2))})` : `CT(${Number(x1.toFixed(2))}; ${Number(y1.toFixed(2))})`,
          color: isFirstMax ? "#ea580c" : "#0284c7",
          isDashedToAxes: true
        },
        {
          x: Number(x2.toFixed(2)),
          y: Number(y2.toFixed(2)),
          label: isFirstMax ? `CT(${Number(x2.toFixed(2))}; ${Number(y2.toFixed(2))})` : `CĐ(${Number(x2.toFixed(2))}; ${Number(y2.toFixed(2))})`,
          color: isFirstMax ? "#0284c7" : "#ea580c",
          isDashedToAxes: true
        }
      );

      extremaMarkdown = `Hàm số có 2 điểm cực trị:
- ${isFirstMax ? "Điểm cực đại" : "Điểm cực tiểu"}: $x = ${Number(x1.toFixed(2))}$, giá trị cực trị $y = ${Number(y1.toFixed(2))}$.
- ${isFirstMax ? "Điểm cực tiểu" : "Điểm cực đại"}: $x = ${Number(x2.toFixed(2))}$, giá trị cực trị $y = ${Number(y2.toFixed(2))}$.`;

      if (a > 0) {
        bbtPoints = [
          { x: "-\\infty", yVal: "-\\infty", yPosition: "bottom" },
          { x: Number(x1.toFixed(2)).toString(), yPrime: "0", yVal: Number(y1.toFixed(2)).toString(), yPosition: "top" },
          { x: Number(x2.toFixed(2)).toString(), yPrime: "0", yVal: Number(y2.toFixed(2)).toString(), yPosition: "bottom" },
          { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
        ];
        bbtIntervals = [
          { trend: "increasing", fromVal: "-\\infty", toVal: Number(y1.toFixed(2)).toString(), sign: "+" },
          { trend: "decreasing", fromVal: Number(y1.toFixed(2)).toString(), toVal: Number(y2.toFixed(2)).toString(), sign: "-" },
          { trend: "increasing", fromVal: Number(y2.toFixed(2)).toString(), toVal: "+\\infty", sign: "+" }
        ];
      } else {
        bbtPoints = [
          { x: "-\\infty", yVal: "+\\infty", yPosition: "top" },
          { x: Number(x1.toFixed(2)).toString(), yPrime: "0", yVal: Number(y1.toFixed(2)).toString(), yPosition: "bottom" },
          { x: Number(x2.toFixed(2)).toString(), yPrime: "0", yVal: Number(y2.toFixed(2)).toString(), yPosition: "top" },
          { x: "+\\infty", yVal: "-\\infty", yPosition: "bottom" }
        ];
        bbtIntervals = [
          { trend: "decreasing", fromVal: "+\\infty", toVal: Number(y1.toFixed(2)).toString(), sign: "-" },
          { trend: "increasing", fromVal: Number(y1.toFixed(2)).toString(), toVal: Number(y2.toFixed(2)).toString(), sign: "+" },
          { trend: "decreasing", fromVal: Number(y2.toFixed(2)).toString(), toVal: "-\\infty", sign: "-" }
        ];
      }
    } else {
      extremaMarkdown = `Phương trình $y' = 0$ có $\\Delta' \\le 0$ nên hàm số không có cực trị (đơn điệu trên $\\mathbb{R}$).`;
      bbtPoints = a > 0 ? [
        { x: "-\\infty", yVal: "-\\infty", yPosition: "bottom" },
        { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
      ] : [
        { x: "-\\infty", yVal: "+\\infty", yPosition: "top" },
        { x: "+\\infty", yVal: "-\\infty", yPosition: "bottom" }
      ];
      bbtIntervals = [
        { trend: a > 0 ? "increasing" : "decreasing", fromVal: a > 0 ? "-\\infty" : "+\\infty", toVal: a > 0 ? "+\\infty" : "-\\infty", sign: a > 0 ? "+" : "-" }
      ];
    }

    const fnPlot: FunctionPlotData = {
      id: "cubic",
      fn: (x) => a * Math.pow(x, 3) + b * Math.pow(x, 2) + c * x + d,
      color: "#2563eb",
      width: 2.5
    };

    return {
      a, b, c, d, aPrime, bPrime, cPrime, deltaPrime, roots,
      xInflection, yInflection, points, fnPlot, extremaMarkdown,
      bbtPoints, bbtIntervals
    };
  }, [c3A, c3B, c3C, c3D]);

  // ==========================================
  // ANALYSIS: HÀM PHÂN THỨC BẬC NHẤT / BẬC NHẤT
  // ==========================================
  const rational1Analysis = useMemo(() => {
    const a = r1A;
    const b = r1B;
    const c = r1C === 0 ? 1 : r1C;
    const d = r1D;

    // ad - bc
    const adMinusBc = a * d - b * c;
    const xAsymptote = -d / c;
    const yAsymptote = a / c;

    const asymptotes: AsymptoteLine[] = [
      {
        type: "vertical",
        value: xAsymptote,
        label: `TCĐ: x = ${Number(xAsymptote.toFixed(2))}`,
        color: "#dc2626"
      },
      {
        type: "horizontal",
        value: yAsymptote,
        label: `TCN: y = ${Number(yAsymptote.toFixed(2))}`,
        color: "#2563eb"
      }
    ];

    const points: Point2D[] = [
      {
        x: Number(xAsymptote.toFixed(2)),
        y: Number(yAsymptote.toFixed(2)),
        label: `Tâm ĐX I(${Number(xAsymptote.toFixed(2))}; ${Number(yAsymptote.toFixed(2))})`,
        color: "#9333ea",
        isDashedToAxes: true
      }
    ];

    // Oy intercept: x = 0
    if (d !== 0) {
      points.push({
        x: 0,
        y: Number((b / d).toFixed(2)),
        label: `Oy(0; ${Number((b / d).toFixed(2))})`,
        color: "#16a34a",
        isDashedToAxes: true
      });
    }

    // Ox intercept: y = 0 => x = -b/a
    if (a !== 0) {
      points.push({
        x: Number((-b / a).toFixed(2)),
        y: 0,
        label: `Ox(${Number((-b / a).toFixed(2))}; 0)`,
        color: "#16a34a",
        isDashedToAxes: true
      });
    }

    const fnPlot: FunctionPlotData = {
      id: "rational1",
      fn: (x) => (a * x + b) / (c * x + d),
      color: "#2563eb",
      width: 2.5,
      discontinuities: [xAsymptote]
    };

    // BBT
    const isIncreasing = adMinusBc > 0;
    const bbtPoints: VariationTablePoint[] = [
      { x: "-\\infty", yVal: Number(yAsymptote.toFixed(2)).toString() },
      {
        x: Number(xAsymptote.toFixed(2)).toString(),
        isDiscontinuity: true,
        yLeftVal: isIncreasing ? "+\\infty" : "-\\infty",
        yRightVal: isIncreasing ? "-\\infty" : "+\\infty"
      },
      { x: "+\\infty", yVal: Number(yAsymptote.toFixed(2)).toString() }
    ];

    const bbtIntervals: VariationInterval[] = [
      {
        trend: isIncreasing ? "increasing" : "decreasing",
        fromVal: Number(yAsymptote.toFixed(2)).toString(),
        toVal: isIncreasing ? "+\\infty" : "-\\infty",
        sign: isIncreasing ? "+" : "-"
      },
      {
        trend: isIncreasing ? "increasing" : "decreasing",
        fromVal: isIncreasing ? "-\\infty" : "+\\infty",
        toVal: Number(yAsymptote.toFixed(2)).toString(),
        sign: isIncreasing ? "+" : "-"
      }
    ];

    return {
      a, b, c, d, adMinusBc, xAsymptote, yAsymptote,
      asymptotes, points, fnPlot, bbtPoints, bbtIntervals
    };
  }, [r1A, r1B, r1C, r1D]);

  // ==========================================
  // ANALYSIS: HÀM PHÂN THỨC BẬC HAI / BẬC NHẤT
  // ==========================================
  const rational2Analysis = useMemo(() => {
    const a = r2A === 0 ? 1 : r2A;
    const b = r2B;
    const c = r2C;
    const d = r2D === 0 ? 1 : r2D;
    const e = r2E;

    // Polynomial division: (ax^2 + bx + c) : (dx + e)
    // Quotient: mx + n, Remainder: r
    const m = a / d;
    const n = (b - m * e) / d;
    const r = c - n * e;

    const xAsymptote = -e / d;

    const asymptotes: AsymptoteLine[] = [
      {
        type: "vertical",
        value: xAsymptote,
        label: `TCĐ: x = ${Number(xAsymptote.toFixed(2))}`,
        color: "#dc2626"
      },
      {
        type: "slant",
        m: m,
        c: n,
        label: `TCX: y = ${Number(m.toFixed(2))}x ${n >= 0 ? "+ " + Number(n.toFixed(2)) : "- " + Math.abs(Number(n.toFixed(2)))}`,
        color: "#9333ea"
      }
    ];

    // Intersection of asymptotes (Symmetry center)
    const yCenter = m * xAsymptote + n;
    const points: Point2D[] = [
      {
        x: Number(xAsymptote.toFixed(2)),
        y: Number(yCenter.toFixed(2)),
        label: `Tâm ĐX I(${Number(xAsymptote.toFixed(2))}; ${Number(yCenter.toFixed(2))})`,
        color: "#9333ea",
        isDashedToAxes: true
      }
    ];

    // y' = m - r / (dx + e)^2 = 0 => (dx+e)^2 = r / m
    let roots: number[] = [];
    if (r / m > 1e-6) {
      const sqrtVal = Math.sqrt(r / m);
      const root1 = (-e - sqrtVal) / d;
      const root2 = (-e + sqrtVal) / d;
      roots = [Math.min(root1, root2), Math.max(root1, root2)];

      const y1 = (a * root1 * root1 + b * root1 + c) / (d * root1 + e);
      const y2 = (a * root2 * root2 + b * root2 + c) / (d * root2 + e);

      points.push(
        { x: Number(root1.toFixed(2)), y: Number(y1.toFixed(2)), label: `CĐ/CT(${Number(root1.toFixed(2))}; ${Number(y1.toFixed(2))})`, color: "#ea580c", isDashedToAxes: true },
        { x: Number(root2.toFixed(2)), y: Number(y2.toFixed(2)), label: `CĐ/CT(${Number(root2.toFixed(2))}; ${Number(y2.toFixed(2))})`, color: "#0284c7", isDashedToAxes: true }
      );
    }

    const fnPlot: FunctionPlotData = {
      id: "rational2",
      fn: (x) => (a * x * x + b * x + c) / (d * x + e),
      color: "#2563eb",
      width: 2.5,
      discontinuities: [xAsymptote]
    };

    // BBT
    const bbtPoints: VariationTablePoint[] = [
      { x: "-\\infty", yVal: "-\\infty", yPosition: "bottom" },
      {
        x: Number(xAsymptote.toFixed(2)).toString(),
        isDiscontinuity: true,
        yLeftVal: "-\\infty",
        yRightVal: "+\\infty"
      },
      { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
    ];

    const bbtIntervals: VariationInterval[] = [
      { trend: "increasing", fromVal: "-\\infty", toVal: "-\\infty", sign: "+" },
      { trend: "increasing", fromVal: "+\\infty", toVal: "+\\infty", sign: "+" }
    ];

    return {
      a, b, c, d, e, m, n, r, xAsymptote, yCenter,
      asymptotes, points, fnPlot, bbtPoints, bbtIntervals, roots
    };
  }, [r2A, r2B, r2C, r2D, r2E]);

  // Generate full markdown investigation report (Sơ đồ KSHS chuẩn SGK)
  const fullReportMarkdown = useMemo(() => {
    if (funcType === "cubic") {
      const { a, b, c, d, aPrime, bPrime, cPrime, roots, xInflection, yInflection, extremaMarkdown } = cubicAnalysis;
      return `### SƠ ĐỒ KHẢO SÁT HÀM SỐ BẬC BA: $y = ${a}x^3 ${b >= 0 ? "+ " + b : "- " + Math.abs(b)}x^2 ${c >= 0 ? "+ " + c : "- " + Math.abs(c)}x ${d >= 0 ? "+ " + d : "- " + Math.abs(d)}$

#### 1. Tập xác định:
$D = \\mathbb{R}$.

#### 2. Sự biến thiên:
- **Đạo hàm:**
  $$y' = ${aPrime}x^2 ${bPrime >= 0 ? "+ " + bPrime : "- " + Math.abs(bPrime)}x ${cPrime >= 0 ? "+ " + cPrime : "- " + Math.abs(cPrime)}$$
- **Nghiệm đạo hàm & Cực trị:**
  ${roots.length === 2 ? `$$y' = 0 \\iff \\left[\\begin{array}{l} x = ${Number(roots[0].toFixed(2))} \\\\ x = ${Number(roots[1].toFixed(2))} \\end{array}\\right.$$` : `$$y' = 0 \\text{ vô nghiệm hoặc có nghiệm kép}$$`}
  ${extremaMarkdown}
- **Giới hạn tại vô cực:**
  $$\\lim_{x \\to +\\infty} y = ${a > 0 ? "+\\infty" : "-\\infty"}, \\quad \\lim_{x \\to -\\infty} y = ${a > 0 ? "-\\infty" : "+\\infty"}$$

#### 3. Đồ thị:
- **Tâm đối xứng (Điểm uốn):** $I(${Number(xInflection.toFixed(2))}; ${Number(yInflection.toFixed(2))})$.
- **Giao điểm với trục tung:** Cho $x = 0 \\implies y = ${d}$, điểm $(0; ${d})$.
- Đồ thị nhận điểm uốn $I$ làm tâm đối xứng.`;
    } else if (funcType === "rational1_1") {
      const { a, b, c, d, adMinusBc, xAsymptote, yAsymptote } = rational1Analysis;
      return `### SƠ ĐỒ KHẢO SÁT HÀM SỐ PHÂN THỨC: $y = \\frac{${a}x ${b >= 0 ? "+ " + b : "- " + Math.abs(b)}}{${c}x ${d >= 0 ? "+ " + d : "- " + Math.abs(d)}}$

#### 1. Tập xác định:
$D = \\mathbb{R} \\setminus \\{${Number(xAsymptote.toFixed(2))}\\}$.

#### 2. Sự biến thiên:
- **Đạo hàm:**
  $$y' = \\frac{ad - bc}{(${c}x ${d >= 0 ? "+ " + d : "- " + Math.abs(d)})^2} = \\frac{${adMinusBc}}{(${c}x ${d >= 0 ? "+ " + d : "- " + Math.abs(d)})^2}$$
  ${adMinusBc > 0 ? `Vì $y' > 0, \\forall x \\ne ${Number(xAsymptote.toFixed(2))}$ nên hàm số đồng biến trên từng khoảng xác định $(-\\infty; ${Number(xAsymptote.toFixed(2))})$ và $(${Number(xAsymptote.toFixed(2))}; +\\infty)$.` : `Vì $y' < 0, \\forall x \\ne ${Number(xAsymptote.toFixed(2))}$ nên hàm số nghịch biến trên từng khoảng xác định $(-\\infty; ${Number(xAsymptote.toFixed(2))})$ và $(${Number(xAsymptote.toFixed(2))}; +\\infty)$.`}
- **Cực trị:** Hàm số không có cực trị.
- **Giới hạn và Tiệm cận:**
  - $\\lim_{x \\to (${Number(xAsymptote.toFixed(2))})^-} y = ${adMinusBc > 0 ? "+\\infty" : "-\\infty"}$, $\\lim_{x \\to (${Number(xAsymptote.toFixed(2))})^+} y = ${adMinusBc > 0 ? "-\\infty" : "+\\infty"}$ $\\implies$ Đường thẳng $x = ${Number(xAsymptote.toFixed(2))}$ là **tiệm cận đứng**.
  - $\\lim_{x \\to \\pm\\infty} y = \\frac{a}{c} = ${Number(yAsymptote.toFixed(2))}$ $\\implies$ Đường thẳng $y = ${Number(yAsymptote.toFixed(2))}$ là **tiệm cận ngang**.

#### 3. Đồ thị:
- **Tâm đối xứng:** Đồ thị nhận giao điểm hai đường tiệm cận $I(${Number(xAsymptote.toFixed(2))}; ${Number(yAsymptote.toFixed(2))})$ làm tâm đối xứng.
- **Giao điểm với trục tọa độ:**
  - Với $Oy$: Cho $x = 0 \\implies y = ${d !== 0 ? Number((b / d).toFixed(2)) : "không xác định"}$.
  - Với $Ox$: Cho $y = 0 \\implies x = ${a !== 0 ? Number((-b / a).toFixed(2)) : "vô nghiệm"}$.`;
    } else {
      const { a, b, c, d, e, m, n, r, xAsymptote, yCenter } = rational2Analysis;
      return `### SƠ ĐỒ KHẢO SÁT HÀM SỐ: $y = \\frac{${a}x^2 ${b >= 0 ? "+ " + b : "- " + Math.abs(b)}x ${c >= 0 ? "+ " + c : "- " + Math.abs(c)}}{${d}x ${e >= 0 ? "+ " + e : "- " + Math.abs(e)}}$

#### 1. Tập xác định:
$D = \\mathbb{R} \\setminus \\{${Number(xAsymptote.toFixed(2))}\\}$.

#### 2. Dạng phân tích (Chia đa thức):
Thực hiện phép chia tử số cho mẫu số ta được:
$$y = (${Number(m.toFixed(2))}x ${n >= 0 ? "+ " + Number(n.toFixed(2)) : "- " + Math.abs(Number(n.toFixed(2)))}) + \\frac{${Number(r.toFixed(2))}}{${d}x ${e >= 0 ? "+ " + e : "- " + Math.abs(e)}}$$

#### 3. Sự biến thiên & Tiệm cận:
- **Đường tiệm cận đứng:**
  $$\\lim_{x \\to (${Number(xAsymptote.toFixed(2))})^\\pm} y = \\pm\\infty \\implies x = ${Number(xAsymptote.toFixed(2))}$$
- **Đường tiệm cận xiên:**
  $$\\lim_{x \\to \\pm\\infty} [y - (${Number(m.toFixed(2))}x ${n >= 0 ? "+ " + Number(n.toFixed(2)) : "- " + Math.abs(Number(n.toFixed(2)))})] = \\lim_{x \\to \\pm\\infty} \\frac{${Number(r.toFixed(2))}}{${d}x ${e >= 0 ? "+ " + e : "- " + Math.abs(e)}} = 0$$
  $$\\implies y = ${Number(m.toFixed(2))}x ${n >= 0 ? "+ " + Number(n.toFixed(2)) : "- " + Math.abs(Number(n.toFixed(2)))}$$
- **Tâm đối xứng:**
  Giao điểm hai đường tiệm cận $I(${Number(xAsymptote.toFixed(2))}; ${Number(yCenter.toFixed(2))})$.`;
    }
  }, [funcType, cubicAnalysis, rational1Analysis, rational2Analysis]);

  // Handle Copy KSHS
  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(fullReportMarkdown);
      setCopiedKSHS(true);
      setTimeout(() => setCopiedKSHS(false), 2200);
    } catch {
      setCopiedKSHS(true);
      setTimeout(() => setCopiedKSHS(false), 2200);
    }
  };

  return (
    <div className="space-y-6">
      {/* Function Type Selector */}
      <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 text-xs font-semibold gap-1">
        <button
          onClick={() => setFuncType("cubic")}
          className={`px-4 py-2 rounded-lg transition-all ${
            funcType === "cubic"
              ? "bg-white text-blue-800 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          1. Hàm bậc ba: $y = ax^3 + bx^2 + cx + d$
        </button>
        <button
          onClick={() => setFuncType("rational1_1")}
          className={`px-4 py-2 rounded-lg transition-all ${
            funcType === "rational1_1"
              ? "bg-white text-indigo-800 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          2. Hàm phân thức bậc nhất/bậc nhất: $y = \frac{"ax + b"}{"cx + d"}$
        </button>
        <button
          onClick={() => setFuncType("rational2_1")}
          className={`px-4 py-2 rounded-lg transition-all ${
            funcType === "rational2_1"
              ? "bg-white text-emerald-800 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          3. Hàm phân thức bậc hai/bậc nhất: $y = \frac{"ax^2 + bx + c"}{"dx + e"}$
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls & Report (Left Column) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {funcType === "cubic" && "Khảo sát hàm số bậc ba"}
                  {funcType === "rational1_1" && "Khảo sát hàm bậc nhất / bậc nhất"}
                  {funcType === "rational2_1" && "Khảo sát hàm bậc hai / bậc nhất"}
                </h3>
                <p className="text-xs text-slate-500">Chuẩn quy cách SGK mới GDPT 2018</p>
              </div>

              {/* Copy full report button */}
              <button
                onClick={handleCopyReport}
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Sao chép toàn bộ bài KSHS (Word/Markdown)"
              >
                {copiedKSHS ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKSHS ? "Đã sao chép!" : "Chép lời giải"}</span>
              </button>
            </div>

            {/* Inputs based on type */}
            {funcType === "cubic" && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hệ số $a$</label>
                    <input
                      type="number"
                      value={c3A}
                      onChange={e => setC3A(parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hệ số $b$</label>
                    <input
                      type="number"
                      value={c3B}
                      onChange={e => setC3B(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hệ số $c$</label>
                    <input
                      type="number"
                      value={c3C}
                      onChange={e => setC3C(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hệ số $d$</label>
                    <input
                      type="number"
                      value={c3D}
                      onChange={e => setC3D(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { a: 1, b: -3, c: 0, d: 2, label: "y = x^3 - 3x + 2" },
                    { a: -1, b: 3, c: 0, d: -1, label: "y = -x^3 + 3x - 1" },
                    { a: 1, b: 0, c: -3, d: 0, label: "y = x^3 - 3x" }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setC3A(p.a); setC3B(p.b); setC3C(p.c); setC3D(p.d); }}
                      className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 rounded text-xs"
                    >
                      ${p.label}$
                    </button>
                  ))}
                </div>

                {/* Variation Table */}
                <VariationTable
                  points={cubicAnalysis.bbtPoints}
                  intervals={cubicAnalysis.bbtIntervals}
                />
              </div>
            )}

            {funcType === "rational1_1" && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hệ số $a$</label>
                    <input
                      type="number"
                      value={r1A}
                      onChange={e => setR1A(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hệ số $b$</label>
                    <input
                      type="number"
                      value={r1B}
                      onChange={e => setR1B(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hệ số $c$</label>
                    <input
                      type="number"
                      value={r1C}
                      onChange={e => setR1C(parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hệ số $d$</label>
                    <input
                      type="number"
                      value={r1D}
                      onChange={e => setR1D(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { a: 2, b: -1, c: 1, d: 1, label: "y = (2x - 1)/(x + 1)" },
                    { a: 1, b: 2, c: 1, d: -1, label: "y = (x + 2)/(x - 1)" },
                    { a: -1, b: 1, c: 1, d: 1, label: "y = (-x + 1)/(x + 1)" }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setR1A(p.a); setR1B(p.b); setR1C(p.c); setR1D(p.d); }}
                      className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 rounded text-xs"
                    >
                      ${p.label}$
                    </button>
                  ))}
                </div>

                <VariationTable
                  points={rational1Analysis.bbtPoints}
                  intervals={rational1Analysis.bbtIntervals}
                />
              </div>
            )}

            {funcType === "rational2_1" && (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-1.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">a (x²)</label>
                    <input
                      type="number"
                      value={r2A}
                      onChange={e => setR2A(parseFloat(e.target.value) || 1)}
                      className="w-full px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">b (x)</label>
                    <input
                      type="number"
                      value={r2B}
                      onChange={e => setR2B(parseFloat(e.target.value) || 0)}
                      className="w-full px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">c (tự do)</label>
                    <input
                      type="number"
                      value={r2C}
                      onChange={e => setR2C(parseFloat(e.target.value) || 0)}
                      className="w-full px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">d (mẫu x)</label>
                    <input
                      type="number"
                      value={r2D}
                      onChange={e => setR2D(parseFloat(e.target.value) || 1)}
                      className="w-full px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">e (mẫu)</label>
                    <input
                      type="number"
                      value={r2E}
                      onChange={e => setR2E(parseFloat(e.target.value) || 0)}
                      className="w-full px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { a: 1, b: 1, c: -2, d: 1, e: -1, label: "(x^2 + x - 2)/(x - 1)" },
                    { a: 1, b: 0, c: 1, d: 1, e: 0, label: "(x^2 + 1)/x" },
                    { a: 1, b: -2, c: 2, d: 1, e: -1, label: "(x^2 - 2x + 2)/(x - 1)" }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setR2A(p.a); setR2B(p.b); setR2C(p.c); setR2D(p.d); setR2E(p.e); }}
                      className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 rounded text-xs"
                    >
                      ${p.label}$
                    </button>
                  ))}
                </div>

                <VariationTable
                  points={rational2Analysis.bbtPoints}
                  intervals={rational2Analysis.bbtIntervals}
                />
              </div>
            )}

            {/* Markdown Report Render */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 max-h-72 overflow-y-auto">
              <MarkdownRenderer content={fullReportMarkdown} />
            </div>
          </div>
        </div>

        {/* Graph View (Right Column) */}
        <div className="lg:col-span-7">
          {funcType === "cubic" && (
            <InteractivePlot
              title={`Đồ thị hàm bậc ba: y = ${c3A}x³ ${c3B >= 0 ? "+ " + c3B : "- " + Math.abs(c3B)}x² ${c3C >= 0 ? "+ " + c3C : "- " + Math.abs(c3C)}x ${c3D >= 0 ? "+ " + c3D : "- " + Math.abs(c3D)}`}
              subtitle="Tâm đối xứng (điểm uốn) và các điểm cực đại / cực tiểu"
              functions={[cubicAnalysis.fnPlot]}
              points={cubicAnalysis.points}
              defaultXRange={[-5, 5]}
              defaultYRange={[-6, 6]}
              height={480}
            />
          )}

          {funcType === "rational1_1" && (
            <InteractivePlot
              title={`Đồ thị hàm số: y = (${r1A}x ${r1B >= 0 ? "+ " + r1B : "- " + Math.abs(r1B)}) / (${r1C}x ${r1D >= 0 ? "+ " + r1D : "- " + Math.abs(r1D)})`}
              subtitle="Tiệm cận đứng (đỏ), tiệm cận ngang (xanh) và tâm đối xứng I"
              functions={[rational1Analysis.fnPlot]}
              points={rational1Analysis.points}
              asymptotes={rational1Analysis.asymptotes}
              defaultXRange={[-7, 7]}
              defaultYRange={[-6, 6]}
              height={480}
            />
          )}

          {funcType === "rational2_1" && (
            <InteractivePlot
              title={`Đồ thị hàm số: y = (${r2A}x² ${r2B >= 0 ? "+ " + r2B : "- " + Math.abs(r2B)}x ${r2C >= 0 ? "+ " + r2C : "- " + Math.abs(r2C)}) / (${r2D}x ${r2E >= 0 ? "+ " + r2E : "- " + Math.abs(r2E)})`}
              subtitle="Tiệm cận đứng, tiệm cận xiên và tâm đối xứng I"
              functions={[rational2Analysis.fnPlot]}
              points={rational2Analysis.points}
              asymptotes={rational2Analysis.asymptotes}
              defaultXRange={[-7, 7]}
              defaultYRange={[-7, 7]}
              height={480}
            />
          )}
        </div>
      </div>
    </div>
  );
};
