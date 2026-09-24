import * as XLSX from 'xlsx';
import { cleanOptionText } from './utils';

export interface MixerQuestion {
  id: number;
  originalId?: number;
  type?: "mc" | "tf" | "sa" | "essay" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY" | string;
  content: string;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  tfStatements?: { statement: string; correct: boolean }[];
  explanation?: string;
  solution?: string;
  level?: string;
  isRealWorld?: boolean;
  topic?: string;
  subtopic?: string;
  imageUrl?: string;
  hasFigure?: boolean;
  section?: 1 | 2 | 3 | 4;
}

export const SECTION_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn",
  2: "PHẦN II. Câu trắc nghiệm đúng sai",
  3: "PHẦN III. Câu trắc nghiệm trả lời ngắn",
  4: "PHẦN IV. Tự luận"
};

export const SECTION_SHORT_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: "Phần I (Nhiều lựa chọn)",
  2: "Phần II (Đúng/Sai)",
  3: "Phần III (Trả lời ngắn)",
  4: "Phần IV (Tự luận)"
};

/**
 * Phân loại câu hỏi vào một trong 4 phần chuẩn Bộ GD&ĐT 2025
 * Group 1: Trắc nghiệm 4 lựa chọn (MC)
 * Group 2: Trắc nghiệm Đúng / Sai (TF)
 * Group 3: Trắc nghiệm Trả lời ngắn / Điền số (SA)
 * Group 4: Tự luận (Essay)
 */
export function identifyQuestionSection(q: any): 1 | 2 | 3 | 4 {
  const typeStr = String(q.type || '').toUpperCase().trim();

  // Part II: Đúng / Sai
  if (
    typeStr === 'TF' ||
    typeStr === 'TRUE_FALSE' ||
    typeStr === 'ĐÚNG_SAI' ||
    typeStr === 'DUNG_SAI' ||
    typeStr === 'ĐÚNG SAI' ||
    (Array.isArray(q.tfStatements) && q.tfStatements.length >= 2)
  ) {
    return 2;
  }

  // Part III: Trả lời ngắn / Điền số
  if (
    typeStr === 'SA' ||
    typeStr === 'SHORT_ANSWER' ||
    typeStr === 'TRẢ LỜI NGẮN' ||
    typeStr === 'TRA_LOI_NGAN' ||
    typeStr === 'ĐIỀN SỐ' ||
    typeStr === 'DIEN_SO'
  ) {
    return 3;
  }

  // Part IV: Tự luận
  if (
    typeStr === 'ESSAY' ||
    typeStr === 'TỰ LUẬN' ||
    typeStr === 'TU_LUAN' ||
    typeStr === 'TL'
  ) {
    return 4;
  }

  // Part I: Trắc nghiệm 4 lựa chọn
  if (
    typeStr === 'MC' ||
    typeStr === 'MULTIPLE_CHOICE' ||
    typeStr === 'TRẮC NGHIỆM' ||
    (Array.isArray(q.options) && q.options.length >= 2)
  ) {
    return 1;
  }

  // Phân tích nội dung câu hỏi nếu type chưa rõ
  const contentUpper = String(q.content || q.question || '').toUpperCase();
  if (contentUpper.includes('PHẦN II') || contentUpper.includes('ĐÚNG SAI')) return 2;
  if (contentUpper.includes('PHẦN III') || contentUpper.includes('TRẢ LỜI NGẮN') || contentUpper.includes('ĐIỀN SỐ')) return 3;
  if (contentUpper.includes('PHẦN IV') || contentUpper.includes('TỰ LUẬN')) return 4;

  // Nếu không có options và đáp án ngắn (dưới 20 ký tự số/chữ) => Trả lời ngắn
  if (!q.options || q.options.length === 0) {
    if (q.correctAnswer && String(q.correctAnswer).trim().length <= 20) {
      return 3;
    }
    return 4;
  }

  return 1;
}

/**
 * Thuật toán xáo trộn Fisher-Yates (Knuth shuffle)
 * Đảm bảo phân phối ngẫu nhiên đồng đều không thiên vị
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Trộn thứ tự các phương án A, B, C, D của câu hỏi trắc nghiệm
 * và đồng bộ lại chính xác 100% key đáp án đúng (correctOptionIndex & correctAnswer)
 */
export function shuffleMultipleChoiceOptions(
  q: MixerQuestion,
  shouldShuffleOptions: boolean
): MixerQuestion {
  if (!q.options || q.options.length === 0) {
    return { ...q };
  }

  const rawOptions = q.options.map(opt => cleanOptionText(opt));

  // Xác định vị trí đáp án đúng ban đầu
  let originalCorrectIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0;
  if (q.correctAnswer) {
    const ca = String(q.correctAnswer).trim().toUpperCase();
    if (ca.length === 1 && ca >= 'A' && ca <= 'D') {
      originalCorrectIdx = ca.charCodeAt(0) - 65;
    } else {
      const matchIdx = rawOptions.findIndex(o => o.trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase());
      if (matchIdx >= 0) originalCorrectIdx = matchIdx;
    }
  }

  const optionObjects = rawOptions.map((optText, idx) => ({
    text: optText,
    isCorrect: idx === originalCorrectIdx
  }));

  const shuffledObjects = shouldShuffleOptions ? fisherYatesShuffle(optionObjects) : optionObjects;
  const newCorrectIdx = shuffledObjects.findIndex(item => item.isCorrect);
  const finalCorrectIdx = newCorrectIdx >= 0 ? newCorrectIdx : 0;
  const oldCorrectLetter = String.fromCharCode(65 + originalCorrectIdx);
  const finalCorrectLetter = String.fromCharCode(65 + finalCorrectIdx);

  let updatedSolution = q.solution ?? q.explanation ?? "";
  let updatedExplanation = q.explanation ?? q.solution ?? "";

  // Nếu vị trí đáp án thay đổi và có lời giải nhắc trực tiếp đến nhãn đáp án cũ (A, B, C, D)
  if (shouldShuffleOptions && oldCorrectLetter !== finalCorrectLetter) {
    const updateLabel = (text: string) => {
      if (!text) return text;
      let s = text;
      // 1. "chọn (đáp án/phương án) X" hoặc "do đó/vậy chọn X"
      const r1 = new RegExp(`(\\b(?:chọn|chọn\\s+đáp\\s+án|chọn\\s+phương\\s+án|do\\s+đó\\s+chọn|vậy\\s+chọn)\\s+)\\b${oldCorrectLetter}\\b`, 'gi');
      s = s.replace(r1, `$1${finalCorrectLetter}`);

      // 2. "đáp án (đúng là) X"
      const r2 = new RegExp(`(\\b(?:đáp\\s+án(?:\\s+đúng(?:\\s+là)?)?|phương\\s+án(?:\\s+đúng(?:\\s+là)?)?)\\s+)\\b${oldCorrectLetter}\\b`, 'gi');
      s = s.replace(r2, `$1${finalCorrectLetter}`);

      // 3. "\text{chọn } X"
      const r3 = new RegExp(`(\\\\text\\{chọn\\s*\\}\\s*)\\b${oldCorrectLetter}\\b`, 'gi');
      s = s.replace(r3, `$1${finalCorrectLetter}`);

      return s;
    };
    updatedSolution = updateLabel(updatedSolution);
    updatedExplanation = updateLabel(updatedExplanation);
  }

  return {
    ...q,
    options: shuffledObjects.map(item => item.text),
    correctOptionIndex: finalCorrectIdx,
    correctAnswer: finalCorrectLetter,
    solution: updatedSolution,
    explanation: updatedExplanation
  };
}

export interface MixExamConfig {
  numCodes: number; // Số lượng mã đề (VD: 4)
  groupBySection: boolean; // Cố định nhóm theo từng phần chuẩn GDPT (Mặc định: true)
  shuffleQuestions: boolean; // Trộn thứ tự câu hỏi giữa các mã đề (Mặc định: true)
  shuffleOptions: boolean; // Đảo thứ tự phương án A, B, C, D (Mặc định: true)
  shuffleEssay?: boolean; // Trộn thứ tự câu tự luận (Mặc định: false - giữ nguyên thứ tự)
  startCode?: number; // Mã đề bắt đầu (Mặc định: 101)
  customCodes?: string[]; // Danh sách mã đề tuỳ chỉnh (nếu có)
}

export interface ShuffledExamResult {
  code: string;
  questions: MixerQuestion[];
}

/**
 * Hàm trộn đề chính theo đúng 4 bước chuẩn Bộ Giáo Dục:
 * Bước 1: Phân loại câu hỏi thành 4 Group (Phần I, II, III, IV)
 * Bước 2: Xáo trộn Fisher-Yates ĐỘC LẬP bên trong từng Group
 * Bước 3: Ghép nối các nhóm theo đúng thứ tự chuẩn GDPT: [...G1, ...G2, ...G3, ...G4]
 * Bước 4: Đánh lại số thứ tự "Câu 1, Câu 2, Câu 3..." liên tục từ đầu đến cuối
 */
export function mixExam(
  originalQuestions: MixerQuestion[],
  config: MixExamConfig
): ShuffledExamResult[] {
  if (!originalQuestions || originalQuestions.length === 0) return [];

  const {
    numCodes = 4,
    groupBySection = true,
    shuffleQuestions = true,
    shuffleOptions = true,
    shuffleEssay = false,
    startCode = 101,
    customCodes
  } = config;

  const results: ShuffledExamResult[] = [];
  const totalExams = Math.min(Math.max(1, numCodes), 24);

  // Gán nhãn section cho từng câu hỏi ban đầu
  const taggedQuestions: MixerQuestion[] = originalQuestions.map((q, idx) => ({
    ...q,
    originalId: q.id || idx + 1,
    section: identifyQuestionSection(q),
    solution: q.solution ?? q.explanation ?? "",
    explanation: q.explanation ?? q.solution ?? ""
  }));

  for (let i = 0; i < totalExams; i++) {
    const code = customCodes && customCodes[i]
      ? customCodes[i]
      : (startCode + i).toString();

    let finalQuestionsForCode: MixerQuestion[] = [];

    if (groupBySection) {
      // BƯỚC 1: Phân loại danh sách câu hỏi thành 4 Group độc lập
      const group1 = taggedQuestions.filter(q => q.section === 1);
      const group2 = taggedQuestions.filter(q => q.section === 2);
      const group3 = taggedQuestions.filter(q => q.section === 3);
      const group4 = taggedQuestions.filter(q => q.section === 4);

      // BƯỚC 2: Xáo trộn Fisher-Yates ĐỘC LẬP bên trong từng Group
      // Group 1: Trắc nghiệm nhiều lựa chọn
      const shuffledG1 = shuffleQuestions ? fisherYatesShuffle(group1) : [...group1];
      const g1Processed = shuffledG1.map(q => shuffleMultipleChoiceOptions(q, shuffleOptions));

      // Group 2: Trắc nghiệm Đúng / Sai
      // Giữ nguyên cấu trúc các ý con a, b, c, d (chỉ đảo thứ tự câu lớn)
      const shuffledG2 = shuffleQuestions ? fisherYatesShuffle(group2) : [...group2];
      const g2Processed = shuffledG2.map(q => ({
        ...q,
        tfStatements: q.tfStatements ? [...q.tfStatements] : undefined
      }));

      // Group 3: Trả lời ngắn / Điền số
      const shuffledG3 = shuffleQuestions ? fisherYatesShuffle(group3) : [...group3];
      const g3Processed = shuffledG3.map(q => ({ ...q }));

      // Group 4: Tự luận (Giữ nguyên vị trí ở cuối đề thi; giữ nguyên thứ tự hoặc đảo nếu cấu hình)
      const shuffledG4 = (shuffleEssay && shuffleQuestions) ? fisherYatesShuffle(group4) : [...group4];
      const g4Processed = shuffledG4.map(q => ({ ...q }));

      // BƯỚC 3: Ghép nối các nhóm lại theo đúng thứ tự chuẩn GDPT
      const combined = [...g1Processed, ...g2Processed, ...g3Processed, ...g4Processed];

      // BƯỚC 4: Đánh lại số thứ tự "Câu 1, Câu 2, Câu 3..." liên tục từ đầu đến cuối đề
      finalQuestionsForCode = combined.map((q, idx) => ({
        ...q,
        id: idx + 1
      }));
    } else {
      // Khi tắt cố định theo phần (trộn tự do toàn bộ đề)
      const shuffledAll = shuffleQuestions ? fisherYatesShuffle(taggedQuestions) : [...taggedQuestions];
      finalQuestionsForCode = shuffledAll.map((q, idx) => {
        const processed = q.section === 1
          ? shuffleMultipleChoiceOptions(q, shuffleOptions)
          : { ...q };
        return {
          ...processed,
          id: idx + 1
        };
      });
    }

    results.push({
      code,
      questions: finalQuestionsForCode
    });
  }

  return results;
}

/**
 * Trích xuất đáp án chuẩn dạng văn bản cho từng câu hỏi
 */
export function getQuestionAnswerString(q: MixerQuestion): string {
  if (q.type === 'mc' || q.section === 1) {
    if (q.correctOptionIndex !== undefined) {
      return String.fromCharCode(65 + q.correctOptionIndex);
    }
    if (q.correctAnswer) {
      const ca = String(q.correctAnswer).trim().toUpperCase();
      if (ca.length === 1 && ca >= 'A' && ca <= 'D') return ca;
    }
    return 'A';
  }

  if (q.type === 'tf' || q.section === 2) {
    if (q.tfStatements && q.tfStatements.length > 0) {
      return q.tfStatements.map(s => s.correct ? 'Đ' : 'S').join('-');
    }
    return String(q.correctAnswer || 'Đ');
  }

  if (q.type === 'sa' || q.section === 3) {
    return String(q.correctAnswer || '').replace(/<[^>]*>?/gm, '').trim();
  }

  if (q.type === 'essay' || q.section === 4) {
    return 'Tự luận';
  }

  return String(q.correctAnswer || '');
}

/**
 * Tạo ma trận đáp án TNMaker định dạng CSV
 */
export function generateTNMakerCSV(shuffledExams: ShuffledExamResult[]): string {
  if (!shuffledExams || shuffledExams.length === 0) return '';
  let csvContent = "\uFEFF"; // UTF-8 BOM
  csvContent += "Câu," + shuffledExams.map(e => e.code).join(",") + "\n";
  const numQuestions = shuffledExams[0].questions.length;

  for (let i = 0; i < numQuestions; i++) {
    const row: (string | number)[] = [i + 1];
    for (const exam of shuffledExams) {
      const q = exam.questions[i];
      let ans = "";
      if (q.section === 1 || q.type === 'mc') {
        ans = String.fromCharCode(65 + (q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0));
      } else if (q.section === 2 || (q.type === 'tf' && q.tfStatements)) {
        // TNMaker thường dùng chuỗi 4 ký tự D/S (Đ/S)
        ans = q.tfStatements ? q.tfStatements.map(s => s.correct ? 'D' : 'S').join('') : 'DDDD';
      } else if (q.section === 3 || q.type === 'sa') {
        ans = (q.correctAnswer || '').replace(/<[^>]*>?/gm, '').trim().substring(0, 15);
      } else {
        ans = "TL";
      }
      row.push(ans);
    }
    csvContent += row.join(",") + "\n";
  }

  return csvContent;
}

/**
 * Xuất file Excel Bảng Đáp Án Ma Trận & TNMaker chuyên nghiệp
 * Bao gồm:
 * 1. Bảng Đáp Án Ma Trận (Trực quan, phân biệt rõ từng Phần I, II, III, IV)
 * 2. Mẫu Chấm TNMaker (Chuẩn cho App quét phiếu)
 * 3. Bảng Tra Cứu Câu Gốc (Đối chiếu câu gốc sang từng mã đề)
 */
export function exportTNMakerExcelFile(shuffledExams: ShuffledExamResult[], examName: string): void {
  if (!shuffledExams || shuffledExams.length === 0) {
    alert("Chưa có mã đề nào được trộn để xuất bảng đáp án.");
    return;
  }

  try {
    const workbook = XLSX.utils.book_new();
    const numQuestions = shuffledExams[0].questions.length;

    // SHEET 1: BẢNG ĐÁP ÁN MA TRẬN TỔNG HỢP
    const matrixData: any[] = [];
    for (let i = 0; i < numQuestions; i++) {
      const firstQ = shuffledExams[0].questions[i];
      const section = firstQ.section || identifyQuestionSection(firstQ);
      const rowObj: any = {
        "Câu": i + 1,
        "Phần": SECTION_SHORT_NAMES[section] || `Phần ${section}`
      };

      for (const exam of shuffledExams) {
        const q = exam.questions[i];
        rowObj[`Mã ${exam.code}`] = getQuestionAnswerString(q);
      }
      matrixData.push(rowObj);
    }

    const wsMatrix = XLSX.utils.json_to_sheet(matrixData);
    wsMatrix['!cols'] = [
      { wch: 8 },  // Câu
      { wch: 24 }, // Phần
      ...shuffledExams.map(() => ({ wch: 14 })) // Các mã đề
    ];
    XLSX.utils.book_append_sheet(workbook, wsMatrix, "Ma Trận Đáp Án");

    // SHEET 2: ĐỊNH DẠNG TNMAKER CHUẨN
    const tnmakerData: any[] = [];
    for (let i = 0; i < numQuestions; i++) {
      const rowObj: any = {
        "Câu": i + 1
      };
      for (const exam of shuffledExams) {
        const q = exam.questions[i];
        let ans = "";
        if (q.section === 1 || q.type === 'mc') {
          ans = String.fromCharCode(65 + (q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0));
        } else if (q.section === 2 || (q.type === 'tf' && q.tfStatements)) {
          ans = q.tfStatements ? q.tfStatements.map(s => s.correct ? 'D' : 'S').join('') : 'DDDD';
        } else if (q.section === 3 || q.type === 'sa') {
          ans = (q.correctAnswer || '').replace(/<[^>]*>?/gm, '').trim().substring(0, 15);
        } else {
          ans = "TL";
        }
        rowObj[exam.code] = ans;
      }
      tnmakerData.push(rowObj);
    }

    const wsTNMaker = XLSX.utils.json_to_sheet(tnmakerData);
    wsTNMaker['!cols'] = [
      { wch: 8 },
      ...shuffledExams.map(() => ({ wch: 12 }))
    ];
    XLSX.utils.book_append_sheet(workbook, wsTNMaker, "TNMaker Form");

    // SHEET 3: BẢNG ĐỐI CHIẾU CÂU HỎI ĐỀ GỐC
    const crossRefData: any[] = [];
    for (let i = 0; i < numQuestions; i++) {
      const originalNum = i + 1;
      const rowObj: any = {
        "Câu Đề Gốc": originalNum
      };

      for (const exam of shuffledExams) {
        // Tìm vị trí của câu gốc trong mã đề này
        const foundIdx = exam.questions.findIndex(q => (q.originalId || 0) === originalNum);
        rowObj[`Vị trí ở Mã ${exam.code}`] = foundIdx >= 0 ? `Câu ${foundIdx + 1}` : '-';
      }
      crossRefData.push(rowObj);
    }

    const wsCrossRef = XLSX.utils.json_to_sheet(crossRefData);
    wsCrossRef['!cols'] = [
      { wch: 14 },
      ...shuffledExams.map(() => ({ wch: 18 }))
    ];
    XLSX.utils.book_append_sheet(workbook, wsCrossRef, "Đối Chiếu Đề Gốc");

    const cleanTitle = (examName || "De_Thi").replace(/[^\w\s\u00C0-\u1EF9]/gi, '').replace(/\s+/g, '_');
    XLSX.writeFile(workbook, `Bang_Dap_An_${cleanTitle}.xlsx`);
  } catch (err: any) {
    console.error("Lỗi xuất file Excel đáp án:", err);
    alert("Đã xảy ra lỗi khi tạo file Excel đáp án: " + (err?.message || ""));
  }
}
