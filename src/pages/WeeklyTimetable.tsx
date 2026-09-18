import { apiFetch } from '../lib/apiFetch';
import { parseApiResponse } from '../lib/utils';
import { useState, useEffect } from "react";
import { Calendar, Plus, Upload, CheckSquare, Trash2, Loader2, FileImage, Moon } from "lucide-react";

export function WeeklyTimetable() {
  const [todos, setTodos] = useState<{id: number, text: string, done: boolean}[]>([
    { id: 1, text: "Thu tiền BHYT đợt 1", done: false },
    { id: 2, text: "Nhắc nhở học sinh trang phục", done: true },
    { id: 3, text: "Chuẩn bị sinh hoạt lớp chủ đề 20/11", done: false }
  ]);
  const [newTodo, setNewTodo] = useState("");

  const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  
  const [isExtracting, setIsExtracting] = useState(false);
  const periods = [
    { id: "1", label: "Tiết 1" },
    { id: "2", label: "Tiết 2" },
    { id: "3", label: "Tiết 3" },
    { id: "4", label: "Tiết 4" },
    { id: "5", label: "Tiết 5" },
    { id: "6", label: "Tiết 6" },
    { id: "7", label: "Tiết 7" },
    { id: "8", label: "Tiết 8" },
    { id: "9", label: "Tiết 9" },
    { id: "10", label: "Tiết 10" },
    { id: "Tối", label: "Tối" }
  ];

  
  // Mock timetable
  const [timetable, setTimetable] = useState<Record<string, string>>({
    "Thứ 2-1": "Chào cờ",
    "Thứ 2-2": "Toán",
    "Thứ 3-3": "Lý",
    "Thứ 6-5": "Sinh hoạt lớp"
  });

  
  useEffect(() => {
    const savedTimetable = localStorage.getItem("timetable_data");
    if (savedTimetable) {
      try {
        setTimetable(JSON.parse(savedTimetable));
      } catch(e) {}
    }

    const savedTodos = localStorage.getItem("timetable_todos");
    if (savedTodos) {
      try {
        setTodos(JSON.parse(savedTodos));
      } catch(e) {}
    }
  }, []);

  const saveTimetable = (newTimetable: Record<string, string>) => {
    setTimetable(newTimetable);
    localStorage.setItem("timetable_data", JSON.stringify(newTimetable));
  };

  const saveTodos = (newTodos: {id: number, text: string, done: boolean}[]) => {
    setTodos(newTodos);
    localStorage.setItem("timetable_todos", JSON.stringify(newTodos));
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    saveTodos([{ id: Date.now(), text: newTodo, done: false }, ...todos]);
    setNewTodo("");
  };

  const toggleTodo = (id: number) => {
    saveTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };
  
  const removeTodo = (id: number) => {
    saveTodos(todos.filter(t => t.id !== id));
  };

  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setIsExtracting(true);
      try {
        const key = localStorage.getItem("eduplan_gemini_api_key_v2") || "";
        const res = await apiFetch("/api/extract-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            
          },
          body: JSON.stringify({ file: base64, type: "timetable" })
        });
        const text = await res.text();
        const data = parseApiResponse<any>(text);
        
        if (data.entries) {
          const newTimetable = { ...timetable };
          data.entries.forEach((entry: any) => {
             const periodId = entry.period.toString();
             newTimetable[`${entry.day}-${periodId}`] = entry.content;
          });
          saveTimetable(newTimetable);
          console.log("Trích xuất TKB thành công!");
        } else {
          console.error("Lỗi: Không tìm thấy dữ liệu TKB");
        }
      } catch (err) {
        console.error(err);
        console.error("Có lỗi xảy ra khi trích xuất tài liệu.");
      } finally {
        setIsExtracting(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const updateTimetable = (day: string, period: number | string, val: string) => {
    saveTimetable({ ...timetable, [`${day}-${period}`]: val });
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Thời khóa biểu & Công việc Tuần</h2>
          <p className="text-slate-500">Lịch báo giảng và danh sách việc cần làm của GVCN</p>
        </div>
        <label className={`flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg shadow-sm cursor-pointer transition-colors ${isExtracting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-50'}`}>
          {isExtracting ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <FileImage className="w-4 h-4 text-emerald-600" />}
          <span className="font-medium text-sm">{isExtracting ? "Đang trích xuất AI..." : "Tải TKB (Ảnh/PDF/Doc)"}</span>
          <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} disabled={isExtracting} />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* Timetable */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" /> Thời khóa biểu giảng dạy
            </h3>
            <button
              onClick={() => {
                saveTimetable({});
              }}
              className="text-xs flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-md transition-colors font-medium"
              title="Xóa trắng Thời khóa biểu"
            >
              <Trash2 className="w-3 h-3" /> Xóa TKB
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-center border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="p-2 border bg-slate-50 text-slate-500 text-sm w-16">Tiết</th>
                  {days.map(d => (
                    <th key={d} className="p-2 border bg-slate-50 text-slate-600 font-medium">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p, i) => (
                  <tr key={p.id} className={p.id === '6' ? 'border-t-4 border-slate-300' : p.id === 'Tối' ? 'border-t-4 border-slate-800' : ''}>
                    <td className={`p-1 border text-xs font-medium text-center ${p.id === 'Tối' ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-500'}`}>
                      {p.id === 'Tối' && <Moon className="w-3 h-3 mx-auto mb-1 text-yellow-300" />}
                      {p.label}
                    </td>
                    {days.map(d => {
                      const key = `${d}-${p.id}`;
                      return (
                        <td key={d} className="p-1 border h-16 relative group">
                          <textarea
                            value={timetable[key] || ""}
                            onChange={e => updateTimetable(d, p.id, e.target.value)}
                            className="w-full h-full p-1 text-sm text-center resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded"
                            placeholder="-"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Todo List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" /> Việc cần làm (GVCN)
            </h3>
            <button
              onClick={() => {
                saveTodos([]);
              }}
              className="text-xs flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-md transition-colors font-medium"
              title="Xóa tất cả công việc"
            >
              <Trash2 className="w-3 h-3" /> Xóa việc
            </button>
          </div>
          
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={newTodo}
              onChange={e => setNewTodo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTodo()}
              placeholder="Thêm công việc..."
              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button onClick={addTodo} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {todos.map(todo => (
              <div key={todo.id} className={`flex items-start gap-3 p-2 rounded-lg border ${todo.done ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
                <input 
                  type="checkbox" 
                  checked={todo.done}
                  onChange={() => toggleTodo(todo.id)}
                  className="mt-1 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className={`flex-1 text-sm ${todo.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {todo.text}
                </span>
                <button onClick={() => removeTodo(todo.id)} className="text-slate-400 hover:text-red-500 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {todos.length === 0 && (
              <p className="text-sm text-slate-500 text-center italic mt-4">Không có công việc nào.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
