import React from "react";
import { MarkdownRenderer } from "../MarkdownRenderer";

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
  fromVal: string;
  toVal: string;
  sign: "+" | "-";
}

interface VariationTableProps {
  title?: string;
  points: VariationTablePoint[]; // points along the x-axis
  intervals: VariationInterval[]; // intervals between points
  className?: string;
}

export const VariationTable: React.FC<VariationTableProps> = ({
  title = "Bảng biến thiên (BBT)",
  points,
  intervals,
  className = ""
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-xs overflow-x-auto ${className}`}>
      {title && (
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>{title}</span>
        </div>
      )}

      {/* BBT SGK Standard Grid Table */}
      <div className="min-w-[480px] border-2 border-slate-700 rounded-lg overflow-hidden bg-white text-xs sm:text-sm select-none">
        
        {/* ROW 1: Dòng x */}
        <div className="flex border-b border-slate-700 bg-slate-50 font-serif">
          <div className="w-16 sm:w-20 shrink-0 p-2 font-bold text-center border-r border-slate-700 flex items-center justify-center bg-slate-100">
            $x$
          </div>
          <div className="flex-1 flex items-center justify-between px-4 py-2">
            {points.map((pt, idx) => (
              <React.Fragment key={idx}>
                <div className="text-center font-medium">
                  <MarkdownRenderer content={`$${pt.x}$`} />
                </div>
                {idx < points.length - 1 && <div className="flex-1" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ROW 2: Dòng y' */}
        <div className="flex border-b border-slate-700 font-serif">
          <div className="w-16 sm:w-20 shrink-0 p-2 font-bold text-center border-r border-slate-700 flex items-center justify-center bg-slate-100">
            $y'$
          </div>
          <div className="flex-1 flex items-center justify-between px-4 py-1.5">
            {points.map((pt, idx) => (
              <React.Fragment key={idx}>
                {/* Value at point */}
                <div className="text-center font-bold min-w-[20px]">
                  {pt.isDiscontinuity ? (
                    <span className="text-red-500 font-black tracking-tighter">||</span>
                  ) : (
                    <span>{pt.yPrime || "0"}</span>
                  )}
                </div>

                {/* Sign between points */}
                {idx < intervals.length && (
                  <div className="flex-1 text-center font-bold text-blue-700">
                    {intervals[idx].sign}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ROW 3: Dòng y (Mũi tên biến thiên) */}
        <div className="flex font-serif min-h-[96px]">
          <div className="w-16 sm:w-20 shrink-0 p-2 font-bold text-center border-r border-slate-700 flex items-center justify-center bg-slate-100">
            $y$
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
                          {pt.yLeftVal && <MarkdownRenderer content={`$${pt.yLeftVal}$`} />}
                        </div>
                        <span>||</span>
                        <div className="flex flex-col justify-between h-full py-1 text-xs">
                          {pt.yRightVal && <MarkdownRenderer content={`$${pt.yRightVal}$`} />}
                        </div>
                      </div>
                    ) : (
                      <div className={`text-center font-semibold text-slate-800 ${
                        pt.yPosition === "top" ? "mb-auto" : pt.yPosition === "bottom" ? "mt-auto" : "my-auto"
                      }`}>
                        {pt.yVal && <MarkdownRenderer content={`$${pt.yVal}$`} />}
                      </div>
                    )}
                  </div>

                  {/* Arrow column between points */}
                  {idx < intervals.length && (
                    <div className="flex-1 flex items-center justify-center px-1">
                      {intervals[idx].trend === "increasing" ? (
                        <div className="w-full flex items-center justify-center text-emerald-600 font-bold text-xl sm:text-2xl">
                          <span className="transform -rotate-12">↗</span>
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-center text-blue-600 font-bold text-xl sm:text-2xl">
                          <span className="transform rotate-12">↘</span>
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
