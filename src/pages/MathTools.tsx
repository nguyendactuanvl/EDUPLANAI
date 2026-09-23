import React, { useState, useMemo } from "react";
import { 
  Calculator, BarChart3, ArrowUpDown, Plus, Trash2, Copy, Check, FileSpreadsheet, 
  HelpCircle, RefreshCw, Printer, Download, Sparkles, BookOpen, Layers, CheckCircle2, 
  Info, AlertTriangle, Cpu, TrendingUp, SlidersHorizontal, ChevronRight, Compass
} from "lucide-react";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { cn } from "../lib/utils";
import { printElement } from "../lib/print";
import { exportHtmlToWord } from "../lib/exportUtils";
import { GraphingAndAnalysisMain } from "../components/math-tools/GraphingAndAnalysisMain";

// ==========================================
// PRESET EXAMPLES
// ==========================================
const PRESETS_GRADE_10 = [
  {
    name: "Điểm kiểm tra Toán 10 (20 HS)",
    desc: "Mẫu điểm thực tế có tần số và giá trị lặp",
    raw: "7, 8, 9, 6, 8, 7, 10, 8, 9, 7, 8, 6, 5, 8, 9, 7, 8, 10, 9, 8"
  },
  {
    name: "Chiều cao học sinh (cm)",
    desc: "Mẫu liên tục có giá trị biến thiên rộng",
    raw: "155, 160, 162, 158, 165, 170, 168, 172, 165, 163, 167, 159, 162, 175, 164"
  },
  {
    name: "Mẫu có giá trị bất thường (Outliers)",
    desc: "Mẫu thời gian giải bài toán (phút) có giá trị ngoại lai",
    raw: "12, 14, 15, 15, 16, 17, 18, 18, 19, 20, 22, 45, 2"
  }
];

const PRESETS_FREQUENCY_TABLE_10 = [
  {
    name: "Số anh chị em trong gia đình (40 HS)",
    desc: "Bảng tần số phân bố số lượng anh chị em",
    data: [
      { x: 0, n: 5 },
      { x: 1, n: 18 },
      { x: 2, n: 12 },
      { x: 3, n: 4 },
      { x: 4, n: 1 }
    ]
  },
  {
    name: "Điểm kiểm tra 1 tiết Toán (45 HS)",
    desc: "Bảng tần số thang điểm 4 đến 10",
    data: [
      { x: 4, n: 2 },
      { x: 5, n: 5 },
      { x: 6, n: 8 },
      { x: 7, n: 13 },
      { x: 8, n: 10 },
      { x: 9, n: 5 },
      { x: 10, n: 2 }
    ]
  }
];

const PRESETS_GROUPED_11_12 = [
  {
    name: "Thời gian tự học hàng ngày của HS (phút)",
    desc: "Toán 11: Ghép 5 nhóm [20; 40), [40; 60)...",
    min: 20,
    max: 120,
    step: 20,
    frequencies: [5, 12, 18, 10, 5]
  },
  {
    name: "Cân nặng học sinh lớp 12 (kg)",
    desc: "Toán 12: Khảo sát mẫu số liệu ghép nhóm 40 HS",
    min: 40,
    max: 70,
    step: 5,
    frequencies: [3, 8, 15, 9, 4, 1]
  },
  {
    name: "Điểm thi thử THPT Quốc gia (50 thí sinh)",
    desc: "Ghép nhóm điểm từ 4 đến 10 độ rộng 1.0 điểm",
    min: 4,
    max: 10,
    step: 1,
    frequencies: [3, 6, 14, 16, 8, 3]
  }
];

// Helper: Round number nicely
function round(val: number, decimals: number = 2): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

export function MathTools() {
  // Navigation: Sub-system Tab 1: Statistics vs Tab 2: Graphing & Analysis (KSHS)
  const [mainSubsystem, setMainSubsystem] = useState<"statistics" | "graphing">("statistics");

  // Main module view: Grade 10 (Ungrouped) or Grade 11-12 (Grouped)
  const [activeModule, setActiveModule] = useState<"grade10" | "grade11_12">("grade10");

  // Output view tab
  const [activeTab, setActiveTab] = useState<"summary" | "steps" | "casio">("summary");

  // Toast / Copy notification
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Print ref
  const reportRef = React.useRef<HTMLDivElement>(null);

  // ----------------------------------------------------------------
  // STATE: PHÂN HỆ 1 (LỚP 10 - SỐ LIỆU RỜI RẠC)
  // ----------------------------------------------------------------
  const [g10Mode, setG10Mode] = useState<"raw" | "table">("raw");
  const [g10RawInput, setG10RawInput] = useState<string>(
    "7, 8, 9, 6, 8, 7, 10, 8, 9, 7, 8, 6, 5, 8, 9, 7, 8, 10, 9, 8"
  );
  const [g10TableRows, setG10TableRows] = useState<Array<{ id: string; x: number | ""; n: number | "" }>>([
    { id: "1", x: 4, n: 2 },
    { id: "2", x: 5, n: 5 },
    { id: "3", x: 6, n: 8 },
    { id: "4", x: 7, n: 13 },
    { id: "5", x: 8, n: 10 },
    { id: "6", x: 9, n: 5 },
    { id: "7", x: 10, n: 2 }
  ]);
  const [showPasteModalG10, setShowPasteModalG10] = useState(false);
  const [excelPasteTextG10, setExcelPasteTextG10] = useState("");

  // ----------------------------------------------------------------
  // STATE: PHÂN HỆ 2 (LỚP 11-12 - MẪU SỐ LIỆU GHÉP NHÓM)
  // ----------------------------------------------------------------
  const [minVal, setMinVal] = useState<number>(20);
  const [maxVal, setMaxVal] = useState<number>(120);
  const [stepVal, setStepVal] = useState<number>(20);
  const [groupedRows, setGroupedRows] = useState<Array<{
    id: string;
    start: number;
    end: number;
    rep: number; // representative value c_i = (start + end)/2
    freq: number; // m_i
  }>>([
    { id: "g1", start: 20, end: 40, rep: 30, freq: 5 },
    { id: "g2", start: 40, end: 60, rep: 50, freq: 12 },
    { id: "g3", start: 60, end: 80, rep: 70, freq: 18 },
    { id: "g4", start: 80, end: 100, rep: 90, freq: 10 },
    { id: "g5", start: 100, end: 120, rep: 110, freq: 5 }
  ]);
  const [showPasteModalGrouped, setShowPasteModalGrouped] = useState(false);
  const [excelPasteTextGrouped, setExcelPasteTextGrouped] = useState("");

  // Copy helper
  const handleCopy = (text: string, label: string = "Đã sao chép!") => {
    navigator.clipboard.writeText(text);
    setCopyStatus(label);
    setTimeout(() => setCopyStatus(null), 2500);
  };

  // ----------------------------------------------------------------
  // CALCULATIONS: LỚP 10
  // ----------------------------------------------------------------
  const g10Data = useMemo(() => {
    let numbers: number[] = [];
    if (g10Mode === "raw") {
      // Parse raw string
      const tokens = g10RawInput.split(/[\s,;\t\n]+/).filter(Boolean);
      numbers = tokens
        .map(t => parseFloat(t.replace(",", ".")))
        .filter(n => !isNaN(n) && isFinite(n));
    } else {
      // Parse table
      g10TableRows.forEach(row => {
        if (typeof row.x === "number" && typeof row.n === "number" && row.n > 0) {
          for (let i = 0; i < Math.floor(row.n); i++) {
            numbers.push(row.x);
          }
        }
      });
    }

    const n = numbers.length;
    if (n === 0) {
      return {
        valid: false,
        n: 0,
        numbers: [],
        sorted: [],
        mean: 0,
        median: 0,
        q1: 0,
        q2: 0,
        q3: 0,
        deltaQ: 0,
        modes: [],
        range: 0,
        variance: 0,
        stdDev: 0,
        sampleVariance: 0,
        sampleStdDev: 0,
        outliers: [],
        lowerFence: 0,
        upperFence: 0,
        frequencyMap: new Map<number, number>(),
        lowerHalf: [],
        upperHalf: [],
        sum: 0,
        sumSq: 0
      };
    }

    const sorted = [...numbers].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, curr) => acc + curr, 0);
    const sumSq = sorted.reduce((acc, curr) => acc + Math.pow(curr, 2), 0);
    const mean = sum / n;

    // Median (Q2)
    let q2 = 0;
    let lowerHalf: number[] = [];
    let upperHalf: number[] = [];

    if (n % 2 === 1) {
      const mid = Math.floor(n / 2);
      q2 = sorted[mid];
      lowerHalf = sorted.slice(0, mid);
      upperHalf = sorted.slice(mid + 1);
    } else {
      const mid2 = n / 2;
      const mid1 = mid2 - 1;
      q2 = (sorted[mid1] + sorted[mid2]) / 2;
      lowerHalf = sorted.slice(0, mid2);
      upperHalf = sorted.slice(mid2);
    }

    // Helper for median of a subarray
    const getMedian = (arr: number[]) => {
      const len = arr.length;
      if (len === 0) return 0;
      if (len % 2 === 1) {
        return arr[Math.floor(len / 2)];
      } else {
        return (arr[len / 2 - 1] + arr[len / 2]) / 2;
      }
    };

    const q1 = getMedian(lowerHalf);
    const q3 = getMedian(upperHalf);
    const deltaQ = q3 - q1;

    // Outlier fences
    const lowerFence = q1 - 1.5 * deltaQ;
    const upperFence = q3 + 1.5 * deltaQ;
    const outliers = sorted.filter(x => x < lowerFence || x > upperFence);

    // Modes & Frequency
    const freqMap = new Map<number, number>();
    sorted.forEach(val => freqMap.set(val, (freqMap.get(val) || 0) + 1));
    let maxFreq = 0;
    freqMap.forEach(f => {
      if (f > maxFreq) maxFreq = f;
    });

    const modes: number[] = [];
    // If all elements have the same frequency and len > 1, traditionally no mode
    const allSameFreq = Array.from(freqMap.values()).every(v => v === maxFreq);
    if (!allSameFreq || freqMap.size === 1) {
      freqMap.forEach((f, v) => {
        if (f === maxFreq && maxFreq > 1) {
          modes.push(v);
        }
      });
    }

    // Range
    const range = sorted[n - 1] - sorted[0];

    // Variance & StdDev (SGK GDPT 2018: s^2 chia cho n)
    const sumSqDiff = sorted.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0);
    const variance = sumSqDiff / n;
    const stdDev = Math.sqrt(variance);

    // Sample variance (chia cho n-1)
    const sampleVariance = n > 1 ? sumSqDiff / (n - 1) : 0;
    const sampleStdDev = Math.sqrt(sampleVariance);

    return {
      valid: true,
      n,
      numbers,
      sorted,
      sum,
      sumSq,
      mean,
      median: q2,
      lowerHalf,
      upperHalf,
      q1,
      q2,
      q3,
      deltaQ,
      modes,
      range,
      variance,
      stdDev,
      sampleVariance,
      sampleStdDev,
      outliers,
      lowerFence,
      upperFence,
      frequencyMap: freqMap
    };
  }, [g10Mode, g10RawInput, g10TableRows]);

  // Sort raw input button
  const handleSortRawInput = () => {
    if (!g10Data.valid) return;
    setG10RawInput(g10Data.sorted.join(", "));
  };

  // ----------------------------------------------------------------
  // GENERATE INTERVALS (LỚP 11 & 12)
  // ----------------------------------------------------------------
  const handleGenerateIntervals = () => {
    if (minVal >= maxVal || stepVal <= 0) {
      alert("Vui lòng nhập: Giá trị nhỏ nhất < Giá trị lớn nhất và Độ dài nhóm > 0!");
      return;
    }

    const rows: Array<{ id: string; start: number; end: number; rep: number; freq: number }> = [];
    let cur = minVal;
    let idx = 1;

    while (cur < maxVal) {
      const next = round(Math.min(cur + stepVal, maxVal));
      rows.push({
        id: `gen_${idx}_${cur}`,
        start: cur,
        end: next,
        rep: round((cur + next) / 2),
        freq: 0
      });
      cur = next;
      idx++;
    }

    setGroupedRows(rows);
  };

  // ----------------------------------------------------------------
  // CALCULATIONS: LỚP 11 & 12 (SỐ LIỆU GHÉP NHÓM)
  // ----------------------------------------------------------------
  const groupedData = useMemo(() => {
    const validRows = groupedRows.filter(r => r.end > r.start && r.freq >= 0);
    const n = validRows.reduce((acc, r) => acc + (Number(r.freq) || 0), 0);

    if (n === 0 || validRows.length === 0) {
      return {
        valid: false,
        n: 0,
        rows: [],
        mean: 0,
        median: 0,
        q1: 0,
        q2: 0,
        q3: 0,
        deltaQ: 0,
        mode: 0,
        variance: 0,
        stdDev: 0,
        sampleVariance: 0,
        sampleStdDev: 0,
        steps: {} as any
      };
    }

    // Cumulative frequencies
    let cum = 0;
    const enrichedRows = validRows.map((r, i) => {
      const rep = round((r.start + r.end) / 2);
      cum += r.freq;
      return {
        ...r,
        index: i + 1,
        rep,
        h: round(r.end - r.start),
        cumFreq: cum,
        prevCumFreq: cum - r.freq
      };
    });

    // 1. Mean: \overline{x} = \frac{1}{n} \sum m_i c_i
    const sumMC = enrichedRows.reduce((acc, r) => acc + r.freq * r.rep, 0);
    const mean = sumMC / n;

    // 2. Median (M_e = Q_2)
    // Vị trí n/2
    const halfN = n / 2;
    const medianRow = enrichedRows.find(r => r.cumFreq >= halfN) || enrichedRows[enrichedRows.length - 1];
    const median = medianRow.freq > 0
      ? medianRow.start + ((halfN - medianRow.prevCumFreq) / medianRow.freq) * medianRow.h
      : medianRow.start;

    // 3. Q1 (vị trí n/4)
    const quarterN = n / 4;
    const q1Row = enrichedRows.find(r => r.cumFreq >= quarterN) || enrichedRows[0];
    const q1 = q1Row.freq > 0
      ? q1Row.start + ((quarterN - q1Row.prevCumFreq) / q1Row.freq) * q1Row.h
      : q1Row.start;

    // 4. Q3 (vị trí 3n/4)
    const threeQuarterN = (3 * n) / 4;
    const q3Row = enrichedRows.find(r => r.cumFreq >= threeQuarterN) || enrichedRows[enrichedRows.length - 1];
    const q3 = q3Row.freq > 0
      ? q3Row.start + ((threeQuarterN - q3Row.prevCumFreq) / q3Row.freq) * q3Row.h
      : q3Row.start;

    const deltaQ = q3 - q1;

    // 5. Mode (M_o)
    let maxFreq = -1;
    let modeRowIdx = 0;
    enrichedRows.forEach((r, idx) => {
      if (r.freq > maxFreq) {
        maxFreq = r.freq;
        modeRowIdx = idx;
      }
    });

    const mRow = enrichedRows[modeRowIdx];
    const mPrev = modeRowIdx > 0 ? enrichedRows[modeRowIdx - 1].freq : 0;
    const mNext = modeRowIdx < enrichedRows.length - 1 ? enrichedRows[modeRowIdx + 1].freq : 0;
    const denomMode = (mRow.freq - mPrev) + (mRow.freq - mNext);
    const mode = denomMode > 0
      ? mRow.start + ((mRow.freq - mPrev) / denomMode) * mRow.h
      : mRow.start;

    // 6. Variance & StdDev: s^2 = \frac{1}{n} \sum m_i c_i^2 - (\overline{x})^2
    const sumMC2 = enrichedRows.reduce((acc, r) => acc + r.freq * Math.pow(r.rep, 2), 0);
    const variance = (sumMC2 / n) - Math.pow(mean, 2);
    const stdDev = Math.sqrt(Math.max(0, variance));

    const sampleVariance = n > 1 ? (n / (n - 1)) * Math.max(0, variance) : 0;
    const sampleStdDev = Math.sqrt(sampleVariance);

    return {
      valid: true,
      n,
      rows: enrichedRows,
      mean,
      median,
      q1,
      q2: median,
      q3,
      deltaQ,
      mode,
      variance: Math.max(0, variance),
      stdDev,
      sampleVariance,
      sampleStdDev,
      steps: {
        sumMC,
        sumMC2,
        halfN,
        quarterN,
        threeQuarterN,
        medianRow,
        q1Row,
        q3Row,
        modeRow: mRow,
        mPrev,
        mNext,
        denomMode
      }
    };
  }, [groupedRows]);

  // ----------------------------------------------------------------
  // GENERATE MARKDOWN / LATEX DETAILED STEPS
  // ----------------------------------------------------------------
  const g10DetailedStepsMarkdown = useMemo(() => {
    if (!g10Data.valid) {
      return "⚠️ **Chưa có dữ liệu hợp lệ để giải chi tiết.** Vui lòng nhập dãy số liệu hoặc bảng tần số.";
    }

    const {
      n, sorted, sum, sumSq, mean, median, lowerHalf, upperHalf, q1, q2, q3, deltaQ, modes, range,
      variance, stdDev, sampleVariance, sampleStdDev, outliers, lowerFence, upperFence
    } = g10Data;

    const sortedLeStr = sorted.join(" \\le ");
    const sumDetailStr = n <= 10 
      ? sorted.join(" + ") 
      : `${sorted.slice(0, 4).join(" + ")} + \\dots + ${sorted.slice(-3).join(" + ")}`;

    const medianStepDetail = n % 2 === 1
      ? `Vì cỡ mẫu $n = ${n}$ là số lẻ, trung vị là giá trị chính giữa ở vị trí thứ $\\frac{n+1}{2} = \\frac{${n}+1}{2} = ${Math.floor(n / 2) + 1}$:
$$M_e = x_{\\frac{n+1}{2}} = x_{${Math.floor(n / 2) + 1}} = ${round(median, 2)}$$`
      : `Vì cỡ mẫu $n = ${n}$ là số chẵn, trung vị là trung bình cộng của 2 giá trị chính giữa ở vị trí $\\frac{n}{2} = ${n / 2}$ và $\\frac{n}{2}+1 = ${n / 2 + 1}$:
$$M_e = \\frac{x_{\\frac{n}{2}} + x_{\\frac{n}{2}+1}}{2} = \\frac{x_{${n / 2}} + x_{${n / 2 + 1}}}{2} = \\frac{${sorted[n / 2 - 1]} + ${sorted[n / 2]}}{2} = ${round(median, 2)}$$`;

    const modeExplanation = modes.length > 0
      ? `Giá trị có số lần lặp lại nhiều nhất trong mẫu là $M_o = \\{${modes.join(", ")}\\}$ với tần số $n_{max} = ${g10Data.frequencyMap.get(modes[0])}$ lần.`
      : "Mẫu số liệu không có mốt ($M_o$) do các giá trị đều có tần số xuất hiện bằng nhau.";

    const outlierExplanation = outliers.length > 0
      ? `Có **${outliers.length}** giá trị bất thường nằm ngoài đoạn $[${round(lowerFence, 2)}; ${round(upperFence, 2)}]$ là: $${outliers.join(", ")}$.`
      : `Không có giá trị bất thường (tất cả các phần tử đều nằm trong đoạn $[${round(lowerFence, 2)}; ${round(upperFence, 2)}]$).`;

    return `
### HƯỚNG DẪN GIẢI CHI TIẾT (THỐNG KÊ LỚP 10 - SỐ LIỆU RỜI RẠC)

#### Bước 1: Sắp xếp mẫu số liệu
In dãy số liệu theo thứ tự không giảm (tăng dần):
$$x_1 \\le x_2 \\le \\dots \\le x_n \\iff ${sortedLeStr}$$
Nêu rõ cỡ mẫu: $n = ${n}$.

---

#### Bước 2: Tính số trung bình cộng ($\\overline{x}$)
Nêu công thức:
$$\\overline{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i$$
Thay số chi tiết:
$$\\overline{x} = \\frac{${sumDetailStr}}{${n}} = \\frac{${round(sum, 4)}}{${n}} \\approx ${round(mean, 4)} \\approx ${round(mean, 2)}$$

---

#### Bước 3: Tìm Trung vị ($M_e$)
${medianStepDetail}

---

#### Bước 4: Tìm Tứ phân vị ($Q_1, Q_2, Q_3$)
* Tứ phân vị thứ hai chính là trung vị của mẫu:
  $$Q_2 = M_e = ${round(q2, 2)}$$
* Nửa số liệu bên trái trung vị là dãy: $${lowerHalf.join(", ")}$ gồm $k = ${lowerHalf.length}$ phần tử. Trung vị của dãy này là:
  $$Q_1 = ${round(q1, 2)}$$
* Nửa số liệu bên phải trung vị là dãy: $${upperHalf.join(", ")}$ gồm $k = ${upperHalf.length}$ phần tử. Trung vị của dãy này là:
  $$Q_3 = ${round(q3, 2)}$$

---

#### Bước 5: Tìm Mốt ($M_o$)
${modeExplanation}

---

#### Bước 6: Các số đo mức độ phân tán & Giá trị bất thường
* **Khoảng biến thiên ($R$):**
  $$R = x_{max} - x_{min} = ${sorted[n - 1]} - ${sorted[0]} = ${round(range, 2)}$$

* **Khoảng tứ phân vị ($\\Delta_Q$):**
  $$\\Delta_Q = Q_3 - Q_1 = ${round(q3, 2)} - ${round(q1, 2)} = ${round(deltaQ, 2)}$$

* **Tìm giá trị bất thường (Outliers):**
  - Tính ngưỡng dưới: $Q_1 - 1{,}5\\Delta_Q = ${round(q1, 2)} - 1{,}5 \\cdot ${round(deltaQ, 2)} = ${round(lowerFence, 2)}$
  - Tính ngưỡng trên: $Q_3 + 1{,}5\\Delta_Q = ${round(q3, 2)} + 1{,}5 \\cdot ${round(deltaQ, 2)} = ${round(upperFence, 2)}$
  - **Kết luận:** ${outlierExplanation}

---

#### Bước 7: Tính Phương sai và Độ lệch chuẩn
Nêu công thức phương sai:
$$s^2 = \\frac{1}{n}\\sum_{i=1}^n (x_i - \\overline{x})^2 = \\frac{1}{n}\\sum_{i=1}^n x_i^2 - (\\overline{x})^2$$
Thay số:
Ta có tổng bình phương các số liệu $\\sum_{i=1}^n x_i^2 = ${round(sumSq, 4)}$.
$$s^2 = \\frac{${round(sumSq, 4)}}{${n}} - (${round(mean, 4)})^2 \\approx ${round(variance, 4)} \\approx ${round(variance, 2)}$$
Suy ra độ lệch chuẩn:
$$s = \\sqrt{s^2} = \\sqrt{${round(variance, 4)}} \\approx ${round(stdDev, 4)} \\approx ${round(stdDev, 2)}$$

*(Ghi chú: Phương sai mẫu hiệu chỉnh $s_{n-1}^2 = \\frac{n}{n-1} s^2 \\approx ${round(sampleVariance, 4)}$ và độ lệch chuẩn hiệu chỉnh $s_{n-1} \\approx ${round(sampleStdDev, 4)}$ - tương ứng với kết quả $s_x$ khi bấm máy tính cầm tay Casio fx-580VN X).*
`;
  }, [g10Data]);

  const groupedDetailedStepsMarkdown = useMemo(() => {
    if (!groupedData.valid) {
      return "⚠️ **Chưa có dữ liệu ghép nhóm hợp lệ để giải chi tiết.** Vui lòng thiết lập bảng nhóm và nhập tần số.";
    }

    const {
      n, rows, mean, median, q1, q2, q3, deltaQ, mode, variance, stdDev, sampleVariance, sampleStdDev, steps
    } = groupedData;

    return `
### HƯỚNG DẪN GIẢI CHI TIẾT (THỐNG KÊ LỚP 11 & 12 - SỐ LIỆU GHÉP NHÓM)

#### Bước 1: Lập bảng phân bố tần số ghép nhóm và xác định giá trị đại diện
Trình bày bảng phân bố tần số gồm đầy đủ 3 cột chính: Nhóm khoảng, Giá trị đại diện $c_i$, Tần số $m_i$ kèm các cột tính toán hỗ trợ:

| Nhóm $[a_i; a_{i+1})$ | Giá trị đại diện $c_i$ | Tần số $m_i$ | Tần số tích lũy $cf_i$ | $m_i \\cdot c_i$ | $m_i \\cdot c_i^2$ |
| :---: | :---: | :---: | :---: | :---: | :---: |
${rows.map(r => `| $[${r.start}; ${r.end})$ | $${r.rep}$ | $${r.freq}$ | $${r.cumFreq}$ | $${round(r.freq * r.rep, 2)}$ | $${round(r.freq * Math.pow(r.rep, 2), 2)}$ |`).join("\n")}
| **Tổng cộng** | - | **$n = ${n}$** | - | **$${round(steps.sumMC, 2)}$** | **$${round(steps.sumMC2, 2)}$** |

Nêu rõ tổng cỡ mẫu: $n = \\sum_{i=1}^{k} m_i = ${n}$.

---

#### Bước 2: Tính số trung bình của mẫu số liệu ghép nhóm ($\\overline{x}$)
Nêu công thức:
$$\\overline{x} = \\frac{1}{n} \\sum_{i=1}^{k} m_i c_i$$
Thay số:
$$\\overline{x} = \\frac{${round(steps.sumMC, 2)}}{${n}} \\approx ${round(mean, 4)} \\approx ${round(mean, 2)}$$

---

#### Bước 3: Tìm Mốt của mẫu số liệu ghép nhóm ($M_o$)
- Nhóm có tần số lớn nhất là nhóm thứ **${steps.modeRow.index}**: $[${steps.modeRow.start}; ${steps.modeRow.end})$ với $m_{max} = ${steps.modeRow.freq}$.
- Do đó:
  - Đầu mút trái của nhóm: $a_j = ${steps.modeRow.start}$.
  - Độ dài nhóm: $a_{j+1} - a_j = ${steps.modeRow.h}$.
  - Tần số nhóm chứa mốt: $m_j = ${steps.modeRow.freq}$.
  - Tần số nhóm kề trước: $m_{j-1} = ${steps.mPrev}$.
  - Tần số nhóm kề sau: $m_{j+1} = ${steps.mNext}$.
- Áp dụng công thức mốt ghép nhóm:
  $$M_o = a_j + \\frac{m_j - m_{j-1}}{(m_j - m_{j-1}) + (m_j - m_{j+1})} \\cdot (a_{j+1} - a_j)$$
  Thay số từng giá trị:
  $$M_o = ${steps.modeRow.start} + \\frac{${steps.modeRow.freq} - ${steps.mPrev}}{(${steps.modeRow.freq} - ${steps.mPrev}) + (${steps.modeRow.freq} - ${steps.mNext})} \\cdot ${steps.modeRow.h} \\approx ${round(mode, 4)} \\approx ${round(mode, 2)}$$

---

#### Bước 4: Tìm Trung vị của mẫu số liệu ghép nhóm ($M_e$)
- Ta có: $\\frac{n}{2} = \\frac{${n}}{2} = ${steps.halfN}$.
- Nhóm đầu tiên có tần số tích lũy lớn hơn hoặc bằng ${steps.halfN}$ là nhóm thứ **${steps.medianRow.index}**: $[${steps.medianRow.start}; ${steps.medianRow.end})$.
- Do đó nhóm chứa trung vị là $[a_p; a_{p+1}) = [${steps.medianRow.start}; ${steps.medianRow.end})$, với $a_p = ${steps.medianRow.start}$, độ dài nhóm $a_{p+1} - a_p = ${steps.medianRow.h}$, tần số $m_p = ${steps.medianRow.freq}$, tần số tích lũy nhóm trước $C = ${steps.medianRow.prevCumFreq}$.
- Áp dụng công thức trung vị ghép nhóm:
  $$M_e = a_p + \\frac{\\frac{n}{2} - C}{m_p} \\cdot (a_{p+1} - a_p)$$
  Thay số chi tiết:
  $$M_e = ${steps.medianRow.start} + \\frac{${steps.halfN} - ${steps.medianRow.prevCumFreq}}{${steps.medianRow.freq}} \\cdot ${steps.medianRow.h} \\approx ${round(median, 4)} \\approx ${round(median, 2)}$$

---

#### Bước 5: Tìm các Tứ phân vị ($Q_1, Q_2, Q_3$)
* **Tứ phân vị thứ hai ($Q_2$):**
  $$Q_2 = M_e \\approx ${round(median, 2)}$$

* **Tứ phân vị thứ nhất ($Q_1$):**
  - Ta có $\\frac{n}{4} = \\frac{${n}}{4} = ${steps.quarterN}$.
  - Nhóm đầu tiên có tần số tích lũy lớn hơn hoặc bằng ${steps.quarterN}$ là nhóm thứ **${steps.q1Row.index}**: $[${steps.q1Row.start}; ${steps.q1Row.end})$.
  - Do đó nhóm chứa $Q_1$ là $[a_p; a_{p+1}) = [${steps.q1Row.start}; ${steps.q1Row.end})$, với $a_p = ${steps.q1Row.start}$, $m_p = ${steps.q1Row.freq}$, $C_{p-1} = ${steps.q1Row.prevCumFreq}$, $a_{p+1} - a_p = ${steps.q1Row.h}$.
  - Áp dụng công thức:
    $$Q_1 = a_p + \\frac{\\frac{n}{4} - C_{p-1}}{m_p} \\cdot (a_{p+1} - a_p)$$
    Thay số:
    $$Q_1 = ${steps.q1Row.start} + \\frac{${steps.quarterN} - ${steps.q1Row.prevCumFreq}}{${steps.q1Row.freq}} \\cdot ${steps.q1Row.h} \\approx ${round(q1, 4)} \\approx ${round(q1, 2)}$$

* **Tứ phân vị thứ ba ($Q_3$):**
  - Ta có $\\frac{3n}{4} = \\frac{3 \\cdot ${n}}{4} = ${steps.threeQuarterN}$.
  - Nhóm đầu tiên có tần số tích lũy lớn hơn hoặc bằng ${steps.threeQuarterN}$ là nhóm thứ **${steps.q3Row.index}**: $[${steps.q3Row.start}; ${steps.q3Row.end})$.
  - Do đó nhóm chứa $Q_3$ là $[a_q; a_{q+1}) = [${steps.q3Row.start}; ${steps.q3Row.end})$, với $a_q = ${steps.q3Row.start}$, $m_q = ${steps.q3Row.freq}$, $C_{q-1} = ${steps.q3Row.prevCumFreq}$, $a_{q+1} - a_q = ${steps.q3Row.h}$.
  - Áp dụng công thức:
    $$Q_3 = a_q + \\frac{\\frac{3n}{4} - C_{q-1}}{m_q} \\cdot (a_{q+1} - a_q)$$
    Thay số:
    $$Q_3 = ${steps.q3Row.start} + \\frac{${steps.threeQuarterN} - ${steps.q3Row.prevCumFreq}}{${steps.q3Row.freq}} \\cdot ${steps.q3Row.h} \\approx ${round(q3, 4)} \\approx ${round(q3, 2)}$$

* **Khoảng tứ phân vị ($\\Delta_Q$):**
  $$\\Delta_Q = Q_3 - Q_1 = ${round(q3, 2)} - ${round(q1, 2)} = ${round(deltaQ, 2)}$$

---

#### Bước 6: Tính Phương sai và Độ lệch chuẩn của mẫu số liệu ghép nhóm
Nêu công thức phương sai ghép nhóm:
$$s^2 = \\frac{1}{n} \\sum_{i=1}^k m_i c_i^2 - (\\overline{x})^2$$
Thay số:
$$s^2 = \\frac{${round(steps.sumMC2, 2)}}{${n}} - (${round(mean, 4)})^2 \\approx ${round(variance, 4)} \\approx ${round(variance, 2)}$$
Suy ra độ lệch chuẩn ghép nhóm:
$$s = \\sqrt{s^2} = \\sqrt{${round(variance, 4)}} \\approx ${round(stdDev, 4)} \\approx ${round(stdDev, 2)}$$

*(Ghi chú: Phương sai mẫu hiệu chỉnh $s_{n-1}^2 = \\frac{n}{n-1} s^2 \\approx ${round(sampleVariance, 4)} \\implies s_{n-1} \\approx ${round(sampleStdDev, 4)}$).*
`;
  }, [groupedData]);

  // Export PDF/Print
  const handlePrint = () => {
    if (reportRef.current) {
      const title = activeModule === "grade10" ? "Loi_Giai_Thong_Ke_Lop_10" : "Loi_Giai_Thong_Ke_Ghep_Nhom_Lop_11_12";
      printElement(reportRef.current, title);
    }
  };

  // Export Word
  const handleExportWord = () => {
    if (reportRef.current) {
      const title = activeModule === "grade10" ? "Loi_Giai_Thong_Ke_Lop_10" : "Loi_Giai_Thong_Ke_Ghep_Nhom_Lop_11_12";
      exportHtmlToWord(reportRef.current, title);
    }
  };

  // Excel paste handler for G10 table
  const handleApplyExcelG10 = () => {
    if (!excelPasteTextG10.trim()) return;
    const lines = excelPasteTextG10.trim().split("\n");
    const newRows: Array<{ id: string; x: number | ""; n: number | "" }> = [];
    lines.forEach((line, idx) => {
      const parts = line.split(/[\t,;]+/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const x = parseFloat(parts[0].replace(",", "."));
        const n = parseFloat(parts[1].replace(",", "."));
        if (!isNaN(x) && !isNaN(n)) {
          newRows.push({ id: `paste_${idx}_${Date.now()}`, x, n });
        }
      } else if (parts.length === 1) {
        const x = parseFloat(parts[0].replace(",", "."));
        if (!isNaN(x)) {
          newRows.push({ id: `paste_${idx}_${Date.now()}`, x, n: 1 });
        }
      }
    });

    if (newRows.length > 0) {
      setG10TableRows(newRows);
      setShowPasteModalG10(false);
      setExcelPasteTextG10("");
    } else {
      alert("Không tìm thấy số liệu hợp lệ. Vui lòng dán 2 cột: Cột 1 (x) và Cột 2 (n).");
    }
  };

  // Excel paste handler for Grouped table
  const handleApplyExcelGrouped = () => {
    if (!excelPasteTextGrouped.trim()) return;
    const lines = excelPasteTextGrouped.trim().split("\n");
    const newRows: Array<{ id: string; start: number; end: number; rep: number; freq: number }> = [];

    lines.forEach((line, idx) => {
      // Regex parse [a, b) or a - b or 3 columns (a, b, m)
      const parts = line.split(/[\t,;]+/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 3) {
        const a = parseFloat(parts[0].replace(",", "."));
        const b = parseFloat(parts[1].replace(",", "."));
        const m = parseFloat(parts[2].replace(",", "."));
        if (!isNaN(a) && !isNaN(b) && !isNaN(m)) {
          newRows.push({
            id: `grp_${idx}_${Date.now()}`,
            start: a,
            end: b,
            rep: round((a + b) / 2),
            freq: m
          });
        }
      } else if (parts.length === 2) {
        // Either "range", "freq" or "rep", "freq"
        const rangeMatch = parts[0].match(/\[?(\d+(?:\.\d+)?)\s*(?:[;:\-–]|\.\.)\s*(\d+(?:\.\d+)?)\)?/);
        const m = parseFloat(parts[1].replace(",", "."));
        if (rangeMatch && !isNaN(m)) {
          const a = parseFloat(rangeMatch[1]);
          const b = parseFloat(rangeMatch[2]);
          newRows.push({
            id: `grp_${idx}_${Date.now()}`,
            start: a,
            end: b,
            rep: round((a + b) / 2),
            freq: m
          });
        }
      }
    });

    if (newRows.length > 0) {
      setGroupedRows(newRows);
      setShowPasteModalGrouped(false);
      setExcelPasteTextGrouped("");
    } else {
      alert("Không nhận diện được định dạng. Vui lòng dán dạng 3 cột: [a, b, m] hoặc '[20; 40]   15'.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast notification */}
      {copyStatus && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium">{copyStatus}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Bộ Công Cụ Toán Học GDPT 2018
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Lớp 9 • 10 • 11 • 12
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Thống kê số liệu rời rạc & ghép nhóm • Hỗ trợ vẽ hình 2D/3D & Khảo sát sự biến thiên hàm số (KSHS)
              </p>
            </div>
          </div>

          {/* Sub-system Navigation Tabs (Tabs chính phân hệ) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setMainSubsystem("statistics")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all",
                mainSubsystem === "statistics"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>1. Công cụ Thống kê 10, 11, 12</span>
            </button>

            <button
              onClick={() => setMainSubsystem("graphing")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all",
                mainSubsystem === "graphing"
                  ? "bg-white text-blue-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Compass className="w-4 h-4 text-blue-600" />
              <span>2. Công cụ Hỗ trợ Vẽ hình & KSHS</span>
            </button>
          </div>
        </div>
      </header>

      {/* RENDER PHÂN HỆ 2: VẼ HÌNH & KHẢO SÁT HÀM SỐ (KSHS) */}
      {mainSubsystem === "graphing" && (
        <div className="flex-1 flex flex-col">
          <GraphingAndAnalysisMain />
        </div>
      )}

      {/* RENDER PHÂN HỆ 1: CÔNG CỤ THỐNG KÊ 10, 11, 12 */}
      {mainSubsystem === "statistics" && (
        <div className="flex-1 flex flex-col">
          {/* Sub-bar for Statistics Grade Selection */}
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 pb-0 flex items-center justify-between">
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setActiveModule("grade10")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeModule === "grade10"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Thống kê Lớp 10 (Rời rạc)</span>
              </button>

              <button
                onClick={() => setActiveModule("grade11_12")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeModule === "grade11_12"
                    ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Thống kê Lớp 11 & 12 (Ghép nhóm)</span>
              </button>
            </div>
          </div>

          {/* Main Container */}
          <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col lg:flex-row gap-6">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: DATA INPUT PANEL                             */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[480px] shrink-0 flex flex-col gap-4">

          {/* ------------------------------------------- */}
          {/* PHÂN HỆ 1: LỚP 10 (SỐ LIỆU RỜI RẠC)         */}
          {/* ------------------------------------------- */}
          {activeModule === "grade10" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <h2 className="font-bold text-slate-800 text-sm">
                    Nhập dữ liệu mẫu không ghép nhóm
                  </h2>
                </div>
                {/* Switcher: Raw vs Table */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium border border-slate-200">
                  <button
                    onClick={() => setG10Mode("raw")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all",
                      g10Mode === "raw" ? "bg-white font-bold text-emerald-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Dãy số đơn
                  </button>
                  <button
                    onClick={() => setG10Mode("table")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all",
                      g10Mode === "table" ? "bg-white font-bold text-emerald-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Bảng tần số (xᵢ, nᵢ)
                  </button>
                </div>
              </div>

              {/* Mode A: Dãy số liệu đơn */}
              {g10Mode === "raw" && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Nhập hoặc dán dãy số liệu:
                      </label>
                      <button
                        onClick={handleSortRawInput}
                        disabled={!g10Data.valid}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors disabled:opacity-40"
                        title="Tự động sắp xếp dãy tăng dần"
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        Sắp xếp tăng dần
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      className="w-full p-3 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all leading-relaxed"
                      placeholder="Ví dụ: 7, 8, 9, 6, 8, 7, 10, 8, 9, 7, 8, 6, 5 (phân tách bởi dấu phẩy, khoảng trắng, hoặc xuống dòng)"
                      value={g10RawInput}
                      onChange={(e) => setG10RawInput(e.target.value)}
                    />
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span>Phân cách bằng: phẩy (,), chấm phẩy (;), khoảng trắng hoặc dòng mới.</span>
                      <span className="font-bold text-slate-700">Cỡ mẫu: n = {g10Data.n}</span>
                    </div>
                  </div>

                  {/* Preset examples */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Tải mẫu ví dụ thực tế:
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {PRESETS_GRADE_10.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setG10RawInput(preset.raw)}
                          className="text-left px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors flex items-center justify-between text-xs group"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 group-hover:text-emerald-800">{preset.name}</span>
                            <span className="text-[10px] text-slate-400 block">{preset.desc}</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode B: Bảng phân bố tần số (x_i và n_i) */}
              {g10Mode === "table" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Bảng giá trị (xᵢ) và tần số (nᵢ):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPasteModalG10(true)}
                        className="text-xs text-blue-700 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Dán từ Excel
                      </button>
                      <button
                        onClick={() => setG10TableRows([...g10TableRows, { id: Date.now().toString(), x: "", n: 1 }])}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm dòng
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[280px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-12 text-center">STT</th>
                          <th className="p-2">Giá trị (xᵢ)</th>
                          <th className="p-2">Tần số (nᵢ)</th>
                          <th className="p-2 w-10 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {g10TableRows.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-slate-50/80">
                            <td className="p-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                step="any"
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                value={row.x}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                                  setG10TableRows(g10TableRows.map(r => r.id === row.id ? { ...r, x: val } : r));
                                }}
                                placeholder="x"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                value={row.n}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                                  setG10TableRows(g10TableRows.map(r => r.id === row.id ? { ...r, n: val } : r));
                                }}
                                placeholder="n"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => setG10TableRows(g10TableRows.filter(r => r.id !== row.id))}
                                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                title="Xóa dòng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                        <tr>
                          <td colSpan={2} className="p-2 text-right">Tổng cỡ mẫu (n = ∑ nᵢ):</td>
                          <td colSpan={2} className="p-2 text-emerald-700 font-mono text-sm">{g10Data.n}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Preset Table */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Mẫu bảng thực tế:
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {PRESETS_FREQUENCY_TABLE_10.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setG10TableRows(preset.data.map((d, i) => ({ id: `${i}_${Date.now()}`, x: d.x, n: d.n })));
                          }}
                          className="text-left px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors flex items-center justify-between text-xs group"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 group-hover:text-emerald-800">{preset.name}</span>
                            <span className="text-[10px] text-slate-400 block">{preset.desc}</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------- */}
          {/* PHÂN HỆ 2: LỚP 11 & 12 (SỐ LIỆU GHÉP NHÓM)  */}
          {/* ------------------------------------------- */}
          {activeModule === "grade11_12" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <h2 className="font-bold text-slate-800 text-sm">
                    Tạo bảng nhóm thông minh (Smart Interval)
                  </h2>
                </div>
                <button
                  onClick={() => setShowPasteModalGrouped(true)}
                  className="text-xs text-blue-700 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Dán từ Excel
                </button>
              </div>

              {/* Interval Generator controls */}
              <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Tham số phân nhóm [aᵢ; aᵢ₊₁)
                  </span>
                  <span className="text-[11px] text-indigo-600 font-medium">Tự động tính cᵢ</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      GTNN (a₀)
                    </label>
                    <input
                      type="number"
                      className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      value={minVal}
                      onChange={(e) => setMinVal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      GTLN (b_max)
                    </label>
                    <input
                      type="number"
                      className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      value={maxVal}
                      onChange={(e) => setMaxVal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Độ dài nhóm (h)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={0.1}
                      className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      value={stepVal}
                      onChange={(e) => setStepVal(parseFloat(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateIntervals}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tạo các khoảng nhóm [aᵢ; aᵢ₊₁)
                </button>
              </div>

              {/* Grouped Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Bảng tần số nhóm và giá trị đại diện:
                  </span>
                  <button
                    onClick={() => {
                      const last = groupedRows[groupedRows.length - 1];
                      const s = last ? last.end : 0;
                      const e = last ? last.end + stepVal : stepVal;
                      setGroupedRows([...groupedRows, {
                        id: `row_${Date.now()}`,
                        start: s,
                        end: e,
                        rep: round((s + e) / 2),
                        freq: 0
                      }]);
                    }}
                    className="text-xs text-indigo-700 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200"
                  >
                    <Plus className="w-3 h-3" /> Thêm nhóm
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2">Khoảng [aᵢ; aᵢ₊₁)</th>
                        <th className="p-2 text-center">Đại diện (cᵢ)</th>
                        <th className="p-2">Tần số (mᵢ)</th>
                        <th className="p-2 w-8 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedRows.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-slate-50/80">
                          <td className="p-2 font-mono font-medium text-slate-800">
                            [{r.start}; {r.end})
                          </td>
                          <td className="p-2 text-center font-mono text-indigo-700 font-bold">
                            {r.rep}
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md font-mono text-xs font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              value={r.freq}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setGroupedRows(groupedRows.map(row => row.id === r.id ? { ...row, freq: val } : row));
                              }}
                              placeholder="m_i"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => setGroupedRows(groupedRows.filter(row => row.id !== r.id))}
                              className="text-slate-400 hover:text-red-600 transition-colors p-1"
                              title="Xóa nhóm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                      <tr>
                        <td colSpan={2} className="p-2 text-right">Tổng cỡ mẫu ($n = \\sum m_i$):</td>
                        <td colSpan={2} className="p-2 text-indigo-700 font-mono text-sm">{groupedData.n}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Preset Examples for Grouped */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Tải mẫu bài toán SGK:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {PRESETS_GROUPED_11_12.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setMinVal(p.min);
                          setMaxVal(p.max);
                          setStepVal(p.step);
                          const rows: any[] = [];
                          let cur = p.min;
                          p.frequencies.forEach((f, i) => {
                            const next = cur + p.step;
                            rows.push({
                              id: `pre_${i}_${Date.now()}`,
                              start: cur,
                              end: next,
                              rep: round((cur + next) / 2),
                              freq: f
                            });
                            cur = next;
                          });
                          setGroupedRows(rows);
                        }}
                        className="text-left px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors flex items-center justify-between text-xs group"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 group-hover:text-indigo-800">{p.name}</span>
                          <span className="text-[10px] text-slate-400 block">{p.desc}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: RESULTS & PEDAGOGICAL TABS                  */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          
          {/* Action & Tab Navigation Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab("summary")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
                  activeTab === "summary"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tóm tắt kết quả</span>
              </button>

              <button
                onClick={() => setActiveTab("steps")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
                  activeTab === "steps"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Xem lời giải chi tiết</span>
              </button>

              <button
                onClick={() => setActiveTab("casio")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
                  activeTab === "casio"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Cpu className="w-3.5 h-3.5 text-purple-600" />
                <span>Quy trình bấm Casio fx-580VN X</span>
              </button>
            </div>

            {/* Export & Copy buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const content = activeModule === "grade10" ? g10DetailedStepsMarkdown : groupedDetailedStepsMarkdown;
                  handleCopy(content, "Đã sao chép toàn bộ lời giải chi tiết (Word / Markdown)!");
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Sao chép toàn bộ nội dung và công thức LaTeX để dán vào Word hoặc đề thi"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép lời giải chi tiết (Word / Markdown)</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="In hoặc xuất PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In / PDF</span>
              </button>

              <button
                onClick={handleExportWord}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Xuất file Word .doc"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Word</span>
              </button>
            </div>
          </div>

          {/* Tab 1: BẢNG KẾT QUẢ TÓM TẮT */}
          {activeTab === "summary" && (
            <div className="space-y-4">
              {activeModule === "grade10" ? (
                /* Card UI for Grade 10 */
                g10Data.valid ? (
                  <div className="space-y-4">
                    {/* Header info badge */}
                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                          Mẫu số liệu Lớp 10 đã phân tích
                        </span>
                        <h3 className="text-base font-black text-emerald-950 mt-0.5">
                          Cỡ mẫu: n = {g10Data.n} phần tử
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-900 font-mono">
                          Min: {g10Data.sorted[0]}
                        </span>
                        <span className="text-slate-400">➔</span>
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-900 font-mono">
                          Max: {g10Data.sorted[g10Data.n - 1]}
                        </span>
                      </div>
                    </div>

                    {/* Group 1: Đo xu thế trung tâm */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800">
                          Nhóm 1
                        </span>
                        <h3 className="text-sm font-bold text-slate-800">
                          Các số đo xu thế trung tâm (Central Tendency)
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-xs text-slate-500 font-medium block">Số trung bình (x̄)</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                            {round(g10Data.mean, 2)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">≈ {round(g10Data.mean, 4)}</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                          <span className="text-xs text-emerald-800 font-semibold block">Trung vị (Me = Q₂)</span>
                          <span className="text-xl font-black text-emerald-950 mt-1 block font-mono">
                            {round(g10Data.median, 2)}
                          </span>
                          <span className="text-[10px] text-emerald-700">Giá trị ở chính giữa mẫu</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-xs text-slate-500 font-medium block">Tứ phân vị (Q₁, Q₃)</span>
                          <div className="flex items-center gap-1.5 mt-1 font-mono font-bold text-slate-900 text-sm">
                            <span>Q1: {round(g10Data.q1, 2)}</span>
                            <span className="text-slate-300">|</span>
                            <span>Q3: {round(g10Data.q3, 2)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">25% và 75% vị trí</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-xs text-slate-500 font-medium block">Mốt (Mo)</span>
                          <span className="text-lg font-black text-slate-900 mt-1 block font-mono">
                            {g10Data.modes.length > 0 ? g10Data.modes.join(", ") : "Không có"}
                          </span>
                          <span className="text-[10px] text-slate-400">Giá trị xuất hiện nhiều nhất</span>
                        </div>
                      </div>
                    </div>

                    {/* Group 2: Đo mức độ phân tán */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
                          Nhóm 2
                        </span>
                        <h3 className="text-sm font-bold text-slate-800">
                          Các số đo mức độ phân tán (Dispersion)
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-xs text-slate-500 font-medium block">Khoảng biến thiên (R)</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                            {round(g10Data.range, 2)}
                          </span>
                          <span className="text-[10px] text-slate-400">x_max - x_min</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-xs text-slate-500 font-medium block">Khoảng tứ phân vị (ΔQ)</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                            {round(g10Data.deltaQ, 2)}
                          </span>
                          <span className="text-[10px] text-slate-400">Q3 - Q1</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                          <span className="text-xs text-amber-800 font-semibold block">Phương sai mẫu (s²)</span>
                          <span className="text-xl font-black text-amber-950 mt-1 block font-mono">
                            {round(g10Data.variance, 2)}
                          </span>
                          <span className="text-[10px] text-amber-700 font-mono">≈ {round(g10Data.variance, 4)}</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                          <span className="text-xs text-amber-800 font-semibold block">Độ lệch chuẩn (s)</span>
                          <span className="text-xl font-black text-amber-950 mt-1 block font-mono">
                            {round(g10Data.stdDev, 2)}
                          </span>
                          <span className="text-[10px] text-amber-700 font-mono">√s² ≈ {round(g10Data.stdDev, 4)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Group 3: Giá trị bất thường (Outliers) */}
                    <div className={cn(
                      "p-4 rounded-2xl border transition-all flex items-start gap-3",
                      g10Data.outliers.length > 0 
                        ? "bg-red-50/80 border-red-200 text-red-950" 
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    )}>
                      {g10Data.outliers.length > 0 ? (
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs sm:text-sm">
                            Kiểm tra giá trị bất thường (Outliers):
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white border border-current/20">
                            Khoảng an toàn: [{round(g10Data.lowerFence)}; {round(g10Data.upperFence)}]
                          </span>
                        </div>
                        <p className="text-xs mt-1 leading-relaxed">
                          {g10Data.outliers.length > 0 ? (
                            <>
                              Phát hiện <strong className="text-red-700">{g10Data.outliers.length} giá trị bất thường</strong>: <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-red-200 text-red-700">{g10Data.outliers.join(", ")}</span> (nằm ngoài phạm vi $Q_1 - 1.5\\Delta_Q$ và $Q_3 + 1.5\\Delta_Q$).
                            </>
                          ) : (
                            "Mẫu số liệu đồng đều, không có giá trị bất thường nào (tất cả các số liệu đều nằm trong giới hạn kiểm định)."
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-600" />
                    <p className="font-bold text-slate-700">Chưa có dữ liệu thống kê Lớp 10</p>
                    <p className="text-xs text-slate-500 mt-1">Nhập dãy số hoặc chọn một mẫu ví dụ ở cột bên trái để bắt đầu.</p>
                  </div>
                )
              ) : (
                /* Card UI for Grade 11 & 12 (Grouped) */
                groupedData.valid ? (
                  <div className="space-y-4">
                    {/* Header info badge */}
                    <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                          Mẫu số liệu ghép nhóm Lớp 11 & 12
                        </span>
                        <h3 className="text-base font-black text-indigo-950 mt-0.5">
                          Tổng cỡ mẫu: n = {groupedData.n} phần tử • {groupedData.rows.length} nhóm
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-900 font-mono">
                          Khoảng: [{groupedData.rows[0].start}; {groupedData.rows[groupedData.rows.length - 1].end})
                        </span>
                      </div>
                    </div>

                    {/* Group 1: Đo xu thế trung tâm */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-800">
                          Đo xu thế trung tâm
                        </span>
                        <h3 className="text-sm font-bold text-slate-800">
                          Các đặc trưng mẫu số liệu ghép nhóm
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-xs text-slate-500 font-medium block">Số trung bình (x̄)</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                            {round(groupedData.mean, 2)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">≈ {round(groupedData.mean, 4)}</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
                          <span className="text-xs text-indigo-800 font-semibold block">Trung vị ghép nhóm (Me)</span>
                          <span className="text-xl font-black text-indigo-950 mt-1 block font-mono">
                            {round(groupedData.median, 2)}
                          </span>
                          <span className="text-[10px] text-indigo-700">Nhóm: [{groupedData.steps.medianRow.start}; {groupedData.steps.medianRow.end})</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-xs text-slate-500 font-medium block">Tứ phân vị (Q₁, Q₃)</span>
                          <div className="flex items-center gap-1.5 mt-1 font-mono font-bold text-slate-900 text-sm">
                            <span>Q1: {round(groupedData.q1, 2)}</span>
                            <span className="text-slate-300">|</span>
                            <span>Q3: {round(groupedData.q3, 2)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">Khoảng: ΔQ = {round(groupedData.deltaQ, 2)}</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-xs text-slate-500 font-medium block">Mốt ghép nhóm (Mo)</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                            {round(groupedData.mode, 2)}
                          </span>
                          <span className="text-[10px] text-slate-400">Nhóm: [{groupedData.steps.modeRow.start}; {groupedData.steps.modeRow.end})</span>
                        </div>
                      </div>
                    </div>

                    {/* Group 2: Đo mức độ phân tán */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800">
                          Đo mức độ phân tán
                        </span>
                        <h3 className="text-sm font-bold text-slate-800">
                          Độ phân tán mẫu số liệu ghép nhóm (Toán 12)
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-xs text-slate-500 font-medium block">Khoảng tứ phân vị (ΔQ)</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                            {round(groupedData.deltaQ, 2)}
                          </span>
                          <span className="text-[10px] text-slate-400">Q3 - Q1</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200">
                          <span className="text-xs text-purple-800 font-semibold block">Phương sai ghép nhóm (s²)</span>
                          <span className="text-xl font-black text-purple-950 mt-1 block font-mono">
                            {round(groupedData.variance, 2)}
                          </span>
                          <span className="text-[10px] text-purple-700 font-mono">≈ {round(groupedData.variance, 4)}</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200">
                          <span className="text-xs text-purple-800 font-semibold block">Độ lệch chuẩn ghép nhóm (s)</span>
                          <span className="text-xl font-black text-purple-950 mt-1 block font-mono">
                            {round(groupedData.stdDev, 2)}
                          </span>
                          <span className="text-[10px] text-purple-700 font-mono">√s² ≈ {round(groupedData.stdDev, 4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400">
                    <Layers className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
                    <p className="font-bold text-slate-700">Chưa có dữ liệu ghép nhóm</p>
                    <p className="text-xs text-slate-500 mt-1">Nhập các khoảng nhóm và tần số tương ứng ở cột bên trái để bắt đầu.</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* Tab 2: CÁC BƯỚC GIẢI CHI TIẾT (LATEX) */}
          {activeTab === "steps" && (
            <div 
              ref={reportRef}
              className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs prose max-w-none text-slate-800"
            >
              <ErrorBoundary>
                <MarkdownRenderer 
                  content={activeModule === "grade10" ? g10DetailedStepsMarkdown : groupedDetailedStepsMarkdown} 
                />
              </ErrorBoundary>
            </div>
          )}

          {/* Tab 3: QUY TRÌNH BẤM MÁY CASIO FX-580VN X */}
          {activeTab === "casio" && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" /> Hướng dẫn Casio fx-580VN X & 880BTG
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Chuẩn GDPT 2018</span>
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  Quy trình thao tác phím máy tính cầm tay
                </h3>
              </div>

              {activeModule === "grade10" ? (
                /* Casio for Grade 10 */
                <div className="space-y-5 text-xs sm:text-sm text-slate-700">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">1</span>
                      Bật cột Tần số (Frequency):
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      Để nhập bảng tần số hoặc dãy số có lặp lại, cần bật chế độ hiển thị cột FREQ:
                    </p>
                    <div className="flex flex-wrap items-center gap-2 font-mono font-bold text-slate-800 pt-1">
                      <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded shadow-2xs">SHIFT</kbd>
                      <span>➔</span>
                      <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded shadow-2xs">MENU (SET UP)</kbd>
                      <span>➔</span>
                      <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded shadow-2xs">▼ (Cuộn xuống)</kbd>
                      <span>➔</span>
                      <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded shadow-2xs">3 (Thống kê)</kbd>
                      <span>➔</span>
                      <kbd className="px-2.5 py-1 bg-purple-600 text-white rounded shadow-2xs">1 (Mở / On)</kbd>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">2</span>
                      Vào chế độ Thống kê 1 biến:
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 font-mono font-bold text-slate-800 pt-1">
                      <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded shadow-2xs">MENU</kbd>
                      <span>➔</span>
                      <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded shadow-2xs">6 (Thống kê)</kbd>
                      <span>➔</span>
                      <kbd className="px-2.5 py-1 bg-purple-600 text-white rounded shadow-2xs">1 (1-Biến / 1-Variable)</kbd>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">3</span>
                      Nhập số liệu vào bảng:
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
                      <li>Nhập từng giá trị $x_i$ ở cột <strong>x</strong>, nhấn phím <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono font-bold">=</kbd> sau mỗi số.</li>
                      <li>Di chuyển con trỏ sang cột <strong>FREQ</strong> để nhập tần số $n_i$ tương ứng cho từng giá trị.</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2">
                    <h4 className="font-bold text-purple-950 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-700 text-white flex items-center justify-center text-xs">4</span>
                      Xem kết quả tính toán 1 biến (1-Variable Calc):
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 font-mono font-bold text-slate-800 pt-1 mb-2">
                      <kbd className="px-2.5 py-1 bg-slate-700 text-white rounded shadow-2xs">AC</kbd>
                      <span>➔</span>
                      <kbd className="px-2.5 py-1 bg-purple-600 text-white rounded shadow-2xs">OPTN</kbd>
                      <span>➔</span>
                      <kbd className="px-2.5 py-1 bg-purple-700 text-white rounded shadow-2xs">2 (Dữ liệu 1-biến)</kbd>
                    </div>
                    
                    <div className="overflow-x-auto pt-2">
                      <table className="w-full text-xs bg-white rounded-lg border border-purple-200">
                        <thead className="bg-purple-100/70 text-purple-900 font-bold">
                          <tr>
                            <th className="p-2 text-left">Ký hiệu trên Casio</th>
                            <th className="p-2 text-left">Ý nghĩa trong SGK GDPT 2018</th>
                            <th className="p-2 text-right">Giá trị tương ứng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-100 font-mono">
                          <tr>
                            <td className="p-2 font-bold text-slate-900">x̄</td>
                            <td className="p-2 text-slate-700 font-sans">Số trung bình cộng</td>
                            <td className="p-2 text-right font-bold text-emerald-700">{round(g10Data.mean, 2)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold text-slate-900">σx</td>
                            <td className="p-2 text-slate-700 font-sans">Độ lệch chuẩn mẫu (chia cho n)</td>
                            <td className="p-2 text-right font-bold text-amber-700">{round(g10Data.stdDev, 2)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold text-slate-900">σ²x</td>
                            <td className="p-2 text-slate-700 font-sans">Phương sai mẫu (chia cho n)</td>
                            <td className="p-2 text-right font-bold text-amber-700">{round(g10Data.variance, 2)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold text-slate-900">sx</td>
                            <td className="p-2 text-slate-700 font-sans">Độ lệch chuẩn mẫu hiệu chỉnh (chia cho n-1)</td>
                            <td className="p-2 text-right font-bold text-slate-600">{round(g10Data.sampleStdDev, 2)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold text-slate-900">n</td>
                            <td className="p-2 text-slate-700 font-sans">Cỡ mẫu</td>
                            <td className="p-2 text-right font-bold text-slate-900">{g10Data.n}</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold text-slate-900">Q₁</td>
                            <td className="p-2 text-slate-700 font-sans">Tứ phân vị thứ nhất</td>
                            <td className="p-2 text-right font-bold text-blue-700">{round(g10Data.q1, 2)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold text-slate-900">Med</td>
                            <td className="p-2 text-slate-700 font-sans">Trung vị (Me = Q₂)</td>
                            <td className="p-2 text-right font-bold text-emerald-700">{round(g10Data.median, 2)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold text-slate-900">Q₃</td>
                            <td className="p-2 text-slate-700 font-sans">Tứ phân vị thứ ba</td>
                            <td className="p-2 text-right font-bold text-blue-700">{round(g10Data.q3, 2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* Casio for Grade 11 & 12 */
                <div className="space-y-5 text-xs sm:text-sm text-slate-700">
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-amber-900 leading-relaxed font-medium">
                        <strong>Lưu ý quan trọng cho mẫu ghép nhóm:</strong> Máy tính Casio không có chế độ nhập trực tiếp khoảng nhóm [a<sub>i</sub>; a<sub>i+1</sub>), nên ta sẽ nhập <strong>giá trị đại diện c<sub>i</sub> = (a<sub>i</sub> + a<sub>i+1</sub>) / 2</strong> vào cột <strong>x</strong> và tần số nhóm m<sub>i</sub> vào cột <strong>FREQ</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
                      Thao tác nhập số liệu ghép nhóm:
                    </h4>
                    <p className="text-slate-600">
                      Bật tần số: <kbd className="px-2 py-0.5 bg-white border rounded font-mono font-bold">SHIFT MENU ▼ 3 1</kbd> ➔ Vào thống kê: <kbd className="px-2 py-0.5 bg-white border rounded font-mono font-bold">MENU 6 1</kbd>.
                    </p>
                    <p className="text-slate-600">
                      Tại cột <strong>x</strong>: Nhập các giá trị đại diện: <span className="font-mono font-bold text-indigo-700">{groupedData.rows.map(r => r.rep).join(", ")}</span>
                    </p>
                    <p className="text-slate-600">
                      Tại cột <strong>FREQ</strong>: Nhập tần số nhóm tương ứng: <span className="font-mono font-bold text-indigo-700">{groupedData.rows.map(r => r.freq).join(", ")}</span>
                    </p>
                  </div>

                  <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2">
                    <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs">2</span>
                      Kiểm tra kết quả máy tính so với SGK:
                    </h4>
                    <ul className="list-disc list-inside space-y-2 text-slate-700 pl-2">
                      <li>
                        <strong>Số trung bình x̄</strong> và <strong>Phương sai s²</strong>: Khớp chính xác 100% với giá trị hiển thị trên máy tính Casio!
                        {" "}(x̄ ≈ {round(groupedData.mean, 2)}, σx ≈ {round(groupedData.stdDev, 2)}).
                      </li>
                      <li>
                        <strong>Trung vị $M_e$, Tứ phân vị $Q_1, Q_3$, Mốt $M_o$</strong>: Đối với mẫu ghép nhóm, học sinh <strong>bắt buộc phải sử dụng công thức nội suy SGK Toán 11 & 12</strong> (trình bày chi tiết ở Tab 2), vì máy tính chỉ tính trung vị rời rạc của các điểm đại diện $c_i$.
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )}

      {/* Modal: Dán Excel cho Lớp 10 */}
      {showPasteModalG10 && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Dán nhanh bảng tần số từ Excel / Google Sheets
              </h3>
              <button onClick={() => setShowPasteModalG10(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-xs text-slate-500">
              Copy 2 cột từ Excel (Cột 1 là Giá trị xᵢ, Cột 2 là Tần số nᵢ) rồi dán vào ô bên dưới:
            </p>
            <textarea
              rows={8}
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              placeholder={`Ví dụ:\n4\t2\n5\t5\n6\t8\n7\t13\n8\t10`}
              value={excelPasteTextG10}
              onChange={(e) => setExcelPasteTextG10(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasteModalG10(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleApplyExcelG10}
                className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs"
              >
                Nhập dữ liệu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dán Excel cho Mẫu Ghép Nhóm */}
      {showPasteModalGrouped && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                Dán bảng số liệu ghép nhóm từ Excel
              </h3>
              <button onClick={() => setShowPasteModalGrouped(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-xs text-slate-500">
              Dán định dạng 3 cột (Bắt đầu, Kết thúc, Tần số) hoặc 2 cột ([Khoảng], Tần số):
            </p>
            <textarea
              rows={8}
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder={`Ví dụ (3 cột):\n20\t40\t5\n40\t60\t12\n60\t80\t18\n80\t100\t10\n100\t120\t5`}
              value={excelPasteTextGrouped}
              onChange={(e) => setExcelPasteTextGrouped(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasteModalGrouped(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleApplyExcelGrouped}
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
              >
                Nhập dữ liệu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
