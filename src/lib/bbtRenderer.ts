/**
 * BẢNG BIẾN THIÊN (BBT) CHUẨN ĐỒ HỌA SÁCH GIÁO KHOA GDPT MỚI
 * - Tự động nhận diện và chuyển đổi mọi Bảng biến thiên (từ Markdown table, TikZ tkz-tab, mã BBT)
 * - Khung bảng: 1 vách dọc phân cách nhãn (x, y', y), 2 vách ngang (dưới hàng x và dưới hàng y')
 * - Hàng y: Canvas SVG vẽ mũi tên liền mạch, dài thanh thoát, không chia ô HTML
 * - Vạch || tiệm cận đứng kéo dài từ hàng y' xuống tận đáy hàng y
 * - Vùng ngoài tập xác định được tô họa tiết gạch chéo //
 */

import { BBTData, BBTPoint, BBTInterval } from '../components/math-tools/VariationTableGenerator';

export function cleanMathText(str?: string): string {
  if (!str) return '';
  return str
    .replace(/\\infty/g, '∞')
    .replace(/\+\\infty/g, '+∞')
    .replace(/-\\infty/g, '-∞')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\mathbb\{R\}/g, 'ℝ')
    .replace(/_([a-zA-Z0-9])/g, '$1')
    .replace(/\$/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

/**
 * Tạo chuỗi SVG thuần túy của Bảng biến thiên chuẩn SGK
 */
export function generateBbtSvg(data: BBTData): string {
  const { points, intervals, functionName, domainNote } = data;
  const numPoints = points.length;

  const leftLabelWidth = 72;
  const colSpacing = Math.max(100, Math.min(160, Math.round(520 / Math.max(numPoints - 1, 1))));
  const contentWidth = Math.max(480, (numPoints - 1) * colSpacing + 80);
  const totalWidth = leftLabelWidth + contentWidth;

  const rowXHeight = 40;
  const rowYPrimeHeight = 40;
  const rowYHeight = 135;
  const totalHeight = rowXHeight + rowYPrimeHeight + rowYHeight;

  const paddingX = 40;
  const usableWidth = contentWidth - 2 * paddingX;
  const stepX = numPoints > 1 ? usableWidth / (numPoints - 1) : usableWidth;

  const getPointX = (index: number) => leftLabelWidth + paddingX + index * stepX;

  const getYPosValue = (pos?: 'top' | 'bottom' | 'middle') => {
    const yStart = rowXHeight + rowYPrimeHeight;
    if (pos === 'top') return yStart + 24;
    if (pos === 'bottom') return yStart + rowYHeight - 16;
    return yStart + rowYHeight / 2 + 4;
  };

  const svgParts: string[] = [];

  // 1. DEFS: Arrow markers and hatch patterns
  svgParts.push(`<defs>
    <marker id="bbt-arrow-marker" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e40af" />
    </marker>
    <pattern id="bbt-hatch-pattern" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="10" stroke="#94a3b8" stroke-width="1.2" />
    </pattern>
  </defs>`);

  // 2. KHUNG NGOÀI & VÁCH NGĂN CHUẨN SGK (1 vách dọc, 2 vách ngang)
  svgParts.push(`<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#ffffff" stroke="#1e293b" stroke-width="1.6" rx="6" />`);
  // Vách dọc duy nhất
  svgParts.push(`<line x1="${leftLabelWidth}" y1="0" x2="${leftLabelWidth}" y2="${totalHeight}" stroke="#1e293b" stroke-width="1.5" />`);
  // Vách ngang 1 (dưới hàng x)
  svgParts.push(`<line x1="0" y1="${rowXHeight}" x2="${totalWidth}" y2="${rowXHeight}" stroke="#1e293b" stroke-width="1.5" />`);
  // Vách ngang 2 (dưới hàng y')
  svgParts.push(`<line x1="0" y1="${rowXHeight + rowYPrimeHeight}" x2="${totalWidth}" y2="${rowXHeight + rowYPrimeHeight}" stroke="#1e293b" stroke-width="1.5" />`);

  // 3. CỘT NHÃN TRÁI: x, y', y
  svgParts.push(`<text x="${leftLabelWidth / 2}" y="26" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="18" font-style="italic" font-weight="bold" fill="#0f172a">x</text>`);
  svgParts.push(`<text x="${leftLabelWidth / 2}" y="${rowXHeight + 26}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="18" font-style="italic" font-weight="bold" fill="#0f172a">y'</text>`);
  svgParts.push(`<text x="${leftLabelWidth / 2}" y="${rowXHeight + rowYPrimeHeight + rowYHeight / 2 + 6}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="18" font-style="italic" font-weight="bold" fill="#0f172a">y</text>`);

  // 4. HÀNG X: CÁC ĐIỂM MỐC
  points.forEach((pt, idx) => {
    const xPos = getPointX(idx);
    svgParts.push(`<text x="${xPos}" y="26" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="16" font-weight="bold" fill="#0f172a">${cleanMathText(pt.x)}</text>`);
  });

  // 5. MIỀN NGOÀI TẬP XÁC ĐỊNH (GẠCH CHÉO // XUYÊN SUỐT)
  intervals.forEach((inter, idx) => {
    if (!inter.isExcludedDomain) return;
    const xLeft = getPointX(idx);
    const xRight = getPointX(idx + 1);
    svgParts.push(`<rect x="${xLeft}" y="${rowXHeight}" width="${xRight - xLeft}" height="${rowYPrimeHeight + rowYHeight}" fill="url(#bbt-hatch-pattern)" stroke="#64748b" stroke-width="0.5" />`);
  });

  // 6. HÀNG Y': DẤU (+, -)
  intervals.forEach((inter, idx) => {
    if (inter.isExcludedDomain || !inter.sign) return;
    const midX = (getPointX(idx) + getPointX(idx + 1)) / 2;
    svgParts.push(`<text x="${midX}" y="${rowXHeight + 27}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="20" font-weight="bold" fill="#1e40af">${inter.sign}</text>`);
  });

  // 7. HÀNG Y': ĐIỂM 0 HOẶC VẠCH ||
  points.forEach((pt, idx) => {
    const xPos = getPointX(idx);

    if (pt.isAsymptote) {
      // Tiệm cận đứng: kéo dài từ hàng y' xuống tận đáy hàng y
      svgParts.push(`<line x1="${xPos - 2}" y1="${rowXHeight}" x2="${xPos - 2}" y2="${totalHeight}" stroke="#dc2626" stroke-width="1.5" />`);
      svgParts.push(`<line x1="${xPos + 2}" y1="${rowXHeight}" x2="${xPos + 2}" y2="${totalHeight}" stroke="#dc2626" stroke-width="1.5" />`);
    } else if (pt.isDerivativeUndefinedOnly) {
      // Chỉ y' không xác định (ví dụ biên hàm căn thức) -> vạch || chỉ ở hàng y'
      svgParts.push(`<line x1="${xPos - 2}" y1="${rowXHeight}" x2="${xPos - 2}" y2="${rowXHeight + rowYPrimeHeight}" stroke="#dc2626" stroke-width="1.4" />`);
      svgParts.push(`<line x1="${xPos + 2}" y1="${rowXHeight}" x2="${xPos + 2}" y2="${rowXHeight + rowYPrimeHeight}" stroke="#dc2626" stroke-width="1.4" />`);
    } else if (pt.yPrime === '0') {
      svgParts.push(`<text x="${xPos}" y="${rowXHeight + 26}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="16" fill="#334155">0</text>`);
    }
  });

  // 8. HÀNG Y: MŨI TÊN BIẾN THIÊN
  for (let i = 0; i < numPoints - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const inter = intervals[i];

    if (inter?.isExcludedDomain) continue;

    const startX = getPointX(i);
    const endX = getPointX(i + 1);

    const y1 = getYPosValue(p1.isAsymptote ? p1.yRightPosition || 'bottom' : p1.yPosition);
    const x1 = p1.isAsymptote ? startX + 16 : startX + 18;

    const y2 = getYPosValue(p2.isAsymptote ? p2.yLeftPosition || 'top' : p2.yPosition);
    const x2 = p2.isAsymptote ? endX - 16 : endX - 18;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);

    if (dist > 28) {
      const margin = 10;
      const nx = dx / dist;
      const ny = dy / dist;
      const sx = (x1 + nx * margin).toFixed(1);
      const sy = (y1 + ny * margin - 4).toFixed(1);
      const ex = (x2 - nx * margin).toFixed(1);
      const ey = (y2 - ny * margin - 4).toFixed(1);

      svgParts.push(`<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="#1d4ed8" stroke-width="1.8" marker-end="url(#bbt-arrow-marker)" stroke-linecap="round" />`);
    }
  }

  // 9. HÀNG Y: CÁC GIÁ TRỊ ĐẦU MÚT MŨI TÊN
  points.forEach((pt, idx) => {
    const xPos = getPointX(idx);

    if (pt.isAsymptote) {
      const yLeft = getYPosValue(pt.yLeftPosition || 'top');
      const yRight = getYPosValue(pt.yRightPosition || 'bottom');

      if (pt.yLeftVal) {
        svgParts.push(`<text x="${xPos - 12}" y="${yLeft}" text-anchor="end" font-family="'Times New Roman', Times, serif" font-size="15" font-weight="bold" fill="#0f172a">${cleanMathText(pt.yLeftVal)}</text>`);
      }
      if (pt.yRightVal) {
        svgParts.push(`<text x="${xPos + 12}" y="${yRight}" text-anchor="start" font-family="'Times New Roman', Times, serif" font-size="15" font-weight="bold" fill="#0f172a">${cleanMathText(pt.yRightVal)}</text>`);
      }
    } else if (pt.yVal) {
      const yCoord = getYPosValue(pt.yPosition);
      svgParts.push(`<text x="${xPos}" y="${yCoord}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="15" font-weight="bold" fill="#0f172a">${cleanMathText(pt.yVal)}</text>`);
    }
  });

  return `<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" class="max-w-full h-auto mx-auto my-3 drop-shadow-sm bg-white rounded-lg">
    ${svgParts.join('\n    ')}
  </svg>`;
}

/**
 * Trích xuất và phân tích một Markdown Table thành cấu trúc BBTData
 * Hỗ trợ các định dạng Markdown BBT phổ biến do AI sinh ra
 */
export function parseMarkdownBbtTable(tableMarkdown: string): BBTData | null {
  try {
    const lines = tableMarkdown
      .trim()
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('|') && l.endsWith('|') && !l.includes('---'));

    if (lines.length < 2 || lines.length > 4) return null;

    const rowCells = lines.map(line => {
      return line
        .slice(1, -1)
        .split(/(?<!\\)\|/)
        .map(cell => cell.trim());
    });

    // Kiểm tra hàng 1: bắt đầu bằng x
    const row1Header = cleanMathText(rowCells[0][0]).toLowerCase();
    if (row1Header !== 'x' && row1Header !== 't') return null;

    // Kiểm tra hàng 2: y' hoặc f'(x) hoặc y
    const row2Header = cleanMathText(rowCells[1][0]).toLowerCase();
    const hasDerivative = row2Header.includes("y'") || row2Header.includes("f'") || row2Header.includes("g'");

    let xCells = rowCells[0].slice(1);
    let yPrimeCells: string[] = [];
    let yCells: string[] = [];

    if (hasDerivative && rowCells.length >= 3) {
      yPrimeCells = rowCells[1].slice(1);
      yCells = rowCells[2].slice(1);
    } else {
      // 2-row table (ví dụ Toán 10)
      yCells = rowCells[1].slice(1);
    }

    // Lọc các mốc x hợp lệ
    const points: BBTPoint[] = [];
    const intervals: BBTInterval[] = [];

    // Danh sách các cột có giá trị mốc x
    const landmarkCols: number[] = [];
    for (let c = 0; c < xCells.length; c++) {
      const val = xCells[c].replace(/\$/g, '').trim();
      if (val && val !== '') {
        landmarkCols.push(c);
      }
    }

    if (landmarkCols.length < 2) return null;

    for (let i = 0; i < landmarkCols.length; i++) {
      const c = landmarkCols[i];
      const xVal = xCells[c].trim();
      const yP = yPrimeCells[c] ? yPrimeCells[c].replace(/\$/g, '').trim() : undefined;
      const yValRaw = yCells[c] ? yCells[c].replace(/\$/g, '').trim() : '';

      const isAsym = (yP && (yP === '||' || yP.includes('||') || yP.includes('\\|') || yP === 'd')) || yValRaw.includes('||') || yValRaw.includes('\\|');

      let yLeftVal: string | undefined;
      let yRightVal: string | undefined;
      let cleanYVal = yValRaw;

      if (isAsym) {
        const parts = yValRaw.split(/\|\||\\\|/).map(s => s.trim());
        if (parts.length >= 2) {
          yLeftVal = parts[0] || '+\\infty';
          yRightVal = parts[1] || '-\\infty';
        } else {
          yLeftVal = '+\\infty';
          yRightVal = '-\\infty';
        }
      }

      // Suy đoán vị trí độ cao nhãn y
      let yPos: 'top' | 'bottom' | 'middle' = 'middle';
      if (cleanYVal.includes('-\\infty') || cleanYVal.includes('-∞')) {
        yPos = 'bottom';
      } else if (cleanYVal.includes('+\\infty') || cleanYVal.includes('+∞') || cleanYVal.includes('∞')) {
        yPos = 'top';
      } else if (i === 0 && landmarkCols.length > 2) {
        yPos = 'bottom';
      } else if (i === landmarkCols.length - 1 && landmarkCols.length > 2) {
        yPos = 'top';
      }

      points.push({
        x: xVal,
        yPrime: yP === '0' ? '0' : yP === '||' ? '||' : undefined,
        isAsymptote: isAsym,
        yVal: isAsym ? undefined : cleanYVal,
        yPosition: yPos,
        yLeftVal,
        yLeftPosition: yLeftVal?.includes('-') ? 'bottom' : 'top',
        yRightVal,
        yRightPosition: yRightVal?.includes('+') ? 'top' : 'bottom'
      });

      // Xác định khoảng giữa điểm này và điểm tiếp theo
      if (i < landmarkCols.length - 1) {
        const nextC = landmarkCols[i + 1];
        let sign: '+' | '-' | '' = '';

        for (let mid = c; mid <= nextC; mid++) {
          const pSign = (yPrimeCells[mid] || '').replace(/\$/g, '').trim();
          if (pSign === '+' || pSign === '-') {
            sign = pSign;
            break;
          }
          const ySign = (yCells[mid] || '').replace(/\$/g, '').trim();
          if (ySign.includes('↗') || ySign.includes('\\nearrow')) {
            sign = '+';
            break;
          }
          if (ySign.includes('↘') || ySign.includes('\\searrow')) {
            sign = '-';
            break;
          }
        }

        intervals.push({
          sign: sign || '+',
          trend: sign === '-' ? 'decreasing' : 'increasing'
        });
      }
    }

    // Điều chỉnh lại độ cao nhãn y dựa trên chiều biến thiên
    for (let i = 0; i < points.length; i++) {
      if (points[i].isAsymptote) continue;
      const prevInter = intervals[i - 1];
      const nextInter = intervals[i];

      if (prevInter?.trend === 'increasing' && nextInter?.trend === 'decreasing') {
        points[i].yPosition = 'top'; // Cực đại
      } else if (prevInter?.trend === 'decreasing' && nextInter?.trend === 'increasing') {
        points[i].yPosition = 'bottom'; // Cực tiểu
      }
    }

    return {
      functionName: '',
      points,
      intervals
    };
  } catch (e) {
    return null;
  }
}

/**
 * Phân tích và chuyển đổi mã TikZ (tkz-tab) thành BBTData
 */
export function parseTkzTabToBbtData(code: string): BBTData | null {
  try {
    const initMatch = code.match(/\\tkzTabInit(?:\[[^\]]*\])?\s*\{([^}]*)\}\s*\{([^}]*)\}/);
    if (!initMatch) return null;

    const xValues = initMatch[2].split(/,\s*(?![^{}]*\})/).map(s => s.replace(/\$/g, '').trim());
    if (xValues.length < 2) return null;

    const lineMatch = code.match(/\\tkzTabLine\s*\{([^}]*)\}/);
    const lineTokens = lineMatch ? lineMatch[1].split(',').map(s => s.trim()) : [];

    const varMatch = code.match(/\\tkzTabVar\s*\{([^}]*)\}/);
    const varTokens = varMatch ? varMatch[1].split(/,\s*(?![^{}]*\})/).map(s => s.trim()) : [];

    const points: BBTPoint[] = [];
    const intervals: BBTInterval[] = [];

    // Trích xuất dấu của y'
    let signIdx = 0;
    const signs: Array<'+' | '-' | ''> = [];
    lineTokens.forEach(tok => {
      if (tok === '+' || tok === '-') signs.push(tok);
    });

    let varIdx = 0;
    for (let i = 0; i < xValues.length; i++) {
      const xVal = xValues[i];
      const rawVar = varTokens[varIdx] || '';

      const isDoubleBar = rawVar.includes('D') || rawVar.includes('d') || lineTokens.some(t => (t === 'd' || t === '||') && xValues.indexOf(xVal) === i);

      if (isDoubleBar) {
        const matchSplit = rawVar.match(/[+-]?[Dd][+-]?\s*\/\s*([^/]+?)\s*\/\s*(.*)/);
        const yLeft = matchSplit ? matchSplit[1].trim() : '+\\infty';
        const yRight = matchSplit ? matchSplit[2].trim() : '-\\infty';

        points.push({
          x: xVal,
          yPrime: '||',
          isAsymptote: true,
          yLeftVal: yLeft,
          yLeftPosition: rawVar.startsWith('+') ? 'top' : 'bottom',
          yRightVal: yRight,
          yRightPosition: rawVar.includes('D+') ? 'top' : 'bottom'
        });
        varIdx++;
      } else {
        const isTop = rawVar.startsWith('+');
        const val = rawVar.replace(/^[+-][^/]*\/?/, '').trim();

        points.push({
          x: xVal,
          yPrime: (i > 0 && i < xValues.length - 1) ? '0' : undefined,
          yVal: val || undefined,
          yPosition: isTop ? 'top' : (rawVar.startsWith('-') ? 'bottom' : 'middle')
        });
        varIdx++;
      }

      if (i < xValues.length - 1) {
        const sign = signs[signIdx] || '+';
        intervals.push({
          sign,
          trend: sign === '-' ? 'decreasing' : 'increasing'
        });
        signIdx++;
      }
    }

    return {
      functionName: '',
      points,
      intervals
    };
  } catch (e) {
    return null;
  }
}

/**
 * Chuyển đổi bất kỳ khối Markdown Table BBT nào thành chuỗi SVG chuẩn SGK
 */
export function convertBbtTableToSvg(tableMarkdown: string): string | null {
  const data = parseMarkdownBbtTable(tableMarkdown);
  if (!data) return null;
  return generateBbtSvg(data);
}
