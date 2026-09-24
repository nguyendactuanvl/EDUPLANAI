import { cleanOptionText, cleanMath, wrapLatex, fixMath, safeJsonParse, sanitizeShortAnswerInput } from './utils';
import { apiFetch } from './apiFetch';

export interface ParsedQuestion {
  id: number;
  type: "mc" | "tf" | "sa" | "essay" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY";
  level: string;
  topic?: string;
  subtopic?: string;
  content: string;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  tfStatements?: { statement: string; correct: boolean }[];
  explanation?: string;
  solution?: string;
  imageUrl?: string;
  hasFigure?: boolean;
}

export interface RawAiQuestion {
  id?: number;
  type?: string;
  question?: string;
  content?: string;
  options?: string[];
  correctAnswer?: string;
  correctOptionIndex?: number;
  tfStatements?: { statement: string; correct: boolean }[];
  explanation?: string;
  solution?: string;
  imageUrl?: string;
  hasFigure?: boolean;
}

export function formatAiQuestionsToParsed(rawQuestions: any[]): ParsedQuestion[] {
  if (!Array.isArray(rawQuestions)) return [];

  return rawQuestions.map((q, idx) => {
    const rawContent = q.question || q.content || `Câu ${idx + 1}`;
    const rawType = String(q.type || '').toUpperCase().trim();

    // Determine normalized question type: mc | tf | sa | essay
    let normalizedType: "mc" | "tf" | "sa" | "essay" = 'mc';
    if (rawType === 'TRUE_FALSE' || rawType === 'TF' || rawType === 'ĐÚNG_SAI' || rawType === 'ĐÚNG SAI') {
      normalizedType = 'tf';
    } else if (rawType === 'SHORT_ANSWER' || rawType === 'SA' || rawType === 'ĐIỀN SỐ' || rawType === 'TRẢ LỜI NGẮN') {
      normalizedType = 'sa';
    } else if (rawType === 'ESSAY' || rawType === 'TỰ LUẬN' || rawType === 'TU_LUAN' || rawType === 'TL') {
      normalizedType = 'essay';
    } else if (rawType === 'MULTIPLE_CHOICE' || rawType === 'MC' || rawType === 'TRẮC NGHIỆM') {
      normalizedType = 'mc';
    } else {
      // Auto-infer from properties if type is missing or vague
      if (Array.isArray(q.tfStatements) && q.tfStatements.length >= 2) {
        normalizedType = 'tf';
      } else if (!q.options || q.options.length === 0) {
        if (q.correctAnswer && String(q.correctAnswer).trim().length <= 15) {
          normalizedType = 'sa';
        } else {
          normalizedType = 'essay';
        }
      }
    }

    // 1. Handle TRUE_FALSE ("tf" - Phần II)
    if (normalizedType === 'tf') {
      let statements: { statement: string; correct: boolean }[] = [];
      if (Array.isArray(q.tfStatements) && q.tfStatements.length > 0) {
        statements = q.tfStatements.map((stmt: any, sIdx: number) => {
          let sText = typeof stmt === 'string' ? stmt : (stmt.statement || stmt.text || stmt.content || `Ý ${String.fromCharCode(97 + sIdx)}`);
          let isTrue = false;
          if (typeof stmt === 'object' && stmt !== null) {
            isTrue = stmt.correct === true || String(stmt.correct).toLowerCase() === 'true' || String(stmt.correct).toUpperCase() === 'Đ' || String(stmt.correct).toLowerCase() === 'đúng';
          }
          return {
            statement: fixMath(cleanMath(sText.replace(/^[a-d][\.\:\)]\s*/i, '').trim())),
            correct: isTrue
          };
        });
      } else if (Array.isArray(q.options) && q.options.length > 0) {
        // AI returned 4 statements in options array
        statements = q.options.map((opt: any, sIdx: number) => {
          let optText = typeof opt === 'string' ? opt : String(opt);
          const isTrue = /(?:\[Đ\]|\(Đ\)|- Đúng|: Đúng)/i.test(optText);
          const cleanText = optText.replace(/(?:\[[ĐS]\]|\([ĐS]\)|- (Đúng|Sai)|: (Đúng|Sai))/gi, '').replace(/^[a-d][\.\:\)]\s*/i, '').trim();
          return {
            statement: fixMath(cleanMath(cleanText)),
            correct: isTrue
          };
        });
      }

      // Ensure 4 sub-statements a, b, c, d
      const defaultSubLabels = ['a', 'b', 'c', 'd'];
      while (statements.length < 4) {
        const nextLetter = defaultSubLabels[statements.length] || 'a';
        statements.push({
          statement: `Ý ${nextLetter}`,
          correct: false
        });
      }

      const solText = q.solution ? fixMath(cleanMath(q.solution)) : (q.explanation ? fixMath(cleanMath(q.explanation)) : "");
      return {
        id: q.id || (idx + 1),
        type: 'tf',
        level: q.level || 'Thông hiểu',
        content: fixMath(cleanMath(rawContent.replace(/^(?:Câu|Bài|Question|Q)?\s*\d+[\.:\s]*/i, '').trim() || `Câu ${idx + 1}`)),
        tfStatements: statements,
        solution: solText,
        explanation: solText || undefined,
        imageUrl: q.imageUrl || undefined,
        hasFigure: q.hasFigure ?? (!!q.imageUrl || undefined)
      };
    }

    // 2. Handle SHORT_ANSWER ("sa" - Phần III)
    if (normalizedType === 'sa') {
      const rawAns = String(q.correctAnswer ?? q.correct ?? q.answer ?? '').trim();
      const sanitizedAns = sanitizeShortAnswerInput(rawAns) || cleanMath(rawAns).slice(0, 4);
      const solText = q.solution ? fixMath(cleanMath(q.solution)) : (q.explanation ? fixMath(cleanMath(q.explanation)) : "");
      return {
        id: q.id || (idx + 1),
        type: 'sa',
        level: q.level || 'Vận dụng',
        content: fixMath(cleanMath(rawContent.replace(/^(?:Câu|Bài|Question|Q)?\s*\d+[\.:\s]*/i, '').trim() || `Câu ${idx + 1}`)),
        correctAnswer: sanitizedAns,
        solution: solText,
        explanation: solText || undefined,
        imageUrl: q.imageUrl || undefined,
        hasFigure: q.hasFigure ?? (!!q.imageUrl || undefined)
      };
    }

    // 3. Handle ESSAY ("essay" - Phần IV: Tự luận)
    if (normalizedType === 'essay') {
      const solutionText = String(q.correctAnswer ?? q.explanation ?? q.rubric ?? q.solution ?? '').trim();
      const solText = q.solution ? fixMath(cleanMath(q.solution)) : (solutionText ? fixMath(cleanMath(solutionText)) : (q.explanation ? fixMath(cleanMath(q.explanation)) : ""));
      return {
        id: q.id || (idx + 1),
        type: 'essay',
        level: q.level || '1.0 điểm',
        content: fixMath(cleanMath(rawContent.replace(/^(?:Câu|Bài|Question|Q)?\s*\d+[\.:\s]*/i, '').trim() || `Câu ${idx + 1}`)),
        correctAnswer: solutionText ? fixMath(cleanMath(solutionText)) : undefined,
        solution: solText,
        explanation: solText || undefined,
        imageUrl: q.imageUrl || undefined,
        hasFigure: q.hasFigure ?? (!!q.imageUrl || undefined)
      };
    }

    // 4. Handle MULTIPLE_CHOICE ("mc" - Phần I)
    const rawOptions: string[] = Array.isArray(q.options) ? q.options : [];
    
    // Clean option strings (strip leading A., B., C., D. or *A., *B. and trailing orphan dollars)
    const cleanedOptions = rawOptions.map(opt => {
      if (typeof opt !== 'string') return cleanOptionText(String(opt));
      return cleanOptionText(opt.replace(/^\*?\s*[A-D][\.\:\)]\s*/i, ''));
    });

    // Ensure 4 options
    while (cleanedOptions.length < 4) {
      cleanedOptions.push(`Phương án ${String.fromCharCode(65 + cleanedOptions.length)}`);
    }

    // Determine correct option index
    let correctOptionIndex = 0;
    const rawCorrect = (q.correctAnswer || '').trim().toUpperCase();
    if (rawCorrect === 'A' || rawCorrect.startsWith('A.') || rawCorrect.startsWith('A:')) correctOptionIndex = 0;
    else if (rawCorrect === 'B' || rawCorrect.startsWith('B.') || rawCorrect.startsWith('B:')) correctOptionIndex = 1;
    else if (rawCorrect === 'C' || rawCorrect.startsWith('C.') || rawCorrect.startsWith('C:')) correctOptionIndex = 2;
    else if (rawCorrect === 'D' || rawCorrect.startsWith('D.') || rawCorrect.startsWith('D:')) correctOptionIndex = 3;
    else if (typeof q.correctOptionIndex === 'number' && q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3) {
      correctOptionIndex = q.correctOptionIndex;
    } else {
      // Check if any option had an asterisk or marker
      const asteriskIdx = rawOptions.findIndex(o => typeof o === 'string' && /^\s*\*+[A-D]/i.test(o));
      if (asteriskIdx >= 0) {
        correctOptionIndex = asteriskIdx;
      }
    }

    const correctLetter = String.fromCharCode(65 + correctOptionIndex);
    const solText = q.solution ? fixMath(cleanMath(q.solution)) : (q.explanation ? fixMath(cleanMath(q.explanation)) : "");

    return {
      id: q.id || (idx + 1),
      type: 'mc',
      level: q.level || 'Nhận biết',
      content: fixMath(cleanMath(rawContent.replace(/^(?:Câu|Bài|Question|Q)?\s*\d+[\.:\s]*/i, '').trim() || `Câu ${idx + 1}`)),
      options: cleanedOptions,
      correctOptionIndex,
      correctAnswer: correctLetter,
      solution: solText,
      explanation: solText || undefined,
      imageUrl: q.imageUrl || undefined,
      hasFigure: q.hasFigure ?? (!!q.imageUrl || undefined)
    };
  });
}

export type ParseExamResult = ParsedQuestion[] & {
  questions: ParsedQuestion[];
  detectedDuration?: number | null;
  detectedTitle?: string | null;
};

/**
 * Detect exam duration in minutes from exam header text
 * Supports common Vietnamese formats like:
 * - "Thời gian làm bài : 90 Phút", "Thời gian: 60 phút", "Thời lượng: 50 phút", "120 phút", "Thời gian: 90 phút (không kể thời gian phát đề)"
 */
export function detectExamDurationFromText(text: string): number | null {
  if (!text || typeof text !== 'string') return null;

  // Scan the beginning part of the document where header/exam instructions are located (first 4000 characters)
  const header = text.slice(0, 4000);

  const patterns = [
    // "Thời gian làm bài: 90 phút", "Thời gian làm bài : 90 Phút", "Thời gian làm bài: 90 phút (không kể..."
    /(?:thời\s*gian\s*làm\s*bài|thời\s*lượng\s*làm\s*bài)[\s:\-=–—]*(\d{1,3})\s*(?:phút|p\b|'|min)/i,
    // "Thời gian: 90 phút", "Thời lượng: 60 phút"
    /(?:thời\s*gian|thời\s*lượng)[\s:\-=–—]+(\d{1,3})\s*(?:phút|p\b|'|min)/i,
    // "Thời gian làm bài 90 phút" (without colon)
    /(?:thời\s*gian\s*làm\s*bài|thời\s*lượng\s*làm\s*bài)[\s]+(\d{1,3})\s*(?:phút|p\b|'|min)/i,
    // "(Thời gian làm bài: 90 phút...)" or "(90 phút)"
    /\(\s*(?:thời\s*gian\s*làm\s*bài[\s:\-]*)?(\d{1,3})\s*phút\s*(?:[,\-–—\(\)][^\)]*)?\)/i,
    // "trong vòng 90 phút", "trong 45 phút", "làm bài trong 90 phút"
    /(?:trong\s*vòng|trong\s*thời\s*gian|làm\s*bài\s*trong)[\s:]*(\d{1,3})\s*phút/i,
    // English formats: "Time allowed: 90 minutes", "Duration: 60 mins"
    /(?:time\s*allowed|duration|exam\s*duration|time\s*limit)[\s:\-=–—]*(\d{1,3})\s*(?:minutes|mins|min|m\b)/i
  ];

  for (const pattern of patterns) {
    const match = header.match(pattern);
    if (match && match[1]) {
      const minutes = parseInt(match[1], 10);
      if (minutes >= 5 && minutes <= 300) {
        return minutes;
      }
    }
  }

  // Fallback: check for lines like "Thời gian làm bài: 90" (missing the word "phút")
  const noUnitMatch = header.match(/(?:thời\s*gian\s*làm\s*bài|thời\s*lượng\s*làm\s*bài)[\s:\-=–—]+(\d{1,3})\b(?!\s*(?:câu|đề|ngày|tháng|năm))/i);
  if (noUnitMatch && noUnitMatch[1]) {
    const mins = parseInt(noUnitMatch[1], 10);
    if (mins >= 15 && mins <= 180) {
      return mins;
    }
  }

  return null;
}

/**
 * Suggest default duration based on total question count:
 * - >= 40 questions: 90 minutes (standard national exam)
 * - 30-39 questions: 50 minutes
 * - 20-29 questions: 45 minutes
 * - 10-19 questions: 30 minutes
 * - < 10 questions: 15 minutes
 */
export function suggestDurationByQuestionCount(questionCount: number): number {
  if (questionCount >= 40) return 90;
  if (questionCount >= 30) return 50;
  if (questionCount >= 20) return 45;
  if (questionCount >= 10) return 30;
  return 15;
}

export async function parseExamWithAI(params: {
  rawText?: string;
  fileData?: string;
  fileName?: string;
  fileType?: string;
}): Promise<ParseExamResult> {
  const payload: any = {};
  if (params.rawText && params.rawText.trim()) {
    payload.rawText = params.rawText;
  }
  if (params.fileData) {
    let formattedData = params.fileData;
    // Standardize data URI if missing prefix for PDF
    if (params.fileType === 'application/pdf' && !formattedData.startsWith('data:')) {
      formattedData = `data:application/pdf;base64,${formattedData}`;
    }
    payload.files = [{
      name: params.fileName || 'exam_document',
      type: params.fileType || 'application/pdf',
      data: formattedData
    }];
  }

  let response: Response;
  try {
    response = await apiFetch('/api/parse-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (netErr: any) {
    throw new Error("Lỗi kết nối máy chủ phân tích đề: " + (netErr.message || "Không thể kết nối đến máy chủ."));
  }

  // 1. Kiểm tra response.ok: Nếu !response.ok, đọc text và báo lỗi chi tiết
  if (!response.ok) {
    let errText = "";
    try {
      errText = await response.text();
    } catch {}
    let msg = `Lỗi HTTP ${response.status}`;
    try {
      const errJson = JSON.parse(errText);
      msg = errJson.error || errJson.message || msg;
    } catch {
      if (errText && errText.trim()) {
        msg = errText.trim();
      }
    }
    throw new Error("Lỗi kết nối máy chủ phân tích đề: " + msg);
  }

  // 2. KHÔNG gọi JSON.parse() trực tiếp trên stream. Đọc text trước để kiểm tra SERVER_ERROR
  const rawResponseText = await response.text();
  const cleanResponseText = rawResponseText.trim();

  if (cleanResponseText.includes("SERVER_ERROR:")) {
    const rawError = cleanResponseText.substring(cleanResponseText.indexOf("SERVER_ERROR:") + 13).trim();
    throw new Error("Lỗi kết nối máy chủ phân tích đề: " + (rawError || "Không thể phân tích tài liệu đề thi."));
  }
  if (cleanResponseText.startsWith("SERVER_ERR")) {
    throw new Error("Lỗi kết nối máy chủ phân tích đề: " + cleanResponseText);
  }

  // 3. Xử lý chuỗi JSON an toàn:
  let rawList: any[] = [];
  let detectedDuration: number | null = null;
  let detectedTitle: string | null = null;

  try {
    const directParsed = safeJsonParse(cleanResponseText);
    if (Array.isArray(directParsed)) {
      rawList = directParsed;
    } else if (directParsed && typeof directParsed === 'object') {
      rawList = Array.isArray(directParsed.questions) ? directParsed.questions : (Array.isArray(directParsed.result) ? directParsed.result : []);
      if (typeof directParsed.duration === 'number' && directParsed.duration > 0) {
        detectedDuration = directParsed.duration;
      } else if (typeof directParsed.duration === 'string') {
        const parsedMins = parseInt(directParsed.duration, 10);
        if (!isNaN(parsedMins) && parsedMins > 0) detectedDuration = parsedMins;
      }
      if (typeof directParsed.examTitle === 'string' && directParsed.examTitle.trim()) {
        detectedTitle = directParsed.examTitle.trim();
      }
    }
  } catch (err: any) {
    console.warn("Direct safeJsonParse warning, trying regex block extraction:", err);
  }

  if (!rawList || rawList.length === 0) {
    let jsonBlock = "";
    // Tìm khối ```json ... ```
    const codeBlockMatch = cleanResponseText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch) {
      jsonBlock = codeBlockMatch[1].trim();
    } else {
      // Tìm từ dấu '[' đầu tiên đến dấu ']' cuối cùng
      const firstBracket = cleanResponseText.indexOf('[');
      const lastBracket = cleanResponseText.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        jsonBlock = cleanResponseText.substring(firstBracket, lastBracket + 1);
      } else {
        // Tìm khối object { ... "questions" ... }
        const firstBrace = cleanResponseText.indexOf('{');
        const lastBrace = cleanResponseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          jsonBlock = cleanResponseText.substring(firstBrace, lastBrace + 1);
        }
      }
    }

    if (jsonBlock) {
      try {
        const blockParsed = safeJsonParse(jsonBlock);
        if (Array.isArray(blockParsed)) {
          rawList = blockParsed;
        } else if (blockParsed && typeof blockParsed === 'object') {
          rawList = Array.isArray(blockParsed.questions) ? blockParsed.questions : (Array.isArray(blockParsed.result) ? blockParsed.result : []);
          if (!detectedDuration && typeof blockParsed.duration === 'number' && blockParsed.duration > 0) {
            detectedDuration = blockParsed.duration;
          }
          if (!detectedTitle && typeof blockParsed.examTitle === 'string' && blockParsed.examTitle.trim()) {
            detectedTitle = blockParsed.examTitle.trim();
          }
        }
      } catch (blockErr) {
        console.warn("Extracted JSON block parsing failed:", blockErr);
      }
    }
  }

  if (!rawList || rawList.length === 0) {
    throw new Error("Không thể bóc tách danh sách câu hỏi từ phản hồi của máy chủ. Vui lòng kiểm tra lại cấu trúc file hoặc dán trực tiếp nội dung văn bản.");
  }

  // Fallback: If AI did not detect duration from file, inspect rawText
  if (!detectedDuration && params.rawText) {
    detectedDuration = detectExamDurationFromText(params.rawText);
  }

  const parsed: any = formatAiQuestionsToParsed(rawList);
  parsed.questions = parsed;
  parsed.detectedDuration = detectedDuration;
  parsed.detectedTitle = detectedTitle;
  return parsed as ParseExamResult;
}

export function parseRawExamText(rawText: string): ParsedQuestion[] {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // 1. Phân chia các phần (Phần I, II, III, IV) nếu có tiêu đề phần
  const sectionRegex = /(?:^|\n)\s*(?:###?\s*|\*\*)?(PHẦN\s*(?:[I|V|X]+|\d+)[:\.]?[^\n]*|B\.?\s*TỰ\s*LUẬN[^\n]*|BÀI\s*TẬP\s*TỰ\s*LUẬN[^\n]*)/gi;
  
  interface SectionChunk {
    type: "mc" | "tf" | "sa" | "essay";
    content: string;
  }
  
  let sections: SectionChunk[] = [];
  let lastIndex = 0;
  let currentSectionType: "mc" | "tf" | "sa" | "essay" = "mc";
  let sMatch: RegExpExecArray | null;

  while ((sMatch = sectionRegex.exec(text)) !== null) {
    const header = sMatch[1];
    const matchStart = sMatch.index;
    if (matchStart > lastIndex) {
      sections.push({
        type: currentSectionType,
        content: text.substring(lastIndex, matchStart)
      });
    }
    
    // Xác định loại phần từ header
    if (/PHẦN\s*(?:II\b|2\b)|ĐÚNG\s*[\/\-]?\s*SAI/i.test(header)) {
      currentSectionType = "tf";
    } else if (/PHẦN\s*(?:III\b|3\b)|TRẢ\s*LỜI\s*NGẮN|ĐIỀN\s*SỐ/i.test(header)) {
      currentSectionType = "sa";
    } else if (/PHẦN\s*(?:IV\b|4\b)|TỰ\s*LUẬN/i.test(header)) {
      currentSectionType = "essay";
    } else {
      currentSectionType = "mc";
    }
    
    lastIndex = matchStart + sMatch[0].length;
  }

  if (lastIndex < text.length) {
    sections.push({
      type: currentSectionType,
      content: text.substring(lastIndex)
    });
  }

  // Nếu không có tiêu đề phần nào, xử lý toàn bộ văn bản dưới dạng 1 section mặc định
  if (sections.length === 0) {
    sections = [{ type: "mc", content: text }];
  }

  const results: ParsedQuestion[] = [];
  let globalId = 1;

  sections.forEach(sec => {
    const secContent = sec.content.trim();
    if (!secContent) return;

    // Split into questions using "Câu \d+[:\.]" or "Bài \d+[:\.]"
    const qRegex = /(?:^|\n)(?=(?:Câu|Bài|Question|Q)\s*\d+[\.:\s])/i;
    let parts = secContent.split(qRegex).map(p => p.trim()).filter(Boolean);

    // Fallback: If no "Câu \d+" found, try splitting on numbered lines "1." or "1)" at start of line
    if (parts.length <= 1) {
      const fallbackRegex = /(?:^|\n)(?=\b\d+[\.:\)]\s+)/;
      const fallbackParts = secContent.split(fallbackRegex).map(p => p.trim()).filter(Boolean);
      if (fallbackParts.length > 1) {
        parts = fallbackParts;
      }
    }

    const questionBlocks: string[] = [];
    for (const part of parts) {
      if (/^(?:(?:Câu|Bài|Question|Q)\s*\d+|\d+[\.:\)])/i.test(part)) {
        questionBlocks.push(part);
      } else if (questionBlocks.length === 0) {
        questionBlocks.push(part);
      } else {
        questionBlocks[questionBlocks.length - 1] += '\n\n' + part;
      }
    }

    questionBlocks.forEach(block => {
      // Extract explanation/lời giải if present
      let explanation = '';
      const expMatch = block.match(/(?:Lời giải|Hướng dẫn giải|Giải chi tiết|HDG|Hướng dẫn|Thang điểm)[\.:\s]*([\s\S]*)$/i);
      let mainBlock = block;
      if (expMatch) {
        explanation = expMatch[1].trim();
        mainBlock = block.substring(0, expMatch.index).trim();
      }

      // Extract correct answer if present
      let extractedCorrect: string | undefined = undefined;
      const ansMatch = mainBlock.match(/(?:Đáp\s*án|Đ\/?A|Chọn|Key|Đáp\s*số)[\.:\s]*([A-D]|Đ|S|[0-9\/\.\-]+)/i);
      if (ansMatch) {
        extractedCorrect = ansMatch[1].trim().toUpperCase();
        mainBlock = mainBlock.replace(/(?:Đáp\s*án|Đ\/?A|Chọn|Key|Đáp\s*số)[\.:\s]*([A-D]|Đ|S|[0-9\/\.\-]+)/i, '').trim();
      }

      // 1. Kiểm tra Đúng/Sai (Phần II hoặc block có a), b), c), d))
      const hasTf = sec.type === 'tf' || /(?:^|\n)\s*[a-d]\)[\s\S]*?(?:^|\n)\s*[b-d]\)/i.test(mainBlock);

      if (hasTf) {
        const stemMatch = mainBlock.match(/^(?:(?:Câu|Bài|Question|Q)?\s*\d+[\.:\s]*)?([\s\S]*?)(?=(?:^|\n)\s*[a-d]\))/i);
        const stem = stemMatch ? stemMatch[1].trim() : mainBlock.split('\n')[0];
        
        const statements: { statement: string; correct: boolean }[] = [];
        const stmtRegex = /(?:^|\n)\s*([a-d])\)[\s\t]*([^\n]+)/gi;
        let stmtMatch: RegExpExecArray | null;
        while ((stmtMatch = stmtRegex.exec(mainBlock)) !== null) {
          const stmtText = stmtMatch[2].trim();
          const isTrue = /(?:\[Đ\]|\(Đ\)|- Đúng|: Đúng)/i.test(stmtText);
          const cleanStmt = stmtText.replace(/(?:\[[ĐS]\]|\([ĐS]\)|- (Đúng|Sai)|: (Đúng|Sai))/gi, '').replace(/^[a-d][\.\:\)]\s*/i, '').trim();
          statements.push({ statement: fixMath(cleanMath(cleanStmt)), correct: isTrue });
        }

        // Đảm bảo đủ 4 ý a, b, c, d
        const subLabels = ['a', 'b', 'c', 'd'];
        while (statements.length < 4) {
          statements.push({ statement: `Ý ${subLabels[statements.length]}`, correct: false });
        }

        const solText = explanation ? fixMath(cleanMath(explanation)) : "";
        results.push({
          id: globalId++,
          type: "tf",
          level: "Thông hiểu",
          content: fixMath(cleanMath(stem.replace(/^(?:Câu|Bài|Question|Q)?\s*\d+[\.:\s]*/i, '').trim() || `Câu ${globalId}`)),
          tfStatements: statements,
          solution: solText,
          explanation: solText || undefined
        });
        return;
      }

      // 2. Kiểm tra Trắc nghiệm 4 lựa chọn (Phần I hoặc có A., B., C., D.)
      const optMatchA = mainBlock.search(/(?:^|\n|\s{2,}|\t)(\*?\s*[A-D]\*?|\([A-D]\))[\.:\)]\s*/i);
      if (sec.type === 'mc' || optMatchA !== -1) {
        if (optMatchA !== -1) {
          const stem = mainBlock.substring(0, optMatchA).replace(/^(?:Câu|Bài|Question|Q)?\s*\d+[\.:\s]*/i, '').trim();
          const optionsContent = mainBlock.substring(optMatchA);

          const options: string[] = [];
          let asteriskCorrectIdx = -1;
          const optRegex = /(?:^|\n|\s{2,}|\t)(\*?\s*[A-D]\*?|\([A-D]\))[\.:\)]\s*([\s\S]*?)(?=(?:(?:^|\n|\s{2,}|\t)(?:\*?\s*[A-D]\*?|\([A-D]\))[\.:\)])|$)/gi;
          let optMatch: RegExpExecArray | null;
          while ((optMatch = optRegex.exec(optionsContent)) !== null) {
            const marker = optMatch[1];
            if (marker.includes('*')) {
              asteriskCorrectIdx = options.length;
            }
            options.push(fixMath(cleanOptionText(optMatch[2])));
          }

          while (options.length < 4) {
            options.push(`Phương án ${String.fromCharCode(65 + options.length)}`);
          }

          let correctOptionIndex = 0;
          if (asteriskCorrectIdx >= 0) {
            correctOptionIndex = asteriskCorrectIdx;
          } else if (extractedCorrect && ['A', 'B', 'C', 'D'].includes(extractedCorrect)) {
            correctOptionIndex = extractedCorrect.charCodeAt(0) - 65;
          }

          const solText = explanation ? fixMath(cleanMath(explanation)) : "";
          results.push({
            id: globalId++,
            type: "mc",
            level: "Nhận biết",
            content: fixMath(cleanMath(stem || `Câu ${globalId}`)),
            options: options,
            correctOptionIndex,
            correctAnswer: String.fromCharCode(65 + correctOptionIndex),
            solution: solText,
            explanation: solText || undefined
          });
          return;
        }
      }

      // 3. Kiểm tra Trả lời ngắn / Điền số (Phần III)
      if (sec.type === 'sa' || (extractedCorrect !== undefined && extractedCorrect.length <= 15)) {
        const rawAns = extractedCorrect || "1";
        const sanitizedAns = sanitizeShortAnswerInput(rawAns) || cleanMath(rawAns).slice(0, 4);
        const solText = explanation ? fixMath(cleanMath(explanation)) : "";
        results.push({
          id: globalId++,
          type: "sa",
          level: "Vận dụng",
          content: fixMath(cleanMath(mainBlock.replace(/^(?:Câu|Bài|Question|Q)?\s*\d+[\.:\s]*/i, '').trim() || `Câu ${globalId}`)),
          correctAnswer: sanitizedAns,
          solution: solText,
          explanation: solText || undefined
        });
        return;
      }

      // 4. Kiểm tra Tự luận (Phần IV)
      const solText = explanation ? fixMath(cleanMath(explanation)) : (extractedCorrect ? fixMath(cleanMath(extractedCorrect)) : "Lời giải và hướng dẫn chấm chi tiết");
      results.push({
        id: globalId++,
        type: "essay",
        level: "1.0 điểm",
        content: fixMath(cleanMath(mainBlock.replace(/^(?:Câu|Bài|Question|Q)?\s*\d+[\.:\s]*/i, '').trim() || `Câu ${globalId}`)),
        correctAnswer: solText,
        solution: solText,
        explanation: solText || undefined
      });
    });
  });

  return results;
}

