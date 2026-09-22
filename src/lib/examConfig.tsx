/**
 * Standardized Exam Types & Duration Configuration (Chuẩn GDPT 2018)
 */

export const STANDARDIZED_EXAM_TYPES = [
  "Đề kiểm tra 15 phút",
  "Đề kiểm tra 45 phút",
  "Đề kiểm tra giữa kỳ 1",
  "Đề kiểm tra giữa kỳ 2",
  "Đề kiểm tra cuối kỳ 1",
  "Đề kiểm tra cuối kỳ 2",
  "Đề thi thử tốt nghiệp THPT",
  "Đề tuyển sinh vào lớp 10",
  "Đề thi vào lớp 6"
] as const;

export type StandardExamType = typeof STANDARDIZED_EXAM_TYPES[number];

/**
 * Tự động gợi ý thời gian làm bài mặc định theo Loại đề:
 * - "Đề kiểm tra 15 phút" -> 15 phút
 * - "Đề kiểm tra 45 phút", "Đề kiểm tra giữa kỳ 1", "Đề kiểm tra giữa kỳ 2" -> 45 phút (hoặc 60 phút nếu cấp THPT)
 * - "Đề kiểm tra cuối kỳ 1", "Đề kiểm tra cuối kỳ 2" -> 90 phút
 * - "Đề thi thử tốt nghiệp THPT" -> 90 phút (môn Toán) / 50 phút (các môn khác)
 * - "Đề tuyển sinh vào lớp 10" -> 120 phút
 * - "Đề thi vào lớp 6" -> 45 phút / 60 phút (mặc định 45 phút)
 */
export function getDefaultDurationForExamType(
  examType: string,
  schoolLevel?: string,
  grade?: string,
  subject?: string
): number {
  const normType = (examType || '').toLowerCase().trim();
  const normLevel = (schoolLevel || '').toLowerCase().trim();
  const normGrade = (grade || '').toLowerCase().trim();
  const normSubj = (subject || '').toLowerCase().trim();

  const isTHPT = normLevel.includes('thpt') || ['10', '11', '12'].some(g => normGrade.includes(g));

  if (normType.includes('15 phút') || normType === '15p') {
    return 15;
  }
  if (normType.includes('giữa kỳ 1') || normType.includes('giữa kỳ 2') || normType === 'mid') {
    return isTHPT ? 60 : 45;
  }
  if (normType.includes('45 phút') || normType === '45p') {
    return isTHPT ? 60 : 45;
  }
  if (
    normType.includes('cuối kỳ 1') ||
    normType.includes('cuối kỳ 2') ||
    normType.includes('học kỳ') ||
    normType === 'final'
  ) {
    return 90;
  }
  if (normType.includes('tốt nghiệp thpt') || normType.includes('thpt quốc gia')) {
    // Môn Toán / Văn -> 90 phút, các môn trắc nghiệm thành phần khác -> 50 phút
    if (!normSubj || normSubj.includes('toán') || normSubj.includes('ngữ văn') || normSubj.includes('văn')) {
      return 90;
    }
    return 50;
  }
  if (normType.includes('tuyển sinh vào lớp 10') || normType.includes('vào 10') || normType.includes('vào lớp 10')) {
    return 120;
  }
  if (normType.includes('vào lớp 6') || normType.includes('vào 6')) {
    return 45;
  }
  return 45;
}

/**
 * Chuẩn hóa giá trị loại đề cũ (nếu có)
 */
export function normalizeExamType(val: string): string {
  if (!val) return STANDARDIZED_EXAM_TYPES[0];
  if (val === '15p') return "Đề kiểm tra 15 phút";
  if (val === '45p') return "Đề kiểm tra 45 phút";
  if (val === 'mid') return "Đề kiểm tra giữa kỳ 1";
  if (val === 'final') return "Đề kiểm tra cuối kỳ 1";
  const found = STANDARDIZED_EXAM_TYPES.find(t => t.toLowerCase() === val.toLowerCase());
  return found || val;
}

/**
 * Đồng bộ tiêu đề chính của đề thi theo format chuẩn:
 * VD: "ĐỀ KIỂM TRA GIỮA KỲ 1 - MÔN TOÁN 10"
 */
export function formatExamTitle(examType: string, subject: string, grade: string): string {
  const cleanType = (normalizeExamType(examType) || 'ĐỀ KIỂM TRA').trim().toUpperCase();
  const cleanSubj = (subject || 'TOÁN HỌC').trim().toUpperCase();
  const cleanGrade = (grade || '').trim().toUpperCase();

  let titlePrefix = cleanType;
  if (!titlePrefix.startsWith('ĐỀ')) {
    titlePrefix = `ĐỀ ${titlePrefix}`;
  }

  let gradePart = '';
  if (cleanGrade) {
    gradePart = cleanGrade.replace(/^(LỚP|KHỐI)\s*/i, '').trim();
    if (gradePart) {
      gradePart = `${gradePart}`;
    }
  }

  if (gradePart) {
    return `${titlePrefix} - MÔN ${cleanSubj} ${gradePart}`.replace(/\s+/g, ' ');
  }
  return `${titlePrefix} - MÔN ${cleanSubj}`.replace(/\s+/g, ' ');
}
