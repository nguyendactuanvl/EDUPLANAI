import React, { useState, useMemo } from "react";
import { InteractivePlot } from "./InteractivePlot";
import { Geometry3DViewer } from "./Geometry3DViewer";
import { VariationTable, VariationTablePoint, VariationInterval } from "./VariationTable";
import { MarkdownRenderer, MathSpan } from "../MarkdownRenderer";
import { FunctionPlotData, Point2D, AsymptoteLine, Shape3DType } from "./types";
import { Sparkles, Box, Info, CheckCircle2 } from "lucide-react";

export const Grade11Graphing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"exp_log" | "geometry_3d">("exp_log");

  // ==========================================
  // EXPONENTIAL & LOGARITHMIC FUNCTIONS
  // ==========================================
  const [funcType, setFuncType] = useState<"exp" | "log">("exp");
  const [baseA, setBaseA] = useState<number>(2);

  const expLogAnalysis = useMemo(() => {
    const a = baseA <= 0 || baseA === 1 ? 2 : baseA;
    const isIncreasing = a > 1;

    let fnPlot: FunctionPlotData;
    let points: Point2D[] = [];
    let asymptotes: AsymptoteLine[] = [];
    let bbtPoints: VariationTablePoint[] = [];
    let bbtIntervals: VariationInterval[] = [];

    if (funcType === "exp") {
      // y = a^x
      fnPlot = {
        id: "exp",
        fn: (x) => Math.pow(a, x),
        color: "#2563eb",
        width: 2.5
      };

      // Fixed points: (0, 1) and (1, a)
      points = [
        { x: 0, y: 1, label: "A(0; 1)", color: "#dc2626", isDashedToAxes: true },
        { x: 1, y: Number(a.toFixed(2)), label: `B(1; ${Number(a.toFixed(2))})`, color: "#16a34a", isDashedToAxes: true }
      ];

      // Asymptote: Ox (y = 0)
      asymptotes = [
        {
          type: "horizontal",
          value: 0,
          label: "Tiệm cận ngang: y = 0 (trục Ox)",
          color: "#9333ea"
        }
      ];

      // Bảng biến thiên 3 dòng chuẩn cho Hàm Mũ
      if (isIncreasing) {
        bbtPoints = [
          { x: "-\\infty", yVal: "0", yPosition: "bottom" },
          { x: "0", yVal: "1", yPosition: "middle" },
          { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
        ];
        bbtIntervals = [
          { trend: "increasing", sign: "+" },
          { trend: "increasing", sign: "+" }
        ];
      } else {
        bbtPoints = [
          { x: "-\\infty", yVal: "+\\infty", yPosition: "top" },
          { x: "0", yVal: "1", yPosition: "middle" },
          { x: "+\\infty", yVal: "0", yPosition: "bottom" }
        ];
        bbtIntervals = [
          { trend: "decreasing", sign: "-" },
          { trend: "decreasing", sign: "-" }
        ];
      }
    } else {
      // y = log_a(x) (x > 0)
      fnPlot = {
        id: "log",
        fn: (x) => (x > 1e-6 ? Math.log(x) / Math.log(a) : NaN),
        color: "#059669",
        width: 2.5,
        discontinuities: [0]
      };

      // Fixed points: (1, 0) and (a, 1)
      points = [
        { x: 1, y: 0, label: "A(1; 0)", color: "#dc2626", isDashedToAxes: true },
        { x: Number(a.toFixed(2)), y: 1, label: `B(${Number(a.toFixed(2))}; 1)`, color: "#2563eb", isDashedToAxes: true }
      ];

      // Asymptote: Oy (x = 0)
      asymptotes = [
        {
          type: "vertical",
          value: 0,
          label: "Tiệm cận đứng: x = 0 (trục Oy)",
          color: "#9333ea"
        }
      ];

      // Bảng biến thiên 3 dòng chuẩn cho Hàm Logarit
      if (isIncreasing) {
        bbtPoints = [
          { x: "0", isDiscontinuity: true, yRightVal: "-\\infty" },
          { x: "1", yVal: "0", yPosition: "middle" },
          { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
        ];
        bbtIntervals = [
          { trend: "increasing", sign: "+" },
          { trend: "increasing", sign: "+" }
        ];
      } else {
        bbtPoints = [
          { x: "0", isDiscontinuity: true, yRightVal: "+\\infty" },
          { x: "1", yVal: "0", yPosition: "middle" },
          { x: "+\\infty", yVal: "-\\infty", yPosition: "bottom" }
        ];
        bbtIntervals = [
          { trend: "decreasing", sign: "-" },
          { trend: "decreasing", sign: "-" }
        ];
      }
    }

    return {
      a, isIncreasing, fnPlot, points, asymptotes, bbtPoints, bbtIntervals
    };
  }, [funcType, baseA]);

  // Prompt helper for 3D geometry
  const [problemPrompt, setProblemPrompt] = useState<string>("");
  const [suggestedShape, setSuggestedShape] = useState<Shape3DType>("pyramid_quad");

  const handleAnalyzePrompt = () => {
    const text = problemPrompt.toLowerCase();
    if (text.includes("s.abc") || (text.includes("chóp") && text.includes("tam giác"))) {
      if (text.includes("đều")) setSuggestedShape("pyramid_regular_tri");
      else setSuggestedShape("pyramid_triangle");
    } else if (text.includes("s.abcd") || (text.includes("chóp") && text.includes("tứ giác"))) {
      if (text.includes("đều") || text.includes("vuông")) setSuggestedShape("pyramid_regular_quad");
      else setSuggestedShape("pyramid_quad");
    } else if (text.includes("lăng trụ")) {
      setSuggestedShape("prism_triangular");
    } else if (text.includes("hộp") || text.includes("lập phương")) {
      setSuggestedShape("cuboid");
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 text-xs font-semibold gap-1">
        <button
          onClick={() => setActiveTab("exp_log")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === "exp_log"
              ? "bg-white text-blue-800 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MathSpan content="1. Đồ thị hàm Mũ ($y = a^x$) & Logarit ($y = \log_a x$)" />
        </button>
        <button
          onClick={() => setActiveTab("geometry_3d")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === "geometry_3d"
              ? "bg-white text-purple-800 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MathSpan content="2. Công cụ vẽ Hình học không gian (3D)" />
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. ĐỒ THỊ HÀM MŨ VÀ LOGARIT                                         */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "exp_log" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">
                  <MathSpan content="Hàm số Mũ và Logarit (Toán 11)" />
                </h3>
                <p className="text-xs text-slate-500">Khảo sát đạo hàm, tính đơn điệu, BBT 3 dòng và tiệm cận</p>
              </div>

              {/* Function Type Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFuncType("exp")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    funcType === "exp"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <MathSpan content="Hàm Mũ: $y = a^x$" />
                </button>
                <button
                  onClick={() => setFuncType("log")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    funcType === "log"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <MathSpan content="Hàm Logarit: $y = \log_a x$" />
                </button>
              </div>

              {/* Base Input a */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  <MathSpan content="Cơ số $a$ ($a > 0, a \ne 1$)" />
                </label>
                <input
                  type="number"
                  step="any"
                  min={0.01}
                  value={baseA}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0 && val !== 1) {
                      setBaseA(val);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Quick Presets for base a */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Cơ số thông dụng:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { a: 2, label: "a = 2" },
                    { a: 3, label: "a = 3" },
                    { a: 0.5, label: "a = 1/2 (0.5)" },
                    { a: 2.718, label: "a = e (2.718)" },
                    { a: 10, label: "a = 10 (lg)" }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setBaseA(preset.a)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <MathSpan content={`$${preset.label}$`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Chi tiết tính đạo hàm y' (Render bằng KaTeX) */}
              <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-100 space-y-2 text-xs text-slate-700">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Bước tính đạo hàm $y'$ chi tiết:</span>
                </div>

                {funcType === "exp" ? (
                  <div className="space-y-1.5">
                    <MarkdownRenderer
                      content={`- **Công thức đạo hàm:**
  $$y' = (a^x)' = a^x \\ln a$$
- **Xét dấu đạo hàm:**
  Vì $a^x > 0, \\forall x \\in \\mathbb{R}$, nên dấu của $y'$ phụ thuộc vào $\\ln a$:
  ${expLogAnalysis.isIncreasing 
    ? `Do $a = ${expLogAnalysis.a} > 1 \\implies \\ln a > 0 \\implies y' > 0, \\forall x \\in \\mathbb{R}$. Hàm số **đồng biến** trên $\\mathbb{R}$.`
    : `Do $0 < a = ${expLogAnalysis.a} < 1 \\implies \\ln a < 0 \\implies y' < 0, \\forall x \\in \\mathbb{R}$. Hàm số **nghịch biến** trên $\\mathbb{R}$.`
  }`}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <MarkdownRenderer
                      content={`- **Công thức đạo hàm:**
  $$y' = (\\log_a x)' = \\frac{1}{x \\ln a}, \\quad \\forall x \\in (0; +\\infty)$$
- **Xét dấu đạo hàm:**
  Với mọi $x > 0$, dấu của $y'$ phụ thuộc hoàn toàn vào $\\ln a$:
  ${expLogAnalysis.isIncreasing 
    ? `Do $a = ${expLogAnalysis.a} > 1 \\implies \\ln a > 0 \\implies y' > 0, \\forall x > 0$. Hàm số **đồng biến** trên $(0; +\\infty)$.`
    : `Do $0 < a = ${expLogAnalysis.a} < 1 \\implies \\ln a < 0 \\implies y' < 0, \\forall x > 0$. Hàm số **nghịch biến** trên $(0; +\\infty)$.`
  }`}
                    />
                  </div>
                )}
              </div>

              {/* Bảng biến thiên 3 dòng chuẩn cho Lớp 11 */}
              <VariationTable
                title={funcType === "exp" ? "Bảng biến thiên hàm Mũ (Toán 11)" : "Bảng biến thiên hàm Logarit (Toán 11)"}
                points={expLogAnalysis.bbtPoints}
                intervals={expLogAnalysis.bbtIntervals}
                showDerivative={true}
              />

              {/* Properties & pedagogical conclusion */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Đặc trưng toán học (SGK Toán 11):</span>
                </div>

                {funcType === "exp" ? (
                  <div className="space-y-1">
                    <div>
                      <MarkdownRenderer inline content="• **Tập xác định:** $D = \mathbb{R}$." />
                    </div>
                    <div>
                      <MarkdownRenderer inline content="• **Tập giá trị:** $T = (0; +\infty)$ (đồ thị luôn nằm hoàn toàn phía trên trục hoành $Ox$)." />
                    </div>
                    <div>
                      <MarkdownRenderer
                        inline
                        content={expLogAnalysis.isIncreasing 
                          ? `• **Tính đơn điệu:** Do $a = ${expLogAnalysis.a} > 1$ nên hàm số đồng biến trên $\\mathbb{R}$.`
                          : `• **Tính đơn điệu:** Do $0 < a = ${expLogAnalysis.a} < 1$ nên hàm số nghịch biến trên $\\mathbb{R}$.`
                        }
                      />
                    </div>
                    <div>
                      <MarkdownRenderer inline content="• **Đường tiệm cận:** Tiệm cận ngang là trục hoành $Ox$ ($y = 0$)." />
                    </div>
                    <div>
                      <MarkdownRenderer inline content={`• **Điểm cố định:** Luôn đi qua điểm $(0; 1)$ và điểm $(1; ${expLogAnalysis.a})$.`} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div>
                      <MarkdownRenderer inline content="• **Tập xác định:** $D = (0; +\infty)$ (đồ thị luôn nằm ở nửa bên phải trục tung $Oy$)." />
                    </div>
                    <div>
                      <MarkdownRenderer inline content="• **Tập giá trị:** $T = \mathbb{R}$." />
                    </div>
                    <div>
                      <MarkdownRenderer
                        inline
                        content={expLogAnalysis.isIncreasing 
                          ? `• **Tính đơn điệu:** Do $a = ${expLogAnalysis.a} > 1$ nên hàm số đồng biến trên $(0; +\\infty)$.`
                          : `• **Tính đơn điệu:** Do $0 < a = ${expLogAnalysis.a} < 1$ nên hàm số nghịch biến trên $(0; +\\infty)$.`
                        }
                      />
                    </div>
                    <div>
                      <MarkdownRenderer inline content="• **Đường tiệm cận:** Tiệm cận đứng là trục tung $Oy$ ($x = 0$)." />
                    </div>
                    <div>
                      <MarkdownRenderer inline content={`• **Điểm cố định:** Luôn đi qua điểm $(1; 0)$ và điểm $(${expLogAnalysis.a}; 1)$.`} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <InteractivePlot
              title={funcType === "exp" ? `Đồ thị hàm số mũ: y = ${expLogAnalysis.a}^x` : `Đồ thị hàm số logarit: y = log_${expLogAnalysis.a}(x)`}
              subtitle="Đường tiệm cận nét đứt và các điểm cố định đặc trưng"
              functions={[expLogAnalysis.fnPlot]}
              points={expLogAnalysis.points}
              asymptotes={expLogAnalysis.asymptotes}
              defaultXRange={funcType === "exp" ? [-4, 4] : [-1, 7]}
              defaultYRange={funcType === "exp" ? [-1, 7] : [-4, 4]}
              height={460}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. CÔNG CỤ VẼ HÌNH HỌC KHÔNG GIAN (3D)                             */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "geometry_3d" && (
        <div className="space-y-6">
          {/* Smart prompt analyzer */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gợi ý mô hình từ mô tả đề bài:
              </label>
              <input
                type="text"
                value={problemPrompt}
                onChange={e => setProblemPrompt(e.target.value)}
                placeholder="Ví dụ: Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none"
              />
            </div>
            <button
              onClick={handleAnalyzePrompt}
              className="w-full sm:w-auto px-4 py-2 mt-auto bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Nhận diện hình
            </button>
          </div>

          <Geometry3DViewer initialShape={suggestedShape} />
        </div>
      )}
    </div>
  );
};
