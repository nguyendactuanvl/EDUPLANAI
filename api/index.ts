
import express from "express";
import fs from "fs";
import HTMLtoDOCX from "html-to-docx";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import LZString from 'lz-string';



export const maxDuration = 60; // 1 minute max duration on Vercel Hobby

const MATH_FORMATTING_RULES = `QUY TẮC ĐỊNH DẠNG TOÁN HỌC VÀ VĂN BẢN (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):
1. Mọi công thức Toán bắt buộc viết bằng cú pháp chuẩn LaTeX (tuyệt đối không dùng ký tự Unicode như √, ∫).
2. Công thức nằm cùng dòng văn bản: Luôn kẹp trong cặp dấu $...$ (ví dụ: $y = \\dfrac{ax+b}{cx+d}$, $x \\in [1; 5]$). LUÔN CÓ KHOẢNG TRẮNG trước và sau dấu $ để không bị dính chữ.
3. Công thức nằm riêng một dòng độc lập: Luôn kẹp trong cặp dấu $$...$$.
4. Ký hiệu bắt buộc: Phân số dùng \\dfrac{a}{b}, hệ phương trình dùng \\begin{cases} ... \\end{cases}, dấu khác (không bằng) BẮT BUỘC dùng \\neq (tuyệt đối KHÔNG viết dạng "/ =", "/=", "!=" hay "=/=").
   Ký hiệu vô cực (vô cùng) BẮT BUỘC dùng \\infty: $-\\infty, +\\infty$. Tuyệt đối KHÔNG viết thiếu dấu gạch chéo thành -infty, +infty hay in fty. Các khoảng như $(-\\infty; -1)$, $(-1; +\\infty)$ BẮT BUỘC có \\ trước infty.
   KÝ HIỆU TẬP HỢP DÙNG DẤU NGOẶC NHỌN: Dấu ngoặc nhọn tập hợp { } BẮT BUỘC phải thoát bằng dấu gạch chéo ngược: \\{ và \\} (ví dụ: $A = \\{x \\in \\mathbb{Z} \\mid -2 \\le x < 3\\}$, $B = \\{1; 2; 3\\}$, $\\{x \\in \\mathbb{R} \\mid |x| \\le 3\\}$). Tuyệt đối KHÔNG viết thiếu gạch chéo { } vì KaTeX sẽ ẩn mất dấu ngoặc nhọn.
   CÁC TOÁN TỬ SO SÁNH: BẮT BUỘC viết \\le, \\ge, \\neq (ví dụ: $x \\le 3$, $|x| \\le 3$, $-2 \\le x < 3$). Tuyệt đối KHÔNG viết dính liền chữ dạng "leqx", "leq3" hay thiếu dấu gạch chéo ngược.
5. [CỰC KỲ QUAN TRỌNG] QUY ƯỚC CÔNG THỨC NGHIỆM PHƯƠNG TRÌNH LƯỢNG GIÁC (CHUẨN TOÁN HỌC & KATEX):
   - Khi biểu diễn họ nghiệm tuyển của phương trình lượng giác (\\sin, \\cos, \\tan, \\cot hoặc các bài toán phương trình có nghiệm phân nhánh "hoặc"):
     + BẮT BUỘC sử dụng dấu móc vuông \\left[ kết hợp \\begin{aligned} ... \\end{aligned}\\right. thay vì dấu móc nhọn \\begin{cases}.
     + Cú pháp chuẩn KaTeX:
       $$\\left[\\begin{aligned} x &= \\alpha + k2\\pi \\\\ x &= \\pi - \\alpha + k2\\pi \\end{aligned}\\right. \\quad (k \\in \\mathbb{Z})$$
       (hoặc viết trong dòng: $\\left[\\begin{aligned} x &= \\alpha + k2\\pi \\\\ x &= \\pi - \\alpha + k2\\pi \\end{aligned}\\right.$).
     + TUYỆT ĐỐI KHÔNG dùng \\begin{cases} cho họ nghiệm lượng giác (vì \\begin{cases} là dấu ngoặc nhọn biểu thị hệ 'và', trong khi các họ nghiệm lượng giác phân nhánh là tuyển 'hoặc', toán học quy chuẩn dùng dấu ngoặc vuông \\left[).
   - GIỮ NGUYÊN dấu móc nhọn \\begin{cases} ... \\end{cases} cho hệ phương trình / hệ bất phương trình (điều kiện đồng thời xảy ra).
6. Bố cục văn bản dùng định dạng Markdown rõ ràng.
7. [CỰC KỲ QUAN TRỌNG] BẢNG BIẾN THIÊN VÀ ĐỒ THỊ BẰNG TIKZ:
   - BẮT BUỘC đặt toàn bộ code vẽ bảng biến thiên hoặc đồ thị vào trong khối markdown \`\`\`tikz ... \`\`\`. 
   - BẮT BUỘC phải bao bọc mã bên trong \\begin{tikzpicture} và \\end{tikzpicture}. KHÔNG DÙNG pgfplots (axis).
   - VỚI BẢNG BIẾN THIÊN: Dùng gói tkz-tab chuẩn mực. KHÔNG dùng môi trường ma trận array.
     + Cấu hình bắt buộc: \\tkzTabInit[lgt=1.5, espcl=3]...
     + Điểm gián đoạn (không xác định) bắt buộc dùng 2 vạch song song: ký hiệu d, -d/, +d/ trong tkz-tab.
     + Ký hiệu tổng quát: x_1, x_2, y_{CĐ}, y_{CT}, -\\infty, +\\infty.
   - VỚI ĐỒ THỊ (ĐẶC BIỆT LÀ HÀM PHÂN THỨC BẬC 1/1 VÀ BẬC 2/1): 
     + Tuyệt đối KHÔNG dùng đường cong Bezier (.. controls ..) kéo tự do làm sai tiếp tuyến đồ thị hàm số.
     + Phải dùng hàm giải tích chuẩn (ví dụ: \\draw[domain=..., samples=100] plot (\\x, {hàm_số})).
     + Với hàm phân thức có tiệm cận đứng tại $x = x_0$, BẮT BUỘC vẽ 2 nhánh riêng biệt ở 2 miền $x < x_0$ và $x > x_0$ (tuyệt đối không để domain chạy qua điểm gián đoạn $x_0$).
     + BẮT BUỘC vẽ các đường tiệm cận đứng, tiệm cận ngang, tiệm cận xiên bằng NÉT ĐỨT (dashed):
       Ví dụ tiệm cận đứng $x = 1$: \\draw[dashed, red, thick] (1, -4) -- (1, 4) node[above] {$x = 1$};
       Ví dụ tiệm cận ngang $y = 2$: \\draw[dashed, blue, thick] (-4, 2) -- (4, 2) node[right] {$y = 2$};
     + BẮT BUỘC có hệ trục tọa độ Oxy với mũi tên (->, >=stealth), nhãn $x$, $y$, gốc $O$ và chia vạch hoặc lưới tọa độ rõ ràng:
       \\draw[->, >=stealth, thick] (-4.5,0) -- (4.5,0) node[right] {$x$};
       \\draw[->, >=stealth, thick] (0,-4.5) -- (0,4.5) node[above] {$y$};
       \\node[below left] at (0,0) {$O$};
7. [CỰC KỲ QUAN TRỌNG] HÌNH VẼ HÌNH HỌC KHÔNG GIAN BẰNG TIKZ (Chuẩn GDPT 2018):
   - BẮT BUỘC đặt code vào khối markdown \`\`\`tikz ... \`\`\` và bao bọc bởi \\begin{tikzpicture} và \\end{tikzpicture}.
   - QUY ƯỚC NÉT VẼ:
     + Nét liền (thick/solid): Tất cả các đường biên bao quanh hình và các cạnh nhìn thấy ở mặt trước. Tuyệt đối KHÔNG vẽ nét đứt cho cạnh biên ngoài cùng (ví dụ: đường cao SA dựng thẳng đứng từ mép ngoài luôn là nét liền).
     + Nét đứt (dashed): CHỈ dành cho các cạnh nằm ở đáy phía sau, đường cao hoặc đường chéo bị các mặt phía trước che khuất.
   - BỐ CỤC ĐIỂM VÀ TỌA ĐỘ CHUẨN:
     + Khối chóp đáy tam giác (S.ABC) có SA vuông góc đáy: Đặt A ở góc phía sau (0,0); B lệch sang phải (4,0); C chúc về phía trước (1.5,-1.8). SA dựng thẳng đứng (0,h). Cạnh khuất DUY NHẤT là AB (nét đứt). Các cạnh SA, SB, SC, AC, BC là nét liền.
     + Khối chóp đáy tứ giác (S.ABCD) có SA vuông góc đáy: Đáy vẽ hình bình hành phối cảnh: A(0,0), B(3.5,0), D(-1,-1.5), C(2.5,-1.5). Các cạnh khuất đáy: AB, AD (nét đứt). Chiều cao SA nét liền nếu ở biên ngoài.
     + Khối lăng trụ / hình hộp: Đáy dưới vẽ phối cảnh, 3 cạnh phía sau đáy dưới và các đường chéo khuất vẽ nét đứt. Các cạnh bên và mặt trước vẽ nét liền.
   - KÝ HIỆU TOÁN HỌC: Vẽ đầy đủ góc vuông ở chân đường cao, ký hiệu góc giữa đường và mặt, góc giữa hai mặt phẳng khi có yêu cầu. Các nhãn đỉnh (above, below, left, right) phải hợp lý, không bị đường kẻ cắt ngang chữ.
8. [CỰC KỲ QUAN TRỌNG] VẼ MIỀN NGHIỆM BẤT PHƯƠNG TRÌNH (BPT) VÀ HỆ BPT BẬC NHẤT HAI ẨN (Chuẩn GDPT 2018):
   - Đặt code vào khối markdown \`\`\`tikz ... \`\`\` và bao bọc bởi \\begin{tikzpicture} và \\end{tikzpicture}.
   - TUYỆT ĐỐI KHÔNG dùng \\usetikzlibrary hay \\usepackage (môi trường Web trình duyệt không hỗ trợ nạp thư viện ngoài). Dùng các tùy chọn chuẩn TikZ như [->] hoặc [>=stealth].
   - QUY ƯỚC ĐƯỜNG BIÊN:
     + Dấu bằng (>= hoặc <=): Đường biên vẽ NÉT LIỀN (thick, solid).
     + Dấu ngặt (> hoặc <): Đường biên vẽ NÉT ĐỨT (dashed, thick).
     + Phải đặt nhãn tên đường thẳng ($d_1, d_2,...$) ở đầu mút.
   - MIỀN NGHIỆM VÀ PHẦN GẠCH BỎ:
     + Phần KHÔNG thuộc miền nghiệm: Dùng tô màu xám nhẹ [fill=gray!25, fill opacity=0.7] (TUYỆT ĐỐI KHÔNG dùng pattern=... vì trình duyệt không nạp được thư viện patterns).
     + Phần THUỘC miền nghiệm: Giữ trắng hoặc tô nền sáng (ví dụ: fill=cyan!15).
     + Đối với Hệ BPT: Vẽ viền đậm quanh đa giác miền nghiệm (tuân thủ nét liền/đứt tương ứng) và đánh dấu rõ các đỉnh kèm tọa độ chính xác.
   - NGUYÊN TẮC GIẢI TÍCH (CẤM VẼ TỰ DO / CẤM ĐOÁN TỌA ĐỘ):
     + Trước khi vẽ bất kỳ đường thẳng ax + by = c nào, BẮT BUỘC phải tính chính xác: Giao điểm với Ox (Cho y = 0 -> x = c/a) và Giao điểm với Oy (Cho x = 0 -> y = c/b).
     + Tọa độ các đỉnh đa giác miền nghiệm phải là nghiệm giải tích thực sự của hệ 2 phương trình đường thẳng giao nhau (Ví dụ: x + y = 4 và y = 3 thì giao điểm BẮT BUỘC là (1; 3), không được vẽ giao điểm nằm ngoài đường thẳng).
9. [CỰC KỲ QUAN TRỌNG] TRÌNH BÀY ĐÁP ÁN TRẮC NGHIỆM:
   - TUYỆT ĐỐI KHÔNG viết các đáp án A, B, C, D dính liền nhau trên cùng một dòng.
   - BẮT BUỘC mỗi đáp án phải nằm trên một dòng riêng biệt.
   - TUYỆT ĐỐI KHÔNG xuống dòng ngay sau dấu $ hoặc để thừa ký tự $ (ví dụ viết $\\begin{cases} ... \\end{cases}$ liền mạch, không viết $ \n \\begin{cases}...\\end{cases} \n $).
10. [QUY CHUẨN CẤU TRÚC ĐỀ THI / PHIẾU HỌC TẬP CHUẨN GDPT 2018 - TUYỆT ĐỐI TUÂN THỦ]:
    - TUYỆT ĐỐI KHÔNG ĐƯỢC tóm tắt, không được bỏ qua bất kỳ câu nào, TUYỆT ĐỐI KHÔNG ĐƯỢC sinh placeholder như "(Các câu tương tự...)", "(Tương tự cho các câu sau...)", "(Các câu 5 đến 12 tương tự...)", "... (tiếp tục)" hoặc viết tắt câu.
    - Yêu cầu N câu thì hệ thống BẮT BUỘC PHẢI SINH ĐỦ 100% ĐÚNG N CÂU HOÀN CHỈNH từ câu 1 đến câu N. Mỗi câu phải có đề bài chi tiết, số liệu cụ thể và lời giải/đáp án rõ ràng.
    - PHẦN TRẮC NGHIỆM ĐÚNG/SAI (loại "tf"): Mỗi câu BẮT BUỘC phải gồm ĐÚNG 4 mệnh đề con:
      a) [Mệnh đề 1]
      b) [Mệnh đề 2]
      c) [Mệnh đề 3]
      d) [Mệnh đề 4]
      (Mỗi ý trên 1 dòng riêng biệt, rõ ràng, không gộp dòng với đề bài, không được thiếu ý nào).
      Trong mảng "tfStatements": BẮT BUỘC có ĐỦ ĐÚNG 4 phần tử:
      [
        { "statement": "Nội dung ý a", "correct": true/false },
        { "statement": "Nội dung ý b", "correct": true/false },
        { "statement": "Nội dung ý c", "correct": true/false },
        { "statement": "Nội dung ý d", "correct": true/false }
      ]
    - PHẦN TRẮC NGHIỆM 4 LỰA CHỌN (loại "mc"): BẮT BUỘC đủ 4 phương án A, B, C, D hoàn chỉnh trong mảng "options".
    - PHẦN TRẢ LỜI NGẮN (loại "sa"): Đưa ra câu hỏi định lượng và giá trị số/kết quả chính xác trong "correctAnswer".
      + [RÀNG BUỘC ĐẶC BIỆT CHO CHỦ ĐỀ TẬP HỢP]:
        * TUYỆT ĐỐI KHÔNG ra đề yêu cầu "Tìm tập hợp", "Viết kết quả dưới dạng khoảng/đoạn/nửa khoảng" hay biểu diễn nghiệm dưới dạng tập hợp.
        * BẮT BUỘC câu hỏi phải có đáp số là MỘT CON SỐ CỤ THỂ, ví dụ:
          . "Tập hợp $A \cap B$ có bao nhiêu phần tử là số nguyên?"
          . "Biết $A \cap B = (a; b)$. Tính giá trị của biểu thức $T = a + b$ (hoặc $T = 2a - b$)?"
          . "Tính độ dài của khoảng/đoạn..."
        * Đảm bảo đáp số luôn là MỘT SỐ NGUYÊN hoặc SỐ THẬP PHÂN có ĐỘ DÀI TỐI ĐA 4 KÝ TỰ (ví dụ: "3", "-2", "15", "2.5", "-0.5").`;

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ type: ['text/plain', 'text/*', 'application/json'], limit: '50mb' }));
app.use((req, _res, next) => {
  if (typeof req.body === 'string' && (req.body.trim().startsWith('{') || req.body.trim().startsWith('['))) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {}
  }
  next();
});

const chunkStore = new Map<string, { chunks: string[], type: string, total: number, timestamp: number }>();

app.post("/api/upload-chunk", (req, res) => {
  const { fileId, chunkIndex, totalChunks, chunkData, type } = req.body;
  if (!chunkStore.has(fileId)) {
    chunkStore.set(fileId, { chunks: new Array(totalChunks), type, total: totalChunks, timestamp: Date.now() });
  }
  const fileEntry = chunkStore.get(fileId)!;
  fileEntry.chunks[chunkIndex] = chunkData;
  fileEntry.timestamp = Date.now();
  res.json({ success: true });
});

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of chunkStore.entries()) {
    if (now - entry.timestamp > 10 * 60 * 1000) {
      chunkStore.delete(id);
    }
  }
}, 60 * 1000);


async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfModule = await import('pdf-parse');
    const mod: any = pdfModule;
    if (typeof mod === 'function') {
      const data = await mod(buffer);
      return data?.text || '';
    }
    if (mod?.default && typeof mod.default === 'function') {
      const data = await mod.default(buffer);
      return data?.text || '';
    }
    const PDFParseClass = mod?.PDFParse || mod?.default?.PDFParse;
    if (PDFParseClass) {
      const parser = new PDFParseClass({ data: buffer });
      const res = await parser.getText();
      return res?.text || '';
    }
  } catch (err) {
    console.warn("PDF text parse error:", err);
  }
  return '';
}

async function processFilesForAI(files: any[]) {
  const processedFiles = [];
  for (const f of files) {
    if (!f.data) continue;
    try {
      let rawBase64 = typeof f.data === 'string' ? f.data.trim() : '';
      if (rawBase64.startsWith('data:')) {
        rawBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '').trim();
      }

      let isDoc = f.type === 'application/msword' || f.name?.endsWith('.doc');
      let isDocx = f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || f.name?.endsWith('.docx');
      let isPdf = f.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf') || rawBase64.startsWith('JVBERi0');
      
      // Fallback identification based on data signature if type/name is missing
      if (!isDoc && !isDocx && !isPdf && rawBase64.startsWith('0M8R4KGxGuE')) {
         isDoc = true; // OLE format
      }
      if (!isDoc && !isDocx && !isPdf && rawBase64.startsWith('UEsDBBQ')) {
         isDocx = true; // ZIP format
      }

      if (isDocx) {
        const buffer = Buffer.from(rawBase64, 'base64');
        const result = await mammoth.convertToHtml({ buffer });
        processedFiles.push({
          inlineData: {
            data: Buffer.from(result.value).toString('base64'),
            mimeType: 'text/html'
          }
        });
      } else if (isDoc) {
        const buffer = Buffer.from(rawBase64, 'base64');
        const extractor = new WordExtractor();
        const extracted = await extractor.extract(buffer);
        processedFiles.push({
          inlineData: {
            data: Buffer.from(extracted.getBody()).toString('base64'),
            mimeType: 'text/plain'
          }
        });
      } else if (isPdf) {
        // Gửi file Base64 sạch sang Gemini API dưới dạng inlineData
        processedFiles.push({
          inlineData: {
            data: rawBase64,
            mimeType: 'application/pdf'
          }
        });

        // Bổ sung cơ chế trích xuất văn bản từ PDF làm dữ liệu văn bản đối chiếu
        try {
          const pdfBuffer = Buffer.from(rawBase64, 'base64');
          const pdfText = await extractTextFromPdf(pdfBuffer);
          if (pdfText && pdfText.trim()) {
            processedFiles.push({
              text: `[Văn bản trích xuất từ file PDF ${f.name || 'đề thi'}]:\n${pdfText.trim().substring(0, 60000)}`
            });
          }
        } catch (pdfErr) {
          console.warn("pdf-parse extraction notice:", pdfErr);
        }
      } else {
        processedFiles.push({
          inlineData: {
            data: rawBase64,
            mimeType: f.type || 'text/plain'
          }
        });
      }
    } catch (e) {
      console.error("Error processing file:", e);
      let rawBase64 = typeof f.data === 'string' ? f.data.replace(/^data:[^;]+;base64,/, '').trim() : f.data;
      processedFiles.push({
        inlineData: {
          data: rawBase64,
          mimeType: f.type || 'text/plain'
        }
      });
    }
  }
  return processedFiles;
}

function resolveFiles(reqBody: any) {
  let files: any[] = [];
  if (Array.isArray(reqBody.files)) {
    files.push(...reqBody.files);
  }
  const fileIds = reqBody.fileIds || [];
  for (const id of fileIds) {
    const entry = chunkStore.get(id);
    if (entry) {
      files.push({ data: entry.chunks.join(''), type: entry.type });
      chunkStore.delete(id);
    }
  }

  return files.map(f => {
    if (f && f.data && typeof f.data === "string") {
      const trimmed = f.data.trim();
      const matches = trimmed.match(/^data:([^;]+);base64,(.*)$/s);
      if (matches) {
        return { ...f, type: f.type || matches[1], data: matches[2].trim() };
      }
      return { ...f, data: trimmed };
    }
    return f;
  });
}

function resolveSingleFile(reqBody: any) {
  let { file, type, fileId } = reqBody;
  if (fileId && chunkStore.has(fileId)) {
    const entry = chunkStore.get(fileId)!;
    file = entry.chunks.join('');
    type = entry.type;
    chunkStore.delete(fileId);
  }
  return { file, type };
}


const EXAMS_CACHE_FILE = path.join(process.cwd(), 'shared_exams.json');
const EXAMS_TMP_FILE = '/tmp/shared_exams.json';
const sharedExamsStore = new Map<string, any>();

// Load initially from file if exists (both cwd and /tmp)
function loadExamsFromDisk() {
  const tryLoad = (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const obj = JSON.parse(raw);
        for (const [k, v] of Object.entries(obj)) {
          if (!sharedExamsStore.has(k)) {
            sharedExamsStore.set(k, v);
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to load exams from ${filePath}:`, e);
    }
  };
  tryLoad(EXAMS_CACHE_FILE);
  tryLoad(EXAMS_TMP_FILE);
}
loadExamsFromDisk();

function saveExamsToDisk() {
  try {
    const obj: Record<string, any> = {};
    for (const [k, v] of sharedExamsStore.entries()) {
      obj[k] = v;
    }
    const json = JSON.stringify(obj);
    try { fs.writeFileSync(EXAMS_CACHE_FILE, json, 'utf8'); } catch (e) {}
    try { fs.writeFileSync(EXAMS_TMP_FILE, json, 'utf8'); } catch (e) {}
  } catch (e) {
    console.warn("Failed to save exams cache to disk:", e);
  }
}

function getAiClient(req: any) {
  const authHeader = req.headers['authorization'] as string;
  let customKey = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    customKey = authHeader.substring(7);
  } else {
    customKey = req.headers['x-gemini-api-key'] as string;
  }
  
  if (customKey) {
    try { customKey = decodeURIComponent(customKey); } catch (e) {}
    customKey = customKey.replace(/[^\x20-\x7E]/g, '').trim();
    return new GoogleGenAI({ apiKey: customKey });
  }
  
  return new GoogleGenAI({ apiKey: process.env.CUSTOM_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "missing" });
}

function handleAiError(error: any, req: any, res: any) {
  const errorMsg = error?.message || "";
  const lowerMsg = errorMsg.toLowerCase();
  const isCustomKey = !!req.headers['x-gemini-api-key'] || (!!req.headers['authorization'] && (req.headers['authorization'] as string).startsWith('Bearer '));

  if (lowerMsg.includes("api_key_invalid") || lowerMsg.includes("api key not valid")) {
    return res.status(400).json({ error: "API Key không hợp lệ. Vui lòng kiểm tra lại Cài đặt hệ thống và đảm bảo API Key chính xác." });
  }
  if (lowerMsg.includes("unauthenticated") || lowerMsg.includes("service account is deleted") || error?.status === 401 || lowerMsg.includes("account_state_invalid")) {
    if (!isCustomKey) {
        return res.status(401).json({ error: "Tài khoản API mặc định của hệ thống đang tạm ngưng. Để tiếp tục sử dụng ứng dụng, thầy/cô vui lòng bấm vào mục \"Nhập mã API key\" ở thanh menu bên trái và điền API Key cá nhân của mình (từ Google AI Studio). Xin lỗi thầy/cô vì sự bất tiện này!" });
    }
    return res.status(401).json({ error: "UNAUTHENTICATED: Tài khoản dịch vụ liên kết với API Key cá nhân của bạn đã bị vô hiệu hóa hoặc không hợp lệ." });
  }

  if (lowerMsg.includes("suspended") || lowerMsg.includes("permission_denied") || error?.status === 403) {
    if (!isCustomKey) {
        return res.status(401).json({ error: "UNAUTHENTICATED: Hệ thống AI hiện đang bảo trì hoặc hết hạn ngạch." });
    }
    return res.status(401).json({ error: "UNAUTHENTICATED: Tài khoản API Key cá nhân của bạn đã bị từ chối quyền truy cập." });
  }

  if (lowerMsg.includes("resource_exhausted") || lowerMsg.includes("quota") || lowerMsg.includes("429") || error?.status === 429) {
    if (!isCustomKey) {
        return res.status(429).json({ error: "Hệ thống đang quá tải hoặc tạm thời không khả dụng do nhu cầu cao (429). Vui lòng thử lại sau ít phút hoặc sử dụng API Key cá nhân." });
    }
    return res.status(429).json({ error: "API Key cá nhân của bạn hiện đang nhận quá nhiều yêu cầu cùng lúc (Lỗi 429). Chi tiết từ Google: " + errorMsg });
  }
  if (lowerMsg.includes("503") || error?.status === 503 || lowerMsg.includes("unavailable")) {
    if (!isCustomKey) {
        return res.status(503).json({ error: "Hệ thống đang quá tải hoặc tạm thời không khả dụng do nhu cầu cao (503). Vui lòng thử lại sau ít phút hoặc sử dụng API Key cá nhân." });
    }
    return res.status(503).json({ error: "Hệ thống AI của Google đang quá tải (503). Vui lòng đợi vài giây và thử lại." });
  }

  if (lowerMsg.includes("bad escaped character") || lowerMsg.includes("unexpected token") || lowerMsg.includes("syntaxerror")) {
    return res.status(500).json({ error: "Phản hồi từ AI chứa ký tự công thức chưa chuẩn. Hệ thống đang tự động tối ưu hóa, thầy/cô vui lòng bấm thử lại." });
  }

  console.error("AI Error Debug:", error, error?.status, error?.message);
  res.status(500).json({ error: errorMsg || "Đã xảy ra lỗi không xác định từ máy chủ AI. Vui lòng thử lại sau." });
}


const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function keepAliveExecute(req: any, res: any, fn: () => Promise<any>) {
  let headersSent = false;
  const keepAlive = setInterval(() => {
    if (!headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(200);
      headersSent = true;
    }
    res.write(' ');
  }, 15000);

  try {
    const result = await fn();
    clearInterval(keepAlive);
    if (!headersSent) {
      res.json(result);
    } else {
      res.write(JSON.stringify(result));
      res.end();
    }
  } catch (error: any) {
    clearInterval(keepAlive);
    if (!headersSent) {
      return handleAiError(error, req, res);
    } else {
      let rawMsg = error?.message || String(error);
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed?.error?.message) rawMsg = parsed.error.message;
        else if (parsed?.message) rawMsg = parsed.message;
      } catch (e) {}
      const cleanMsg = rawMsg.replace(/[\r\n]+/g, ' ').replace(/"/g, "'").trim();
      res.write(`\n\nSERVER_ERROR: ${cleanMsg}\n`);
      res.end();
    }
  }
}

/**
 * Làm sạch chuỗi JSON bên trong chuỗi string, tự động sửa các lỗi:
 * - Ký tự backslash không hợp lệ trong LaTeX (\frac, \alpha, \le, \vec, \Omega, ...)
 * - Unicode escape không hợp lệ (\upsilon, \underline, ...)
 * - Xuống dòng hoặc tab chưa được escape trong chuỗi string
 * - Dấu phẩy thừa cuối mảng/object (, } hoặc , ])
 */
function sanitizeJsonString(str: string): string {
  let result = "";
  let inString = false;
  let i = 0;
  const len = str.length;

  while (i < len) {
    const ch = str[i];

    if (!inString) {
      if (ch === "\"") {
        inString = true;
        result += ch;
        i++;
      } else {
        result += ch;
        i++;
      }
    } else {
      // Bên trong chuỗi JSON string
      if (ch === "\"") {
        inString = false;
        result += ch;
        i++;
      } else if (ch === "\\") {
        if (i + 1 >= len) {
          result += "\\\\";
          i++;
        } else {
          let slashCount = 0;
          let k = i;
          while (k < len && str[k] === "\\") {
            slashCount++;
            k++;
          }

          if (slashCount === 2) {
            // LaTeX line break like \\ in cases, array, matrix
            // In JSON, 4 backslashes are required to yield 2 backslashes after JSON.parse
            result += "\\\\\\\\";
            i += 2;
          } else if (slashCount >= 4) {
            result += "\\\\\\\\";
            i += 4;
          } else {
            const next = str[i + 1];
            if (next === "\"") {
              result += "\\\"";
              i += 2;
            } else if (next === "/") {
              result += "/";
              i += 2;
            } else if (next === "b" || next === "f" || next === "n" || next === "r" || next === "t") {
              const charAfter = (i + 2 < len) ? str[i + 2] : "";
              if (charAfter && /[a-zA-Z]/.test(charAfter)) {
                // Lệnh LaTeX như \frac, \beta, \text, \tau, \rho, \rightarrow, \neq, \times...
                result += "\\\\" + next;
                i += 2;
              } else {
                // Escape chuẩn JSON như \n, \t...
                result += "\\" + next;
                i += 2;
              }
            } else if (next === "u") {
              const hex = str.slice(i + 2, i + 6);
              if (/^[0-9a-fA-F]{4}$/.test(hex)) {
                result += "\\u" + hex;
                i += 6;
              } else {
                // Lệnh LaTeX bắt đầu bằng \u như \upsilon, \underline...
                result += "\\\\u";
                i += 2;
              }
            } else {
              // Tất cả các ký tự khác sau \ (như \alpha, \le, \vec, \Delta, \[, \], \{, \}, \$, \%...)
              result += "\\\\" + next;
              i += 2;
            }
          }
        }
      } else if (ch === "\n") {
        result += "\\n";
        i++;
      } else if (ch === "\r") {
        result += "\\r";
        i++;
      } else if (ch === "\t") {
        result += "\\t";
        i++;
      } else {
        result += ch;
        i++;
      }
    }
  }

  // Loại bỏ dấu phẩy thừa trước ngoặc đóng
  return result.replace(/,\s*([\}\]])/g, "$1");
}

function repairTruncatedJson(str: string): string {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
    } else {
      if (ch === "\"") {
        inString = true;
      } else if (ch === "{" || ch === "[") {
        stack.push(ch);
      } else if (ch === "}" && stack[stack.length - 1] === "{") {
        stack.pop();
      } else if (ch === "]" && stack[stack.length - 1] === "[") {
        stack.pop();
      }
    }
  }

  let repaired = str;
  if (inString) {
    repaired += "\"";
  }
  repaired = repaired.replace(/,\s*$/, "");
  while (stack.length > 0) {
    const top = stack.pop();
    if (top === "{") repaired += "}";
    if (top === "[") repaired += "]";
  }
  return repaired;
}

/**
 * An toàn phân tích chuỗi JSON trả về từ AI, xử lý triệt để lỗi "Bad escaped character in JSON"
 * do công thức toán học LaTeX chứa các ký tự \ chưa được escape hợp lệ (như \frac, \le, \Omega, \alpha, ...)
 */
function safeJsonParse<T = any>(text: string, fallback?: T): T {
  if (!text || typeof text !== 'string') return (text as any) || (fallback as T);
  let cleaned = text
    .replace(/^```json\s*/gi, '')
    .replace(/^```\s*/gi, '')
    .replace(/```\s*$/gi, '')
    .replace(/```/g, '')
    .trim();

  // 1. Thử parse nguyên bản
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // 2. Thử làm sạch qua bộ sanitize
    try {
      const sanitized = sanitizeJsonString(cleaned);
      return JSON.parse(sanitized);
    } catch (e2) {
      // 3. Thử trích xuất khối JSON giữa { ... } hoặc [ ... ]
      const match = cleaned.match(/(\{|\[)[\s\S]*(\}|\])/);
      if (match) {
        try {
          return JSON.parse(sanitizeJsonString(match[0]));
        } catch (e3) {}
      }

      // 4. Thử tự động vá đóng ngoặc nếu chuỗi bị cắt ngắn (truncated)
      try {
        const repaired = repairTruncatedJson(cleaned);
        return JSON.parse(sanitizeJsonString(repaired));
      } catch (e4) {}

      if (fallback !== undefined && fallback !== null) {
        return fallback;
      }
      throw e1;
    }
  }
}

async function generateWithFallback(req: any, payloadOptions: any) {
  const client = getAiClient(req);
  const models = ["gemini-3.8-flash", "gemini-3.1-pro-preview", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let primaryError: any = null;
  
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const model of models) {
      try {
        
        const config = payloadOptions.config || {};
        const defaultSystemInstruction = `Bạn là chuyên gia Toán học và Khảo thí GDPT 2018. BẮT BUỘC dùng cú pháp LaTeX chuẩn kẹp trong cặp dấu $...$ (nội dòng) hoặc $$...$$ (khối dòng) cho TẤT CẢ các thành phần toán:
- Chỉ số dưới BẮT BUỘC dùng dấu gạch dưới: $u_1$, $u_6$, $S_{10}$, $N_0$, $N_t$.
- Số mũ / lũy thừa BẮT BUỘC dùng dấu mũ: $q^5$, $2^9$, $2^{10}$, $a^2 + b^2$.
- Phân số BẮT BUỘC dùng \\frac{tử}{mẫu}: $\\frac{1 - (-2)^{10}}{1 - (-2)}$, $\\frac{108}{54}$.
- Phép nhân dùng \\cdot, dấu suy ra/tương đương dùng \\Rightarrow, \\Leftrightarrow.
- Họ nghiệm phương trình lượng giác (\\sin, \\cos...): BẮT BUỘC dùng dấu móc vuông \\left[ thay vì \\begin{cases}, cú pháp chuẩn KaTeX: $\\left[\\begin{aligned} x &= \\alpha + k2\\pi \\\\ x &= \\pi - \\alpha + k2\\pi \\end{aligned}\\right. \\quad (k \\in \\mathbb{Z})$.
- Hệ phương trình / Hệ bất phương trình: GIỮ NGUYÊN dấu móc nhọn \\begin{cases} ... \\end{cases} kèm xuống dòng \\\\ rõ ràng.
- Tuyệt đối KHÔNG viết công thức dưới dạng text thường như u1, q5, 2^9 viết thành 29.
- [QUY CHUẨN CẤU TRÚC ĐỀ THI / PHIẾU HỌC TẬP GDPT 2018]:
  + TUYỆT ĐỐI KHÔNG ĐƯỢC tóm tắt, không được bỏ qua bất kỳ câu nào, TUYỆT ĐỐI KHÔNG ĐƯỢC sinh placeholder như "(Các câu tương tự...)", "(Tương tự cho các câu sau...)", "(Các câu 5 đến 12 tương tự...)", "... (tiếp tục)" hoặc viết tắt câu.
  + Nếu yêu cầu N câu thì hệ thống BẮT BUỘC PHẢI SINH ĐỦ 100% ĐÚNG N CÂU HOÀN CHỈNH từ câu 1 đến câu N.
  + Mỗi câu Đúng/Sai (loại "tf") BẮT BUỘC gồm ĐÚNG 4 mệnh đề con a), b), c), d) trên các dòng riêng biệt (mảng "tfStatements" có đúng 4 phần tử).
  + Mỗi câu trắc nghiệm (loại "mc") BẮT BUỘC có ĐÚNG 4 lựa chọn (mảng "options" có đúng 4 phần tử).
  + Câu trả lời ngắn (loại "sa") CHỦ ĐỀ TẬP HỢP: TUYỆT ĐỐI KHÔNG ra đề yêu cầu "Tìm tập hợp", "Viết khoảng/đoạn/nửa khoảng". BẮT BUỘC đáp số là MỘT CON SỐ CỤ THỂ (số phần tử nguyên, tính giá trị biểu thức $T = a + b$ hoặc $2a - b$ với $A \cap B = (a; b)$, tính độ dài khoảng...) và đáp số có độ dài tối đa 4 ký tự.
  + Khi vẽ đồ thị hàm phân thức (bậc 1/1, bậc 2/1): BẮT BUỘC vẽ tiệm cận đứng và ngang/xiên bằng nét đứt (dashed), vẽ 2 nhánh riêng biệt ở 2 phía của tiệm cận đứng, có trục tọa độ Oxy với mũi tên và chia lưới/vạch rõ ràng.`;

        const updatedPayload = { 
          ...payloadOptions, 
          model,
          config: {
            maxOutputTokens: 8192,
            ...config,
            systemInstruction: config.systemInstruction || defaultSystemInstruction
          } 
        };
        return await client.models.generateContent(updatedPayload);
  
      } catch (e: any) {
        const errorMsg = e?.message || "";
        const status = e?.status;
        
        const lowerMsg = (e?.message || "").toLowerCase();
        
        // Immediately throw if it's an invalid API key to notify user
        if (lowerMsg.includes("api_key_invalid") || lowerMsg.includes("api key not valid")) {
          throw e;
        }
        
        const is429 = lowerMsg.includes("429") || status === 429 || lowerMsg.includes("resource_exhausted") || lowerMsg.includes("quota") || lowerMsg.includes("503") || status === 503 || lowerMsg.includes("unavailable") || lowerMsg.includes("overloaded");
        const is404 = lowerMsg.includes("not found") || status === 404 || lowerMsg.includes("is not found") || lowerMsg.includes("not exist") || lowerMsg.includes("no longer available") || status === 400;
        
        if (is429) {
          // Always overwrite primary error with 429, as it's the most actionable rate-limit error.
          primaryError = e;
          continue; 
        }
        if (is404) {
          // Only set primary error to 404 if we don't already have one (like a 429).
          if (!primaryError) primaryError = e;
          continue;
        }
        throw e; // Non-retryable
      }
    }
    
    // If all models failed with 429/503, wait and retry
    if (primaryError && attempt < maxRetries - 1) {
      
      await delay(2000 * (attempt + 1) + Math.random() * 1000);
    }
  }
  
  if (primaryError) throw primaryError;
  throw new Error("503 UNAVAILABLE: Hệ thống đang quá tải hoặc tạm thời không khả dụng do nhu cầu cao (503). Vui lòng thử lại sau ít phút hoặc sử dụng API Key cá nhân.");
}

app.all("/api/circulars", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();


  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
    res.json([
      { id: "5512/BGDĐT-GDTrH", date: "18/12/2020", title: "Xây dựng và tổ chức thực hiện kế hoạch giáo dục của nhà trường" },
      { id: "3456/BGDĐT-GDPT", date: "27/6/2025", title: "Hướng dẫn triển khai thực hiện khung năng lực số cho học sinh phổ thông" },
      { id: "2422/QĐ-BGDĐT", date: "18/8/2026", title: "Ban hành Khung nội dung giáo dục trí tuệ nhân tạo cho học sinh phổ thông" }
    ]);

});

app.all("/api/extract-data", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();


  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
    try {
      const { file, type } = resolveSingleFile(req.body);
      let promptText = "";
      let responseSchema;
      
      if (type === "timetable") {
        promptText = `Trích xuất Thời khóa biểu từ tài liệu. Hệ thống tiết học: Sáng (tiết 1, 2, 3, 4, 5), Chiều (tiết 6, 7, 8, 9, 10), Tối (tiết Tối).
Nếu trong tài liệu ghi buổi chiều tiết 1,2,3,4,5 thì tự động chuyển đổi thành tiết 6,7,8,9,10.
Trả về danh sách các tiết học/lịch công tác.`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            entries: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING, description: "Ví dụ: Thứ 2, Thứ 3..." },
                  period: { type: Type.STRING, description: "Từ 1 đến 10, hoặc 'Tối'" },
                  content: { type: Type.STRING }
                },
                required: ["day", "period", "content"]
              }
            }
          },
          required: ["entries"]
        };
      } else if (type === "student_profiles") {
        promptText = "Trích xuất danh sách học sinh kèm thông tin liên lạc từ tài liệu đính kèm. Bỏ qua tiêu đề. Lấy họ tên, ngày sinh, số điện thoại học sinh, họ tên phụ huynh, số điện thoại phụ huynh, địa chỉ, ghi chú (nếu có).";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            students: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  dob: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  parentName: { type: Type.STRING },
                  parentPhone: { type: Type.STRING },
                  address: { type: Type.STRING },
                  notes: { type: Type.STRING }
                },
                required: ["name"]
              }
            }
          },
          required: ["students"]
        };
      } else if (type === "students") {
        promptText = "Trích xuất danh sách họ và tên học sinh từ tài liệu đính kèm. Bỏ qua các tiêu đề, STT, cột điểm, chỉ lấy họ và tên.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            students: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["students"]
        };
      } else if (type === "raw_text") {
        promptText = "Trích xuất toàn bộ nội dung văn bản từ tài liệu đính kèm. Hãy giữ nguyên định dạng ngắt dòng. Trả về toàn bộ dưới dạng chuỗi trong trường text.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING }
          },
          required: ["text"]
        };
      } else {
        throw new Error("Invalid extract type");
      }
      
      const matches = file.match(/^data:([a-zA-Z0-9\/\+\-\.]+);base64,(.+)$/);
      if (!matches) throw new Error("Invalid file format");
      
      const parts = [
        { text: promptText },
        {
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        }
      ];
      
      const payloadOptions = {
        contents: [{ role: "user", parts }],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema
        }
      };

      const response = await generateWithFallback(req, payloadOptions);
      if (!response || !response.text) throw new Error("No response from AI");
      
      const parsed = safeJsonParse(response.text);
      res.json(parsed);
    } catch (error: any) {
    return handleAiError(error, req, res);
  }
});

app.all("/api/generate-exam", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return keepAliveExecute(req, res, async () => {
    const { 
      subject = "Toán", 
      grade = "12", 
      duration = "45", 
      examType = "Định kỳ", 
      matrix = "", 
      customPrompt = "", 
      qCounts = {},
      matrixFile,
      selectedTopics = [],
      detailedSolution = true,
      realWorldConfig
    } = req.body;

    let files = resolveFiles(req.body);
    if (matrixFile) {
      let fileData = matrixFile;
      let fileType = 'application/pdf';
      if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        const matches = fileData.match(/^data:(.*?);base64,(.*)$/);
        if (matches) {
          fileType = matches[1];
          fileData = matches[2];
        }
      }
      files.push({ data: fileData, type: fileType });
    }

    const mcCount = Number(qCounts.mc) || 0;
    const tfCount = Number(qCounts.tf) || 0;
    const saCount = Number(qCounts.sa) || 0;
    const essayCount = Number(qCounts.essay) || 0;
    const totalQuestions = mcCount + tfCount + saCount + essayCount;

    const isRealWorldEnabled = realWorldConfig ? realWorldConfig.enabled !== false : false;
    const rwLevel = realWorldConfig?.level || "standard";
    const rwLevelText = 
      rwLevel === "high" ? "Tăng cường (~50% câu thực tế)" :
      rwLevel === "max" ? "Chuyên đề thực tế (~70% - 100% câu thực tế)" :
      "Tiêu chuẩn (~30% câu thực tế)";

    const realWorldDirective = isRealWorldEnabled ? `
ƯU TIÊN CÂU HỎI BỐI CẢNH THỰC TIỄN (CHUẨN GDPT 2018):
- Mức độ ưu tiên: ${rwLevelText}.
- Thiết kế các câu hỏi có ngữ cảnh đời sống thực tế rõ ràng (kinh doanh, sản xuất xưởng cơ khí/may mặc, đo đạc hàng hải, đo chiều cao tháp/sông, bài toán chi tiêu/lãi suất).
- Tránh các bài toán thuần túy đại số khô khan nếu chủ đề có khả năng ứng dụng thực tế cao (nhất là Hệ bất phương trình bậc nhất hai ẩn và Hệ thức lượng trong tam giác).
- Đối với Phần III (Trả lời ngắn): Đặt câu hỏi thực tế yêu cầu tính một đại lượng cụ thể (mét, nghìn đồng, số sản phẩm, số giờ...) và làm tròn theo đúng yêu cầu để đáp số là một số nguyên hoặc số thập phân tối đa 4 ký tự.
- ĐẶC BIỆT: Đối với mỗi câu hỏi có ngữ cảnh/ứng dụng thực tế, hãy thêm trường "isRealWorld": true vào đối tượng câu hỏi tương ứng trong mảng "questions".
` : '';

    const promptText = `Bạn là một chuyên gia khảo thí và giáo viên giỏi bộ môn ${subject}.
Nhiệm vụ của bạn là biên soạn một Đề kiểm tra chuẩn chất lượng cao cho học sinh Lớp ${grade}, môn ${subject}, Thời gian làm bài: ${duration} phút.
Hình thức/Kỳ thi: ${examType}.
${selectedTopics.length > 0 ? `Các chủ đề/bài học trọng tâm: ${selectedTopics.join(', ')}.` : ''}
${matrix ? `Yêu cầu ma trận/đặc tả: ${matrix}` : ''}
${customPrompt ? `Yêu cầu chi tiết của giáo viên:\n${customPrompt}` : ''}
${realWorldDirective}

CẤU TRÚC VÀ SỐ LƯỢNG CÂU HỎI BẮT BUỘC:
TUYỆT ĐỐI KHÔNG ĐƯỢC tóm tắt, không được bỏ qua bất kỳ câu nào, TUYỆT ĐỐI KHÔNG ĐƯỢC sinh placeholder như "(Các câu tương tự...)" hay viết tắt câu. Phải sinh ĐỦ 100% các câu hỏi theo đúng số lượng yêu cầu:
${mcCount > 0 ? `- Phần I: ĐÚNG ${mcCount} câu hỏi Trắc nghiệm nhiều lựa chọn (loại "mc") - mỗi câu gồm đúng 4 phương án lựa chọn trong mảng "options", chỉ có 1 phương án đúng.` : ''}
${tfCount > 0 ? `- Phần II: ĐÚNG ${tfCount} câu hỏi Trắc nghiệm Đúng/Sai (loại "tf") - mỗi câu BẮT BUỘC có đề dẫn chung và ĐÚNG 4 ý a), b), c), d) trong mảng "tfStatements" (4 phần tử). Học sinh xác định từng ý là Đúng (true) hay Sai (false).` : ''}
${saCount > 0 ? `- Phần III: ĐÚNG ${saCount} câu hỏi Trắc nghiệm Trả lời ngắn (loại "sa") - CHUẨN ĐỊNH DẠNG BỘ GD&ĐT 2018:
  + BẮT BUỘC câu hỏi phải dẫn tới MỘT KẾT QUẢ SỐ CỤ THỂ (ví dụ: "Tính giá trị biểu thức $T = ...$", "Tìm số nguyên dương nhỏ nhất...", "Tính diện tích tam giác...", "Tìm số nghiệm của phương trình...").
  + TUYỆT ĐỐI KHÔNG ra đề dạng mở (như "Viết hệ bất phương trình...", "Nêu kết luận...", "Giải thích vì sao...").
  + [RÀNG BUỘC ĐẶC BIỆT CHO CHỦ ĐỀ TẬP HỢP]:
    * TUYỆT ĐỐI KHÔNG ra đề yêu cầu "Tìm tập hợp", "Viết kết quả dưới dạng khoảng/đoạn/nửa khoảng" hay biểu diễn nghiệm dưới dạng tập hợp.
    * BẮT BUỘC câu hỏi phải có đáp số là MỘT CON SỐ CỤ THỂ, ví dụ:
      - "Tập hợp $A \\cap B$ có bao nhiêu phần tử là số nguyên?"
      - "Biết $A \\cap B = (a; b)$. Tính giá trị của biểu thức $T = a + b$ (hoặc $T = 2a - b$)?"
      - "Tính độ dài khoảng/đoạn..."
    * Đảm bảo đáp số luôn là MỘT SỐ NGUYÊN hoặc SỐ THẬP PHÂN có ĐỘ DÀI TỐI ĐA 4 KÝ TỰ (ví dụ: "3", "-2", "15", "2.5", "-0.5").
  + ĐÁP ÁN BẮT BUỘC (RÀNG BUỘC PHIẾU CHẤM GDPT 2018): Trường "correctAnswer" BẮT BUỘC chỉ là một chuỗi số có ĐỘ DÀI TỐI ĐA 4 KÝ TỰ (kể cả dấu âm '-' hoặc dấu phẩy/chấm thập phân), ví dụ: "22", "-3.5", "13", "102", "0.25", "-8". TUYỆT ĐỐI KHÔNG viết chữ, đơn vị đo hay công thức toán vào "correctAnswer" (nêu đơn vị trong đề bài).` : ''}
${essayCount > 0 ? `- Phần IV: ĐÚNG ${essayCount} câu hỏi Tự luận (loại "essay") - bài toán tự luận có hướng dẫn giải và thang điểm chi tiết.` : ''}
${totalQuestions === 0 ? 'Nếu không chỉ định số lượng, hãy tạo 12 câu trắc nghiệm nhiều lựa chọn (mc), 2 câu Đúng/Sai (tf), 4 câu Trả lời ngắn (sa) theo đúng cấu trúc đề thi mới của Bộ GD&ĐT.' : ''}

QUY TẮC BẮT BUỘC VỀ TOÁN HỌC VÀ KỸ THUẬT:
${MATH_FORMATTING_RULES}
- Mọi công thức, ký hiệu toán, biến số đơn lẻ (như $x, y, z, m, a, b, c, \\alpha, \\beta, \\pi, \\in, \\le, \\ge, -\\infty, +\\infty...$) BẮT BUỘC đặt trong cặp dấu đô la $...$ hoặc $$...$$.
- Ký hiệu vô cùng/vô cực BẮT BUỘC viết chuẩn LaTeX là \\infty (ví dụ: $(-\\infty; -1)$, $(-1; +\\infty)$, $[0; +\\infty)$, $(-\\infty; +\\infty)$). Tuyệt đối KHÔNG viết thiếu dấu gạch chéo ngược thành -infty, +infty, in fty.
- TUYỆT ĐỐI KHÔNG lặp lại các chữ A, B, C, D vào nội dung của câu hỏi hoặc phương án (hệ thống sẽ tự động gán nhãn A, B, C, D).
- Câu trắc nghiệm (mc): mảng "options" phải có ĐÚNG 4 phần tử dạng chuỗi. "correctOptionIndex" là chỉ số đáp án đúng (0, 1, 2, 3).
- Câu đúng/sai (tf): "tfStatements" phải là mảng ĐÚNG 4 đối tượng [{ "statement": "...", "correct": true/false }].
- Câu trả lời ngắn (sa): "correctAnswer" BẮT BUỘC là MỘT SỐ CỤ THỂ có độ dài TỐI ĐA 4 KÝ TỰ (ví dụ: "22", "-3.5", "13", "102"). Tuyệt đối không dùng dạng mở hay công thức.
${detailedSolution !== false ? '- BẮT BUỘC kèm lời giải chi tiết (explanation) rõ ràng, chuẩn xác sư phạm cho từng câu hỏi.' : '- Giáo viên KHÔNG yêu cầu lời giải chi tiết. Hãy để trường "explanation" là chuỗi ngắn gọn để tối ưu tốc độ tạo đề.'}

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ VỚI CẤU TRÚC SAU:
{
  "examName": "${examType.toUpperCase().startsWith('ĐỀ') ? examType.toUpperCase() : 'ĐỀ ' + examType.toUpperCase()} - MÔN ${subject.toUpperCase()} ${grade.replace(/^(LỚP|KHỐI)\s*/i, '').trim()} (${duration} PHÚT)",
  "questions": [
    {
      "id": 1,
      "type": "mc",
      "level": "Nhận biết",
      "isRealWorld": false,
      "content": "Nội dung câu hỏi...",
      "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
      "correctOptionIndex": 0,
      "explanation": "Lời giải chi tiết..."
    },
    {
      "id": 2,
      "type": "tf",
      "level": "Thông hiểu",
      "isRealWorld": true,
      "content": "Nội dung câu hỏi Đúng/Sai bối cảnh thực tế...",
      "tfStatements": [
        { "statement": "Khẳng định a", "correct": true },
        { "statement": "Khẳng định b", "correct": false },
        { "statement": "Khẳng định c", "correct": true },
        { "statement": "Khẳng định d", "correct": false }
      ],
      "explanation": "Lời giải chi tiết cho 4 ý..."
    },
    {
      "id": 3,
      "type": "sa",
      "level": "Vận dụng",
      "content": "Tính diện tích tam giác $ABC$... (Kết quả làm tròn đến hàng đơn vị).",
      "correctAnswer": "25",
      "explanation": "Lời giải chi tiết..."
    },
    {
      "id": 4,
      "type": "essay",
      "level": "Vận dụng cao",
      "content": "Nội dung bài toán tự luận...",
      "correctAnswer": "Hướng dẫn chấm chi tiết",
      "explanation": "Lời giải chi tiết..."
    }
  ]
}`;

    const processedFiles = await processFilesForAI(files);

    const response = await generateWithFallback(req, {
      contents: [
        {
          role: "user",
          parts: [
            ...processedFiles,
            { text: promptText }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    if (!response || !response.text) {
      throw new Error("Không nhận được phản hồi từ AI");
    }

    let parsedData: any = {};
    const rawText = response.text.trim();
    try {
      parsedData = safeJsonParse(rawText);
    } catch (e) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedData = safeJsonParse(jsonMatch[0]);
        } catch (e3) {
          // Salvage questions if JSON was truncated
          parsedData = { examName: `Đề kiểm tra ${subject} ${grade}`, questions: [] };
        }
      } else {
        parsedData = { examName: `Đề kiểm tra ${subject} ${grade}`, questions: [] };
      }
    }

    if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
      parsedData.questions = [];
    }

    parsedData.questions = parsedData.questions.map((q: any, idx: number) => ({
      ...q,
      id: q.id || idx + 1,
      type: q.type || 'mc',
      level: q.level || 'Nhận biết',
      isRealWorld: Boolean(q.isRealWorld)
    }));

    return parsedData;
  });
});

app.all("/api/upgrade-lesson-plan", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    const { lesson, subject } = req.body;
    const files = resolveFiles(req.body);
    
    const prompt = `Bạn là một chuyên gia giáo dục và công nghệ thông tin. Tôi đã tải lên một tài liệu Giáo án cũ (Kế hoạch bài dạy) môn ${subject || "chung"} cho bài học: "${lesson}".

YÊU CẦU:
Hãy đọc toàn bộ giáo án cũ này và viết lại toàn bộ giáo án, giữ nguyên cấu trúc và những nội dung cốt lõi, nhưng TÍCH HỢP VÀ BỔ SUNG CHI TIẾT việc ứng dụng công nghệ, năng lực số (NLS), năng lực AI, và STEM vào các hoạt động dạy học.

HƯỚNG DẪN CHI TIẾT:
1. **Phần Mục tiêu**: Hãy thêm hoặc làm rõ các mục tiêu về Năng lực số, Năng lực AI (nếu có thể), và STEM.
2. **Phần Thiết bị & Học liệu**: Bổ sung các công cụ số, phần mềm, thiết bị tương tác, công cụ AI cần thiết cho bài dạy.
3. **Phần Tiến trình dạy học**: 
   - Với mỗi hoạt động (Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng):
     + Mục "c) Sản phẩm": BẮT BUỘC PHẢI CÓ LỜI GIẢI CHI TIẾT từng bước hoặc bảng kiến thức hoàn chỉnh mà HS cần đạt, không chỉ ghi chung chung "phiếu trả lời" hay "câu trả lời của HS".
     + Mục "d) Tổ chức thực hiện": BẮT BUỘC THỂ HIỆN RÕ 4 BƯỚC SƯ PHẠM KÈM LỜI THOẠI VÀ HÀNH ĐỘNG CỤ THỂ:
       * Bước 1: Chuyển giao nhiệm vụ (câu hỏi/bài tập cụ thể, lời thoại GV dẫn dắt, câu lệnh prompt mẫu cho ChatGPT/Gemini, link/thao tác GeoGebra/Forms).
       * Bước 2: Thực hiện nhiệm vụ (thời gian làm việc cá nhân/nhóm, dự kiến khó khăn/sai lầm học sinh thường mắc phải và cách GV gợi mở).
       * Bước 3: Báo cáo, thảo luận (chỉ định nhóm/HS trình bày, các nhóm phản biện và đối chiếu kết quả phản biện từ công cụ AI/phần mềm).
       * Bước 4: Kết luận, nhận định (GV chốt kiến thức, ghi rõ bảng tổng kết kiến thức hoặc nội dung cần ghi chép vào vở).
4. **Tô màu Năng lực số và Năng lực AI**: Khi nhắc đến bất kỳ phần mềm, công cụ thiết bị số, Năng lực số hoặc công cụ AI nào (đặc biệt là những cái bạn vừa bổ sung), BẮT BUỘC phải bọc trong thẻ HTML \`<mark style="background-color: #dbeafe; color: #1d4ed8; font-weight: bold; padding: 2px 4px; border-radius: 4px;">Tên công cụ / NLS</mark>\` để tô màu nổi bật.
${MATH_FORMATTING_RULES}
5. TUYỆT ĐỐI KHÔNG sử dụng thẻ HTML \`<br>\` hoặc \`<br/>\`. Sử dụng dấu xuống dòng chuẩn Markdown.
6. Soạn chi tiết đầy đủ 100%, không tóm tắt, không dùng dấu ba chấm (...).`;

    const response = await generateWithFallback(req, {
      contents: [
        {
          role: "user",
          parts: [
            ...(await processFilesForAI(files || [])),
            {
              text: prompt
            }
          ]
        }
      ],
      config: {
        temperature: 0.5,
        maxOutputTokens: 8192,
      }
    });

    res.json({ result: response.text });
  } catch (error: any) {
    const errorMsg = error?.message || "";
    if (errorMsg.includes("Unsupported MIME type")) {
      return res.status(400).json({ error: "Định dạng file không được AI hỗ trợ. Vui lòng tải lên PDF, Text hoặc Word (DOC/DOCX)." });
    }
    return handleAiError(error, req, res);
  }
});

// Route for Educational Plan (KHGD - Phân phối chương trình)
app.all("/api/generate-plan", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return keepAliveExecute(req, res, async () => {
    const { subject = "Toán", grade = "10", topic = "" } = req.body;
    const files = resolveFiles(req.body);
    
    const prompt = `Bạn là một Tổ trưởng chuyên môn và chuyên gia giáo dục. Hãy tạo/bổ sung một mẫu Kế hoạch giáo dục (KHGD) cho môn ${subject}, lớp ${grade}, chủ đề "${topic}".
    Giữ nguyên cấu trúc KHGD gốc (của công văn 5512/BGDĐT-GDTrH) và chỉ bổ sung các cột còn thiếu theo yêu cầu chuẩn của các công văn mới nhất về Năng lực số (NLS) (CV 3456) và Năng lực AI (QĐ 2422).
    
    YÊU CẦU BẮT BUỘC ĐỐI VỚI NỘI DUNG:
    - Cột "Năng lực số": BẮT BUỘC phải bắt đầu bằng mã chỉ báo cụ thể trong dấu ngoặc vuông (ví dụ: [1.1.NC1a], [3.1.NC1a], [5.3.NC1b]...). Theo sau là nội dung ứng dụng. Ví dụ: "[3.1.NC1a] Sử dụng công cụ vẽ số hóa biểu đồ".
    - Cột "Năng lực AI": BẮT BUỘC phải bắt đầu bằng mã chỉ báo cụ thể trong dấu ngoặc vuông theo QĐ 2422 (ví dụ: [10.A1.1], [10.C2.1], [12.D2.1]...). Theo sau là yêu cầu cần đạt về AI tương ứng.
    - Cột "Giáo dục STEM/STEAM": Đề xuất hợp lý nhất các bài có thể tích hợp Stem/Steam phù hợp với năng lực và điều kiện thực tế.
    - Giữ nguyên các cột gốc: Bài học, Số tiết/bài, Yêu cầu cần đạt.
    ${MATH_FORMATTING_RULES}
    Trả về kết quả dưới dạng danh sách JSON array với các thuộc tính: lesson, periods, requirement, digitalComp, aiComp, stem, note.`;

    let contents: any = prompt;
    if (files && files.length > 0) {
      contents = [
        {
          role: "user",
          parts: [
            ...(await processFilesForAI(files)),
            { text: prompt }
          ]
        }
      ];
    }
    const response = await generateWithFallback(req, {
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              lesson: { type: Type.STRING },
              periods: { type: Type.NUMBER },
              requirement: { type: Type.STRING },
              digitalComp: { type: Type.STRING },
              aiComp: { type: Type.STRING },
              stem: { type: Type.STRING },
              note: { type: Type.STRING }
            },
            required: ["lesson", "periods", "requirement", "digitalComp", "aiComp", "stem", "note"]
          }
        }
      }
    });

    const data = safeJsonParse(response.text || "[]");
    return data;
  });
});

// Route for Kế hoạch bài dạy (Giáo án CV 5512)
app.all(["/api/generate-lesson-plan", "/api/generate-lesson-plan-file"], async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return keepAliveExecute(req, res, async () => {
    // If request comes with topic only and no lesson, fallback to KHGD
    if (req.body.topic && !req.body.lesson && !req.body.name) {
      const { subject = "Toán", grade = "10", topic = "" } = req.body;
      const files = resolveFiles(req.body);
      const prompt = `Bạn là một Tổ trưởng chuyên môn và chuyên gia giáo dục. Hãy tạo mẫu Kế hoạch giáo dục (KHGD) cho môn ${subject}, lớp ${grade}, chủ đề "${topic}". Trả về kết quả dưới dạng danh sách JSON array với các thuộc tính: lesson, periods, requirement, digitalComp, aiComp, stem, note.`;
      const response = await generateWithFallback(req, {
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return safeJsonParse(response.text || "[]");
    }

    const lesson = req.body.lesson || req.body.name || "Bài học";
    const subject = req.body.subject || "Toán";
    const grade = req.body.grade || "10";
    const periods = Number(req.body.periods) || 2;
    const requirement = req.body.requirement || req.body.requirements || "";
    const digitalComp = req.body.digitalComp || req.body.digitalCompetence || "";
    const aiComp = req.body.aiComp || req.body.aiCompetence || "";
    const stem = req.body.stem || "";
    const textbook = req.body.textbook || "Kết nối tri thức với cuộc sống";
    const maxOutputTokens = 8192;
    const files = resolveFiles(req.body);

    const lessonPlanSystemInstruction = `Bạn là Chuyên gia Sư phạm cao cấp, Chuyên viên Vụ Giáo dục Trung học (Bộ GD&ĐT), và Giáo viên giỏi cốt cán chuyên sâu về đổi mới phương pháp dạy học theo Chương trình Giáo dục phổ thông 2018.
Nhiệm vụ của bạn là biên soạn một KẾ HOẠCH BÀI DẠY (GIÁO ÁN) hoàn chỉnh, mẫu mực, chuẩn mực sư phạm 100% theo đúng quy định Công văn 5512/BGDĐT-GDTrH và bám sát bộ sách giáo khoa "${textbook}".

YÊU CẦU ĐẶC BIỆT QUAN TRỌNG VỀ ĐỘ CHI TIẾT:
TUYỆT ĐỐI KHÔNG ĐƯỢC TÓM TẮT SƠ SÀI, KHÔNG CHỈ VIẾT DÀN Ý HAY GẠCH ĐẦU DÒNG CHUNG CHUNG. Hãy biên soạn một GIÁO ÁN CHI TIẾT ĐẦY ĐỦ NHƯ GIÁO VIÊN SOẠN THỰC TẾ ĐỂ ĐỨNG LỚP VÀ NỘP DUYỆT BAN GIÁM HIỆU/TỔ CHUYÊN MÔN. Mọi câu hỏi, bài toán, lời thoại giáo viên, hành động của học sinh, khó khăn dự kiến, bảng chốt kiến thức và lời giải đều phải được viết rõ ràng, trọn vẹn 100%.

CÁC NGUYÊN TẮC CỐT LÕI BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT:

1. TIẾN TRÌNG DẠY HỌC PHÂN BỔ ĐẦY ĐỦ ${periods} TIẾT (CHUẨN HÓA 4 HOẠT ĐỘNG CHO TỪNG TIẾT):
- Căn cứ vào thời lượng ${periods} tiết, phần "III. TIẾN TRÌNG DẠY HỌC" BẮT BUỘC PHẢI ĐƯỢC PHÂN CHIA RÕ RÀNG VÀ CHI TIẾT THEO TỪNG TIẾT HỌC: TIẾT 1, TIẾT 2, ..., TIẾT ${periods}.
- Mỗi tiết học là một chỉnh thể sư phạm hoàn chỉnh gồm ĐẦY ĐỦ 4 HOẠT ĐỘNG CHUẨN CÔNG VĂN 5512:
  + Hoạt động 1: Khởi động / Mở đầu (Xác định vấn đề / tình huống học tập của tiết)
  + Hoạt động 2: Hình thành kiến thức mới (Chiếm lĩnh các đơn vị kiến thức tương ứng phân phối cho tiết đó)
  + Hoạt động 3: Luyện tập (Hệ thống câu hỏi, bài tập có giải chi tiết để củng cố kiến thức tiết học)
  + Hoạt động 4: Vận dụng / Giao việc về nhà (Ứng dụng thực tiễn, định hướng STEM, chuẩn bị cho tiết tiếp theo).
- Soạn đầy đủ cho tất cả các tiết (từ Tiết 1 đến Tiết ${periods}), tuyệt đối KHÔNG bỏ lửng hay viết tắt.

2. ĐẦU RA MỤC "c) Sản phẩm" BẮT BUỘC PHẢI CÓ LỜI GIẢI / ĐÁP ÁN CHI TIẾT:
- Bắt buộc trình bày LỜI GIẢI CHI TIẾT từng bước, đáp số cụ thể hoặc BẢNG KIẾN THỨC HOÀN CHỈNH mà học sinh cần đạt được.
- TUYỆT ĐỐI KHÔNG chỉ ghi chung chung như "phiếu trả lời", "câu trả lời của HS", "học sinh làm bài vào vở". Toàn bộ nội dung lời giải, các bước biến đổi, công thức và đáp số phải được viết đầy đủ vào mục Sản phẩm.

3. Ở MỖI HOẠT ĐỘNG, MỤC "d) Tổ chức thực hiện" BẮT BUỘC VIẾT RÕ 4 BƯỚC KÈM LỜI THOẠI VÀ HÀNH ĐỘNG CỤ THỂ:
- **Bước 1: Chuyển giao nhiệm vụ**:
  + GV chiếu slide hoặc phát phiếu học tập (ghi rõ nội dung cụ thể câu hỏi/bài tập mẫu, số liệu và công thức rõ ràng, KHÔNG ghi chung chung).
  + Kèm lời thoại sư phạm cụ thể của giáo viên khi dẫn dắt và giao việc cho học sinh.
  + Hướng dẫn cụ thể thao tác số/AI/STEM: Ghi rõ CÂU LỆNH PROMPT MẪU học sinh cần nhập vào ChatGPT/Gemini là gì (ví dụ: \`"Hãy tìm 3 phản ví dụ trong thực tế chứng minh mệnh đề sau là sai: ..."\`); cung cấp đường link hoặc hướng dẫn thao tác GeoGebra/Google Forms/Quizizz cụ thể.
- **Bước 2: Thực hiện nhiệm vụ**:
  + Nêu rõ thời gian làm việc (học sinh làm việc cá nhân trong bao nhiêu phút, sau đó thảo luận cặp đôi hoặc nhóm trong bao nhiêu phút).
  + GV quan sát, bao quát lớp; DỰ KIẾN CÁC KHÓ KHĂN, SAI LẦM PHỔ BIẾN học sinh thường mắc phải và CÁCH GV GỢI MỞ, HỖ TRỢ kịp thời để học sinh tự tìm ra hướng giải quyết.
- **Bước 3: Báo cáo, thảo luận**:
  + Chỉ định rõ nhóm hoặc học sinh trình bày (chiếu bài làm lên bảng, dùng bảng nhóm hoặc trình chiếu từ thiết bị thông minh).
  + Các nhóm khác chú ý theo dõi, nhận xét, đối chiếu kết quả phản biện từ công cụ AI/phần mềm.
  + GV định hướng câu hỏi thảo luận mở rộng hoặc cho học sinh chất vấn lẫn nhau để khắc sâu bản chất kiến thức.
- **Bước 4: Kết luận, nhận định**:
  + GV phân tích, nhận xét thái độ làm việc và đánh giá độ chính xác trong câu trả lời của các nhóm.
  + GV chốt kiến thức trọng tâm: GHI RÕ BẢNG TỔNG KẾT KIẾN THỨC HOẶC NỘI DUNG CHÍNH HỌC SINH CẦN GHI CHÉP VÀO VỞ ĐỂ HỌC TẬP.

4. THỂ HIỆN RÕ NĂNG LỰC SỐ, NĂNG LỰC AI VÀ STEM TRONG TỪNG HOẠT ĐỘNG:
- Lồng ghép trực tiếp vào tiến trình hoạt động (ở mục Nội dung, Sản phẩm và 4 bước Tổ chức thực hiện):
  + [Năng lực số (NLS)]: Chỉ rõ phần mềm (Google Forms, Quizizz, GeoGebra, Desmos, Padlet, Canva...) và sản phẩm số đầu ra.
  + [Năng lực AI]: Kịch bản tương tác với AI (ChatGPT/Gemini), câu lệnh prompt mẫu, so sánh đối chiếu kết quả của AI với SGK, đánh giá tính chính xác và phản biện giới hạn của AI.
  + [Tích hợp STEM/STEAM]: Giao nhiệm vụ thực tiễn gắn với kỹ thuật và đời sống.
- TÔ MÀU NỔI BẬT: BẮT BUỘC bọc mọi công cụ số, phần mềm, NLS hoặc AI trong thẻ HTML:
  <mark style="background-color: #dbeafe; color: #1d4ed8; font-weight: bold; padding: 2px 4px; border-radius: 4px;">Tên công cụ / NLS / AI</mark>

5. CHUẨN MỰC TRÌNH BÀY VÀ TOÀN VẸN 100%:
- Soạn đầy đủ, chi tiết từ đầu đến cuối cho tất cả các tiết (từ Tiết 1 đến Tiết ${periods}).
- Tuyệt đối KHÔNG viết tóm tắt, KHÔNG để dấu ba chấm (...), KHÔNG ghi "(tương tự tiết 1)".
- Đảm bảo công thức toán học dùng chuẩn LaTeX kẹp trong $...$ hoặc $$...$$.`;

    const prompt = `Hãy biên soạn toàn diện KẾ HOẠCH BÀI DẠY chuẩn Công văn 5512/BGDĐT-GDTrH và bộ sách "${textbook}" cho bài học sau:

THÔNG TIN BÀI DẠY:
- Môn học: ${subject}
- Lớp: ${grade}
- Tên bài dạy: ${lesson}
- Thời lượng: ${periods} tiết (BẮT BUỘC: Tiến trình dạy học ở Phần III phải chia cụ thể theo từng tiết: từ TIẾT 1 đến TIẾT ${periods}, mỗi tiết có đủ 4 hoạt động)
- Bộ sách giáo khoa: ${textbook}
${requirement ? `- Yêu cầu cần đạt: ${requirement}` : ''}
${digitalComp ? `- Năng lực số (NLS) cần lồng ghép: ${digitalComp}` : ''}
${aiComp ? `- Năng lực Trí tuệ nhân tạo (AI) cần lồng ghép: ${aiComp}` : ''}
${stem ? `- Định hướng STEM/STEAM: ${stem}` : ''}

CẤU TRÚC KẾ HOẠCH BÀI DẠY BẮT BUỘC (VIẾT CHI TIẾT TOÀN DIỆN, KHÔNG ĐƯỢC TÓM TẮT):

# KẾ HOẠCH BÀI DẠY: ${lesson.toUpperCase()}
**Môn học:** ${subject} | **Lớp:** ${grade} | **Thời lượng:** ${periods} tiết  
**Bộ sách:** ${textbook}

---

## I. MỤC TIÊU
1. **Kiến thức:** Trình bày cụ thể các kiến thức học sinh cần chiếm lĩnh sau bài học.
2. **Năng lực:**
   - **Năng lực chung:** Tự chủ và tự học; Giao tiếp và hợp tác; Giải quyết vấn đề và sáng tạo.
   - **Năng lực đặc thù (${subject}):** Nêu rõ các năng lực thành phần chuyên môn môn học.
   - **Năng lực số (NLS):** Chỉ báo và thao tác số học sinh vận dụng.
   - **Năng lực AI:** Năng lực xây dựng câu lệnh prompt, kiểm chứng, phản biện kết quả của AI.
3. **Phẩm chất:** Chăm chỉ, trung thực, trách nhiệm, nhân ái.

## II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
1. **Giáo viên:** Máy chiếu/ti vi tương tác, bài giảng điện tử, phiếu học tập số (Google Forms/Quizizz), máy tính kết nối mạng, câu lệnh mẫu (prompts) cho AI, phần mềm dạy học (GeoGebra/Desmos).
2. **Học sinh:** SGK ${textbook}, vở ghi chép, thiết bị thông minh (quét mã QR, thực hiện prompt AI, tra cứu học liệu số).

## III. TIẾN TRÌNG DẠY HỌC (BẮT BUỘC PHÂN CHIA CỤ THỂ THEO ĐÚNG ${periods} TIẾT)

(Hãy soạn chi tiết lần lượt từ TIẾT 1 đến TIẾT ${periods}. Trong MỖI TIẾT, phải có ĐẦY ĐỦ 4 HOẠT ĐỘNG:
- Hoạt động 1: Mở đầu / Khởi động
- Hoạt động 2: Hình thành kiến thức mới
- Hoạt động 3: Luyện tập
- Hoạt động 4: Vận dụng / Giao việc về nhà

Ở MỖI HOẠT ĐỘNG, BẮT BUỘC TRÌNH BÀY ĐỦ 4 MỤC CHI TIẾT NHƯ SAU:
a) Mục tiêu: Nêu rõ mục tiêu cần đạt của hoạt động (kiến thức, NLS, năng lực AI, phẩm chất).
b) Nội dung: Nhiệm vụ học tập cụ thể, câu hỏi, đề bài hoặc phiếu học tập (ghi rõ nội dung cụ thể câu hỏi/bài tập mẫu, không ghi chung chung).
c) Sản phẩm: BẮT BUỘC TRÌNH BÀY LỜI GIẢI CHI TIẾT hoặc BẢNG KIẾN THỨC HOÀN CHỈNH mà HS cần đạt, TUYỆT ĐỐI KHÔNG CHỈ GHI "phiếu trả lời" hay "câu trả lời của HS".
d) Tổ chức thực hiện: BẮT BUỘC VIẾT RÕ 4 BƯỚC KÈM LỜI THOẠI VÀ HÀNH ĐỘNG CỤ THỂ:
   - **Bước 1: Chuyển giao nhiệm vụ**:
     + GV chiếu slide/giao phiếu học tập (ghi rõ nội dung cụ thể câu hỏi/bài tập mẫu, không ghi chung chung).
     + Kèm lời thoại sư phạm dẫn dắt của GV.
     + Hướng dẫn cụ thể thao tác số/AI/STEM: Câu lệnh prompt mẫu học sinh cần nhập vào ChatGPT/Gemini là gì; link hoặc thao tác GeoGebra/Forms cụ thể.
   - **Bước 2: Thực hiện nhiệm vụ**:
     + HS làm việc cá nhân hoặc nhóm trong bao nhiêu phút.
     + Dự kiến các khó khăn, sai lầm học sinh thường mắc phải và cách GV gợi mở.
   - **Bước 3: Báo cáo, thảo luận**:
     + Chỉ định nhóm/HS trình bày; các nhóm khác nhận xét, đối chiếu kết quả phản biện từ công cụ AI/phần mềm.
   - **Bước 4: Kết luận, nhận định**:
     + GV chốt kiến thức trọng tâm (ghi rõ bảng tổng kết kiến thức hoặc nội dung cần ghi chép vào vở).
)

LƯU Ý ĐẶC BIỆT:
- Lồng ghép trực tiếp các kịch bản [Năng lực số], [Năng lực AI] và [Tích hợp STEM/STEAM] vào từng hoạt động và sản phẩm cụ thể của học sinh.
- Tô màu mọi công cụ số, NLS, AI bằng: <mark style="background-color: #dbeafe; color: #1d4ed8; font-weight: bold; padding: 2px 4px; border-radius: 4px;">Tên công cụ / NLS / AI</mark>.
- Viết chi tiết đầy đủ 100%, không tóm tắt, không dùng dấu ba chấm (...).
${MATH_FORMATTING_RULES}`;

    let contents: any = prompt;
    if (files && files.length > 0) {
      contents = [
        {
          role: "user",
          parts: [
            ...(await processFilesForAI(files)),
            { text: prompt }
          ]
        }
      ];
    }

    const response = await generateWithFallback(req, {
      contents: contents,
      config: {
        systemInstruction: lessonPlanSystemInstruction,
        temperature: 0.5,
        maxOutputTokens: maxOutputTokens
      }
    });

    return { result: response.text };
  });
});

app.all("/api/generate-similar", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();


  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
    return keepAliveExecute(req, res, async () => {

      const files = resolveFiles(req.body);
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const prompt = `Bạn là một chuyên gia giáo dục. Dưới đây là bài tập, đề thi hoặc tài liệu mà giáo viên cung cấp.
YÊU CẦU:
1. Đọc và phân tích cấu trúc, độ khó, dạng bài, và kiến thức trọng tâm của tài liệu gốc.
2. TẠO RA MỘT ĐỀ BÀI HOẶC BỘ BÀI TẬP TƯƠNG TỰ (cùng cấu trúc, độ khó, và dạng bài nhưng thay đổi số liệu, ngữ cảnh hoặc cách hỏi).
3. CUNG CẤP LỜI GIẢI CHI TIẾT cho ĐỀ TƯƠNG TỰ vừa tạo.

Định dạng đầu ra rõ ràng:
## Đề bài tương tự
[Nội dung đề vừa tạo]

## Lời giải chi tiết
[Các bước giải chi tiết cho đề tương tự]

${MATH_FORMATTING_RULES}
BẮT BUỘC kiểm tra và SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận trước khi trả kết quả.`;

      const response = await generateWithFallback(req, {
        contents: [
          {
            role: "user",
            parts: [
              ...(await processFilesForAI(files || [])),
              {
                text: prompt
              }
            ]
          }
        ],
        config: {
          temperature: 0.7,
        }
      });
      
      return { result: response.text };
    
    });
});


app.all("/api/generate-interactive-worksheet", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
    
  return keepAliveExecute(req, res, async () => {
    const { lesson, subject, grade, type } = req.body;
       
    const promptText = `Bạn là một giáo viên xuất sắc môn ${subject || "chung"}. Hãy tạo một Phiếu bài tập (Worksheet) tương tác thật chuyên nghiệp cho học sinh lớp ${grade}, bài học/chủ đề: "${lesson}". Hình thức: ${type || "Kết hợp trắc nghiệm, đúng/sai, trả lời ngắn, tự luận"}.
       
    YÊU CẦU:
    1. Đưa ra khoảng 5-10 câu hỏi phân hóa từ cơ bản đến vận dụng. TUYỆT ĐỐI KHÔNG ĐƯỢC tóm tắt hoặc sinh placeholder như "(Các câu tương tự...)". Bắt buộc sinh đủ 100% các câu hỏi hoàn chỉnh.
    2. Các câu hỏi có thể thuộc 4 loại hình:
       - mc: Trắc nghiệm 4 lựa chọn (chỉ viết nội dung câu hỏi vào "content", 4 phương án vào mảng "options", TUYỆT ĐỐI KHÔNG lặp lại các phương án A, B, C, D trong "content").
       - tf: Trắc nghiệm Đúng/Sai (Mỗi câu BẮT BUỘC gồm ĐÚNG 4 ý a, b, c, d trên các dòng riêng biệt, mảng "tfStatements" BẮT BUỘC có đúng 4 phần tử có thuộc tính statement và correct).
       - sa: Trả lời ngắn (kết quả là 1 số cụ thể có độ dài tối đa 4 ký tự trong "correctAnswer". ĐẶC BIỆT CHỦ ĐỀ TẬP HỢP: Tuyệt đối không ra đề dạng tìm tập hợp hay viết khoảng/đoạn; bắt buộc hỏi số phần tử nguyên, tính biểu thức T = a+b hoặc độ dài khoảng để đáp số là một con số).
       - essay: Tự luận (nội dung đề bài và hướng dẫn chấm cụ thể)
    ${MATH_FORMATTING_RULES}
    3. BẮT BUỘC SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận.
    4. BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON VỚI CẤU TRÚC SAU:
    {
      "examName": "Phiếu bài tập: ${lesson}",
      "questions": [
        {
          "type": "mc",
          "content": "Nội dung câu hỏi...",
          "options": ["Đáp án 1", "Đáp án 2", "Đáp án 3", "Đáp án 4"],
          "correctOptionIndex": 0, // Vị trí đáp án đúng (0, 1, 2, 3)
          "explanation": "Giải thích..."
        },
        {
          "type": "tf",
          "content": "Nội dung câu hỏi Đúng/Sai...",
          "tfStatements": [
            { "statement": "Ý a...", "correct": true },
            { "statement": "Ý b...", "correct": false },
            { "statement": "Ý c...", "correct": true },
            { "statement": "Ý d...", "correct": false }
          ],
          "explanation": "Giải thích..."
        },
        {
          "type": "sa",
          "content": "Nội dung câu trả lời ngắn...",
          "correctAnswer": "Giá trị/Từ khóa đúng (ngắn gọn)",
          "explanation": "Giải thích..."
        },
        {
          "type": "essay",
          "content": "Nội dung tự luận...",
          "correctAnswer": "Hướng dẫn chấm/Đáp án gợi ý chi tiết"
        }
      ]
    }
    `;

    const response = await generateWithFallback(req, {
      contents: promptText,
      config: {
        responseMimeType: "application/json"
      }
    });

    let rawOutput = response.text || '';
    let parsedData: any = safeJsonParse(rawOutput, { questions: [] });
    
    // Process questions
    const formattedQuestions = (parsedData.questions || []).map((q: any, idx: number) => {
       return {
         ...q,
         id: idx + 1,
         number: idx + 1
       };
    });

    return {
       ...parsedData,
       questions: formattedQuestions
    };
  });
});

app.all("/api/generate-worksheet", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();


  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
    return keepAliveExecute(req, res, async () => {

      const { 
        lesson, 
        subject, 
        grade, 
        type, 
        layoutStyle = 'a4_print',
        numMC,
        numEssay,
        includeRealWorld = true,
        answerMode = 'full'
      } = req.body;
      
      let stylePrompt = '';
      if (layoutStyle === 'infographic') {
        stylePrompt = `
YÊU CẦU PHONG CÁCH: INFOGRAPHIC / PHOTOGRAPHIC (Hình ảnh minh họa & Màu sắc hiện đại)
- Trình bày dạng các Thẻ bài học (Card UI) với các khối kiến thức phân chia trực quan, sinh động.
- Sử dụng các tiêu đề thẻ bắt mắt và icon cảm xúc:
  + 💡 **GHI NHỚ NHANH**: Các định nghĩa, tính chất cốt lõi dưới dạng bullet points súc tích.
  + ⚡ **BÍ KÍP THỰC CHIẾN & CÔNG THỨC VÀNG**: Đóng khung các công thức quan trọng nhất.
  + ⚠️ **BẪY SAI LẦM THƯỜNG GẶP**: Những lỗi sai học sinh hay mắc phải và mẹo phòng tránh.
  + 🖼️ **KHUNG MINH HỌA TRỰC QUAN**: Đưa các gợi ý mô tả hình vẽ hoặc đồ thị minh họa thực tế vào trong khối [HÌNH VẼ MINH HỌA: ...].
- Hệ thống bài tập:
  + Phân chia rõ các dạng: [Cơ bản], [Vận dụng], [Toán thực tế cuộc sống].
  + Mỗi bài toán thực tế có thêm: 🧠 **Gợi ý tư duy nhanh** (1 câu ngắn định hướng cách tư duy trước khi giải).`;
      } else if (layoutStyle === 'poster') {
        stylePrompt = `
YÊU CẦU PHONG CÁCH: POSTER TÓM TẮT TƯ DUY (Cheat Sheet / Summary Poster khổ lớn)
- Bố cục cô đọng tối đa, tiêu đề chính thật lớn và nổi bật, phù hợp làm poster dán góc học tập hoặc lưu điện thoại.
- TOÀN BỘ CÔNG THỨC TRỌNG TÂM được gom vào các khối HERO BOX đóng khung nổi bật với ký hiệu 📌, ⭐, 🔑.
- SƠ ĐỒ HÓA CÁC BƯỚC GIẢI TOÁN: Quy trình giải một bài toán mẫu được sơ đồ hóa rõ ràng thành: Bước 1 ➔ Bước 2 ➔ Bước 3 ➔ Kết luận.
- BỔ SUNG MẸO BẤM MÁY TÍNH CASIO & BÍ KÍP TÍNH NHANH (nếu có).
- Hệ thống 3-5 bài tập cốt lõi tiêu biểu nhất, kèm sơ đồ tư duy hướng dẫn cách tiếp cận.`;
      } else if (layoutStyle === 'mindmap') {
        stylePrompt = `
YÊU CẦU PHONG CÁCH: MINDMAP / SƠ ĐỒ NHÁNH
- Cấu trúc kiến thức phân cấp từ CHỦ ĐỀ TRUNG TÂM tỏa ra các nhánh lý thuyết, phương pháp và ví dụ:
  + 🌳 **CHỦ ĐỀ TRUNG TÂM**: "${lesson}"
  + ├── 🌿 **Nhánh 1: Khái niệm & Lý thuyết cốt lõi**
  + ├── ⚡ **Nhánh 2: Công thức then chốt & Định lý**
  + ├── 🎯 **Nhánh 3: Các dạng bài tập điển hình** (kèm ví dụ giải nhanh và phương pháp mẫu)
  + └── ⚠️ **Nhánh 4: Lưu ý & Bẫy sai lầm cần tránh**
- Dùng thụt dòng, ký hiệu phân cấp cây sơ đồ trực quan và bullet point để tạo cảm giác bản đồ tư duy sinh động.`;
      } else {
        stylePrompt = `
YÊU CẦU PHONG CÁCH: A4 CHUẨN IN ẤN (Đen trắng / Tiết kiệm mực - Bố cục chính quy)
- Bố cục trang giấy chuẩn mực cho học sinh in ra làm bài:
  + Phần đầu: Bảng thông tin học sinh (Trường, Lớp, Họ và tên học sinh, Điểm số, Lời phê của giáo viên).
  + Phần I: TÓM TẮT LÝ THUYẾT (Ngắn gọn, bảng biểu sắc nét, kẻ khung tiết kiệm mực in).
  + Phần II: CÂU HỎI TRẮC NGHIỆM (Đánh số câu rõ ràng, 4 phương án A, B, C, D phân bố gọn gàng).
  + Phần III: BÀI TẬP TỰ LUẬN (Có dòng kẻ chấm chấm "......................................................" hoặc khung trống phù hợp để học sinh làm bài trực tiếp trên giấy in).`;
      }

      let exercisePrompt = `Hình thức bài tập: ${type || "Kết hợp trắc nghiệm và tự luận"}.`;
      if (numMC !== undefined || numEssay !== undefined) {
        exercisePrompt += `\nCấu trúc số lượng câu dự kiến: ${numMC ? `${numMC} câu trắc nghiệm` : ''}${numMC && numEssay ? ', ' : ''}${numEssay ? `${numEssay} câu tự luận` : ''}${includeRealWorld ? ', có lồng ghép bài toán liên hệ thực tế cuộc sống.' : '.'}`;
      }

      let answerPrompt = '';
      if (answerMode === 'none') {
        answerPrompt = 'TUYỆT ĐỐI KHÔNG kèm đáp án hay lời giải ở cuối phiếu (phiếu học tập chỉ dành riêng cho học sinh làm bài).';
      } else if (answerMode === 'summary') {
        answerPrompt = 'Ở cuối tài liệu, hãy cung cấp bảng đáp số/đáp án ngắn gọn (dạng bảng đáp án trắc nghiệm và kết số tự luận), phân cách bằng tiêu đề "--- BẢNG ĐÁP ÁN NHANH ---".';
      } else {
        answerPrompt = 'Ở cuối tài liệu, hãy cung cấp phần Hướng dẫn giải chi tiết từng câu, phân cách bằng tiêu đề "--- HƯỚNG DẪN CHẤM / ĐÁP ÁN CHI TIẾT ---".';
      }

      const prompt = `Bạn là một giáo viên xuất sắc môn ${subject || "chung"}. Hãy tạo một Phiếu học tập (Worksheet) thật chuyên nghiệp, trực quan cho học sinh lớp ${grade}, bài học/chủ đề: "${lesson}".
      
${stylePrompt}

YÊU CẦU CHUNG:
1. Phân hóa từ cơ bản đến vận dụng, bám sát chương trình GDPT 2018.
2. ${exercisePrompt}
3. Trình bày rõ ràng, để lại khoảng trống hợp lý giả định học sinh sẽ làm trực tiếp vào phiếu.
${MATH_FORMATTING_RULES}
4. ĐÁP ÁN: ${answerPrompt}
5. BẮT BUỘC kiểm tra và SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận trước khi trả kết quả.`;

      const response = await generateWithFallback(req, {
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      });

      return { result: response.text };
    
    });

});

app.all("/api/pdf-to-word", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();


  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
    return keepAliveExecute(req, res, async () => {

      const files = resolveFiles(req.body);
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const prompt = `Bạn là một chuyên gia số hóa tài liệu. Nhiệm vụ của bạn là chuyển đổi TOÀN BỘ nội dung trong tài liệu (ảnh/PDF) được cung cấp sang định dạng văn bản (Markdown).

YÊU CẦU NGHIÊM NGẶT:
1. TUYỆT ĐỐI GIỮ NGUYÊN cấu trúc, số thứ tự câu, các mục lục, phân chương phân bài. Không được tự ý tóm tắt hay lược bỏ bất kỳ từ nào.
${MATH_FORMATTING_RULES}
2. HÌNH ẢNH / HÌNH VẼ: Do hạn chế kỹ thuật số hóa, nếu gặp biểu đồ, hình vẽ, đồ thị, hãy thêm một chú thích rõ ràng bằng chữ ở vị trí đó (Ví dụ: [Hình vẽ đồ thị hàm số...] hoặc [Hình ảnh mô tả...]) để giáo viên biết vị trí cần chèn lại ảnh gốc.
3. GIỮ NGUYÊN BẢNG BIỂU: Dùng cú pháp Markdown table để tạo lại chính xác các bảng biểu thông thường. ĐỐI VỚI BẢNG BIẾN THIÊN HOẶC BẢNG XÉT DẤU TOÁN HỌC, TUYỆT ĐỐI KHÔNG DÙNG Markdown Table, HÃY DÙNG CÚ PHÁP LaTeX array (như đã quy định ở trên).
4. Nếu trong tài liệu gốc có các thẻ HTML (như <img>) được truyền vào, TUYỆT ĐỐI GIỮ NGUYÊN Y HỆT các thẻ đó ở đúng vị trí.

Đầu ra của bạn phải hoàn toàn là nội dung tài liệu đã được số hóa, không thêm các câu chào hỏi thừa.`;

      const response = await generateWithFallback(req, {
        contents: [
          {
            role: "user",
            parts: [
              ...(await processFilesForAI(files || [])),
              {
                text: prompt
              }
            ]
          }
        ],
        config: {
          temperature: 0.1,
        }
      });
      
      return { result: response.text };
    
    });
});

app.all("/api/solve-exercise", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();


  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
    return keepAliveExecute(req, res, async () => {

      const files = resolveFiles(req.body);
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const prompt = `Bạn là một giáo viên xuất sắc. Dưới đây là bài tập hoặc tài liệu học sinh đưa ra. 
YÊU CẦU:
1. Đọc nội dung bài tập từ file.
2. Viết lại đề bài rõ ràng.
3. Cung cấp lời giải chi tiết, giải thích cặn kẽ từng bước để học sinh dễ hiểu.
4. Định dạng đầu ra thành 2 phần rõ rệt (dùng tiêu đề H2):
## Đề bài
[Nội dung đề]

## Lời giải chi tiết
[Các bước giải chi tiết]

${MATH_FORMATTING_RULES}
5. BẮT BUỘC kiểm tra và SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận trước khi trả kết quả.
6. [QUAN TRỌNG] BẮT BUỘC vẽ bảng biến thiên (BBT), đồ thị hàm số, hoặc hình học (nếu có yêu cầu hoặc cần thiết cho bài toán) bằng code TikZ. Đặt toàn bộ code TikZ (bắt đầu bằng \\\begin{tikzpicture} và kết thúc bằng \\\end{tikzpicture}) vào trong một block markdown có định dạng:
\`\`\`tikz
\\begin{tikzpicture}
...
\\end{tikzpicture}
\`\`\``;

      const response = await generateWithFallback(req, {
        contents: [
          {
            role: "user",
            parts: [
              ...(await processFilesForAI(files || [])),
              {
                text: prompt
              }
            ]
          }
        ],
        config: {
          temperature: 0.2,
        }
      });
      return { result: response.text };
    });
});

app.all("/api/extract-file-text", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const files = resolveFiles(req.body);
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Không tìm thấy file để trích xuất văn bản." });
    }

    const f = files[0];
    let rawBase64 = typeof f.data === 'string' ? f.data.trim() : '';
    if (rawBase64.startsWith('data:')) {
      rawBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '').trim();
    }

    const buffer = Buffer.from(rawBase64, 'base64');
    let extractedText = "";

    const isPdf = f.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf') || rawBase64.startsWith('JVBERi0');
    const isDocx = f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || f.name?.endsWith('.docx') || rawBase64.startsWith('UEsDBBQ');
    const isDoc = f.type === 'application/msword' || f.name?.endsWith('.doc') || rawBase64.startsWith('0M8R4KGxGuE');

    if (isPdf) {
      extractedText = await extractTextFromPdf(buffer);
    } else if (isDocx) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || "";
    } else if (isDoc) {
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(buffer);
      extractedText = extracted.getBody() || "";
    } else {
      extractedText = buffer.toString('utf8');
    }

    return res.json({ text: extractedText.trim() });
  } catch (err: any) {
    console.warn("File text extraction warning:", err);
    return res.status(500).json({ error: "Không thể trích xuất văn bản từ tệp: " + (err.message || String(err)) });
  }
});

app.all("/api/parse-exam", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  return keepAliveExecute(req, res, async () => {
    const { rawText } = req.body || {};
    const files = resolveFiles(req.body);

    const promptText = `Bạn là chuyên gia bóc tách đề thi môn Toán và khoa học tự nhiên chuẩn cấu trúc GDPT 2018. Hãy phân tích tài liệu đề thi được cung cấp (Word, PDF, Text) và tự động nhận diện chính xác từng câu hỏi thuộc các phần của đề thi:

[CỰC KỲ QUAN TRỌNG: BẮT BUỘC BÓC TÁCH TOÀN BỘ ĐỀ THI - TUYỆT ĐỐI KHÔNG ĐƯỢC DỪNG LẠI Ở 12 CÂU CỦA PHẦN I]:
- Quét tiếp toàn bộ tài liệu từ đầu đến cuối đề thi để trích xuất đầy đủ 100% tất cả các phần:
  + PHẦN I: Trắc nghiệm nhiều lựa chọn (Câu 1 đến Câu 12).
  + PHẦN II: Trắc nghiệm Đúng/Sai (Câu 1, 2... của Phần II hoặc Câu 13, 14...). Mỗi câu BẮT BUỘC có 4 ý a), b), c), d) kèm trạng thái Đúng hoặc Sai trong mảng "tfStatements".
  + PHẦN III: Trắc nghiệm trả lời ngắn / điền số (Câu 1, 2, 3, 4...). Lưu nội dung câu hỏi và ô đáp án số ngắn trong "correctAnswer" (ví dụ: "4", "13", "273", "-5", "1/2"...).
  + PHẦN IV: Tự luận (nếu có tiêu đề "PHẦN IV. Tự luận" hoặc bài toán tự luận): Đánh dấu type: "ESSAY". Bóc tách trọn vẹn nội dung câu hỏi (Câu 1, 2, 3...) kèm hướng dẫn chấm / đáp án chi tiết nếu có trong "correctAnswer" hoặc "explanation".
- ĐẢM BẢO DANH SÁCH CÂU HỎI NHẬN VỀ ĐẦY ĐỦ CẢ ĐỀ THI (Ví dụ: 18 câu gồm 12 câu Phần I + 2 câu Đúng/Sai Phần II + 4 câu Điền số Phần III + các câu Tự luận Phần IV nếu có). TUYỆT ĐỐI KHÔNG BỎ SÓT HOẶC CẮT BỚT BẤT KỲ CÂU NÀO.

QUY TẮC NHẬN DIỆN THỜI GIAN LÀM BÀI & TIÊU ĐỀ ĐỀ THI:
+ Tự động quét phần tiêu đề / đầu trang / ghi chú đề thi để tìm thời gian làm bài, ví dụ:
  - "Thời gian làm bài : 90 Phút", "Thời gian: 60 phút", "Thời gian làm bài: 45 phút", "120 phút", "Thời lượng: 50 phút", "Thời gian: 90 phút (không kể thời gian phát đề)"...
  - Trích xuất số phút thực tế tìm thấy (kiểu số nguyên dương, ví dụ: 90). Nếu tài liệu không ghi thời gian, trả về null.
+ Tự động nhận diện tiêu đề đề thi ở đầu trang (ví dụ: "ĐỀ KIỂM TRA ĐỊNH KỲ MÔN TOÁN LỚP 12", "ĐỀ THI HỌC KỲ I..."), gán vào trường "examTitle". Nếu không rõ, để null.

CẤU TRÚC ĐỀ THI GDPT 2018 GỒM CÁC PHẦN:
1. PHẦN I: TRẮC NGHIỆM NHIỀU LỰA CHỌN (MULTIPLE_CHOICE)
- Gồm các câu hỏi có 4 phương án A, B, C, D (chọn 1 đáp án đúng).
- Trường type: "MULTIPLE_CHOICE" (hoặc "mc").
- Gồm: "question", "options" (mảng 4 phương án A, B, C, D), "correctAnswer" (ví dụ: "A"), "explanation" (nếu có).

2. PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI (TRUE_FALSE)
- Gồm các câu có lệnh hỏi chính và 4 ý con a, b, c, d. Mỗi ý học sinh chọn Đúng hoặc Sai.
- Trường type: "TRUE_FALSE" (hoặc "tf").
- Gồm: "question" (nội dung đề bài dẫn), "tfStatements" (mảng gồm 4 phần tử tương ứng với 4 ý a, b, c, d).
  + Mỗi phần tử trong tfStatements: {"statement": "Nội dung ý a/b/c/d...", "correct": true hoặc false}.
  + Ví dụ: [{"statement": "Hàm số đồng biến trên (0; 2)", "correct": true}, ...]

3. PHẦN III: TRẮC NGHIỆM TRẢ LỜI NGẮN / ĐIỀN SỐ (SHORT_ANSWER) - CHUẨN GDPT 2018:
- Gồm các câu hỏi học sinh tự tính toán và điền đáp số ngắn. Không có 4 phương án A, B, C, D.
- BẮT BUỘC câu hỏi phải dẫn tới một kết quả số cụ thể (ví dụ: "Tính giá trị biểu thức...", "Tính diện tích...", "Tìm số nghiệm..."). Tuyệt đối không ra đề dạng mở.
- Trường type: "SHORT_ANSWER" (hoặc "sa").
- ĐÁP ÁN BẮT BUỘC (RÀNG BUỘC PHIẾU CHẤM GDPT 2018): Trường "correctAnswer" BẮT BUỘC là MỘT CHUỖI SỐ CÓ ĐỘ DÀI TỐI ĐA 4 KÝ TỰ (kể cả dấu âm '-' hoặc dấu phẩy/chấm thập phân), ví dụ: "22", "-3.5", "13", "102". Tuyệt đối không chứa chữ cái, đơn vị đo hay công thức dài dòng.
- Gồm: "question", "correctAnswer", "explanation" (nếu có).

4. PHẦN IV: TỰ LUẬN (ESSAY) - nếu có:
- Gồm các câu hỏi tự luận yêu cầu học sinh trình bày bài giải (Câu 1, Câu 2...).
- Trường type: "ESSAY" (hoặc "essay").
- Gồm: "question" (nội dung bài toán tự luận), "correctAnswer" hoặc "explanation" (lời giải / hướng dẫn chấm chi tiết kèm thang điểm nếu có).

QUY TẮC NHẬN DIỆN HÌNH VẼ / ĐỒ THỊ MINH HỌA (FIGURES / CHARTS / IMAGES):
+ Khi đọc tài liệu đề thi (PDF, Word, ảnh), nếu một câu hỏi có kèm theo hình vẽ, đồ thị hàm số (ví dụ: đồ thị tọa độ Oxy, hình không gian, hình tròn, biểu đồ...), BẮT BUỘC:
  - Đánh dấu thuộc tính: "hasFigure": true
  - Nếu đề bài có ghi chú hoặc có đường dẫn ảnh/mô tả đồ thị, ghi vào: "figureDescription": "Mô tả ngắn gọn hình vẽ (ví dụ: Đồ thị hàm số bậc ba trên hệ trục Oxy qua các điểm...)"
  - Nếu câu không có hình vẽ thì "hasFigure": false hoặc bỏ qua.

QUY TẮC BẮT BUỘC VỀ TOÁN HỌC VÀ CÔNG THỨC (LATEX):
+ TẤT CẢ các ký hiệu toán học, biến số (x, y, m, a, b...), biểu thức, phương trình, hệ phương trình BẮT BUỘC đặt trong cặp dấu $...$ (nội dòng) hoặc $$...$$ (khối riêng).
+ QUY TẮC ĐẶC BIỆT VỀ DẤU $:
  - Tuyệt đối không tự động gắn thêm dấu $ vào cuối chuỗi nếu chuỗi đã có cặp dấu $...$ hoàn chỉnh.
  - Tuyệt đối không để ký tự $ mồ côi (trailing dollar sign) ở cuối đáp án hoặc nằm sau dấu chấm câu (ví dụ: cấm viết ".$" hay ". $", phải cắt bỏ sạch sẽ thành ".").
+ HỌ NGHIỆM PHƯƠNG TRÌNH LƯỢNG GIÁC (\sin, \cos...): BẮT BUỘC sử dụng dấu móc vuông \left[ kết hợp \begin{aligned} ... \end{aligned}\right. thay vì dấu móc nhọn \begin{cases}. Cú pháp chuẩn KaTeX:
  $\left[\begin{aligned} x &= \alpha + k2\pi \\ x &= \pi - \alpha + k2\pi \end{aligned}\right. \quad (k \in \mathbb{Z})$
+ HỆ PHƯƠNG TRÌNH / HỆ BẤT PHƯƠNG TRÌNH: GIỮ NGUYÊN dấu móc nhọn \begin{cases} ... \end{cases} và BẮT BUỘC bọc trong cặp dấu $...$ hoặc $$...$$. Các dòng phương trình BẮT BUỘC cách nhau bởi dấu xuống dòng \\ (hai dấu gạch chéo ngược) rõ ràng. Ví dụ:
  $\begin{cases} 2x + y = 5 \\ x - y = 1 \end{cases}$
+ Tuyệt đối KHÔNG viết \\ x - y (một gạch) làm dính dòng phương trình, BẮT BUỘC phải là \\\\ x - y.
+ Sử dụng cú pháp LaTeX chuẩn: \\frac{a}{b}, \\sqrt{x}, \\sin x, \\cos x, \\tan x, \\cot x, \\pi, \\ge, \\le, \\in, \\Leftrightarrow, \\Rightarrow, \\Delta.
+ Giữ nguyên font tiếng Việt UTF-8 chuẩn cho đề bài và các phương án.

Trả về kết quả dưới dạng JSON có cấu trúc sau:
{
  "examTitle": "Tiêu đề đề thi nếu có hoặc null",
  "duration": 90, // Số phút làm bài tìm thấy trong đề thi (ví dụ: 15, 45, 50, 60, 90, 120), hoặc null nếu không có
  "questions": [
    {
      "id": 1,
      "type": "MULTIPLE_CHOICE", // "MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"
      "question": "Nội dung câu hỏi...",
      "hasFigure": false,
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": "A",
      "explanation": "Lời giải chi tiết nếu có..."
    }
  ]
}

LƯU Ý QUAN TRỌNG VỀ JSON: Đảm bảo tất cả các dấu gạch chéo ngược (\\) trong mã LaTeX phải được escape thành kép (\\\\) khi tạo chuỗi JSON (ví dụ: \\\\begin{cases} ... \\\\end{cases}, \\\\frac{a}{b}). Tuyệt đối chỉ trả về JSON hợp lệ, không kèm bất kỳ lời dẫn hay giải thích nào ngoài khối JSON.`;

    const userParts: any[] = [];
    if (files && files.length > 0) {
      const processed = await processFilesForAI(files);
      userParts.push(...processed);
    }
    if (rawText && typeof rawText === 'string' && rawText.trim()) {
      userParts.push({ text: `Nội dung tài liệu đề thi:\n${rawText}` });
    }
    userParts.push({ text: promptText });

    const response = await generateWithFallback(req, {
      contents: [
        {
          role: "user",
          parts: userParts
        }
      ],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    if (!response || !response.text) {
      throw new Error("Không nhận được phản hồi từ AI");
    }

    const aiCleanText = response.text.trim();
    let parsed: any[] = [];
    let detectedDuration: number | null = null;
    let detectedTitle: string | null = null;

    try {
      const p = safeJsonParse(aiCleanText);
      if (Array.isArray(p)) {
        parsed = p;
      } else if (p && typeof p === 'object') {
        parsed = Array.isArray(p.questions) ? p.questions : (Array.isArray(p.result) ? p.result : []);
        if (typeof p.duration === 'number' && p.duration > 0) {
          detectedDuration = p.duration;
        } else if (typeof p.duration === 'string') {
          const parsedMins = parseInt(p.duration, 10);
          if (!isNaN(parsedMins) && parsedMins > 0) detectedDuration = parsedMins;
        }
        if (typeof p.examTitle === 'string' && p.examTitle.trim()) {
          detectedTitle = p.examTitle.trim();
        }
      }
    } catch {
      const arrayMatch = aiCleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        try {
          parsed = safeJsonParse(arrayMatch[0], []);
        } catch {}
      }
    }

    // Helper regex to extract duration if AI missed it
    if (!detectedDuration && rawText && typeof rawText === 'string') {
      const headerSnippet = rawText.slice(0, 4000);
      const durRegexes = [
        /(?:thời\s*gian\s*làm\s*bài|thời\s*lượng\s*làm\s*bài)[\s:\-=–—]*(\d{1,3})\s*(?:phút|p\b|'|min)/i,
        /(?:thời\s*gian|thời\s*lượng)[\s:\-=–—]+(\d{1,3})\s*(?:phút|p\b|'|min)/i,
        /(?:thời\s*gian\s*làm\s*bài|thời\s*lượng\s*làm\s*bài)[\s]+(\d{1,3})\s*(?:phút|p\b|'|min)/i,
        /\(\s*(?:thời\s*gian\s*làm\s*bài[\s:\-]*)?(\d{1,3})\s*phút\s*(?:[,\-–—\(\)][^\)]*)?\)/i,
        /(?:time\s*allowed|duration|exam\s*duration)[\s:\-=–—]*(\d{1,3})\s*(?:minutes|mins|min|m\b)/i
      ];
      for (const reg of durRegexes) {
        const match = headerSnippet.match(reg);
        if (match && match[1]) {
          const m = parseInt(match[1], 10);
          if (m >= 5 && m <= 300) {
            detectedDuration = m;
            break;
          }
        }
      }
    }

    return { 
      questions: parsed,
      duration: detectedDuration,
      examTitle: detectedTitle
    };
  });
});

app.all("/api/exams/share", (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const examId = req.body?.customId ? String(req.body.customId).trim() : code;

    sharedExamsStore.set(examId, req.body);
    sharedExamsStore.set(examId.toLowerCase(), req.body);
    sharedExamsStore.set(examId.toUpperCase(), req.body);

    saveExamsToDisk();

    // Asynchronously push to persistent cloud KV store so Vercel lambdas & other devices can always find it
    try {
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(req.body));
      fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/jaku8xjm/${encodeURIComponent(examId.toUpperCase())}/${encodeURIComponent(compressed)}`, { method: 'POST' }).catch(() => {});
    } catch (kvErr) {}

    res.json({ examId });
  } catch (error) {
    res.status(500).json({ error: "Lỗi chia sẻ đề thi" });
  }
});

app.get("/api/exams/:id", async (req, res) => {
  const rawId = (req.params.id || '').trim();
  let data = sharedExamsStore.get(rawId) 
    || sharedExamsStore.get(rawId.toLowerCase()) 
    || sharedExamsStore.get(rawId.toUpperCase());

  if (!data) {
    loadExamsFromDisk();
    data = sharedExamsStore.get(rawId) 
      || sharedExamsStore.get(rawId.toLowerCase()) 
      || sharedExamsStore.get(rawId.toUpperCase());
  }

  // If not found in local memory/disk (e.g. fresh Vercel serverless cold-start), fetch from persistent cloud KV
  if (!data) {
    try {
      const kvRes = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/jaku8xjm/${encodeURIComponent(rawId.toUpperCase())}`, {
        signal: AbortSignal.timeout(5000)
      });
      if (kvRes.ok) {
        const val = await kvRes.json();
        if (val && typeof val === 'string') {
          const decompressed = LZString.decompressFromEncodedURIComponent(val);
          if (decompressed) {
            data = JSON.parse(decompressed);
            sharedExamsStore.set(rawId, data);
            sharedExamsStore.set(rawId.toUpperCase(), data);
            saveExamsToDisk();
          }
        }
      }
    } catch (kvFetchErr) {
      console.warn("Cloud KV fetch fallback error:", kvFetchErr);
    }
  }

  if (data) {
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(data);
  } else {
    res.status(404).json({ error: "Không tìm thấy đề thi. Mã đề có thể không chính xác hoặc đã hết hạn." });
  }
});

// Clean link return without external shorteners that Zalo blocks
app.post("/api/shorten", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing url" });
    // NEVER return tinyurl.com or foreign domains that Zalo blocks!
    res.json({ shortUrl: url });
  } catch (error: any) {
    res.json({ shortUrl: req.body?.url || "" });
  }
});

// Adding back chat route
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt, context } = req.body;
    let fullPrompt = prompt;
    if (context) {
      fullPrompt = `Ngữ cảnh: ${JSON.stringify(context)}\n\nCâu hỏi: ${prompt}`;
    }
    const response = await generateWithFallback(req, {
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
    });
    res.json({ text: response.text });
  } catch (error: any) {
    return handleAiError(error, req, res);
  }
});


app.post('/api/export-docx', async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) {
      return res.status(400).json({ error: 'Missing HTML content' });
    }
    
    // Remove any data:image/svg images to prevent HTMLtoDOCX crashing
    let cleanHtml = html.replace(/<img[^>]*src=["']data:image\/svg[^"']*["'][^>]*>/gi, '');
    
    // Normalize and style math characters with Cambria Math font to prevent empty boxes in Office
    cleanHtml = cleanHtml
      .replace(/\\mathbb\{R\}|\b\\mathbb\s*R\b/g, 'ℝ')
      .replace(/\\mathbb\{N\}|\b\\mathbb\s*N\b/g, 'ℕ')
      .replace(/\\mathbb\{Z\}|\b\\mathbb\s*Z\b/g, 'ℤ')
      .replace(/\\mathbb\{Q\}|\b\\mathbb\s*Q\b/g, 'ℚ')
      .replace(/\\mathbb\{C\}|\b\\mathbb\s*C\b/g, 'ℂ')
      .replace(/\\forall\b/g, '∀')
      .replace(/\\exists\b/g, '∃')
      .replace(/\\in\b/g, '∈')
      .replace(/\\notin\b/g, '∉')
      .replace(/\\cap\b/g, '∩')
      .replace(/\\cup\b/g, '∪')
      .replace(
        /([\u2100-\u214F\u2190-\u21FF\u2200-\u22FF\u2300-\u23FF\u25A0-\u25FF\u27C0-\u27EF\u27F0-\u27FF\u2900-\u297F\u2980-\u29FF\u2A00-\u2AFF\u2B00-\u2BFF\u00B1\u00D7\u00F7\u00AC\u00B7]|[\uD835][\uDC00-\uDFFF])/g,
        '<span style="font-family: \'Cambria Math\', \'Segoe UI Symbol\';">$1</span>'
      );
    
    // Convert inch to twips (1 inch = 1440 twips)
    // 2cm is ~0.787 inches = ~1134 twips
    const fileBuffer = await HTMLtoDOCX(cleanHtml, null, {
      orientation: 'portrait',
      margins: { top: 1134, right: 1134, bottom: 1134, left: 1134, header: 720, footer: 720, gutter: 0 },
      font: 'Times New Roman',
      fontSize: 26, // 13pt (half-points)
      size: { width: 11906, height: 16838 }, // A4
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="document.docx"');
    res.send(fileBuffer);
  } catch (error) {
    console.error('DOCX Export error:', error);
    res.status(500).json({ error: 'Failed to generate Word document' });
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint không tồn tại." });
});

app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof SyntaxError && (err as any).status === 400 && "body" in err) {
    return res.status(400).json({ error: "Dữ liệu JSON không hợp lệ." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Dữ liệu gửi lên quá lớn. Vui lòng giảm dung lượng file (tối đa 50MB)." });
  }
  console.error("Express Error:", err);
  res.status(err.status || 500).json({ error: err.message || "Đã xảy ra lỗi hệ thống." });
});

if (!process.env.VERCEL) {
  const PORT = 3000;
  if (process.env.NODE_ENV !== "production") {
    import("vite").then(async ({ createServer }) => {
      const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => console.log("Server running on port " + PORT));
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, "index.html"));
    });
    app.listen(PORT, "0.0.0.0", () => console.log("Server running on port " + PORT));
  }
}
export default app;


