/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Analytics } from '@vercel/analytics/react';
import { Menu, Sparkles, Key, AlertCircle } from "lucide-react";
import React, { useState, Suspense, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { ErrorBoundary } from "./components/ErrorBoundary";
const EducationalPlan = React.lazy(() => import("./pages/EducationalPlan").then(module => ({ default: module.EducationalPlan })));
const LessonPlan = React.lazy(() => import("./pages/LessonPlan").then(module => ({ default: module.LessonPlan })));
const Circulars = React.lazy(() => import("./pages/Circulars").then(module => ({ default: module.Circulars })));
const HistoryPage = React.lazy(() => import("./pages/HistoryPage").then(module => ({ default: module.HistoryPage })));
const Worksheets = React.lazy(() => import("./pages/Worksheets").then(module => ({ default: module.Worksheets })));
import { SettingsModal } from "./components/SettingsModal";
const ExerciseSolver = React.lazy(() => import('./pages/ExerciseSolver').then(module => ({ default: module.ExerciseSolver })));
const PdfToWord = React.lazy(() => import('./pages/PdfToWord').then(module => ({ default: module.PdfToWord })));
const ExamGenerator = React.lazy(() => import('./pages/ExamGenerator').then(module => ({ default: module.ExamGenerator })));
const StudentExamView = React.lazy(() => import('./pages/StudentExamView').then(module => ({ default: module.StudentExamView })));
const ClassMap = React.lazy(() => import('./pages/ClassMap').then(module => ({ default: module.ClassMap })));
const HomeroomManagement = React.lazy(() => import('./pages/HomeroomManagement').then(module => ({ default: module.HomeroomManagement })));
const WeeklyTimetable = React.lazy(() => import('./pages/WeeklyTimetable').then(module => ({ default: module.WeeklyTimetable })));
const Gamification = React.lazy(() => import('./pages/Gamification').then(module => ({ default: module.Gamification })));




export default function App() {
  const [activeTab, setActiveTab] = useState("khgd");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [retryStatus, setRetryStatus] = useState<{ attempt: number, maxRetries: number, message?: string } | null>(null);

  useEffect(() => {
    const handleShowModal = () => setIsSettingsOpen(true);
    const handleRetryStatus = (e: any) => {
      setRetryStatus(e.detail);
      setTimeout(() => setRetryStatus(null), 14000);
    };

    window.addEventListener('show-api-key-modal', handleShowModal);
    window.addEventListener('api-retry-status', handleRetryStatus);
    
    const storedKey = localStorage.getItem("eduplan_gemini_api_key_v2");
    if (!storedKey) {
      setIsSettingsOpen(true);
    }

    return () => {
      window.removeEventListener('show-api-key-modal', handleShowModal);
      window.removeEventListener('api-retry-status', handleRetryStatus);
    };
  }, []);

  
  const urlParams = new URLSearchParams(window.location.search);
  const studentExamId = urlParams.get('examId') || urlParams.get('exam') || urlParams.get('code') || urlParams.get('pin');
  const studentExamData = urlParams.get('examData');
  const isStudentMode = urlParams.get('mode') === 'student' || urlParams.get('view') === 'exam';

  if (studentExamId) {
    return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-100">Đang tải đề thi...</div>}><StudentExamView examId={studentExamId} /></Suspense>;
  }
  if (studentExamData) {
    return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-100">Đang tải đề thi...</div>}><StudentExamView examRawData={studentExamData} /></Suspense>;
  }
  if (isStudentMode) {
    return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-100">Đang tải phòng thi...</div>}><StudentExamView /></Suspense>;
  }
  
  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {retryStatus && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-5">
          <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
          <div className="text-sm">
            <p className="font-semibold">{retryStatus.message || "Hệ thống AI đang bận (Lỗi quá tải - 429)"}</p>
            <p>Đang tự động thử lại... ({retryStatus.attempt}/{retryStatus.maxRetries})</p>
          </div>
        </div>
      )}
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false);
          }} 
          onOpenSettings={() => {
            setIsSettingsOpen(true);
            setIsSidebarOpen(false);
          }}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 shrink-0 shadow-sm z-10 relative">
          <div className="flex items-center gap-2 text-emerald-600">
             <Sparkles className="h-6 w-6" />
             <span className="font-bold text-lg hidden sm:inline">EduPlan AI</span>
             <span className="font-bold text-lg sm:hidden">EduPlan</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md text-xs font-medium hover:bg-emerald-100 transition-colors">
              <Key className="h-3.5 w-3.5" />
              <span>API Key</span>
            </button>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto relative w-full h-full">
          <ErrorBoundary key={activeTab}>
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500">Đang tải...</div>}>
              {activeTab === "khgd" && <EducationalPlan />}
              {activeTab === "khdh" && <LessonPlan />}
              {activeTab === "worksheets" && <Worksheets />}
              {activeTab === "exercise" && <ExerciseSolver />}
              {activeTab === "gamification" && <Gamification />}
              {activeTab === "classmap" && <ClassMap />}
              {activeTab === "homeroom" && <HomeroomManagement />}
              {activeTab === "timetable" && <WeeklyTimetable />}
              {activeTab === "exam" && <ExamGenerator />}
              {activeTab === "pdf2word" && <PdfToWord />}
              {activeTab === "circulars" && <Circulars />}
              {activeTab === "history" && <HistoryPage />}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <Analytics />
    </div>
  );
}
