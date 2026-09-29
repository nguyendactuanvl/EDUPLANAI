import { useState, useEffect } from "react";
import { X, Key, Save } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem("eduplan_gemini_api_key_v2") || "";
      setApiKey(storedKey);
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem("eduplan_gemini_api_key_v2", apiKey.trim());
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-600" />
            Nhập mã API key
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Gemini API Key cá nhân
            </label>
            <input
              type="password"
              placeholder="Nhập API Key của bạn (AI Studio)..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setIsSaved(false);
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
            <p className="mt-2 text-xs text-slate-500">
              Key này sẽ được lưu an toàn trên trình duyệt của bạn (localStorage) và sử dụng để bỏ qua giới hạn biến môi trường của hệ thống.
            </p>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
              <p className="font-semibold mb-1">Hướng dẫn lấy API Key miễn phí:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Google AI Studio</a></li>
                <li>Đăng nhập bằng tài khoản Google của bạn</li>
                <li>Nhấn nút <strong>Create API Key</strong></li>
                <li>Copy mã Key và dán vào ô bên trên</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaved ? "Đã lưu!" : "Lưu cài đặt"}
          </button>
        </div>
      </div>
    </div>
  );
}