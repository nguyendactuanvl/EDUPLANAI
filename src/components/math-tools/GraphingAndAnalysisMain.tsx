import React, { useState } from "react";
import { Grade9Graphing } from "./Grade9Graphing";
import { Grade10Graphing } from "./Grade10Graphing";
import { Grade11Graphing } from "./Grade11Graphing";
import { Grade12Graphing } from "./Grade12Graphing";
import { GradeLevel } from "./types";
import { Compass, GraduationCap, Sparkles, BookOpen } from "lucide-react";

export const GraphingAndAnalysisMain: React.FC = () => {
  const [activeGrade, setActiveGrade] = useState<GradeLevel>("grade12");

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full p-4 sm:p-6">
      {/* Grade Level Selector Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Công cụ Hỗ trợ Vẽ hình & Khảo sát hàm số (KSHS)
            </h2>
            <p className="text-xs text-slate-500">
              Chương trình chuẩn Toán từ Lớp 9 đến Lớp 12 theo GDPT 2018
            </p>
          </div>
        </div>

        {/* Grade Navigation pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveGrade("grade9")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeGrade === "grade9"
                ? "bg-white text-blue-700 font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Lớp 9</span>
          </button>

          <button
            onClick={() => setActiveGrade("grade10")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeGrade === "grade10"
                ? "bg-white text-indigo-700 font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Lớp 10</span>
          </button>

          <button
            onClick={() => setActiveGrade("grade11")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeGrade === "grade11"
                ? "bg-white text-purple-700 font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Lớp 11</span>
          </button>

          <button
            onClick={() => setActiveGrade("grade12")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeGrade === "grade12"
                ? "bg-white text-emerald-700 font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Lớp 12</span>
          </button>
        </div>
      </div>

      {/* Grade Content */}
      <div className="transition-all">
        {activeGrade === "grade9" && <Grade9Graphing />}
        {activeGrade === "grade10" && <Grade10Graphing />}
        {activeGrade === "grade11" && <Grade11Graphing />}
        {activeGrade === "grade12" && <Grade12Graphing />}
      </div>
    </div>
  );
};
