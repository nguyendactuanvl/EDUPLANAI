import React from "react";
import { MarkdownRenderer, MathSpan } from "../MarkdownRenderer";

export interface VariationTablePoint {
  x: string;               // LaTeX string e.g. "-\\infty", "1", "2", "+\\infty"
  yPrime?: string;         // "+", "-", "0", or "||"
  yVal?: string;           // value of y e.g. "-\\infty", "4", "+\\infty"
  yPosition?: "top" | "bottom" | "middle"; // where to place in row y
  isDiscontinuity?: boolean; // double bar for both y' and y
  yLeftVal?: string;       // for vertical asymptote e.g. "-\\infty" on left
  yRightVal?: string;      // for vertical asymptote e.g. "+\\infty" on right
}

export interface VariationInterval {
  trend: "increasing" | "decreasing" | "none";
  fromVal?: string;
  toVal?: string;
  sign?: "+" | "-" | "";
}

interface VariationTableProps {
  title?: string;
  points: VariationTablePoint[]; // points along the x-axis
  intervals: VariationInterval[]; // intervals between points
  showDerivative?: boolean;       // false for Grade 10 Parabola (2 rows), true for Grade 11/12 (3 rows)
  className?: string;
}

export const VariationTable: React.FC<VariationTableProps> = ({
  title = "Bảng biến thiên (BBT)",
  points,
  intervals,
  showDerivative = true,
  className = ""
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-xs overflow-x-auto ${className}`}>
      {title && (
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>{title}</span>
          {!showDerivative && (
            <span className="text-[10px] font-normal text-slate-400 normal-case ml-auto bg-slate-100 px-2 py-0.5 rounded-full">
              Chuẩn SGK Toán 10 (2 dòng)
            </span>
          )}
        </div>
      )}

      {/* BBT SGK Standard Grid Table */}
      <div className="min-w-[480px] border-2 border-slate-700 rounded-lg overflow-hidden bg-white text-xs sm:text-sm select-none">
        
        {/* ROW 1: Dòng x */}
        <div className="flex border-b border-slate-700 bg-slate-50 font-serif">
          <div className="w-16 sm:w-20 shrink-0 p-2 font-bold text-center border-r border-slate-700 flex items-center justify-center bg-slate-100">
            <MathSpan content="$x$" />
          </div>
          <div className="flex-1 flex items-center justify-between px-4 py-2">
            {points.map((pt, idx) => (
              <React.Fragment key={idx}>
                <div className="text-center font-medium">
                  <MarkdownRenderer inline content={`$${pt.x}$`} />
                </div>
                {idx < points.length - 1 && <div className="flex-1" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ROW 2: Dòng y' (CHỈ HIỂN THỊ KHI showDerivative === true - DÀNH CHO LỚP 11 & 12) */}
        {showDerivative && (
          <div className="flex border-b border-slate-700 font-serif">
            <div className="w-16 sm:w-20 shrink-0 p-2 font-bold text-center border-r border-slate-700 flex items-center justify-center bg-slate-100">
              <MathSpan content="$y'$" />
            </div>
            <div className="flex-1 flex items-center justify-between px-4 py-1.5">
              {points.map((pt, idx) => (
                <React.Fragment key={idx}>
                  {/* Giá trị đạo hàm tại điểm mốc */}
                  <div className="text-center font-bold min-w-[24px]">
                    {pt.isDiscontinuity ? (
                      <span className="text-red-500 font-black tracking-tighter text-sm">||</span>
                    ) : pt.yPrime !== undefined && pt.yPrime !== "" ? (
                      <MarkdownRenderer inline content={`$${pt.yPrime}$`} />
                    ) : (
                      <span className="inline-block w-4">&nbsp;</span>
                    )}
                  </div>

                  {/* Dấu đạo hàm trên từng khoảng */}
                  {idx < intervals.length && (
                    <div className="flex-1 text-center font-bold text-blue-700 text-sm">
                      {intervals[idx].sign && <MarkdownRenderer inline content={`$${intervals[idx].sign}$`} />}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* ROW 3: Dòng y (Mũi tên biến thiên) */}
        <div className="flex font-serif min-h-[105px]">
          <div className="w-16 sm:w-20 shrink-0 p-2 font-bold text-center border-r border-slate-700 flex items-center justify-center bg-slate-100">
            <MathSpan content="$y$" />
          </div>

          <div className="flex-1 flex items-stretch justify-between px-4 py-2 relative">
            {points.map((pt, idx) => {
              const hasAsymptote = pt.isDiscontinuity;

              return (
                <React.Fragment key={idx}>
                  {/* Point column */}
                  <div className="flex flex-col justify-between items-center z-10 min-w-[36px] py-1">
                    {hasAsymptote ? (
                      <div className="h-full flex items-center gap-1 font-bold text-red-500 tracking-tighter text-base">
                        <div className="flex flex-col justify-between h-full py-1 text-xs">
                          {pt.yLeftVal && <MarkdownRenderer inline content={`$${pt.yLeftVal}$`} />}
                        </div>
                        <span>||</span>
                        <div className="flex flex-col justify-between h-full py-1 text-xs">
                          {pt.yRightVal && <MarkdownRenderer inline content={`$${pt.yRightVal}$`} />}
                        </div>
                      </div>
                    ) : (
                      <div className={`text-center font-semibold text-slate-800 ${
                        pt.yPosition === "top" ? "mb-auto" : pt.yPosition === "bottom" ? "mt-auto" : "my-auto"
                      }`}>
                        {pt.yVal && <MarkdownRenderer inline content={`$${pt.yVal}$`} />}
                      </div>
                    )}
                  </div>

                  {/* Arrow column between points */}
                  {idx < intervals.length && (
                    <div className="flex-1 flex items-center justify-center px-2">
                      {intervals[idx].trend === "increasing" ? (
                        <div className="w-full flex items-center justify-center text-emerald-600 font-bold text-2xl">
                          <span className="transform -rotate-12 transition-transform select-none">↗</span>
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-center text-blue-600 font-bold text-2xl">
                          <span className="transform rotate-12 transition-transform select-none">↘</span>
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
