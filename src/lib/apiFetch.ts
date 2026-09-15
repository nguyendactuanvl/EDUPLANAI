export const API_KEY_STORAGE = 'eduplan_gemini_api_key_v2';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (options.body && typeof options.body === 'string' && options.body.length > 250 * 1024) {
    try {
      const parsedBody = JSON.parse(options.body);
      let modified = false;
      
      if (parsedBody.files && Array.isArray(parsedBody.files)) {
        parsedBody.fileIds = parsedBody.fileIds || [];
        for (let i = 0; i < parsedBody.files.length; i++) {
          const f = parsedBody.files[i];
          if (f.data && f.data.length > 100 * 1024) {
            const fileId = await uploadFileChunked(f.data, f.type);
            parsedBody.fileIds.push(fileId);
            f.data = ""; // Clear large data
            modified = true;
          }
        }
        // Filter out empty data files if they were offloaded
        parsedBody.files = parsedBody.files.filter((f: any) => f.data.length > 0);
      }
      
      if (parsedBody.file && typeof parsedBody.file === 'string' && parsedBody.file.length > 100 * 1024) {
        const fileId = await uploadFileChunked(parsedBody.file, parsedBody.type || 'text/plain');
        parsedBody.fileId = fileId;
        parsedBody.file = ""; // Clear
        modified = true;
      }
      
      if (modified) {
        options.body = JSON.stringify(parsedBody);
      }
    } catch (e) {
      console.warn("Could not chunk upload:", e);
    }
  }

  const getHeaders = (skipCustomKey = false) => {
    const headers = new Headers(options.headers || {});
    headers.delete('x-gemini-api-key');
    headers.delete('Authorization');
    
    if (!skipCustomKey) {
      const customKey = localStorage.getItem(API_KEY_STORAGE);
      if (customKey) {
        headers.set('Authorization', 'Bearer ' + encodeURIComponent(customKey));
        headers.set('x-gemini-api-key', encodeURIComponent(customKey)); // Keep fallback
      }
    }
    return headers;
  };

  const maxRetries = 5; // Up to 5 retries (total ~1 minute wait)
  let skipCustomKey = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let customKeyUsed = !skipCustomKey && !!localStorage.getItem(API_KEY_STORAGE);
    
    // First try with custom key (if exists), or system key
    const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || "";
    let response = await fetch(baseUrl + url, {
      credentials: 'include',
      ...options,
      headers: getHeaders(skipCustomKey)
    });

    
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      const text = await response.text();
      const lowerText = text.toLowerCase();
      console.warn("HTML ERROR RESPONSE:", text.substring(0, 500));
      if (response.status === 504 || response.status === 502) {
        throw new Error("Hệ thống xử lý quá lâu và bị ngắt kết nối (Lỗi Timeout). Việc tạo tài liệu chi tiết (như Kế hoạch bài dạy, Đề thi) tốn rất nhiều thời gian. Vui lòng thử chia nhỏ yêu cầu, hoặc thiết lập API Key cá nhân để bỏ qua giới hạn của máy chủ proxy.");
      } else if (response.status === 413) {
        throw new Error("Dữ liệu quá lớn, đã bị hệ thống proxy/mạng từ chối. Vui lòng giảm dung lượng file hoặc nội dung yêu cầu.");
      } else if (lowerText.includes("aistudio_auth_flow") || lowerText.includes("action required") || lowerText.includes("aistudio-iframe") || lowerText.includes("cookie_check") || lowerText.includes("cookie check") || lowerText.includes("id=\"app\"") || lowerText.includes("id=\"root\"")) {
        throw new Error("Xác thực bảo mật của trình duyệt hết hạn hoặc API bị chặn (404). Vui lòng TẢI LẠI TRANG (nhấn F5) hoặc MỞ ỨNG DỤNG TRONG TAB MỚI. Nếu vẫn lỗi, hãy sử dụng tính năng 'Nhập mã API key' cá nhân.");
      } else if (lowerText.includes("nginx")) {
         throw new Error("Hệ thống máy chủ mạng (Nginx) đã chặn kết nối hoặc quá tải (Lỗi " + response.status + "). Vui lòng tải lại trang hoặc thiết lập API Key cá nhân để kết nối trực tiếp.");
      } else {
        throw new Error("Máy chủ trả về trang lỗi HTML thay vì JSON (Lỗi " + response.status + "). Hệ thống đang bảo trì, quá tải, hoặc xác thực bị lỗi.");
      }
    }
    if (response.ok) return response;

    const clonedRes = response.clone();
    let errorData;
    let errText = await clonedRes.text();
    try {
      errorData = JSON.parse(errText);
    } catch (e) {
      errorData = { error: errText };
    }

    const is401 = response.status === 401;
    
    let errorMsg = typeof errorData?.error === 'string' ? errorData.error : JSON.stringify(errorData?.error || "");

    const isAuthError = is401 || errorMsg.includes("UNAUTHENTICATED") || errorMsg.includes("deleted or disabled") || errorMsg.includes("Tài khoản dịch vụ");
    const isQuotaError = response.status === 429 || errorMsg.includes("vượt quá giới hạn") || errorMsg.includes("quota") || errorMsg.includes("429");
    const isInvalidKeyError = response.status === 400 && (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("API Key không hợp lệ") || errorMsg.includes("API key not valid"));

    // If Custom key is used and it's invalid or auth error, tell the user explicitly
    if ((isAuthError || isInvalidKeyError) && customKeyUsed) {
      localStorage.removeItem(API_KEY_STORAGE);
      throw new Error("API Key cá nhân của bạn không hợp lệ, đã bị vô hiệu hóa, hoặc đã bị xóa (Lỗi 400/401). Vui lòng kiểm tra lại. Hệ thống đã tự động gỡ API Key lỗi này.");
    }
    
    if (isQuotaError || response.status === 503 || errorMsg.toLowerCase().includes("overloaded")) {
      if (customKeyUsed) {
        if (attempt < maxRetries) {
          console.warn(`[apiFetch] Custom API key rate limited (429/503). Retrying... (Attempt ${attempt + 1} of ${maxRetries})`);
          window.dispatchEvent(new CustomEvent('api-retry-status', { detail: { attempt: attempt + 1, maxRetries, message: "API Key cá nhân đang quá tải (429). Đang thử lại..." } }));
          await delay(15000);
          continue;
        } else {
          throw new Error("API Key cá nhân của bạn hiện đang quá tải do nhận quá nhiều yêu cầu (Lỗi 429/503). Vui lòng đợi 1-2 phút rồi thử lại.");
        }
      }
      if (attempt < maxRetries) {
        console.warn(`[apiFetch] Rate limited (429/503). Retrying in 15 seconds... (Attempt ${attempt + 1} of ${maxRetries})`);
        window.dispatchEvent(new CustomEvent('api-retry-status', { detail: { attempt: attempt + 1, maxRetries } }));
        await delay(15000);
        continue;
      } else {
        throw new Error("Hệ thống (API Key mặc định) hiện đang nhận quá nhiều yêu cầu hoặc đã hết hạn mức. Vui lòng thử lại sau, hoặc thiết lập API Key cá nhân của riêng bạn trong Cài đặt để sử dụng ổn định hơn.");
      }
    }

    // For any other non-retryable errors
    throw new Error(errorMsg || "Đã xảy ra lỗi khi kết nối.");
  }
  
  throw new Error("Request failed after retries.");
}

export async function uploadFileChunked(fileData: string, type: string): Promise<string> {
  const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
  const fileId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  // Max payload is ~1MB for Nginx, so we use 500KB chunks
  const chunkSize = 500 * 1024;
  const totalChunks = Math.ceil(fileData.length / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const chunkData = fileData.substring(i * chunkSize, (i + 1) * chunkSize);
    const res = await fetch(baseUrl + '/api/upload-chunk', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, chunkIndex: i, totalChunks, chunkData, type })
    });
    if (!res.ok) {
      throw new Error(`Lỗi khi tải file lên (phần ${i + 1}/${totalChunks}). Vui lòng thử lại.`);
    }
  }
  return fileId;
}
