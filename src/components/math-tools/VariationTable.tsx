import React from "react";
import { generateBbtSvg } from "../../lib/bbtRenderer";
import { BBTData } from "./VariationTableGenerator";

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
  const bbtData: BBTData = {
    functionName: '',
    points: points.map(pt => ({
      x: pt.x,
      yPrime: showDerivative ? pt.yPrime : undefined,
      isAsymptote: pt.isDiscontinuity,
      yVal: pt.yVal,
      yPosition: pt.yPosition,
      yLeftVal: pt.yLeftVal,
      yRightVal: pt.yRightVal,
      yLeftPosition: pt.yLeftVal?.includes('-') ? 'bottom' : 'top',
      yRightPosition: pt.yRightVal?.includes('+') ? 'top' : 'bottom'
    })),
    intervals: intervals.map(inter => ({
      sign: showDerivative ? (inter.sign || (inter.trend === 'decreasing' ? '-' : '+')) : '',
      trend: inter.trend
    }))
  };

  const svgHtml = generateBbtSvg(bbtData);

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

      {/* BBT SGK Standard Vector SVG */}
      <div className="w-full flex justify-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: svgHtml }} />
    </div>
  );
};
