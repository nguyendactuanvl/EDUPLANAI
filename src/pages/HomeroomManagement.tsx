import { apiFetch } from '../lib/apiFetch';
import { exportHtmlToWord } from '../lib/exportUtils';
import { useState, useEffect } from "react";
import { Upload, Plus, Save, Trash2, Award, FileText, Loader2, FileImage, Search, Edit3, Download, Printer, Trophy } from "lucide-react";
import { Student } from "../types";
import { parseApiResponse } from "../lib/utils";

export function HomeroomManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [competitionRules, setCompetitionRules] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"list" | "competition">("list");
  
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [competitionScores, setCompetitionScores] = useState<Record<string, { plus: number; minus: number; note: string }>>({});

  useEffect(() => {
    const saved = localStorage.getItem("homeroom_students");
    if (saved) {
      try {
        setStudents(JSON.parse(saved));
      } catch (e) {}
    }
    const savedScores = localStorage.getItem("homeroom_competition_scores");
    if (savedScores) {
      try {
        setCompetitionScores(JSON.parse(savedScores));
      } catch (e) {}
    }
  }, []);

  const saveStudents = (newSt: Student[]) => {
    setStudents(newSt);
    localStorage.setItem("homeroom_students", JSON.stringify(newSt));
  };

  const saveCompetitionScores = (newScores: Record<string, { plus: number; minus: number; note: string }>) => {
    setCompetitionScores(newScores);
    localStorage.setItem("homeroom_competition_scores", JSON.stringify(newScores));
  };

  const addStudent = () => {
    const newId = `hs${Date.now()}`;
    saveStudents([...students, { id: newId, name: "Học sinh mới", role: "" }]);
  };

  const updateStudent = (id: string, field: string, value: string) => {
    saveStudents(students.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  
  const clearAllStudents = () => { setIsConfirmClearOpen(true); };
  const executeClearAllStudents = () => {
    saveStudents([]);
    saveCompetitionScores({});
    setIsConfirmClearOpen(false);
  };

  const removeStudent = (id: string) => {

    saveStudents(students.filter(s => s.id !== id));
  };

  const handleScoreChange = (studentId: string, field: 'plus' | 'minus' | 'note', value: string | number) => {
    const current = competitionScores[studentId] || { plus: 0, minus: 0, note: "" };
    const newScores = {
      ...competitionScores,
      [studentId]: {
        ...current,
        [field]: field === 'note' ? value : (Number(value) || 0)
      }
    };
    setCompetitionScores(newScores);
  };
  
  const getRankedStudents = () => {
    return students.map(st => {
      const score = competitionScores[st.id] || { plus: 0, minus: 0, note: "" };
      const total = score.plus - score.minus;
      return { ...st, score, total };
    }).sort((a, b) => b.total - a.total);
  };

  const exportToCSV = () => {
    const ranked = getRankedStudents();
    let csv = "STT,Họ và tên,Điểm cộng,Điểm trừ,Tổng điểm,Xếp hạng,Ghi chú\n";
    ranked.forEach((st, idx) => {
      csv += `${idx + 1},"${st.name}",${st.score.plus},${st.score.minus},${st.total},${idx + 1},"${st.score.note}"\n`;
    });
    
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Bao_Cao_Thi_Dua_Lop.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    const ranked = getRankedStudents();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    let html = `
      <html>
      <head>
        <title>Báo Cáo Thi Đua Lớp</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: center; }
          th { background-color: #f8fafc; }
          td.name { text-align: left; font-weight: bold; }
          td.note { text-align: left; }
        </style>
      </head>
      <body>
        <h1>BẢNG TỔNG HỢP THI ĐUA LỚP</h1>
        <table>
          <thead>
            <tr>
              <th>Hạng</th>
              <th>Họ và tên</th>
              <th>Điểm cộng</th>
              <th>Điểm trừ</th>
              <th>Tổng điểm</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    ranked.forEach((st, idx) => {
      html += `
        <tr>
          <td>${idx + 1}</td>
          <td class="name">${st.name}</td>
          <td style="color: #16a34a;">+${st.score.plus}</td>
          <td style="color: #dc2626;">-${st.score.minus}</td>
          <td style="font-weight: bold;">${st.total}</td>
          <td class="note">${st.score.note}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
        <div style="margin-top: 40px; text-align: right; padding-right: 50px;">
          <p>Ngày ...... tháng ...... năm ......</p>
          <p><strong>Giáo viên Chủ nhiệm</strong></p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleRuleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/') || file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
       const reader = new FileReader();
       reader.onload = async (event) => {
         const base64 = event.target?.result as string;
         setIsExtracting(true);
         try {
           const res = await apiFetch("/api/extract-data", {
             method: "POST",
             headers: {
               "Content-Type": "application/json",
             },
             body: JSON.stringify({ file: base64, type: "raw_text" })
           });
           
           const textRes = await res.text();
           const data = parseApiResponse<any>(textRes);
           
           if (!res.ok) throw new Error(data.error || "Không thể phân tích dữ liệu");
           
           if (data.text) {
             setCompetitionRules(data.text);
           }
         } catch (error: any) {
           alert("Lỗi: " + error.message);
         } finally {
           setIsExtracting(false);
           // Reset input
           e.target.value = '';
         }
       };
       reader.readAsDataURL(file);
    } else {
      alert("Vui lòng tải lên file ảnh, PDF hoặc Word.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/') || file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
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
             body: JSON.stringify({ file: base64, type: "student_profiles" })
           });
           const text = await res.text();
           const data = parseApiResponse<any>(text);
           
           if (data.students && Array.isArray(data.students)) {
             const newStudents = data.students.map((st: any, i: number) => ({
               id: `hs_${Date.now()}_${i}`,
               name: st.name || "",
               dob: st.dob || "",
               phone: st.phone || "",
               parentName: st.parentName || "",
               parentPhone: st.parentPhone || "",
               address: st.address || "",
               notes: st.notes || "",
               role: "",
               isFixed: false
             }));
             
             if (students.length > 0) {
               if (confirm("Lớp này đã có danh sách học sinh. Bạn có muốn ghi đè danh sách mới (Xóa cũ) không? Chọn OK để XÓA cũ và THAY MỚI, Cancel để THÊM NỐI TIẾP.")) {
                  saveStudents(newStudents);
               } else {
                  saveStudents([...students, ...newStudents]);
               }
             } else {
                saveStudents(newStudents);
             }
             alert(`Trích xuất thành công ${data.students.length} hồ sơ học sinh!`);
           } else {
             alert("Lỗi: Không tìm thấy thông tin học sinh");
           }
         } catch (err) {
           console.error(err);
           alert("Lỗi: " + (err.message || "Có lỗi xảy ra khi trích xuất. Vui lòng kiểm tra API Key."));
         } finally {
           setIsExtracting(false);
           e.target.value = '';
         }
       };
       reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        
        const newStudents: Student[] = [];
        let startIndex = 0;
        if (lines.length > 0 && (lines[0].toLowerCase().includes('tên') || lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('stt'))) {
            startIndex = 1;
        }

        for (let i = startIndex; i < lines.length; i++) {
           const l = lines[i];
           if (l.includes(',')) {
              const parts = l.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
              let nameIdx = 0;
              if (!isNaN(Number(parts[0])) && parts.length > 1) nameIdx = 1;
              
              if (parts[nameIdx]) {
                newStudents.push({
                  id: `hs_${Date.now()}_${i}`,
                  name: parts[nameIdx],
                  dob: parts[nameIdx + 1] || "",
                  phone: parts[nameIdx + 2] || "",
                  parentName: parts[nameIdx + 3] || "",
                  parentPhone: parts[nameIdx + 4] || "",
                  role: "",
                  isFixed: false
                });
              }
           } else {
              if (isNaN(Number(l))) {
                 newStudents.push({
                    id: `hs_${Date.now()}_${i}`,
                    name: l.trim(),
                    role: "",
                    isFixed: false
                 });
              }
           }
        }

        if (newStudents.length === 0) return;
        
        if (students.length > 0) {
           if (confirm("Ghi đè danh sách mới (OK) hay Thêm nối tiếp (Cancel)?")) {
              saveStudents(newStudents);
           } else {
              saveStudents([...students, ...newStudents]);
           }
        } else {
           saveStudents(newStudents);
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    }
  };

  const filteredStudents = students.filter(st => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      st.name.toLowerCase().includes(term) ||
      (st.phone && st.phone.includes(term)) ||
      (st.parentName && st.parentName.toLowerCase().includes(term)) ||
      (st.parentPhone && st.parentPhone.includes(term))
    );
  });

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Quản lý Lớp Chủ nhiệm</h2>
        <p className="text-slate-500">Danh sách học sinh, Ban cán sự và Thi đua</p>
      </div>

      <div className="flex justify-between items-end border-b border-slate-200 mb-6">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab("list")}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "list" ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Danh sách & Chức vụ
          </button>
          <button 
            onClick={() => setActiveTab("competition")}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "competition" ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Quy định & Thi đua
          </button>
        </div>
        
              <div className="flex gap-2">
                <button onClick={() => {
                   const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                   <head><meta charset='utf-8'><title>So Chu Nhiem</title>
                   <style>
                    body { font-family: "Times New Roman", Times, serif; font-size: 14pt; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 20px;}
                    th, td { border: 1px solid black; padding: 6px; }
                    th { font-weight: bold; text-align: center; }
                    .page-break { page-break-before: always; }
                    .title { font-size: 24pt; font-weight: bold; text-align: center; margin-top: 50px; margin-bottom: 50px; }
                   </style></head><body>`;
                   
                   let content = `<div class="center bold" style="font-size: 16pt;">SỞ GIÁO DỤC VÀ ĐÀO TẠO .......</div>`;
                   content += `<div class="center bold" style="font-size: 16pt; margin-bottom: 80px;">TRƯỜNG ......................................</div>`;
                   content += `<div class="title">SỔ CHỦ NHIỆM<br/>CẤP TRUNG HỌC PHỔ THÔNG</div>`;
                   content += `<div style="margin-left: 50px; font-size: 16pt; line-height: 2;">`;
                   content += `Họ tên GVCN: ..............................................................<br/>`;
                   content += `Lớp: ............................................................................<br/>`;
                   content += `Năm học: 2026 - 2027<br/>`;
                   content += `</div>`;
                   
                   content += `<div class="page-break"></div>`;
                   content += `<div class="bold center" style="font-size: 16pt;">PHẦN I: NHỮNG VĂN BẢN QUY ĐỊNH NHIỆM VỤ<br/>HỌC SINH VÀ GIÁO VIÊN</div>`;
                   content += `<p><i>(Căn cứ Thông tư 15/2026/TT-BGDĐT ban hành Điều lệ trường học và Thông tư 22/2021/TT-BGDĐT về đánh giá học sinh THPT)</i></p>`;
                   content += `<p class="bold">1. Nhiệm vụ và quyền của học sinh (Theo Điều 32, 33 TT 15/2026/TT-BGDĐT)</p>`;
                   content += `<ul><li>Thực hiện nhiệm vụ học tập, rèn luyện theo chương trình, kế hoạch giáo dục của nhà trường.</li><li>Được tôn trọng và bảo vệ, được đối xử bình đẳng, dân chủ...</li></ul>`;
                   content += `<p class="bold">2. Quy định Đánh giá xếp loại (Theo TT 22/2021/TT-BGDĐT)</p>`;
                   content += `<ul><li>Đánh giá bằng nhận xét kết hợp điểm số.</li><li>Đánh giá thường xuyên và đánh giá định kì.</li></ul>`;
                   
                   content += `<div class="page-break"></div>`;
                   content += `<div class="bold center" style="font-size: 16pt;">PHẦN II: DANH SÁCH HỌC SINH LỚP</div>`;
                   content += `<table><thead><tr><th>STT</th><th>Họ và tên</th><th>Ngày sinh</th><th>Điện thoại</th></tr></thead><tbody>`;
                   students.forEach((st, idx) => {
                       content += `<tr><td class="center">${idx + 1}</td><td>${st.name}</td><td></td><td></td></tr>`;
                   });
                   content += `</tbody></table>`;
                   
                   content += `<div class="page-break"></div>`;
                   content += `<div class="bold center" style="font-size: 16pt;">PHẦN III: KẾ HOẠCH CHỦ NHIỆM CẢ NĂM HỌC 2026-2027</div>`;
                   content += `<p><b>I. Đặc điểm tình hình lớp:</b></p><p>Thuận lợi: .............................................................</p><p>Khó khăn: .............................................................</p>`;
                   content += `<p><b>II. Chỉ tiêu phấn đấu:</b></p><p>Hạnh kiểm: 100% Khá, Tốt</p><p>Học lực: ...% Giỏi, ...% Khá</p>`;
                   content += `<p><b>III. Kế hoạch hàng tháng (Tháng 8 đến Tháng 5):</b></p><p>(Giáo viên tự điền chi tiết nội dung sinh hoạt theo chủ điểm từng tháng)</p>`;

                   const postHtml = "</body></html>";
                   const blob = new Blob(['\ufeff', preHtml + content + postHtml], { type: 'application/msword' });
                   const url = URL.createObjectURL(blob);
                   const link = document.createElement('a');
                   link.href = url;
                   link.download = 'So_Chu_Nhiem_THPT_2026_2027.doc';
                   document.body.appendChild(link);
                   link.click();
                   document.body.removeChild(link);
                }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white border border-indigo-700 rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors shadow-sm mb-3">
                  <FileText className="w-4 h-4" /> Xuất Sổ Chủ Nhiệm (Cả năm)
                </button>
              </div>

      </div>

      {activeTab === "list" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center bg-slate-50">
            <div className="flex flex-wrap gap-3">
              <button onClick={addStudent} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium shadow-sm transition-colors">
                <Plus className="w-4 h-4" /> Thêm HS
              </button>
              <button onClick={(e) => { e.preventDefault(); clearAllStudents(); }} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 hover:text-red-700 text-sm font-medium transition-colors" title="Xóa toàn bộ danh sách">
                <Trash2 className="w-4 h-4" /> Xóa danh sách
              </button>
              <label className={`flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 text-sm font-medium cursor-pointer transition-colors ${isExtracting ? 'opacity-70 pointer-events-none' : ''}`}>
                {isExtracting ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <Upload className="w-4 h-4" />}
                {isExtracting ? 'Đang trích xuất AI...' : 'Nhập Hồ sơ (Excel/Ảnh/PDF)'}
                <input type="file" className="hidden" accept=".csv,.txt,image/*,.pdf,.doc,.docx" onChange={handleFileUpload} />
              </label>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                <input 
                  type="text"
                  placeholder="Tìm tên, SĐT, Phụ huynh..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-emerald-500 w-64"
                />
              </div>
              <div className="text-sm text-slate-500 hidden sm:block">
                Sĩ số: <strong className="text-slate-800">{filteredStudents.length}/{students.length}</strong>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-0">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 w-12 text-center border-r border-slate-200">STT</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 w-48 border-r border-slate-200">Họ và tên</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 w-32 border-r border-slate-200">Ngày sinh</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 w-32 border-r border-slate-200">SĐT HS</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 w-48 border-r border-slate-200">Họ tên Phụ huynh</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 w-32 border-r border-slate-200">SĐT Phụ huynh</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 w-48 border-r border-slate-200">Chức vụ</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 w-16 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st, i) => (
                  <tr key={st.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-sm text-slate-500 text-center border-r border-slate-100">{i + 1}</td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <input 
                        type="text" 
                        value={st.name || ""} 
                        onChange={e => updateStudent(st.id, "name", e.target.value)}
                        className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-emerald-500 rounded text-sm font-medium text-slate-800 transition-colors"
                        placeholder="Tên học sinh..."
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <input 
                        type="text" 
                        value={st.dob || ""} 
                        onChange={e => updateStudent(st.id, "dob", e.target.value)}
                        className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-emerald-500 rounded text-sm text-slate-600 transition-colors"
                        placeholder="DD/MM/YYYY"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <input 
                        type="text" 
                        value={st.phone || ""} 
                        onChange={e => updateStudent(st.id, "phone", e.target.value)}
                        className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-emerald-500 rounded text-sm text-slate-600 transition-colors"
                        placeholder="Số điện thoại..."
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <input 
                        type="text" 
                        value={st.parentName || ""} 
                        onChange={e => updateStudent(st.id, "parentName", e.target.value)}
                        className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-emerald-500 rounded text-sm text-slate-600 transition-colors"
                        placeholder="Tên Phụ huynh..."
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <input 
                        type="text" 
                        value={st.parentPhone || ""} 
                        onChange={e => updateStudent(st.id, "parentPhone", e.target.value)}
                        className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-emerald-500 rounded text-sm text-slate-600 transition-colors font-medium"
                        placeholder="SĐT Phụ huynh..."
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <select 
                        value={st.role || ""} 
                        onChange={e => updateStudent(st.id, "role", e.target.value)}
                        className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-emerald-500 rounded text-sm text-slate-600 transition-colors"
                      >
                        <option value="">-- Không --</option>
                        <option value="Lớp trưởng">Lớp trưởng</option>
                        <option value="Lớp phó Học tập">Lớp phó Học tập</option>
                        <option value="Lớp phó Lao động">Lớp phó Lao động</option>
                        <option value="Lớp phó Kỷ luật">Lớp phó Kỷ luật</option>
                        <option value="Lớp phó Văn thể mỹ">Lớp phó Văn thể mỹ</option>
                        <option value="Tổ trưởng Tổ 1">Tổ trưởng Tổ 1</option>
                        <option value="Tổ trưởng Tổ 2">Tổ trưởng Tổ 2</option>
                        <option value="Tổ trưởng Tổ 3">Tổ trưởng Tổ 3</option>
                        <option value="Tổ trưởng Tổ 4">Tổ trưởng Tổ 4</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeStudent(st.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Xóa học sinh">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500 bg-slate-50/50">
                      {students.length === 0 ? "Chưa có học sinh nào. Hãy thêm học sinh hoặc tải lên file danh sách (Excel, Ảnh, PDF)." : "Không tìm thấy học sinh nào phù hợp."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "competition" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col md:col-span-1 p-4">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" /> Quy định thi đua
            </h3>
            <textarea 
              className="flex-1 w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Dán nội dung quy định thi đua của Đoàn trường vào đây (VD: Đi muộn -5đ, Không đeo thẻ -2đ...)"
              value={competitionRules}
              onChange={e => setCompetitionRules(e.target.value)}
            />
            <div className="mt-3">
              <label className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer transition-colors text-sm font-medium">
                {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {isExtracting ? 'Đang trích xuất AI...' : 'Tải lên File quy định (PDF/Word)'}
                <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={handleRuleFileUpload} disabled={isExtracting} />
              </label>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col md:col-span-2 p-0">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" /> Chấm điểm & Xếp hạng Tuần
              </h3>
              <div className="flex gap-2">
                <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 text-sm font-medium transition-colors shadow-sm">
                  <Download className="w-4 h-4" /> Xuất Excel
                </button>
                <button onClick={printReport} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-medium transition-colors shadow-sm">
                  <Printer className="w-4 h-4" /> Xuất PDF (In)
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200">
                    <th className="p-3 text-slate-600 font-semibold w-12 text-center">Hạng</th>
                    <th className="p-3 text-slate-600 font-semibold">Học sinh</th>
                    <th className="p-3 text-slate-600 font-semibold w-24 text-center">Điểm cộng</th>
                    <th className="p-3 text-slate-600 font-semibold w-24 text-center">Điểm trừ</th>
                    <th className="p-3 text-slate-600 font-semibold w-24 text-center">Tổng</th>
                    <th className="p-3 text-slate-600 font-semibold">Lý do / Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {getRankedStudents().map((st, idx) => (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center">
                         {idx === 0 && st.total > 0 ? <Trophy className="w-5 h-5 text-yellow-500 mx-auto" /> : 
                          idx === 1 && st.total > 0 ? <Trophy className="w-5 h-5 text-slate-400 mx-auto" /> :
                          idx === 2 && st.total > 0 ? <Trophy className="w-5 h-5 text-amber-600 mx-auto" /> :
                          <span className="font-bold text-slate-400">{idx + 1}</span>}
                      </td>
                      <td className="p-3 font-medium text-slate-800">{st.name}</td>
                      <td className="p-3">
                        <input 
                          type="number" 
                          className="w-full px-2 py-1 border border-transparent hover:border-emerald-200 focus:border-emerald-500 bg-transparent focus:bg-white rounded text-center text-emerald-600 font-medium transition-colors" 
                          value={st.score.plus || ''} 
                          onChange={e => handleScoreChange(st.id, 'plus', e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          type="number" 
                          className="w-full px-2 py-1 border border-transparent hover:border-red-200 focus:border-red-500 bg-transparent focus:bg-white rounded text-center text-red-600 font-medium transition-colors" 
                          value={st.score.minus || ''} 
                          onChange={e => handleScoreChange(st.id, 'minus', e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${st.total > 0 ? 'bg-emerald-100 text-emerald-700' : st.total < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                          {st.total > 0 ? '+' : ''}{st.total}
                        </span>
                      </td>
                      <td className="p-3">
                        <input 
                          type="text" 
                          className="w-full px-2 py-1 border border-transparent hover:border-slate-300 focus:border-emerald-500 bg-transparent focus:bg-white rounded text-slate-600 transition-colors" 
                          placeholder="Nhập ghi chú..." 
                          value={st.score.note || ''}
                          onChange={e => handleScoreChange(st.id, 'note', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Chưa có học sinh trong danh sách. Vui lòng thêm học sinh ở tab Danh sách.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
               <div className="text-sm text-slate-500">Mọi thay đổi điểm số sẽ được tự động lưu.</div>
               <button onClick={() => saveCompetitionScores(competitionScores)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm transition-colors flex items-center gap-2">
                 <Save className="w-4 h-4" /> Lưu thủ công
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear Modal */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Cảnh báo xóa dữ liệu</h3>
              <p className="text-slate-600 text-sm">
                Bạn có chắc chắn muốn xóa TOÀN BỘ danh sách học sinh của lớp này không? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsConfirmClearOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                Hủy bỏ
              </button>
              <button onClick={executeClearAllStudents} className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors">
                Xóa toàn bộ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
