export interface SampleQuestion {
  id: number;
  type: "mc" | "tf" | "sa" | "essay";
  level: string;
  isRealWorld?: boolean;
  topic?: string;
  subtopic?: string;
  content: string;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  tfStatements?: { statement: string; correct: boolean }[];
  explanation?: string;
}

export const SAMPLE_MATH_EXAM_NAME = "ĐỀ KIỂM TRA ĐỊNH KỲ TOÁN HỌC - KHUNG CHUẨN 2025";
export const SAMPLE_MATH_DURATION = 90;

export const SAMPLE_MATH_QUESTIONS: SampleQuestion[] = [
  // PHẦN I: TRẮC NGHIỆM NHIỀU LỰA CHỌN (12 CÂU)
  {
    id: 1,
    type: "mc",
    level: "Nhận biết",
    topic: "Hàm số và Đồ thị",
    subtopic: "Đồng biến và nghịch biến",
    content: "Cho hàm số $y = f(x)$ có bảng xét dấu đạo hàm như sau:\n\n| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |\n|---|---|---|---|---|---|---|---|\n| $f'(x)$ | | $+$ | $0$ | $-$ | $0$ | $+$ | |\n\nHàm số đã cho đồng biến trên khoảng nào dưới đây?",
    options: [
      "$(-\\infty; -1)$",
      "$(-1; 2)$",
      "$(-\\infty; 2)$",
      "$(-1; +\\infty)$"
    ],
    correctOptionIndex: 0,
    explanation: "Dựa vào bảng xét dấu, $f'(x) > 0$ trên các khoảng $(-\\infty; -1)$ và $(2; +\\infty)$. Do đó hàm số đồng biến trên khoảng $(-\\infty; -1)$."
  },
  {
    id: 2,
    type: "mc",
    level: "Nhận biết",
    topic: "Hàm số và Đồ thị",
    subtopic: "Cực trị hàm số",
    content: "Điểm cực tiểu của đồ thị hàm số $y = x^3 - 3x + 2$ là điểm nào dưới đây?",
    options: [
      "$(1; 0)$",
      "$(-1; 4)$",
      "$x = 1$",
      "$y = 0$"
    ],
    correctOptionIndex: 0,
    explanation: "Ta có $y' = 3x^2 - 3 = 0 \\Leftrightarrow x = \\pm 1$. Vì $y''(1) = 6 > 0$ nên $x = 1$ là điểm cực tiểu của hàm số, khi đó $y(1) = 1 - 3 + 2 = 0$. Vậy điểm cực tiểu của đồ thị là $(1; 0)$."
  },
  {
    id: 3,
    type: "mc",
    level: "Thông hiểu",
    topic: "Hàm số và Đồ thị",
    subtopic: "Tiệm cận đồ thị hàm số",
    content: "Đường tiệm cận đứng của đồ thị hàm số $y = \\frac{2x - 1}{x + 1}$ có phương trình là:",
    options: [
      "$x = -1$",
      "$x = 2$",
      "$y = 2$",
      "$y = -1$"
    ],
    correctOptionIndex: 0,
    explanation: "Ta có $\\lim_{x \\to (-1)^+} \\frac{2x - 1}{x + 1} = -\\infty$ nên đường thẳng $x = -1$ là tiệm cận đứng của đồ thị hàm số."
  },
  {
    id: 4,
    type: "mc",
    level: "Thông hiểu",
    topic: "Mũ và Logarit",
    subtopic: "Nghiệm phương trình mũ",
    content: "Tập nghiệm của phương trình $2^{2x - 1} = 8$ là:",
    options: [
      "$\\{2\\}$",
      "$\\{1\\}$",
      "$\\{\\frac{7}{2}\\}$",
      "$\\{4\\}$"
    ],
    correctOptionIndex: 0,
    explanation: "Phương trình tương đương với $2^{2x - 1} = 2^3 \\Leftrightarrow 2x - 1 = 3 \\Leftrightarrow 2x = 4 \\Leftrightarrow x = 2$."
  },
  {
    id: 5,
    type: "mc",
    level: "Thông hiểu",
    topic: "Mũ và Logarit",
    subtopic: "Tập xác định logarit",
    content: "Tập xác định của hàm số $y = \\log_3 (x - 2)$ là:",
    options: [
      "$(2; +\\infty)$",
      "$[2; +\\infty)$",
      "$(-\\infty; 2)$",
      "$\\mathbb{R} \\setminus \\{2\\}$"
    ],
    correctOptionIndex: 0,
    explanation: "Điều kiện xác định của hàm số: $x - 2 > 0 \\Leftrightarrow x > 2$. Vậy tập xác định là $D = (2; +\\infty)$."
  },
  {
    id: 6,
    type: "mc",
    level: "Nhận biết",
    topic: "Nguyên hàm - Tích phân",
    subtopic: "Công thức nguyên hàm",
    content: "Họ tất cả các nguyên hàm của hàm số $f(x) = \\cos x + 2x$ là:",
    options: [
      "$\\sin x + x^2 + C$",
      "$-\\sin x + x^2 + C$",
      "$\\sin x + 2 + C$",
      "$-\\sin x + 2 + C$"
    ],
    correctOptionIndex: 0,
    explanation: "Ta có $\\int (\\cos x + 2x) dx = \\sin x + x^2 + C$."
  },
  {
    id: 7,
    type: "mc",
    level: "Thông hiểu",
    topic: "Nguyên hàm - Tích phân",
    subtopic: "Tính chất tích phân",
    content: "Biết $\\int_1^2 f(x) dx = 3$ và $\\int_1^2 g(x) dx = -2$. Khi đó $\\int_1^2 [2f(x) + g(x)] dx$ bằng:",
    options: [
      "$4$",
      "$1$",
      "$8$",
      "$-1$"
    ],
    correctOptionIndex: 0,
    explanation: "Ta có $\\int_1^2 [2f(x) + g(x)] dx = 2 \\int_1^2 f(x) dx + \\int_1^2 g(x) dx = 2 \\cdot 3 + (-2) = 4$."
  },
  {
    id: 8,
    type: "mc",
    level: "Nhận biết",
    topic: "Hình học Oxyz",
    subtopic: "Tọa độ vectơ",
    content: "Trong không gian $Oxyz$, cho hai điểm $A(1; 2; -1)$ và $B(2; 0; 1)$. Tọa độ của vectơ $\\vec{AB}$ là:",
    options: [
      "$(1; -2; 2)$",
      "$(3; 2; 0)$",
      "$(-1; 2; -2)$",
      "$(\\frac{3}{2}; 1; 0)$"
    ],
    correctOptionIndex: 0,
    explanation: "Ta có $\\vec{AB} = (x_B - x_A; y_B - y_A; z_B - z_A) = (2 - 1; 0 - 2; 1 - (-1)) = (1; -2; 2)$."
  },
  {
    id: 9,
    type: "mc",
    level: "Nhận biết",
    topic: "Hình học Oxyz",
    subtopic: "Phương trình mặt cầu",
    content: "Trong không gian $Oxyz$, mặt cầu $(S): (x - 1)^2 + (y + 2)^2 + z^2 = 9$ có tâm $I$ và bán kính $R$ lần lượt là:",
    options: [
      "$I(1; -2; 0)$, $R = 3$",
      "$I(-1; 2; 0)$, $R = 3$",
      "$I(1; -2; 0)$, $R = 9$",
      "$I(-1; 2; 0)$, $R = 9$"
    ],
    correctOptionIndex: 0,
    explanation: "Từ phương trình chuẩn $(x - a)^2 + (y - b)^2 + (z - c)^2 = R^2$, ta có tâm $I(1; -2; 0)$ và bán kính $R = \\sqrt{9} = 3$."
  },
  {
    id: 10,
    type: "mc",
    level: "Thông hiểu",
    topic: "Hình học Oxyz",
    subtopic: "Vectơ pháp tuyến mặt phẳng",
    content: "Trong không gian $Oxyz$, vectơ nào sau đây là một vectơ pháp tuyến của mặt phẳng $(\\alpha): 2x - y + 3z - 1 = 0$?",
    options: [
      "$\\vec{n} = (2; -1; 3)$",
      "$\\vec{n} = (2; 1; 3)$",
      "$\\vec{n} = (2; -1; -1)$",
      "$\\vec{n} = (-2; -1; 3)$"
    ],
    correctOptionIndex: 0,
    explanation: "Mặt phẳng có phương trình $Ax + By + Cz + D = 0$ có một VTPT là $\\vec{n} = (A; B; C) = (2; -1; 3)$."
  },
  {
    id: 11,
    type: "mc",
    level: "Thông hiểu",
    topic: "Thống kê & Xác suất",
    subtopic: "Quy tắc nhân xác suất",
    content: "Gieo một con xúc xắc cân đối và đồng chất hai lần. Xác suất để tổng số chấm xuất hiện trong hai lần gieo bằng $7$ là:",
    options: [
      "$\\frac{1}{6}$",
      "$\\frac{5}{36}$",
      "$\\frac{7}{36}$",
      "$\\frac{1}{12}$"
    ],
    correctOptionIndex: 0,
    explanation: "Số phần tử không gian mẫu $n(\\Omega) = 6 \\times 6 = 36$. Các cặp có tổng bằng $7$ là $(1,6), (2,5), (3,4), (4,3), (5,2), (6,1)$ gồm $6$ biến cố thuận lợi. Do đó $P = \\frac{6}{36} = \\frac{1}{6}$."
  },
  {
    id: 12,
    type: "mc",
    level: "Vận dụng",
    topic: "Hàm số và Đồ thị",
    subtopic: "Giá trị lớn nhất và nhỏ nhất",
    content: "Giá trị lớn nhất của hàm số $f(x) = x^4 - 2x^2 + 3$ trên đoạn $[0; 2]$ bằng:",
    options: [
      "$11$",
      "$3$",
      "$2$",
      "$9$"
    ],
    correctOptionIndex: 0,
    explanation: "Ta có $f'(x) = 4x^3 - 4x = 4x(x^2 - 1) = 0 \\Leftrightarrow x = 0, x = 1, x = -1$. Trên $[0; 2]$, ta xét $x = 0, x = 1, x = 2$. Ta có: $f(0) = 3$, $f(1) = 2$, $f(2) = 16 - 8 + 3 = 11$. Vậy $\\max_{[0; 2]} f(x) = 11$ tại $x = 2$."
  },

  // PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI (2 CÂU, MỖI CÂU 4 Ý)
  {
    id: 13,
    type: "tf",
    level: "Thông hiểu",
    topic: "Hàm số và Đồ thị",
    subtopic: "Khảo sát hàm phân thức hữu tỉ",
    content: "Cho hàm số $y = f(x) = \\frac{x + 2}{x - 1}$. Xét tính đúng/sai của các khẳng định sau:",
    tfStatements: [
      { statement: "Tập xác định của hàm số là $D = \\mathbb{R} \\setminus \\{1\\}$.", correct: true },
      { statement: "Đạo hàm của hàm số là $y' = \\frac{-3}{(x - 1)^2}$ với mọi $x \\ne 1$.", correct: true },
      { statement: "Hàm số đồng biến trên từng khoảng xác định $(-\\infty; 1)$ và $(1; +\\infty)$.", correct: false },
      { statement: "Giao điểm của hai đường tiệm cận của đồ thị hàm số là điểm $I(1; 1)$.", correct: true }
    ],
    explanation: "a) Đúng vì mẫu thức $x - 1 \\ne 0 \\Leftrightarrow x \\ne 1$.\nb) Đúng vì $y' = \\frac{1 \\cdot (-1) - 2 \\cdot 1}{(x - 1)^2} = \\frac{-3}{(x - 1)^2} < 0$.\nc) Sai vì $y' < 0$ nên hàm số nghịch biến trên từng khoảng xác định.\nd) Đúng vì tiệm cận đứng là $x = 1$, tiệm cận ngang là $y = 1$, giao điểm là $I(1; 1)$."
  },
  {
    id: 14,
    type: "tf",
    level: "Vận dụng",
    topic: "Hình học Oxyz",
    subtopic: "Đường thẳng và mặt phẳng",
    content: "Trong không gian $Oxyz$, cho ba điểm $A(1; 0; 0)$, $B(0; 2; 0)$, $C(0; 0; 3)$ và mặt phẳng $(P): x + 2y + 3z - 6 = 0$. Xét tính đúng/sai của các khẳng định sau:",
    tfStatements: [
      { statement: "Phương trình mặt phẳng $(ABC)$ theo đoạn chắn là $\\frac{x}{1} + \\frac{y}{2} + \\frac{z}{3} = 1$.", correct: true },
      { statement: "Mặt phẳng $(ABC)$ song song với mặt phẳng $(P)$.", correct: false },
      { statement: "Khoảng cách từ gốc tọa độ $O$ đến mặt phẳng $(ABC)$ bằng $\\frac{6}{7}$.", correct: true },
      { statement: "Điểm $M(1; 1; 1)$ thuộc cả hai mặt phẳng $(ABC)$ và $(P)$.", correct: false }
    ],
    explanation: "a) Đúng: Mặt phẳng đi qua các điểm trên các trục tọa độ có dạng đoạn chắn $\\frac{x}{1} + \\frac{y}{2} + \\frac{z}{3} = 1 \\Leftrightarrow 6x + 3y + 2z - 6 = 0$.\nb) Sai: VTPT của $(ABC)$ là $\\vec{n}_1 = (6; 3; 2)$, còn VTPT của $(P)$ là $\\vec{n}_2 = (1; 2; 3)$ không cùng phương.\nc) Đúng: $d(O, (ABC)) = \\frac{|-6|}{\\sqrt{6^2 + 3^2 + 2^2}} = \\frac{6}{\\sqrt{49}} = \\frac{6}{7}$.\nd) Sai: Thay $M(1;1;1)$ vào $(ABC)$: $6(1)+3(1)+2(1)-6 = 5 \\ne 0$, nên $M \\notin (ABC)$."
  },

  // PHẦN III: TRẢ LỜI NGẮN (4 CÂU)
  {
    id: 15,
    type: "sa",
    level: "Thông hiểu",
    topic: "Nguyên hàm - Tích phân",
    subtopic: "Tính tích phân xác định",
    content: "Tính giá trị của tích phân $I = \\int_0^1 (3x^2 + 2x) dx$.",
    correctAnswer: "2",
    explanation: "Ta có nguyên hàm $F(x) = x^3 + x^2$. Khi đó $I = F(1) - F(0) = (1^3 + 1^2) - 0 = 2$."
  },
  {
    id: 16,
    type: "sa",
    level: "Vận dụng",
    topic: "Hình học Oxyz",
    subtopic: "Khoảng cách từ điểm đến mặt phẳng",
    content: "Trong không gian $Oxyz$, tính khoảng cách từ điểm $M(1; 2; 3)$ đến mặt phẳng $(P): 2x - 2y + z + 5 = 0$.",
    correctAnswer: "2",
    explanation: "Áp dụng công thức khoảng cách:\n$$d(M, (P)) = \\frac{|2(1) - 2(2) + 1(3) + 5|}{\\sqrt{2^2 + (-2)^2 + 1^2}} = \\frac{|2 - 4 + 3 + 5|}{\\sqrt{9}} = \\frac{6}{3} = 2.$$"
  },
  {
    id: 17,
    type: "sa",
    level: "Vận dụng",
    topic: "Hàm số và Đồ thị",
    subtopic: "Giá trị nhỏ nhất",
    content: "Tìm giá trị nhỏ nhất của hàm số $y = x + \\frac{4}{x}$ trên khoảng $(0; +\\infty)$.",
    correctAnswer: "4",
    explanation: "Áp dụng bất đẳng thức Cauchy cho hai số dương $x$ và $\\frac{4}{x}$:\n$$x + \\frac{4}{x} \\ge 2 \\sqrt{x \\cdot \\frac{4}{x}} = 2 \\cdot 2 = 4.$$\nDấu đẳng thức xảy ra khi $x = \\frac{4}{x} \\Leftrightarrow x^2 = 4 \\Leftrightarrow x = 2$ (thỏa mãn $x > 0$). Vậy giá trị nhỏ nhất bằng $4$."
  },
  {
    id: 18,
    type: "sa",
    level: "Vận dụng cao",
    isRealWorld: true,
    topic: "Thống kê & Xác suất",
    subtopic: "Biến cố độc lập",
    content: "Một xạ thủ bắn độc lập $3$ viên đạn vào một bia. Xác suất bắn trúng ở mỗi lần bắn là $p = 0{,}8$. Tính xác suất để có đúng $2$ viên đạn trúng bia.",
    correctAnswer: "0.384",
    explanation: "Xác suất bắn trúng mỗi lần là $p = 0{,}8$, xác suất bắn trượt là $q = 1 - 0{,}8 = 0{,}2$. Xác suất để có đúng $2$ viên trúng bia trong $3$ lần bắn độc lập là:\n$$P = C_3^2 \\cdot (0{,}8)^2 \\cdot (0{,}2)^1 = 3 \\cdot 0{,}64 \\cdot 0{,}2 = 0{,}384.$$"
  },

  // PHẦN IV: TỰ LUẬN (2 CÂU)
  {
    id: 19,
    type: "essay",
    level: "Vận dụng",
    topic: "Nguyên hàm - Tích phân",
    subtopic: "Ứng dụng hình học của tích phân",
    content: "Tính diện tích hình phẳng giới hạn bởi đồ thị hàm số $y = -x^2 + 2x$ và trục hoành $Ox$.",
    correctAnswer: "Diện tích $S = \\frac{4}{3}$",
    explanation: "Phương trình hoành độ giao điểm của parabol và trục hoành:\n$$-x^2 + 2x = 0 \\Leftrightarrow x(-x + 2) = 0 \\Leftrightarrow x = 0 \\text{ hoặc } x = 2.$$\n\nVì trên đoạn $[0; 2]$, ta có $-x^2 + 2x \\ge 0$, nên diện tích hình phẳng là:\n$$S = \\int_0^2 (-x^2 + 2x) dx = \\left[ -\\frac{x^3}{3} + x^2 \\right]_0^2 = \\left( -\\frac{8}{3} + 4 \\right) - 0 = \\frac{4}{3} \\text{ (đvdt)}.$$"
  },
  {
    id: 20,
    type: "essay",
    level: "Vận dụng cao",
    isRealWorld: true,
    topic: "Hàm số và Đồ thị",
    subtopic: "Bài toán thực tế tối ưu hóa",
    content: "Một người làm vườn muốn rào một khu đất hình chữ nhật có diện tích $200\\text{ m}^2$ sát một bờ tường thẳng (bờ tường không cần rào). Ba cạnh còn lại được rào bằng lưới thép. Tìm chiều dài và chiều rộng của khu đất để tổng chiều dài hàng rào lưới thép là ngắn nhất. Tính chiều dài ngắn nhất đó.",
    correctAnswer: "Chiều rộng $x = 10\\text{ m}$, chiều dài $y = 20\\text{ m}$, chiều dài hàng rào ngắn nhất là $40\\text{ m}$.",
    explanation: "Gọi $x$ (m) là chiều rộng của khu đất (hai cạnh vuông góc với bờ tường), điều kiện $x > 0$.\nKhi đó chiều dài của khu đất (cạnh song song với bờ tường) là $y = \\frac{200}{x}$ (m).\n\nTổng chiều dài hàng rào lưới thép cần dùng là:\n$$L(x) = 2x + y = 2x + \\frac{200}{x} \\quad (x > 0).$$\n\nCách 1: Áp dụng bất đẳng thức Cauchy:\n$$L(x) = 2x + \\frac{200}{x} \\ge 2 \\sqrt{2x \\cdot \\frac{200}{x}} = 2 \\sqrt{400} = 40.$$\nDấu đẳng thức xảy ra khi:\n$$2x = \\frac{200}{x} \\Leftrightarrow 2x^2 = 200 \\Leftrightarrow x^2 = 100 \\Leftrightarrow x = 10 \\text{ (vì } x > 0\\text{)}.$$\nKhi đó $y = \\frac{200}{10} = 20\\text{ m}$.\n\nKết luận: Tổng chiều dài hàng rào ngắn nhất là $40\\text{ m}$ khi chiều rộng là $10\\text{ m}$ và chiều dài là $20\\text{ m}$."
  }
];
