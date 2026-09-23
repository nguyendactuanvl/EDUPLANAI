import { Trophy, BookOpen, Calendar, FileText, Settings, Sparkles, Clock, ClipboardList, FileEdit, FileCheck, Users, ShieldCheck, CalendarDays, Key, Calculator } from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, onOpenSettings }: SidebarProps) {
  const navGroups = [
    {
      title: "Chuyên môn & Soạn giảng",
      items: [
        { id: "khgd", label: "Kế hoạch giáo dục", icon: Calendar },
        { id: "khdh", label: "Kế hoạch dạy học", icon: BookOpen },
        { id: "worksheets", label: "Phiếu học tập", icon: ClipboardList },
        { id: "exercise", label: "Giải bài tập", icon: Sparkles },
        { id: "math_tools", label: "Công cụ Toán học", icon: Calculator },
        { id: "pdf2word", label: "Chuyển PDF sang Word", icon: FileEdit },
        { id: "exam", label: "Tạo & Trộn đề", icon: FileCheck },
      ]
    },
    {
      title: "Nghiệp vụ Giáo viên & Công tác Chủ nhiệm",
      items: [
        { id: "homeroom", label: "Sổ Chủ Nhiệm & QL", icon: ShieldCheck },
        { id: "classmap", label: "Sơ đồ lớp", icon: Users },
        { id: "gamification", label: "Thi đua & Gọi tên", icon: Trophy },
      ]
    },
    {
      title: "Tiện ích & Hồ sơ",
      items: [
        { id: "timetable", label: "TKB & Công việc", icon: CalendarDays },
        { id: "circulars", label: "Tài liệu & Thông tư", icon: FileText },
        { id: "history", label: "Lịch sử đã tạo", icon: Clock },
      ]
    }
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-full flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3 text-emerald-400">
          <Sparkles className="h-8 w-8" />
          <h1 className="text-xl font-bold">EduPlan AI</h1>
        </div>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Ứng dụng đa năng cho GV<br/>
          (Đăng ký app: LH Zalo 0835606162)
        </p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-6 last:mb-2">
            <h3 className="px-6 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-r-4 border-emerald-500"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800">
        <button 
          onClick={onOpenSettings}
          className="flex items-center gap-3 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors w-full text-left"
        >
          <Key className="h-5 w-5" />
          Nhập mã API key của bạn ở đây
        </button>
      </div>
    </div>
  );
}

