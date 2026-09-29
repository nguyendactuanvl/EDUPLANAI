import LZString from 'lz-string';
import { apiFetch } from './apiFetch';

export const SYSTEM_EXAM_WEBHOOK = "https://script.google.com/macros/s/AKfycbwYHVplKQAUoUVBo6QbjSBnO_TB71eUXeeP2MmQ42nQIVJiUjvmLrrJwvCC-lsCXc7k/exec";

export interface ExamWebhookPayload {
  examId?: string;
  examName?: string;
  examType?: string;
  duration?: string | number;
  studentName?: string;
  className?: string;
  studentClass?: string;
  score?: number | string;
  correctCount?: number;
  totalQuestions?: number;
  timeSpent?: string;
  hasEssay?: boolean;
  essayCount?: number;
  submittedAt?: string;
  detailedAnswers?: any;
  essayImages?: any;
}

export async function sendExamResultToWebhook(payload: ExamWebhookPayload): Promise<void> {
  try {
    const formattedPayload = {
      ...payload,
      detailedAnswers: typeof payload.detailedAnswers === 'string'
        ? payload.detailedAnswers
        : JSON.stringify(payload.detailedAnswers || []),
      essayImages: typeof payload.essayImages === 'string'
        ? payload.essayImages
        : JSON.stringify(payload.essayImages || [])
    };
    await fetch(SYSTEM_EXAM_WEBHOOK, {
      method: 'POST',
      mode: 'no-cors', // Tránh chặn CORS trên trình duyệt
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedPayload)
    });
  } catch (err) {
    console.error('Lỗi gửi kết quả thi qua Webhook:', err);
  }
}

/**
 * Lưu đề thi hoặc phiếu bài tập lên Webhook Google Apps Script với cơ chế theo dõi redirect 302
 * và kiểm tra response text trước khi parse JSON để tránh dính HTML
 */
export async function saveExamToWebhook(payload: any): Promise<any> {
  try {
    const response = await fetch(SYSTEM_EXAM_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Dùng text/plain để tránh bị lỗi CORS preflight với Apps Script
      },
      body: JSON.stringify(payload),
      redirect: 'follow', // Bắt buộc để theo dõi chuyển hướng 302 từ Google Script sang Googleusercontent
    });

    const rawText = await response.text();

    // Kiểm tra xem dữ liệu trả về có bị dính HTML không
    if (rawText.trim().startsWith('<') || rawText.includes('<!DOCTYPE html>')) {
      console.error("Server trả về trang HTML thay vì JSON:", rawText);
      throw new Error("Dịch vụ tạo đề tạm thời gián đoạn hoặc API Key chưa được nạp đúng. Vui lòng kiểm tra lại cấu hình API.");
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error("Lỗi parse JSON:", rawText);
      throw new Error("Phản hồi từ máy chủ không đúng định dạng dữ liệu.");
    }
    return data;
  } catch (err: any) {
    console.warn("Lưu đề lên Webhook:", err?.message || err);
    throw err;
  }
}

const KV_STORE_ID = 'jaku8xjm';
const CHUNK_SIZE = 120; // 120 hex chars per chunk is well within URL path limits and safe across all HTTP proxies

function strToHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(4, '0');
  }
  return hex;
}

function hexToStr(hex: string): string {
  let str = '';
  for (let i = 0; i < hex.length; i += 4) {
    str += String.fromCharCode(parseInt(hex.substring(i, i + 4), 16));
  }
  return str;
}

/**
 * Saves exam data persistently across:
 * 1. Client localStorage
 * 2. Backend Express API (/api/exams/share)
 * 3. Distributed Cloud KV (keyvalue.immanuel.co) with hex chunking
 */
export async function saveExamToCloud(examId: string, data: any): Promise<boolean> {
  const cleanId = examId.trim().toUpperCase();
  if (!cleanId) return false;

  // 1. Always cache in localStorage
  try {
    localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Local storage cache failed:', e);
  }

  // 2. Sync to Backend API
  try {
    apiFetch('/api/exams/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, customId: cleanId })
    }).catch(err => console.warn('API share async failed:', err));
  } catch (e) {}

  // 3. Sync to Cloud KV with hex chunking
  try {
    const jsonStr = JSON.stringify(data);
    const compressed = LZString.compressToUTF16(jsonStr);
    const hex = strToHex(compressed);
    const count = Math.ceil(hex.length / CHUNK_SIZE);

    // Save count
    await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${KV_STORE_ID}/${cleanId}_C/${count}`, {
      method: 'POST'
    });

    // Save all chunks in parallel
    const chunkPromises: Promise<any>[] = [];
    for (let i = 0; i < count; i++) {
      const chunk = hex.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      chunkPromises.push(
        fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${KV_STORE_ID}/${cleanId}_${i}/${chunk}`, {
          method: 'POST'
        })
      );
    }
    await Promise.all(chunkPromises);
    return true;
  } catch (err) {
    console.warn('Cloud KV upload error:', err);
    return false;
  }
}

/**
 * Fetches exam data from:
 * 1. Client localStorage
 * 2. Backend API (/api/exams/:id)
 * 3. Distributed Cloud KV (chunked hex)
 * 4. Distributed Cloud KV (legacy encoded URI)
 */
export async function fetchExamFromCloud(examId: string): Promise<any> {
  const cleanId = examId.trim().toUpperCase();
  if (!cleanId) return null;

  // 1. Check localStorage first (instant response)
  try {
    const cached = localStorage.getItem(`examCache_${cleanId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && (parsed.examData || parsed.codes)) {
        return parsed;
      }
    }
  } catch (e) {}

  // 2. Try Backend API
  try {
    const res = await apiFetch(`/api/exams/${cleanId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.examData || data.codes)) {
        try {
          localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(data));
        } catch (e) {}
        return data;
      }
    }
  } catch (e) {
    console.warn('Backend API exam fetch error:', e);
  }

  // 3. Try Distributed Cloud KV with hex chunking
  try {
    const countRes = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${cleanId}_C`);
    if (countRes.ok) {
      const countVal = await countRes.json();
      const readCount = parseInt(countVal, 10);
      if (readCount && readCount > 0 && readCount < 100) {
        const chunkPromises: Promise<any>[] = [];
        for (let i = 0; i < readCount; i++) {
          chunkPromises.push(
            fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${cleanId}_${i}`).then(r => r.json())
          );
        }
        const chunks = await Promise.all(chunkPromises);
        const hexReconstructed = chunks.join('');
        if (hexReconstructed) {
          const restoredUtf16 = hexToStr(hexReconstructed);
          const decompressed = LZString.decompressFromUTF16(restoredUtf16);
          if (decompressed) {
            const parsed = JSON.parse(decompressed);
            try {
              localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(parsed));
            } catch (e) {}
            return parsed;
          }
        }
      }
    }
  } catch (kvErr) {
    console.warn('Cloud KV chunked fetch error:', kvErr);
  }

  // 4. Try legacy single-key Cloud KV
  try {
    const legacyRes = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${cleanId}`);
    if (legacyRes.ok) {
      const val = await legacyRes.json();
      if (val && typeof val === 'string') {
        const decomp = LZString.decompressFromEncodedURIComponent(val);
        if (decomp) {
          const parsed = JSON.parse(decomp);
          try {
            localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(parsed));
          } catch (e) {}
          return parsed;
        }
      }
    }
  } catch (e) {}

  return null;
}

