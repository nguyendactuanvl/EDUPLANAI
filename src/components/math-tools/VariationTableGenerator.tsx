import React, { useState, useRef } from "react";
import { 
  Key, Sparkles, Download, FileText, RefreshCw, Eye, EyeOff, 
  Copy, Check, Image as ImageIcon, Info, ChevronRight, Zap
} from "lucide-react";
import { GoogleGenAI, Type } from "@google/genai";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, ImageRun, AlignmentType, HeadingLevel } from "docx";

// ============================================================================
// TYPES & DATA STRUCTURES
// ============================================================================

export interface BBTPoint {
  x: string;                              // Ký hiệu x, vd: "-\\infty", "0", "2", "+\\infty"
  yPrime?: string;                        // Dấu hoặc giá trị tại x, vd: "0", "+", "-", "||"
  isAsymptote?: boolean;                  // Tiệm cận đứng (vạch || xuyên suốt hàng y' và y)
  isDerivativeUndefinedOnly?: boolean;    // Chỉ đạo hàm không xác định, hàm số xác định (vạch || chỉ ở y')
  yVal?: string;                          // Giá trị y tại x, vd: "-\\infty", "4", "0", "+\\infty"
  yPosition?: "top" | "bottom" | "middle";// Vị trí độ cao nhãn y trên canvas (top ~ 15%, bottom ~ 85%, middle ~ 50%)
  
  // Trường hợp tiệm cận đứng có 2 giới hạn một bên (x -> x0^- và x -> x0^+)
  yLeftVal?: string;                      // Giới hạn bên trái tiệm cận đứng, vd: "+\\infty"
  yLeftPosition?: "top" | "bottom" | "middle";
  yRightVal?: string;                     // Giới hạn bên phải tiệm cận đứng, vd: "-\\infty"
  yRightPosition?: "top" | "bottom" | "middle";
}

export interface BBTInterval {
  sign?: "+" | "-" | "";                  // Dấu của y' trong khoảng
  isExcludedDomain?: boolean;             // Khoảng nằm ngoài TXĐ (tô gạch chéo //)
  trend?: "increasing" | "decreasing" | "none"; // Chiều biến thiên mũi tên
}

export interface BBTData {
  functionName: string;                   // Tên hàm số, vd: "y = x^3 - 3x^2 + 4"
  domainNote?: string;                    // Tập xác định, vd: "D = R" hoặc "D = R \\ {-1}"
  points: BBTPoint[];                     // Danh sách các điểm mốc trên trục hoành x
  intervals: BBTInterval[];               // Danh sách các khoảng giữa các điểm mốc
}

// ============================================================================
// DỮ LIỆU MẪU CHUẨN SGK (MOCK DATA)
// ============================================================================

export const MOCK_CUBIC_FUNCTION: BBTData = {
  functionName: "y = x^3 - 3x^2 + 4",
  domainNote: "Tập xác định: D = \\mathbb{R}",
  points: [
    { x: "-\\infty", yVal: "-\\infty", yPosition: "bottom" },
    { x: "0", yPrime: "0", yVal: "4", yPosition: "top" },
    { x: "2", yPrime: "0", yVal: "0", yPosition: "bottom" },
    { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
  ],
  intervals: [
    { sign: "+", trend: "increasing" },
    { sign: "-", trend: "decreasing" },
    { sign: "+", trend: "increasing" }
  ]
};

export const MOCK_RATIONAL_FUNCTION: BBTData = {
  functionName: "y = \\frac{2x - 1}{x + 1}",
  domainNote: "Tập xác định: D = \\mathbb{R} \\setminus \\{-1\\}",
  points: [
    { x: "-\\infty", yVal: "2", yPosition: "middle" },
    { 
      x: "-1", 
      yPrime: "||", 
      isAsymptote: true, 
      yLeftVal: "+\\infty", 
      yLeftPosition: "top", 
      yRightVal: "-\\infty", 
      yRightPosition: "bottom" 
    },
    { x: "+\\infty", yVal: "2", yPosition: "middle" }
  ],
  intervals: [
    { sign: "+", trend: "increasing" },
    { sign: "+", trend: "increasing" }
  ]
};

export const MOCK_RADICAL_FUNCTION: BBTData = {
  functionName: "y = \\sqrt{x^2 - 4}",
  domainNote: "Tập xác định: D = (-\\infty; -2] \\cup [2; +\\infty)",
  points: [
    { x: "-\\infty", yVal: "+\\infty", yPosition: "top" },
    { x: "-2", yPrime: "||", isDerivativeUndefinedOnly: true, yVal: "0", yPosition: "bottom" },
    { x: "2", yPrime: "||", isDerivativeUndefinedOnly: true, yVal: "0", yPosition: "bottom" },
    { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
  ],
  intervals: [
    { sign: "-", trend: "decreasing" },
    { isExcludedDomain: true, trend: "none" },
    { sign: "+", trend: "increasing" }
  ]
};

// ============================================================================
// HELPER FORMAT CHUỖI TOÁN SANG KÝ TỰ HIỂN THỊ ĐỒ HỌA
// ============================================================================
function formatMathSymbol(str?: string): string {
  if (!str) return "";
  return str
    .replace(/\\infty/g, "∞")
    .replace(/\+\\infty/g, "+∞")
    .replace(/-\\infty/g, "-∞")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\$/g, "")
    .trim();
}

// Chuyển Base64 ảnh sang Uint8Array cho docx ImageRun
function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
  const binaryString = window.atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// ============================================================================
// COMPONENT VẼ BẢNG BIẾN THIÊN SVG & KHUNG CHUẨN SGK (REQUIREMENT 2)
// ============================================================================
interface VariationTableViewProps {
  data: BBTData;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const VariationTableView: React.FC<VariationTableViewProps> = ({ data, containerRef }) => {
  const { points, intervals, functionName, domainNote } = data;
  const numPoints = points.length;

  // Kích thước chuẩn đồ họa SVG
  const leftLabelWidth = 72; // Độ rộng cột nhãn bên trái (x, y', y)
  const contentWidth = 580;  // Độ rộng vùng nội dung biến thiên
  const totalWidth = leftLabelWidth + contentWidth;

  const rowXHeight = 42;      // Chiều cao hàng x
  const rowYPrimeHeight = 42; // Chiều cao hàng y'
  const rowYHeight = 135;     // Chiều cao hàng y (đủ độ thoáng để vẽ mũi tên dài thanh thoát)
  const totalHeight = rowXHeight + rowYPrimeHeight + rowYHeight;

  // Tính tọa độ X của các điểm mốc trên trục x (phân bổ đều cân đối)
  const paddingX = 40;
  const usableWidth = contentWidth - 2 * paddingX;
  const stepX = numPoints > 1 ? usableWidth / (numPoints - 1) : usableWidth;

  const getPointX = (index: number) => {
    return leftLabelWidth + paddingX + index * stepX;
  };

  // Tính tọa độ Y của nhãn trong hàng y
  const getYPosValue = (pos?: "top" | "bottom" | "middle") => {
    const yStart = rowXHeight + rowYPrimeHeight;
    if (pos === "top") return yStart + 24;
    if (pos === "bottom") return yStart + rowYHeight - 16;
    return yStart + rowYHeight / 2 + 4;
  };

  // Tạo các mũi tên biến thiên trong hàng y
  const arrows: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    key: string;
  }> = [];

  for (let i = 0; i < numPoints - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const inter = intervals[i];

    if (inter?.isExcludedDomain) {
      continue; // Miền không xác định, không vẽ mũi tên
    }

    const startX = getPointX(i);
    const endX = getPointX(i + 1);

    // Xác định điểm bắt đầu của mũi tên
    let y1 = getYPosValue(p1.isAsymptote ? p1.yRightPosition || "bottom" : p1.yPosition);
    let x1 = p1.isAsymptote ? startX + 16 : startX + 18;

    // Xác định điểm kết thúc của mũi tên
    let y2 = getYPosValue(p2.isAsymptote ? p2.yLeftPosition || "top" : p2.yPosition);
    let x2 = p2.isAsymptote ? endX - 16 : endX - 18;

    // Khoảng cách an toàn để đầu mũi tên và đuôi mũi tên không chạm sát đè lên chữ số
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);

    if (dist > 30) {
      const margin = 10;
      const nx = dx / dist;
      const ny = dy / dist;
      arrows.push({
        x1: x1 + nx * margin,
        y1: y1 + ny * margin - 4,
        x2: x2 - nx * margin,
        y2: y2 - ny * margin - 4,
        key: `arrow-${i}`
      });
    }
  }

  return (
    <div 
      ref={containerRef}
      className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm inline-block select-none"
      style={{ minWidth: `${totalWidth + 48}px` }}
    >
      {/* Tiêu đề hàm số & Tập xác định */}
      <div className="mb-4 text-center">
        <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight font-serif">
          BẢNG BIẾN THIÊN {functionName ? `: ${formatMathSymbol(functionName)}` : ""}
        </h3>
        {domainNote && (
          <p className="text-xs text-slate-500 font-serif italic mt-0.5">
            {formatMathSymbol(domainNote)}
          </p>
        )}
      </div>

      {/* KHUNG BẢNG BIẾN THIÊN CHUẨN SGK TOÁN THPT (QUY TẮC ĐỒ HỌA TUYỆT ĐỐI) */}
      <div 
        className="relative bg-white rounded-lg overflow-hidden border-2 border-slate-800"
        style={{ width: `${totalWidth}px`, height: `${totalHeight}px` }}
      >
        <svg 
          width={totalWidth} 
          height={totalHeight} 
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="absolute inset-0"
        >
          <defs>
            {/* Đầu mũi tên hình học sắc nét chuẩn SGK */}
            <marker 
              id="bbt-arrow" 
              viewBox="0 0 10 10" 
              refX="6" 
              refY="5" 
              markerWidth="6" 
              markerHeight="6" 
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e40af" />
            </marker>

            {/* Pattern gạch chéo song song (//) che phủ khoảng ngoài tập xác định */}
            <pattern 
              id="hatch-pattern" 
              width="10" 
              height="10" 
              patternTransform="rotate(45 0 0)" 
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="10" stroke="#94a3b8" strokeWidth="1.2" />
            </pattern>
          </defs>

          {/* 1. KHUNG VÁCH NGĂN CHUẨN SGK:
              - DUY NHẤT 1 VÁCH DỌC giữa cột nhãn và vùng nội dung
              - ĐÚNG 2 VÁCH NGANG: dưới hàng x và dưới hàng y' 
          */}
          {/* Vách dọc phân cách nhãn và nội dung */}
          <line 
            x1={leftLabelWidth} 
            y1={0} 
            x2={leftLabelWidth} 
            y2={totalHeight} 
            stroke="#1e293b" 
            strokeWidth="1.5" 
          />

          {/* Vách ngang 1: dưới hàng x */}
          <line 
            x1={0} 
            y1={rowXHeight} 
            x2={totalWidth} 
            y2={rowXHeight} 
            stroke="#1e293b" 
            strokeWidth="1.5" 
          />

          {/* Vách ngang 2: dưới hàng y' */}
          <line 
            x1={0} 
            y1={rowXHeight + rowYPrimeHeight} 
            x2={totalWidth} 
            y2={rowXHeight + rowYPrimeHeight} 
            stroke="#1e293b" 
            strokeWidth="1.5" 
          />

          {/* CỘT NHÃN BÊN TRÁI: x, y', y */}
          <text 
            x={leftLabelWidth / 2} 
            y={27} 
            textAnchor="middle" 
            fontFamily="'Times New Roman', Times, serif" 
            fontSize="18" 
            fontStyle="italic" 
            fontWeight="bold" 
            fill="#0f172a"
          >
            x
          </text>

          <text 
            x={leftLabelWidth / 2} 
            y={rowXHeight + 27} 
            textAnchor="middle" 
            fontFamily="'Times New Roman', Times, serif" 
            fontSize="18" 
            fontStyle="italic" 
            fontWeight="bold" 
            fill="#0f172a"
          >
            y'
          </text>

          <text 
            x={leftLabelWidth / 2} 
            y={rowXHeight + rowYPrimeHeight + rowYHeight / 2 + 6} 
            textAnchor="middle" 
            fontFamily="'Times New Roman', Times, serif" 
            fontSize="18" 
            fontStyle="italic" 
            fontWeight="bold" 
            fill="#0f172a"
          >
            y
          </text>

          {/* HÀNG X: Các điểm mốc */}
          {points.map((pt, idx) => {
            const xPos = getPointX(idx);
            return (
              <text
                key={`x-${idx}`}
                x={xPos}
                y={27}
                textAnchor="middle"
                fontFamily="'Times New Roman', Times, serif"
                fontSize="16"
                fontWeight="bold"
                fill="#0f172a"
              >
                {formatMathSymbol(pt.x)}
              </text>
            );
          })}

          {/* MIỀN NGOÀI TẬP XÁC ĐỊNH (TÔ GẠCH CHÉO // XUYÊN SUỐT) */}
          {intervals.map((inter, idx) => {
            if (!inter.isExcludedDomain) return null;
            const xLeft = getPointX(idx);
            const xRight = getPointX(idx + 1);
            const width = xRight - xLeft;
            return (
              <rect
                key={`excluded-${idx}`}
                x={xLeft}
                y={rowXHeight}
                width={width}
                height={rowYPrimeHeight + rowYHeight}
                fill="url(#hatch-pattern)"
                stroke="#64748b"
                strokeWidth="0.5"
              />
            );
          })}

          {/* HÀNG Y': Dấu (+, -) hoặc giá trị 0 hoặc vạch || */}
          {/* Dấu y' trên từng khoảng */}
          {intervals.map((inter, idx) => {
            if (inter.isExcludedDomain || !inter.sign) return null;
            const midX = (getPointX(idx) + getPointX(idx + 1)) / 2;
            return (
              <text
                key={`sign-${idx}`}
                x={midX}
                y={rowXHeight + 28}
                textAnchor="middle"
                fontFamily="'Times New Roman', Times, serif"
                fontSize="20"
                fontWeight="bold"
                fill="#1e40af"
              >
                {inter.sign}
              </text>
            );
          })}

          {/* Điểm đạo hàm triệt tiêu (=0) hoặc không xác định tại các điểm mốc */}
          {points.map((pt, idx) => {
            const xPos = getPointX(idx);

            // 1. Tiệm cận đứng (cả y' và y không xác định) -> Vạch || kéo thẳng xuyên suốt từ hàng y' xuống đáy hàng y
            if (pt.isAsymptote) {
              return (
                <g key={`double-line-full-${idx}`}>
                  <line 
                    x1={xPos - 2} 
                    y1={rowXHeight} 
                    x2={xPos - 2} 
                    y2={totalHeight} 
                    stroke="#dc2626" 
                    strokeWidth="1.5" 
                  />
                  <line 
                    x1={xPos + 2} 
                    y1={rowXHeight} 
                    x2={xPos + 2} 
                    y2={totalHeight} 
                    stroke="#dc2626" 
                    strokeWidth="1.5" 
                  />
                </g>
              );
            }

            // 2. Chỉ đạo hàm không xác định, hàm số xác định -> Vạch || chỉ nằm ở hàng y'
            if (pt.isDerivativeUndefinedOnly) {
              return (
                <g key={`double-line-yprime-${idx}`}>
                  <line 
                    x1={xPos - 2} 
                    y1={rowXHeight} 
                    x2={xPos - 2} 
                    y2={rowXHeight + rowYPrimeHeight} 
                    stroke="#dc2626" 
                    strokeWidth="1.4" 
                  />
                  <line 
                    x1={xPos + 2} 
                    y1={rowXHeight} 
                    x2={xPos + 2} 
                    y2={rowXHeight + rowYPrimeHeight} 
                    stroke="#dc2626" 
                    strokeWidth="1.4" 
                  />
                </g>
              );
            }

            // 3. Đạo hàm bằng 0 tại cực trị
            if (pt.yPrime === "0") {
              return (
                <text
                  key={`zero-${idx}`}
                  x={xPos}
                  y={rowXHeight + 27}
                  textAnchor="middle"
                  fontFamily="'Times New Roman', Times, serif"
                  fontSize="16"
                  fill="#334155"
                >
                  0
                </text>
              );
            }

            return null;
          })}

          {/* HÀNG Y: MŨI TÊN BIẾN THIÊN LIỀN MẠCH, DÀI THANH THOÁT */}
          {arrows.map((arr) => (
            <line
              key={arr.key}
              x1={arr.x1}
              y1={arr.y1}
              x2={arr.x2}
              y2={arr.y2}
              stroke="#1d4ed8"
              strokeWidth="1.8"
              markerEnd="url(#bbt-arrow)"
              strokeLinecap="round"
            />
          ))}

          {/* HÀNG Y: CÁC GIÁ TRỊ TẠI ĐẦU MÚT MŨI TÊN (CỰC ĐẠI, CỰC TIỂU, VÔ CÙNG, TIỆM CẬN) */}
          {points.map((pt, idx) => {
            const xPos = getPointX(idx);

            // Trường hợp tiệm cận đứng: vẽ 2 giá trị 2 bên vạch || (tiến về -∞ hoặc +∞)
            if (pt.isAsymptote) {
              const yLeft = getYPosValue(pt.yLeftPosition || "top");
              const yRight = getYPosValue(pt.yRightPosition || "bottom");

              return (
                <g key={`asymptote-vals-${idx}`}>
                  {pt.yLeftVal && (
                    <text
                      x={xPos - 12}
                      y={yLeft}
                      textAnchor="end"
                      fontFamily="'Times New Roman', Times, serif"
                      fontSize="15"
                      fontWeight="bold"
                      fill="#0f172a"
                    >
                      {formatMathSymbol(pt.yLeftVal)}
                    </text>
                  )}
                  {pt.yRightVal && (
                    <text
                      x={xPos + 12}
                      y={yRight}
                      textAnchor="start"
                      fontFamily="'Times New Roman', Times, serif"
                      fontSize="15"
                      fontWeight="bold"
                      fill="#0f172a"
                    >
                      {formatMathSymbol(pt.yRightVal)}
                    </text>
                  )}
                </g>
              );
            }

            // Điểm bình thường
            if (!pt.yVal) return null;
            const yCoord = getYPosValue(pt.yPosition);

            return (
              <text
                key={`yval-${idx}`}
                x={xPos}
                y={yCoord}
                textAnchor="middle"
                fontFamily="'Times New Roman', Times, serif"
                fontSize="15"
                fontWeight="bold"
                fill="#0f172a"
              >
                {formatMathSymbol(pt.yVal)}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT & WORKFLOW CONTROLLER
// ============================================================================
export const VariationTableGenerator: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("eduplan_gemini_api_key_v2") || localStorage.getItem("gemini_user_api_key") || "";
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [userPrompt, setUserPrompt] = useState<string>("Khảo sát và vẽ Bảng biến thiên hàm số bậc ba: y = x^3 - 3x^2 + 4");
  
  const [bbtData, setBbtData] = useState<BBTData>(MOCK_CUBIC_FUNCTION);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);

  const bbtContainerRef = useRef<HTMLDivElement>(null);

  // Lưu API Key cá nhân vào localStorage
  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem("gemini_user_api_key", newKey.trim());
  };

  // ============================================================================
  // REQUIREMENT 1: GỌI GEMINI API THÔNG MINH (TIỀN TỐ NGẦM)
  // ============================================================================
  const handleGenerateBBT = async () => {
    if (!userPrompt.trim()) {
      setError("Vui lòng nhập hàm số hoặc yêu cầu khảo sát biến thiên.");
      return;
    }

    setIsLoading(true);
    setError(null);

    // Tiền tố vai trò chuyên gia bắt buộc theo yêu cầu hệ thống
    const finalPrompt = `Bạn là chuyên gia toán học sư phạm và lập trình SVG chuẩn SGK GDPT Việt Nam. Hãy phân tích hàm số và trả về dữ liệu cấu trúc JSON chuẩn xác để vẽ Bảng biến thiên.\n\nYêu cầu: ${userPrompt}`;

    const effectiveKey = apiKey.trim() || localStorage.getItem("eduplan_gemini_api_key_v2") || "";

    try {
      let jsonText = "";

      if (effectiveKey) {
        // Sử dụng GoogleGenAI SDK với key cá nhân
        const ai = new GoogleGenAI({ apiKey: effectiveKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                functionName: { type: Type.STRING, description: "Tên hàm số dạng LaTeX, ví dụ: y = x^3 - 3x^2 + 4" },
                domainNote: { type: Type.STRING, description: "Tập xác định, ví dụ: D = R hoặc D = R \\ {-1}" },
                points: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      x: { type: Type.STRING, description: "Tọa độ x (-\\infty, 0, 1, +\\infty)" },
                      yPrime: { type: Type.STRING, description: "Giá trị y' tại x ('0', '+', '-', '||')" },
                      isAsymptote: { type: Type.BOOLEAN, description: "true nếu là tiệm cận đứng (vạch || cả y' và y)" },
                      isDerivativeUndefinedOnly: { type: Type.BOOLEAN, description: "true nếu chỉ y' không xác định, hàm y vẫn xác định" },
                      yVal: { type: Type.STRING, description: "Giá trị y tại x nếu liên tục" },
                      yPosition: { type: Type.STRING, enum: ["top", "bottom", "middle"], description: "Vị trí chiều cao nhãn y" },
                      yLeftVal: { type: Type.STRING, description: "Giới hạn bên trái tiệm cận đứng x -> x0^-" },
                      yLeftPosition: { type: Type.STRING, enum: ["top", "bottom", "middle"] },
                      yRightVal: { type: Type.STRING, description: "Giới hạn bên phải tiệm cận đứng x -> x0^+" },
                      yRightPosition: { type: Type.STRING, enum: ["top", "bottom", "middle"] }
                    },
                    required: ["x"]
                  }
                },
                intervals: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      sign: { type: Type.STRING, enum: ["+", "-", ""], description: "Dấu của y'" },
                      isExcludedDomain: { type: Type.BOOLEAN, description: "true nếu khoảng ngoài TXĐ (tô //)" },
                      trend: { type: Type.STRING, enum: ["increasing", "decreasing", "none"], description: "Chiều mũi tên" }
                    }
                  }
                }
              },
              required: ["functionName", "points", "intervals"]
            }
          }
        });

        jsonText = response.text || "";
      } else {
        // Fallback qua proxy nội bộ ứng dụng
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `${finalPrompt}\n\nTrả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng BBTData.`
          })
        });
        const data = await res.json();
        jsonText = data.text || "";
      }

      if (!jsonText) throw new Error("Không nhận được phản hồi từ AI.");

      // Clean markdown code fence if exists
      const cleanJson = jsonText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed: BBTData = JSON.parse(cleanJson);

      if (!parsed.points || parsed.points.length < 2) {
        throw new Error("Dữ liệu BBT không hợp lệ: Cần ít nhất 2 mốc trên trục x.");
      }

      setBbtData(parsed);
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      setError(err?.message || "Đã xảy ra lỗi khi phân tích hàm số bằng Gemini API. Vui lòng kiểm tra lại API Key.");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // REQUIREMENT 3: XUẤT BBT RA ẢNH ĐỘ NÉT CAO (PNG BASE64)
  // ============================================================================
  const captureBbtPngBase64 = async (): Promise<string> => {
    if (!bbtContainerRef.current) throw new Error("Không tìm thấy khung Bảng biến thiên.");
    
    // Cấu hình bắt buộc: backgroundColor trắng tuyệt đối + pixelRatio: 2 (siêu nét A4)
    return await toPng(bbtContainerRef.current, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      cacheBust: true
    });
  };

  const handleDownloadPng = async () => {
    try {
      setIsExportingPng(true);
      const dataUrl = await captureBbtPngBase64();
      saveAs(dataUrl, `BangBienThien_${bbtData.functionName.replace(/[^a-zA-Z0-9]/g, "_") || "Toan"}.png`);
    } catch (e: any) {
      alert("Lỗi khi xuất ảnh PNG: " + (e?.message || ""));
    } finally {
      setIsExportingPng(false);
    }
  };

  // ============================================================================
  // REQUIREMENT 4: TÍCH HỢP TẢI FILE WORD (.DOCX) CHỐNG VỠ KHUNG
  // ============================================================================
  const handleDownloadDocx = async () => {
    try {
      setIsExportingWord(true);

      // 1. Chụp BBT thành ảnh PNG Base64 siêu nét (pixelRatio 2)
      const dataUrl = await captureBbtPngBase64();
      
      // 2. Chuyển Base64 sang Uint8Array
      const imageBytes = base64ToUint8Array(dataUrl);

      // 3. Tạo tài liệu Word chuẩn Office, chèn ảnh căn giữa trang với ImageRun
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 inch lề chuẩn A4
              }
            },
            children: [
              new Paragraph({
                text: "BẢNG BIẾN THIÊN HÀM SỐ (CHUẨN BỘ GIÁO DỤC)",
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 }
              }),
              new Paragraph({
                text: `Hàm số: ${formatMathSymbol(bbtData.functionName)}`,
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 }
              }),
              ...(bbtData.domainNote ? [
                new Paragraph({
                  text: formatMathSymbol(bbtData.domainNote),
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 240 }
                })
              ] : []),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    type: "png",
                    data: imageBytes,
                    transformation: {
                      width: 500, // Chiều rộng vừa vặn hoàn hảo bề ngang khổ giấy A4
                      height: 200 // Chiều cao cân đối theo tỉ lệ khung
                    }
                  })
                ],
                spacing: { after: 200 }
              }),
              new Paragraph({
                text: "* Ghi chú: Hình ảnh Bảng biến thiên được nhúng dạng Vector/Raster độ nét cao, bảo toàn 100% đồ họa trên mọi phiên bản Microsoft Word (2010 - 2021, Office 365, Word Mobile).",
                alignment: AlignmentType.CENTER,
                spacing: { before: 100 }
              })
            ]
          }
        ]
      });

      // 4. Đóng gói và tải file .docx về máy tính
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `BangBienThien_${bbtData.functionName.replace(/[^a-zA-Z0-9]/g, "_") || "Toan"}.docx`);
    } catch (e: any) {
      console.error("DOCX Export Error:", e);
      alert("Lỗi khi tạo file Word: " + (e?.message || ""));
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(bbtData, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                Chuẩn SGK GDPT Mới
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-semibold">
                Gemini 2.5 Flash
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tạo Bảng Biến Thiên Toán THPT Chuẩn SGK
            </h1>
            <p className="text-blue-100 text-sm mt-1 max-w-2xl leading-relaxed">
              Tự động phân tích hàm số (Đa thức, Phân thức tiệm cận, Căn thức), vẽ Bảng biến thiên SVG liền mạch và xuất Word (.docx) chống vỡ khung 100%.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBbtData(MOCK_CUBIC_FUNCTION);
                setUserPrompt("Khảo sát và vẽ Bảng biến thiên hàm số bậc ba: y = x^3 - 3x^2 + 4");
              }}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium backdrop-blur-xs transition-colors"
            >
              Mẫu: Hàm Bậc 3
            </button>
            <button
              onClick={() => {
                setBbtData(MOCK_RATIONAL_FUNCTION);
                setUserPrompt("Khảo sát và vẽ Bảng biến thiên hàm phân thức hữu tỉ có tiệm cận: y = (2x - 1) / (x + 1)");
              }}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium backdrop-blur-xs transition-colors"
            >
              Mẫu: Hàm Phân Thức
            </button>
            <button
              onClick={() => {
                setBbtData(MOCK_RADICAL_FUNCTION);
                setUserPrompt("Khảo sát và vẽ Bảng biến thiên hàm số chứa căn thức: y = \\sqrt{x^2 - 4}");
              }}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium backdrop-blur-xs transition-colors"
            >
              Mẫu: Hàm Căn Thức
            </button>
          </div>
        </div>
      </div>

      {/* INPUT CONTROL PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI: NHẬP API KEY & CÂU HỎI HÀM SỐ (REQUIREMENT 1) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-3">
            <Key className="w-5 h-5 text-blue-600" />
            <span>Cấu hình Gemini API & Hàm số</span>
          </div>

          {/* Ô nhập API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Google Gemini API Key:</span>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer" 
                className="text-blue-600 hover:underline text-[11px]"
              >
                Lấy mã API miễn phí &rarr;
              </a>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => handleSaveApiKey(e.target.value)}
                placeholder="Dán API Key (AIzaSy...) hoặc để trống dùng key hệ thống"
                className="w-full text-xs font-mono px-3 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              * Key được lưu an toàn trực tiếp trên trình duyệt của bạn (Client-side).
            </p>
          </div>

          {/* Khung nhập Prompt hàm số */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Yêu cầu hàm số hoặc câu hỏi toán học (userPrompt):
            </label>
            <textarea
              rows={4}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Ví dụ: Khảo sát sự biến thiên của hàm số y = (x^2 - 3x + 2) / (x - 1) hoặc hàm số y = -x^4 + 2x^2 + 1..."
              className="w-full text-xs font-sans p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none leading-relaxed"
            />
          </div>

          {/* Gợi ý hàm số nhanh */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Gợi ý nhanh:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                "y = x^3 - 3x + 2",
                "y = (x + 2) / (x - 1)",
                "y = (x^2 - x + 1) / (x - 1)",
                "y = x^4 - 2x^2 - 1",
                "y = \\sqrt{4 - x^2}"
              ].map((fn, idx) => (
                <button
                  key={idx}
                  onClick={() => setUserPrompt(`Khảo sát và vẽ Bảng biến thiên hàm số: ${fn}`)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-serif rounded-md transition-colors"
                >
                  {fn}
                </button>
              ))}
            </div>
          </div>

          {/* Nút Kích hoạt Gemini phân tích */}
          <button
            onClick={handleGenerateBBT}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI đang phân tích & vẽ BBT...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Tạo Bảng biến thiên AI</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: HIỂN THỊ BBT & XUẤT FILE CHỐNG VỠ KHUNG (REQUIREMENTS 2, 3, 4) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Bảng Biến Thiên Hiển Thị (SVG Canvas)</span>
              </div>

              {/* Nhóm nút xuất file cao cấp */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPng}
                  disabled={isExportingPng}
                  title="Xuất ảnh PNG độ phân giải cao 2x"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isExportingPng ? "Đang xuất..." : "Tải ảnh PNG"}</span>
                </button>

                <button
                  onClick={handleDownloadDocx}
                  disabled={isExportingWord}
                  title="Tải tài liệu Word (.docx) chứa BBT không bị vỡ khung"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExportingWord ? "Đang đóng gói Word..." : "Tải file Word (.docx)"}</span>
                </button>
              </div>
            </div>

            {/* VÙNG HIỂN THỊ BBT SVG */}
            <div className="overflow-x-auto flex justify-center py-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <VariationTableView data={bbtData} containerRef={bbtContainerRef} />
            </div>
          </div>

          {/* THANH THAO TÁC PHỤ */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Đồ họa chuẩn SGK: 1 vách dọc, 2 vách ngang, mũi tên liên tục</span>
            </div>

            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? "Đã chép JSON" : "Sao chép cấu trúc JSON"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
