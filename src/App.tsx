/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Menu, Sparkles, Key, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { EducationalPlan } from "./pages/EducationalPlan";
import { LessonPlan } from "./pages/LessonPlan";
import { Circulars } from "./pages/Circulars";
import { HistoryPage } from "./pages/HistoryPage";
import { Worksheets } from "./pages/Worksheets";
import { SettingsModal } from "./components/SettingsModal";
import { ExerciseSolver } from './pages/ExerciseSolver';
import { PdfToWord } from './pages/PdfToWord';
import { ExamGenerator } from './pages/ExamGenerator';
import { StudentExamView } from './pages/StudentExamView';
import { ClassMap } from './pages/ClassMap';
import { HomeroomManagement } from './pages/HomeroomManagement';
import { WeeklyTimetable } from './pages/WeeklyTimetable';
import { Gamification } from './pages/Gamification';




export default function App() {
  const [activeTab, setActiveTab] = useState("khgd");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [retryStatus, setRetryStatus] = useState<{ attempt: number, maxRetries: number } | null>(null);

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
  const studentExamId = urlParams.get('examId');
  const studentExamData = urlParams.get('examData');
  if (studentExamId) {
    return <StudentExamView examId={studentExamId} />;
  }
  if (studentExamData) {
    return <StudentExamView examRawData={studentExamData} />;
  }
  
  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {retryStatus && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-5">
          <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
          <div className="text-sm">
            <p className="font-semibold">Hệ thống AI đang bận (Lỗi quá tải - 429)</p>
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
        </div>
      </main>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
