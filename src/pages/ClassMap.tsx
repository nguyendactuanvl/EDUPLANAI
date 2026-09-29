import { useState, useEffect, useRef } from "react";
import { Shuffle, Printer, Settings2, Users, Upload } from "lucide-react";
import { Student } from "../types";

export function ClassMap() {
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(4);
  const [students, setStudents] = useState<Student[]>([]);
  const [seats, setSeats] = useState<{row: number, col: number, studentId: string | null}[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<{row: number, col: number} | null>(null);
  
  // Load students from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("homeroom_students");
    if (saved) {
      try {
        setStudents(JSON.parse(saved));
      } catch (e) {}
    } else {
      // Mock data
      const mock: Student[] = Array.from({length: 40}).map((_, i) => ({
        id: `hs${i+1}`,
        name: `Học sinh ${i+1}`,
        role: i === 0 ? "Lớp trưởng" : i === 1 ? "Lớp phó HT" : ""
      }));
      setStudents(mock);
      localStorage.setItem("homeroom_students", JSON.stringify(mock));
    }
  }, []);

  useEffect(() => {
    const savedConfig = localStorage.getItem("classmap_config");
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.rows) setRows(config.rows);
        if (config.cols) setCols(config.cols);
        if (config.seats) {
          setSeats(config.seats);
          return;
        }
      } catch (e) {}
    }
  }, []);

  // Initialize seats when dimensions change
  useEffect(() => {
    // Only re-init if current seats don't match dimensions or it's empty
    const expectedLength = rows * cols;
    if (seats.length === expectedLength && seats.some(s => s.studentId !== null)) {
        return; // already loaded from localstorage or previously set
    }

    const newSeats = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const existing = seats.find(s => s.row === r && s.col === c);
        newSeats.push({
          row: r, 
          col: c, 
          studentId: existing ? existing.studentId : null
        });
      }
    }
    setSeats(newSeats);
  }, [rows, cols]);

  // Save config whenever it changes
  useEffect(() => {
    if (seats.length > 0) {
      localStorage.setItem("classmap_config", JSON.stringify({ rows, cols, seats }));
    }
  }, [rows, cols, seats]);


  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).map(l => {
        // If CSV, take the first column if it's not a number, or try to find the name column.
        // For simplicity, just split by comma and take the longest string or just the whole line if no comma
        if (l.includes(',')) {
          const parts = l.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
          // Take the second column if the first is a number (STT)
          if (!isNaN(Number(parts[0])) && parts.length > 1) {
            return parts[1];
          }
          return parts[0];
        }
        return l.trim();
      }).filter(l => l && isNaN(Number(l)));
      
      let names = lines;
      if (names.length > 0 && (names[0].toLowerCase().includes('tên') || names[0].toLowerCase().includes('name') || names[0].toLowerCase().includes('stt'))) {
          names = names.slice(1);
      }

      if (names.length === 0) {
        alert("Không tìm thấy dữ liệu hợp lệ trong file.");
        return;
      }

      const newStudents = names.map((name, i) => ({
        id: `hs_${Date.now()}_${i}`,
        name: name,
        role: "",
        isFixed: false
      }));

      setStudents(newStudents);
      localStorage.setItem("homeroom_students", JSON.stringify(newStudents));
      
      // Auto assign to seats sequentially
      const newSeats = [];
      let studentIdx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          newSeats.push({
            row: r,
            col: c,
            studentId: studentIdx < newStudents.length ? newStudents[studentIdx++].id : null
          });
        }
      }
      setSeats(newSeats);
      
      // Reset input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const generateMap = () => {
    // 1-click auto generate
    const fixedSeats = seats.filter(s => {
      if (!s.studentId) return false;
      const st = students.find(x => x.id === s.studentId);
      return st?.isFixed;
    });
    
    const availableStudents = students.filter(st => !fixedSeats.find(s => s.studentId === st.id));
    const shuffled = [...availableStudents].sort(() => Math.random() - 0.5);
    
    let studentIdx = 0;
    const newSeats = [];
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const fixed = fixedSeats.find(s => s.row === r && s.col === c);
        if (fixed) {
          newSeats.push(fixed);
        } else {
          newSeats.push({
            row: r,
            col: c,
            studentId: studentIdx < shuffled.length ? shuffled[studentIdx++].id : null
          });
        }
      }
    }
    setSeats(newSeats);
  };

  const handleSeatClick = (r: number, c: number) => {
    if (!selectedSeat) {
      setSelectedSeat({row: r, col: c});
    } else {
      // Swap
      const newSeats = [...seats];
      const seat1Idx = newSeats.findIndex(s => s.row === selectedSeat.row && s.col === selectedSeat.col);
      const seat2Idx = newSeats.findIndex(s => s.row === r && s.col === c);
      
      if (seat1Idx !== -1 && seat2Idx !== -1) {
        const tempId = newSeats[seat1Idx].studentId;
        newSeats[seat1Idx].studentId = newSeats[seat2Idx].studentId;
        newSeats[seat2Idx].studentId = tempId;
        setSeats(newSeats);
      }
      setSelectedSeat(null);
    }
  };
  
  const toggleFixed = (e: React.MouseEvent, studentId: string) => {
    e.stopPropagation();
    const newSt = students.map(s => s.id === studentId ? {...s, isFixed: !s.isFixed} : s);
    setStudents(newSt);
    localStorage.setItem("homeroom_students", JSON.stringify(newSt));
  };

  const printMap = () => {
    window.print();
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sơ đồ lớp học</h2>
          <p className="text-slate-500">Tạo, tùy chỉnh và in sơ đồ chỗ ngồi</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-sm font-medium text-slate-600">Bàn ngang:</span>
            <input type="number" min="1" max="10" value={cols} onChange={e => setCols(Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-center" />
            <span className="text-sm font-medium text-slate-600 ml-2">Bàn dọc:</span>
            <input type="number" min="1" max="10" value={rows} onChange={e => setRows(Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-center" />
          </div>
          
          
          <label className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            <span className="font-medium">Tải DS (CSV/TXT)</span>
            <input type="file" className="hidden" accept=".csv,.txt" onChange={handleFileUpload} />
          </label>

          <button onClick={generateMap} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
            <Shuffle className="w-4 h-4" />
            <span className="font-medium">Trộn chỗ (1-click)</span>
          </button>
          
          <button onClick={printMap} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            <Printer className="w-4 h-4" />
            <span className="font-medium">In sơ đồ</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-auto p-8 print:p-0 print:border-none print:shadow-none flex flex-col items-center">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-10 print:mb-6">
            <div className="inline-block bg-slate-800 text-white px-16 py-3 rounded-lg font-bold text-xl uppercase tracking-wider mb-2 shadow-sm print:bg-slate-200 print:text-black">
              BẢNG TỪ / BỤC GIẢNG
            </div>
          </div>
          
          <div 
            className="grid gap-4 md:gap-6 mx-auto" 
            style={{ 
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              maxWidth: `${cols * 180}px`
            }}
          >
            {seats.map((seat, idx) => {
              const student = students.find(s => s.id === seat.studentId);
              const isSelected = selectedSeat?.row === seat.row && selectedSeat?.col === seat.col;
              
              return (
                <div 
                  key={idx}
                  onClick={() => handleSeatClick(seat.row, seat.col)}
                  className={`
                    relative flex flex-col items-center justify-center p-3 rounded-lg border-2 min-h-[80px] cursor-pointer transition-all
                    ${isSelected ? 'border-emerald-500 bg-emerald-50 shadow-md transform scale-105 z-10' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}
                    ${!student ? 'bg-slate-50 border-dashed' : 'bg-white shadow-sm'}
                    print:border-slate-400 print:shadow-none print:break-inside-avoid
                  `}
                >
                  {student ? (
                    <>
                      <div className="font-medium text-slate-800 text-center leading-tight mb-1">{student.name}</div>
                      {student.role && (
                        <div className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full print:bg-transparent print:border print:border-emerald-600">
                          {student.role}
                        </div>
                      )}
                      
                      <button 
                        onClick={(e) => toggleFixed(e, student.id)}
                        className={`absolute top-1 right-1 p-1 rounded-full print:hidden ${student.isFixed ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-slate-500'}`}
                        title={student.isFixed ? "Bỏ cố định" : "Cố định chỗ ngồi"}
                      >
                        <Users className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="text-slate-400 text-sm font-medium">Trống</div>
                  )}
                  
                  {isSelected && (
                    <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full shadow-md animate-pulse">
                      Chọn vị trí đổi
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-8 text-center text-sm text-slate-500 print:hidden flex items-center justify-center gap-2">
            <span>💡 Mẹo:</span> Click vào 2 học sinh để đổi chỗ thủ công. Bấm biểu tượng <Users className="w-3 h-3 inline" /> để cố định chỗ ngồi.
          </div>
        </div>
      </div>
    </div>
  );
}
