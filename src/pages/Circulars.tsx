import { useEffect, useState } from "react";
import { FileText, ShieldCheck, AlertCircle, Plus, Trash2, Link } from "lucide-react";
import { printElement } from '../lib/print';

export interface Circular {
  id: string;
  date: string;
  title: string;
  content?: string;
  link?: string;
}

const DEFAULT_CIRCULARS: Circular[] = [
  {
    id: "15/2026/TT-BGDĐT",
    date: "24/03/2026",
    title: "Ban hành Điều lệ trường tiểu học, trường trung học cơ sở, trường trung học phổ thông và trường phổ thông có nhiều cấp học",
    content: "Đã tích hợp sẵn: Điều 32, Điều 33 thuộc Chương V về Nhiệm vụ và quyền của học sinh. Đây là văn bản mới nhất áp dụng từ năm 2026-2027.",
    link: "#"
  },
  {
    id: "22/2021/TT-BGDĐT",
    date: "20/07/2021",
    title: "Quy định về đánh giá học sinh trung học cơ sở và học sinh trung học phổ thông",
    content: "Đã tích hợp sẵn: Hướng dẫn chi tiết cách đánh giá, xếp loại học sinh THPT, quy định về Điểm trung bình, Đánh giá bằng nhận xét.",
    link: "#"
  },
  { id: "5512/BGDĐT-GDTrH", date: "18/12/2020", title: "Xây dựng và tổ chức thực hiện kế hoạch giáo dục của nhà trường" },
  { id: "3456/BGDĐT-GDPT", date: "27/6/2025", title: "Hướng dẫn triển khai thực hiện khung năng lực số cho học sinh phổ thông" },
  { id: "2422/QĐ-BGDĐT", date: "18/8/2026", title: "Ban hành Khung nội dung giáo dục trí tuệ nhân tạo cho học sinh phổ thông" }
];

export function Circulars() {
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newId, setNewId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("custom_circulars");
    if (saved) {
      try {
        setCirculars(JSON.parse(saved));
      } catch (e) {
        setCirculars(DEFAULT_CIRCULARS);
      }
    } else {
      setCirculars(DEFAULT_CIRCULARS);
    }
  }, []);

  const saveCirculars = (data: Circular[]) => {
    setCirculars(data);
    localStorage.setItem("custom_circulars", JSON.stringify(data));
  };

  const handleAdd = () => {
    if (!newId || !newTitle) return alert("Vui lòng nhập Số/Ký hiệu và Tên thông tư");
    const updated = [{
      id: newId,
      date: newDate,
      title: newTitle,
      content: newContent
    }, ...circulars];
    saveCirculars(updated);
    setShowAddForm(false);
    setNewId(""); setNewDate(""); setNewTitle(""); setNewContent("");
  };

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa thông tư này?")) {
      saveCirculars(circulars.filter(c => c.id !== id));
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Bộ lọc thông tư & Văn bản</h2>
            <p className="text-slate-500 mt-1">Cập nhật tự động các quy định mới nhất từ Bộ GD&ĐT (Năm học 2026-2027)</p>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Thêm Thông tư
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 lg:p-6 mb-8 flex gap-4">
          <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900">Hệ thống đang hoạt động tốt</h3>
            <p className="text-blue-800 text-sm mt-1">
              Kế hoạch giáo dục và Sổ chủ nhiệm của bạn đang được áp dụng chuẩn theo các Thông tư mới nhất năm học 2026-2027.
            </p>
          </div>
        </div>

        {showAddForm && (
          <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm mb-6 space-y-4">
            <h3 className="font-bold text-emerald-800 border-b border-emerald-100 pb-2">Thêm Thông tư / Văn bản mới</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Số / Ký hiệu</label>
                <input value={newId} onChange={e=>setNewId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="VD: 15/2026/TT-BGDĐT" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Ngày ban hành</label>
                <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tên Thông tư / Trích yếu</label>
              <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Nhập tên văn bản..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nội dung tóm tắt / Ghi chú</label>
              <textarea value={newContent} onChange={e=>setNewContent(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Nội dung cần lưu ý..."></textarea>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm">Hủy</button>
              <button onClick={handleAdd} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm">Lưu văn bản</button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {circulars.map(c => (
            <div key={c.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex gap-4 items-start relative group">
              <div className={`p-3 rounded-lg shrink-0 ${c.content ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                <FileText className={`h-6 w-6 ${c.content ? 'text-emerald-600' : 'text-slate-600'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg text-slate-800">{c.id}</h3>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                    Hiệu lực
                  </span>
                  {c.content && <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex items-center gap-1"><Link className="w-3 h-3"/> Có đính kèm</span>}
                </div>
                <p className="text-sm text-slate-500 mt-1 mb-2">Ngày ban hành: {c.date}</p>
                <p className="text-slate-700 font-medium">{c.title}</p>
                
                {c.content && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 italic">
                    {c.content}
                  </div>
                )}
                
                {c.id.includes("2422") && (
                  <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-lg flex gap-2">
                    <AlertCircle className="h-5 w-5 text-purple-600 shrink-0" />
                    <p className="text-sm text-purple-800">
                      <strong>Lưu ý quan trọng:</strong> Khung năng lực AI yêu cầu bổ sung cột "Năng lực AI" vào kế hoạch giáo dục. Hệ thống đã tự động thêm cột này vào mẫu.
                    </p>
                  </div>
                )}
              </div>
              <button onClick={() => handleDelete(c.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
