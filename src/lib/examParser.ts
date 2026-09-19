import { cleanOptionText, fixMath } from './utils';

export interface ParsedQuestion {
  id: number;
  type: "mc" | "tf" | "sa" | "essay";
  level: string;
  topic?: string;
  subtopic?: string;
  content: string;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  tfStatements?: { statement: string; correct: boolean }[];
  explanation?: string;
}

export function parseRawExamText(rawText: string): ParsedQuestion[] {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split into questions using "Câu \d+[:\.]"
  const questionBlocks: string[] = [];
  const regex = /(?:^|\n)(?=Câu\s*\d+[\.:\s])/i;
  const parts = text.split(regex).map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (/^Câu\s*\d+/i.test(part)) {
      questionBlocks.push(part);
    } else if (questionBlocks.length === 0) {
      // If there's preamble before Câu 1, check if it's already a question
      questionBlocks.push(part);
    } else {
      // Append to previous
      questionBlocks[questionBlocks.length - 1] += '\n\n' + part;
    }
  }

  const results: ParsedQuestion[] = [];

  questionBlocks.forEach((block, idx) => {
    // Extract explanation/lời giải if present
    let explanation = '';
    const expMatch = block.match(/(?:Lời giải|Hướng dẫn giải|Giải chi tiết|HDG)[\.:\s]*([\s\S]*)$/i);
    let mainBlock = block;
    if (expMatch) {
      explanation = expMatch[1].trim();
      mainBlock = block.substring(0, expMatch.index).trim();
    }

    // Extract correct answer if present
    let extractedCorrect: string | undefined = undefined;
    const ansMatch = mainBlock.match(/(?:Đáp án|ĐA|Chọn)[\.:\s]*([A-D]|Đ|S|[0-9\/\.\-]+)/i);
    if (ansMatch) {
      extractedCorrect = ansMatch[1].trim().toUpperCase();
      mainBlock = mainBlock.replace(/(?:Đáp án|ĐA|Chọn)[\.:\s]*([A-D]|Đ|S|[0-9\/\.\-]+)/i, '').trim();
    }

    // Check if it's True/False with a), b), c), d)
    const hasTf = /(?:^|\n)\s*[a-d]\)[\s\S]*?(?:^|\n)\s*[b-d]\)/i.test(mainBlock);

    if (hasTf) {
      const stemMatch = mainBlock.match(/^(?:Câu\s*\d+[\.:\s]*)?([\s\S]*?)(?=(?:^|\n)\s*[a-d]\))/i);
      const stem = stemMatch ? stemMatch[1].trim() : mainBlock.split('\n')[0];
      
      const statements: { statement: string; correct: boolean }[] = [];
      const stmtRegex = /(?:^|\n)\s*([a-d])\)[\s\t]*([^\n]+)/gi;
      let sMatch: RegExpExecArray | null;
      while ((sMatch = stmtRegex.exec(mainBlock)) !== null) {
        const stmtText = sMatch[2].trim();
        const isTrue = /(?:\[Đ\]|\(Đ\)|- Đúng|: Đúng)/i.test(stmtText);
        const cleanStmt = stmtText.replace(/(?:\[[ĐS]\]|\([ĐS]\)|- (Đúng|Sai)|: (Đúng|Sai))/gi, '').trim();
        statements.push({ statement: fixMath(cleanStmt), correct: isTrue });
      }

      results.push({
        id: idx + 1,
        type: "tf",
        level: "Thông hiểu",
        content: fixMath(stem || `Câu ${idx + 1}`),
        tfStatements: statements.length > 0 ? statements : [
          { statement: "Ý a", correct: true },
          { statement: "Ý b", correct: false },
          { statement: "Ý c", correct: true },
          { statement: "Ý d", correct: false }
        ],
        explanation: explanation ? fixMath(explanation) : undefined
      });
      return;
    }

    // Check if it's 4-option MC (A, B, C, D)
    const optMatchA = mainBlock.search(/(?:^|\n|\s{2,})A[\.:\)]\s*/);
    if (optMatchA !== -1) {
      const stem = mainBlock.substring(0, optMatchA).replace(/^Câu\s*\d+[\.:\s]*/i, '').trim();
      const optionsContent = mainBlock.substring(optMatchA);

      // Extract A, B, C, D
      const options: string[] = [];
      const optRegex = /(?:^|\n|\s{2,})([A-D])[\.:\)]\s*([\s\S]*?)(?=(?:(?:^|\n|\s{2,})[A-D][\.:\)])|$)/g;
      let optMatch: RegExpExecArray | null;
      while ((optMatch = optRegex.exec(optionsContent)) !== null) {
        options.push(fixMath(cleanOptionText(optMatch[2])));
      }

      let correctOptionIndex = 0;
      if (extractedCorrect && ['A', 'B', 'C', 'D'].includes(extractedCorrect)) {
        correctOptionIndex = extractedCorrect.charCodeAt(0) - 65;
      }

      results.push({
        id: idx + 1,
        type: "mc",
        level: "Nhận biết",
        content: fixMath(stem || `Câu ${idx + 1}`),
        options: options.length >= 2 ? options : ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
        correctOptionIndex,
        explanation: explanation ? fixMath(explanation) : undefined
      });
      return;
    }

    // Check if Short Answer or Essay
    const isShortAnswer = extractedCorrect !== undefined && extractedCorrect.length <= 10;
    results.push({
      id: idx + 1,
      type: isShortAnswer ? "sa" : "essay",
      level: isShortAnswer ? "Vận dụng" : "Vận dụng cao",
      content: fixMath(mainBlock.replace(/^Câu\s*\d+[\.:\s]*/i, '').trim() || `Câu ${idx + 1}`),
      correctAnswer: extractedCorrect || (isShortAnswer ? "1" : "Lời giải và thang điểm"),
      explanation: explanation ? fixMath(explanation) : undefined
    });
  });

  return results;
}
