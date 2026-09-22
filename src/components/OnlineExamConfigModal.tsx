import React, { useState, useEffect } from 'react';
import { 
  X, Share2, Clock, Calendar, CheckCircle2, Copy, ExternalLink, Download, 
  QrCode as QrIcon, Sparkles, Check, AlertCircle, RefreshCw 
} from 'lucide-react';
import QRCode from 'qrcode';
import LZString from 'lz-string';
import { apiFetch } from '../lib/apiFetch';
import { saveExamToCloud } from '../lib/cloudExamStore';
import { embedTikzSvgsInText } from './TikzRenderer';
import { 
  STANDARDIZED_EXAM_TYPES, 
  getDefaultDurationForExamType, 
  formatExamTitle, 
  normalizeExamType 
} from '../lib/examConfig';

interface OnlineExamConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  examName: string;
  examType: string;
  duration: number;
  schoolLevel: string;
  subject: string;
  grade: string;
  shuffledExams?: { code: string; questions: any[] }[];
  originalQuestions?: any[];
  onExamUpdated?: (updated: { examName: string; examType: string; duration: number }) => void;
}

export const OnlineExamConfigModal: React.FC<OnlineExamConfigModalProps> = ({
  isOpen,
  onClose,
  examName: initialExamName,
  examType: initialExamType,
  duration: initialDuration,
  schoolLevel,
  subject,
  grade,
  shuffledExams = [],
  originalQuestions = [],
  onExamUpdated
}) => {
  const [modalExamType, setModalExamType] = useState(normalizeExamType(initialExamType));
  const [modalDuration, setModalDuration] = useState<number>(initialDuration || 45);
  const [isUnlimitedTime, setIsUnlimitedTime] = useState<boolean>(initialDuration === 0);
  const [modalExamName, setModalExamName] = useState(initialExamName || '');
  
  // Date time opening & closing
  const [hasSchedule, setHasSchedule] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Code selection
  const [selectedCodeOption, setSelectedCodeOption] = useState<string>('all');

  // Step state
  const [step, setStep] = useState<'config' | 'success'>('config');
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [sharePin, setSharePin] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedZalo, setCopiedZalo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial props whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const normType = normalizeExamType(initialExamType);
      setModalExamType(normType);
      
      const defaultDur = initialDuration > 0 
        ? initialDuration 
        : getDefaultDurationForExamType(normType, schoolLevel, grade, subject);
      
      setModalDuration(defaultDur);
      setIsUnlimitedTime(initialDuration === 0);
      
      const standardTitle = formatExamTitle(normType, subject, grade);
      setModalExamName(initialExamName || standardTitle);
      
      setStep('config');
      setErrorMsg(null);
      setShareLink('');
      setSharePin('');
      setQrCodeUrl('');
      setCopiedLink(false);
      setCopiedPin(false);
      setCopiedZalo(false);
    }
  }, [isOpen, initialExamName, initialExamType, initialDuration, schoolLevel, grade, subject]);

  if (!isOpen) return null;

  const handleExamTypeChange = (newType: string) => {
    setModalExamType(newType);
    const newDur = getDefaultDurationForExamType(newType, schoolLevel, grade, subject);
    if (!isUnlimitedTime) {
      setModalDuration(newDur);
    }
    // Auto-update title if it currently matches a standard format
    const oldTitle = formatExamTitle(modalExamType, subject, grade);
    if (!modalExamName || modalExamName === oldTitle || modalExamName.startsWith('ĐỀ ')) {
      setModalExamName(formatExamTitle(newType, subject, grade));
    }
  };

  const handleResetTitleToStandard = () => {
    setModalExamName(formatExamTitle(modalExamType, subject, grade));
  };

  const handleCreateOnlineExam = async () => {
    try {
      setErrorMsg(null);
      setIsSharing(true);

      // Validate questions exist
      const availableQuestions = (shuffledExams && shuffledExams.length > 0)
        ? shuffledExams[0].questions
        : originalQuestions;

      if (!availableQuestions || availableQuestions.length === 0) {
        throw new Error("Chưa có câu hỏi nào trong đề thi. Vui lòng tạo hoặc tải đề trước.");
      }

      // Validate schedule if enabled
      if (hasSchedule) {
        if (startTime && endTime) {
          const startTimestamp = new Date(startTime).getTime();
          const endTimestamp = new Date(endTime).getTime();
          if (startTimestamp >= endTimestamp) {
            throw new Error("Thời gian mở đề phải diễn ra trước thời gian đóng đề.");
          }
        }
      }

      // Filter or pick codes to include
      let codesToProcess: { code: string; questions: any[] }[] = [];
      if (selectedCodeOption === 'all' && shuffledExams && shuffledExams.length > 0) {
        codesToProcess = shuffledExams;
      } else if (selectedCodeOption !== 'all' && shuffledExams && shuffledExams.length > 0) {
        const found = shuffledExams.find(e => e.code === selectedCodeOption);
        codesToProcess = found ? [found] : [shuffledExams[0]];
      } else {
        codesToProcess = [{ code: '101', questions: originalQuestions }];
      }

      // Pre-render TikZ figures into high-speed native SVG
      const optimizedCodes = codesToProcess.map(exam => ({
        ...exam,
        questions: exam.questions.map((q: any) => ({
          ...q,
          content: embedTikzSvgsInText(q.content || q.question || q.text || ''),
          explanation: q.explanation ? embedTikzSvgsInText(q.explanation) : undefined,
          options: q.options ? q.options.map((opt: string) => embedTikzSvgsInText(opt)) : undefined,
          tfStatements: q.tfStatements ? q.tfStatements.map((tf: any) => ({
            statement: embedTikzSvgsInText(tf.statement || ''),
            correct: tf.correct
          })) : undefined
        }))
      }));

      const finalDuration = isUnlimitedTime ? 0 : (Number(modalDuration) || 45);
      const cleanTitle = modalExamName.trim() || formatExamTitle(modalExamType, subject, grade);

      const examMetadata = {
        examName: cleanTitle,
        examType: modalExamType,
        subject,
        grade,
        schoolLevel,
        duration: finalDuration,
        examDuration: finalDuration,
        isUnlimitedTime: isUnlimitedTime || finalDuration === 0,
        startTime: hasSchedule && startTime ? startTime : undefined,
        endTime: hasSchedule && endTime ? endTime : undefined,
        createdAt: new Date().toISOString()
      };

      const dataToShare = {
        examData: examMetadata,
        examType: modalExamType,
        duration: finalDuration,
        examDuration: finalDuration,
        isUnlimitedTime: isUnlimitedTime || finalDuration === 0,
        startTime: hasSchedule && startTime ? startTime : undefined,
        endTime: hasSchedule && endTime ? endTime : undefined,
        codes: optimizedCodes
      };

      // Generate 6-char PIN
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let fallbackCode = '';
      for (let i = 0; i < 6; i++) {
        fallbackCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      let examId = fallbackCode;
      try {
        const shareRes = await apiFetch('/api/exams/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...dataToShare, customId: fallbackCode })
        });
        if (shareRes.ok) {
          const shareJson = await shareRes.json();
          if (shareJson.examId) examId = shareJson.examId;
        }
      } catch (e) {
        console.warn("Backend share notice:", e);
      }

      // Dual-sync to persistent Cloud KV with hex chunking and local cache
      await saveExamToCloud(examId, dataToShare);

      // Clean short PIN url
      const publicBase = window.location.origin;
      const cleanPinUrl = `${publicBase}/?pin=${examId}`;
      let finalUrl = cleanPinUrl;

      // Fallback hash for offline/static resilience if not too long
      try {
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(dataToShare));
        if (compressed && compressed.length < 1800) {
          finalUrl = `${cleanPinUrl}#d=${compressed}`;
        }
      } catch (e) {}

      // Generate QR Code
      try {
        const qrData = await QRCode.toDataURL(cleanPinUrl, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#0f172a', light: '#ffffff' }
        });
        setQrCodeUrl(qrData);
      } catch (qrErr) {
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(cleanPinUrl)}`);
      }

      setSharePin(examId);
      setShareLink(finalUrl);
      setStep('success');

      if (onExamUpdated) {
        onExamUpdated({
          examName: cleanTitle,
          examType: modalExamType,
          duration: finalDuration
        });
      }
    } catch (err: any) {
      console.error("Lỗi tạo bài thi trực tuyến:", err);
      setErrorMsg(err.message || "Không thể tạo link làm online.");
    } finally {
      setIsSharing(false);
    }
  };

  const getZaloTemplate = () => {
    const durText = isUnlimitedTime ? "Không giới hạn" : `${modalDuration} phút`;
    let scheduleText = '';
    if (hasSchedule) {
      if (startTime) scheduleText += `\n🕒 Mở đề từ: ${new Date(startTime).toLocaleString('vi-VN')}`;
      if (endTime) scheduleText += `\n⛔ Khóa nộp bài lúc: ${new Date(endTime).toLocaleString('vi-VN')}`;
    }

    return `📢 THÔNG BÁO BÀI THI TRỰC TUYẾN: ${modalExamName}
📚 Môn: ${subject} - Lớp: ${grade}
📝 Loại đề: ${modalExamType}
⏱ Thời gian làm bài: ${durText}${scheduleText}
👉 Link làm bài trực tiếp: ${shareLink}
🔑 Hoặc vào trang: ${window.location.origin} và nhập Mã PIN: ${sharePin}

📌 LƯU Ý KHI LÀM BÀI TRÊN ĐIỆN THOẠI / ZALO:
1. Nếu mở link trong Zalo bị chậm, hãy bấm biểu tượng (···) ở góc trên bên phải màn hình Zalo và chọn "Mở bằng trình duyệt" (Chrome / Safari).
2. Điền đầy đủ Họ và tên, Lớp trước khi bấm "Bắt đầu làm bài".`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(sharePin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2500);
  };

  const handleCopyZalo = () => {
    navigator.clipboard.writeText(getZaloTemplate());
    setCopiedZalo(true);
    setTimeout(() => setCopiedZalo(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {step === 'config' ? 'Cấu Hình & Tạo Link Làm Online' : 'Link Bài Thi Trực Tuyến Đã Sẵn Sàng'}
              </h2>
              <p className="text-xs text-slate-500">
                {step === 'config' 
                  ? 'Thiết lập loại đề, thời lượng làm bài và khung giờ mở thi cho học sinh' 
                  : 'Chia sẻ mã PIN, link trực tiếp hoặc mã QR để học sinh quét làm bài'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {step === 'config' ? (
            <div className="space-y-5 text-sm">
              
              {/* Tiêu đề đề thi */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Tên đề thi / Bài kiểm tra</label>
                  <button
                    type="button"
                    onClick={handleResetTitleToStandard}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                    title="Đặt lại theo định dạng chuẩn"
                  >
                    <RefreshCw className="w-3 h-3" /> Đặt tên theo chuẩn
                  </button>
                </div>
                <input
                  type="text"
                  value={modalExamName}
                  onChange={e => setModalExamName(e.target.value)}
                  placeholder="Ví dụ: ĐỀ KIỂM TRA GIỮA KỲ 1 - MÔN TOÁN 10..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Grid: Loại đề & Thời gian làm bài */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Loại đề thi (Danh mục chuẩn hóa GDPT) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Loại đề thi <span className="text-emerald-600 font-normal">(Gợi ý thời gian tự động)</span>
                  </label>
                  <select
                    value={modalExamType}
                    onChange={e => handleExamTypeChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                  >
                    {STANDARDIZED_EXAM_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Thời gian làm bài */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      Thời gian (phút)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isUnlimitedTime}
                        onChange={e => {
                          const checked = e.target.checked;
                          setIsUnlimitedTime(checked);
                          if (!checked && modalDuration === 0) {
                            setModalDuration(getDefaultDurationForExamType(modalExamType, schoolLevel, grade, subject));
                          }
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                      />
                      <span>Không giới hạn</span>
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min={5}
                      max={300}
                      disabled={isUnlimitedTime}
                      value={isUnlimitedTime ? '' : modalDuration}
                      onChange={e => setModalDuration(Math.max(1, Number(e.target.value)))}
                      placeholder={isUnlimitedTime ? "Không giới hạn thời gian" : "Số phút"}
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                        isUnlimitedTime 
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                          : 'border-slate-300'
                      }`}
                    />
                    {!isUnlimitedTime && (
                      <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                        phút
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Lựa chọn mã đề trộn */}
              {shuffledExams && shuffledExams.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mã đề áp dụng cho phòng thi</label>
                  <select
                    value={selectedCodeOption}
                    onChange={e => setSelectedCodeOption(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                  >
                    <option value="all">
                      🎲 Tất cả {shuffledExams.length} mã đề ({shuffledExams.map(e => e.code).join(', ')}) - Học sinh nhận ngẫu nhiên
                    </option>
                    {shuffledExams.map(exam => (
                      <option key={exam.code} value={exam.code}>
                        Chỉ phát Mã đề {exam.code} ({exam.questions.length} câu)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 4. Khung giờ mở / đóng đề */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">Cấu hình thời gian mở / đóng đề thi</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasSchedule}
                      onChange={e => setHasSchedule(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span>{hasSchedule ? "Đang bật" : "Bật hẹn giờ"}</span>
                  </label>
                </div>

                {hasSchedule && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Thời điểm bắt đầu mở đề
                      </label>
                      <input
                        type="datetime-local"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Trước giờ này học sinh không thể vào làm</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Thời điểm khóa nộp bài
                      </label>
                      <input
                        type="datetime-local"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Sau giờ này hệ thống tự động khóa đề</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Pill */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  Đồng hồ thi sẽ đếm ngược: <strong>{isUnlimitedTime ? 'Không giới hạn thời gian' : `${modalDuration} phút`}</strong>
                </span>
                <span className="text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                  {modalExamType}
                </span>
              </div>
            </div>
          ) : (
            /* ================= STEP SUCCESS ================= */
            <div className="space-y-5 text-sm">
              
              {/* Success Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-1">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-emerald-950">
                  Tạo Link Làm Online Thành Công!
                </h3>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  Đề thi <strong>"{modalExamName}"</strong> ({modalExamType} - {isUnlimitedTime ? 'Không giới hạn' : `${modalDuration} phút`}) đã được lưu trữ trên máy chủ và sẵn sàng.
                </p>
              </div>

              {/* PIN Code Box */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block font-semibold">Mã phòng thi (PIN):</span>
                  <span className="text-2xl font-mono font-black text-emerald-700 tracking-widest">{sharePin}</span>
                </div>
                <button
                  onClick={handleCopyPin}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPin ? "Đã chép!" : "Sao chép PIN"}
                </button>
              </div>

              {/* Direct Link Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Đường link làm bài trực tiếp:</span>
                  {copiedLink && (
                    <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs animate-in fade-in">
                      <Check className="w-3.5 h-3.5" /> Đã sao chép link!
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 select-all outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow-2xs transition-colors"
                  >
                    <Copy className="w-4 h-4" /> Sao chép Link
                  </button>
                  <a
                    href={shareLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shrink-0 transition-colors"
                    title="Mở tab mới để kiểm tra giao diện làm bài của học sinh"
                  >
                    <ExternalLink className="w-4 h-4" /> Thử làm
                  </a>
                </div>
              </div>

              {/* QR Code & Zalo Message */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* QR Code Box */}
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="w-44 h-44 rounded-lg object-contain" />
                  ) : (
                    <div className="w-44 h-44 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                      <QrIcon className="w-10 h-10 animate-pulse" />
                    </div>
                  )}
                  {qrCodeUrl && (
                    <a
                      href={qrCodeUrl}
                      download={`QR_PhongThi_${sharePin}.png`}
                      className="text-xs text-emerald-700 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" /> Tải ảnh mã QR
                    </a>
                  )}
                </div>

                {/* Zalo Message Template */}
                <div className="flex flex-col justify-between h-full space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mẫu tin nhắn gửi Zalo / Phụ huynh:
                    </label>
                    <textarea
                      readOnly
                      rows={6}
                      value={getZaloTemplate()}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 font-sans leading-relaxed focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    onClick={handleCopyZalo}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    {copiedZalo ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {copiedZalo ? "Đã sao chép tin nhắn Zalo!" : "Sao chép tin nhắn Zalo"}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step === 'config' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold text-sm rounded-xl hover:bg-slate-200/60 transition-colors"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleCreateOnlineExam}
                disabled={isSharing}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                {isSharing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang khởi tạo phòng thi...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Tạo Link & Sinh Mã QR</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('config')}
                className="px-4 py-2 text-slate-700 hover:text-slate-900 font-semibold text-sm rounded-xl hover:bg-slate-200/60 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Chỉnh sửa cấu hình
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-xs transition-colors"
              >
                Hoàn tất & Đóng
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
