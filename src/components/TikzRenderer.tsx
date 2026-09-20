import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';

// Global cache for TikZ SVGs
const tikzCache = new Map<string, string>();

export function cleanTikzCode(raw: string): string {
  if (!raw) return '';
  let code = raw.trim();

  // 1. Remove \usetikzlibrary{...} and \usepackage{...}
  code = code.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '');

  // 2. Remove document / standalone environments if wrapped
  code = code.replace(/\\begin\s*\{document\}|\\end\s*\{document\}/gi, '');
  code = code.replace(/\\documentclass(\[[^\]]*\])?\{[^}]*\}/gi, '');

  // 3. Replace unsupported pattern=... with fill=gray!25
  code = code.replace(/pattern\s*=\s*(?:north\s*east\s*lines|north\s*west\s*lines|dots|crosshatch|grid|fivepointed\s*stars)[^,\]]*/gi, 'fill=gray!25, fill opacity=0.7');
  code = code.replace(/pattern\s*=\s*[^,\]]+/gi, 'fill=gray!25, fill opacity=0.7');
  code = code.replace(/pattern\s+color\s*=\s*[^,\]]+/gi, '');

  // 4. Replace arrows.meta syntax with standard TikZ arrows
  code = code.replace(/arrows\s*=\s*\{?\s*-?\s*[Ss]tealth\s*\}?/gi, '->');
  code = code.replace(/-?\{[Ss]tealth\}\s*-?/gi, '->');
  code = code.replace(/>=\s*\{?[Ss]tealth\}?/gi, '>=stealth');
  code = code.replace(/>=\s*\{?latex\}?/gi, '>=latex');

  // 5. Clean trailing/duplicate commas in option brackets
  code = code.replace(/\[\s*,+/g, '[').replace(/,+\s*\]/g, ']').replace(/,\s*,+/g, ',');

  // 6. Ensure wrapped in \begin{tikzpicture}...\end{tikzpicture}
  if (!code.includes('\\begin{tikzpicture}')) {
    code = `\\begin{tikzpicture}\n${code}\n\\end{tikzpicture}`;
  }

  return code.trim();
}

// Helper function to render tkz-tab (bảng biến thiên) to clean, vector SVG instantly
export function renderTkzTabToSvg(code: string): string | null {
  try {
    const initMatch = code.match(/\\tkzTabInit(?:\[[^\]]*\])?\s*\{([^}]*)\}\s*\{([^}]*)\}/);
    if (!initMatch) return null;

    const headers = initMatch[1].split(/,\s*(?![^{}]*\})/).map(s => s.split('/')[0].replace(/\$/g, '').trim());
    const xValues = initMatch[2].split(/,\s*(?![^{}]*\})/).map(s => s.replace(/\$/g, '').trim());

    if (xValues.length < 2) return null;

    const lineMatch = code.match(/\\tkzTabLine\s*\{([^}]*)\}/);
    const lineTokens = lineMatch ? lineMatch[1].split(',').map(s => s.trim()) : [];

    const varMatch = code.match(/\\tkzTabVar\s*\{([^}]*)\}/);
    const varTokens = varMatch ? varMatch[1].split(/,\s*(?![^{}]*\})/).map(s => s.trim()) : [];

    const toMathSvgText = (s: string) => {
      return s.replace(/\\infty/g, '∞')
              .replace(/\+∞/g, '+∞')
              .replace(/-∞/g, '-∞')
              .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
              .replace(/_([a-zA-Z0-9])/g, '$1')
              .replace(/\$/g, '')
              .trim();
    };

    const hColW = 68;
    const numX = xValues.length;
    const colSpacing = Math.max(90, Math.min(150, Math.round(380 / Math.max(numX - 1, 1))));
    const totalW = hColW + (numX - 1) * colSpacing + 60;

    const hX = 36;
    const hYPrime = 36;
    const hY = 88;
    const totalH = hX + hYPrime + hY;

    const svgParts: string[] = [];
    svgParts.push(`<defs>
      <marker id="arrow-var" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563eb" />
      </marker>
    </defs>`);

    // Outer card border
    svgParts.push(`<rect x="0" y="0" width="${totalW}" height="${totalH}" fill="#ffffff" stroke="#94a3b8" stroke-width="1.2" rx="6" />`);
    // Vertical divider after headers
    svgParts.push(`<line x1="${hColW}" y1="0" x2="${hColW}" y2="${totalH}" stroke="#94a3b8" stroke-width="1.2" />`);
    // Horizontal divider under X row
    svgParts.push(`<line x1="0" y1="${hX}" x2="${totalW}" y2="${hX}" stroke="#94a3b8" stroke-width="1.2" />`);
    // Horizontal divider under Y' row
    svgParts.push(`<line x1="0" y1="${hX + hYPrime}" x2="${totalW}" y2="${hX + hYPrime}" stroke="#94a3b8" stroke-width="1.2" />`);

    // Headers
    const h1 = headers[0] || 'x';
    const h2 = headers[1] || "y'";
    const h3 = headers[2] || 'y';
    svgParts.push(`<text x="${hColW / 2}" y="24" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="16" font-style="italic" fill="#0f172a">${toMathSvgText(h1)}</text>`);
    svgParts.push(`<text x="${hColW / 2}" y="${hX + 24}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="16" font-style="italic" fill="#0f172a">${toMathSvgText(h2)}</text>`);
    svgParts.push(`<text x="${hColW / 2}" y="${hX + hYPrime + 48}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="16" font-style="italic" fill="#0f172a">${toMathSvgText(h3)}</text>`);

    // X row values
    const xCoords: number[] = [];
    for (let i = 0; i < numX; i++) {
      const xPos = hColW + 30 + i * colSpacing;
      xCoords.push(xPos);
      svgParts.push(`<text x="${xPos}" y="24" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="15" fill="#0f172a">${toMathSvgText(xValues[i])}</text>`);
    }

    // Y' row (signs and zeros / double lines)
    const cleanLineTokens = lineTokens.map(t => t.trim()).filter(Boolean);
    if (cleanLineTokens.length > 0) {
      let signIdx = 0;
      for (let i = 0; i < cleanLineTokens.length; i++) {
        const tok = cleanLineTokens[i];
        if (tok === '+' || tok === '-') {
          const leftX = xCoords[signIdx] || (hColW + 30);
          const rightX = xCoords[signIdx + 1] || (leftX + colSpacing);
          const midX = (leftX + rightX) / 2;
          svgParts.push(`<text x="${midX}" y="${hX + 24}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="17" font-weight="bold" fill="#334155">${tok}</text>`);
          signIdx++;
        } else if (tok === '0' || tok === 'z') {
          const xPos = xCoords[signIdx] || (hColW + 30 + signIdx * colSpacing);
          svgParts.push(`<text x="${xPos}" y="${hX + 24}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="15" fill="#334155">0</text>`);
        } else if (tok === 'd' || tok === '||') {
          const xPos = xCoords[signIdx] || (hColW + 30 + signIdx * colSpacing);
          svgParts.push(`<line x1="${xPos - 2}" y1="${hX}" x2="${xPos - 2}" y2="${hX + hYPrime}" stroke="#64748b" stroke-width="1.2" />`);
          svgParts.push(`<line x1="${xPos + 2}" y1="${hX}" x2="${xPos + 2}" y2="${hX + hYPrime}" stroke="#64748b" stroke-width="1.2" />`);
        }
      }
    }

    // Y row: variation points and arrows
    // Group variation points by continuous intervals (separated by double vertical lines)
    const points: { x: number; y: number; val: string; interval: number }[] = [];
    const yTop = hX + hYPrime + 22;
    const yBottom = totalH - 18;

    // Detect double bars from lineTokens and varTokens
    const dIndices = new Set<number>();
    for (let i = 0; i < cleanLineTokens.length; i++) {
      if (cleanLineTokens[i] === 'd' || cleanLineTokens[i] === '||') {
        dIndices.add(i);
      }
    }

    let curInterval = 0;
    let varIdx = 0;

    for (let i = 0; i < varTokens.length; i++) {
      const rawTok = varTokens[i];
      const isDoubleBar = rawTok.includes('D') || rawTok.includes('d');

      if (isDoubleBar) {
        // e.g. -D+/ -\infty / +\infty or +D-/ +\infty / -\infty
        const matchSplit = rawTok.match(/[+-]?[Dd][+-]?\s*\/\s*([^/]+?)\s*\/\s*(.*)/);
        const xPos = xCoords[varIdx] || (hColW + 30 + varIdx * colSpacing);

        // Draw double vertical lines in Y row
        svgParts.push(`<line x1="${xPos - 2}" y1="${hX + hYPrime}" x2="${xPos - 2}" y2="${totalH}" stroke="#64748b" stroke-width="1.2" />`);
        svgParts.push(`<line x1="${xPos + 2}" y1="${hX + hYPrime}" x2="${xPos + 2}" y2="${totalH}" stroke="#64748b" stroke-width="1.2" />`);

        if (matchSplit) {
          const valLeft = matchSplit[1].trim();
          const valRight = matchSplit[2].trim();
          const leftIsTop = rawTok.startsWith('+');
          const rightIsTop = rawTok.includes('D+') || rawTok.includes('d+');

          // Left side limit point (end of previous interval)
          points.push({
            x: xPos - 16,
            y: leftIsTop ? yTop : yBottom,
            val: valLeft,
            interval: curInterval
          });

          // Move to next interval across double bar
          curInterval++;

          // Right side limit point (start of next interval)
          points.push({
            x: xPos + 16,
            y: rightIsTop ? yTop : yBottom,
            val: valRight,
            interval: curInterval
          });
        } else {
          curInterval++;
        }
        varIdx++;
      } else {
        const xPos = xCoords[varIdx] || (hColW + 30 + varIdx * colSpacing);
        const isTop = rawTok.startsWith('+');
        const val = rawTok.replace(/^[+-][^/]*\/?/, '').trim();
        points.push({
          x: xPos,
          y: isTop ? yTop : yBottom,
          val,
          interval: curInterval
        });
        varIdx++;
      }
    }

    // Draw arrows strictly within the same continuous interval (never cross double vertical lines)
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      // Arrows must NEVER cross intervals
      if (p1.interval !== p2.interval) continue;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 25) {
        const offset = 18;
        const x1 = p1.x + (dx / dist) * offset;
        const y1 = p1.y + (dy / dist) * offset;
        const x2 = p2.x - (dx / dist) * offset;
        const y2 = p2.y - (dy / dist) * offset;
        svgParts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#2563eb" stroke-width="1.6" marker-end="url(#arrow-var)" />`);
      }
    }

    // Draw values at points
    for (const p of points) {
      svgParts.push(`<text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="14" fill="#0f172a">${toMathSvgText(p.val)}</text>`);
    }

    return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg" class="max-w-full h-auto mx-auto my-3 drop-shadow-sm bg-white rounded-lg border border-slate-200">
      ${svgParts.join('\n      ')}
    </svg>`;
  } catch (e) {
    return null;
  }
}

// Evaluate mathematical expressions for plot (\x, {expr})
function evaluatePlotExpr(exprStr: string, xVal: number): number | null {
  try {
    let clean = exprStr.trim();
    // 1. Replace LaTeX \frac{A}{B} with ((A)/(B))
    clean = clean.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '(($1)/($2))');
    clean = clean.replace(/\\frac\s*([0-9a-zA-Z\\]+)\s*\{([^{}]+)\}/g, '(($1)/($2))');
    
    // 2. Replace variable \x with (xVal)
    clean = clean.replace(/([0-9])\s*\\x/g, `$1*(${xVal})`);
    clean = clean.replace(/\\x\s*([0-9])/g, `(${xVal})*$1`);
    clean = clean.replace(/\\x/g, `(${xVal})`);
    
    // 3. Replace standalone variable x if used
    clean = clean.replace(/([0-9])\s*x\b/g, `$1*(${xVal})`);
    clean = clean.replace(/\bx\b/g, `(${xVal})`);
    
    // 4. Handle implicit multiplication between parentheses: e.g. (x-1)(x+2) -> (x-1)*(x+2)
    clean = clean.replace(/\)\s*\(/g, ')*(');
    clean = clean.replace(/([0-9])\s*\(/g, '$1*(');
    clean = clean.replace(/\)\s*([0-9])/g, ')*$1');
    
    // 5. Replace LaTeX powers ^ with JavaScript **
    clean = clean.replace(/\^/g, '**');
    
    // 6. Replace mathematical functions
    clean = clean.replace(/\bsin\b/g, 'Math.sin')
                 .replace(/\bcos\b/g, 'Math.cos')
                 .replace(/\btan\b/g, 'Math.tan')
                 .replace(/\bsqrt\b/g, 'Math.sqrt')
                 .replace(/\babs\b/g, 'Math.abs')
                 .replace(/\bln\b/g, 'Math.log')
                 .replace(/\bexp\b/g, 'Math.exp');

    if (!/^[0-9+\-*/()., eMathsincoztaprwlg*]+$/i.test(clean)) return null;
    const val = Function(`"use strict"; return (${clean});`)();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val) && Math.abs(val) < 200) {
      return val;
    }
    return null;
  } catch (e) {
    return null;
  }
}

interface RationalParams {
  a: number;
  b: number;
  c: number;
  d: number;
  xAsym: number;
  yAsym: number;
}

// Trích xuất tham số hàm phân thức bậc nhất trên bậc nhất y = (ax+b)/(cx+d)
function extractRationalParams(code: string): RationalParams | null {
  const parseLinear = (str: string) => {
    let s = str.replace(/[{}\s$]/g, '');
    const m = s.match(/^([+-]?(?:\d*\.?\d*)?)x(?:([+-]\d*\.?\d+))?$/);
    if (m) {
      let coeffStr = m[1];
      if (coeffStr === '' || coeffStr === '+') coeffStr = '1';
      if (coeffStr === '-') coeffStr = '-1';
      const c = parseFloat(coeffStr);
      const k = m[2] ? parseFloat(m[2]) : 0;
      return { c, k };
    }
    return null;
  };

  // 1. Phân thức LaTeX: \frac{x+2}{x-1} hoặc \frac{ax+b}{cx+d}
  const fracMatch = code.match(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/);
  if (fracMatch) {
    const num = parseLinear(fracMatch[1]);
    const den = parseLinear(fracMatch[2]);
    if (num && den && den.c !== 0) {
      return {
        a: num.c,
        b: num.k,
        c: den.c,
        d: den.k,
        xAsym: -den.k / den.c,
        yAsym: num.c / den.c
      };
    }
  }

  // 2. Dạng phân thức xuyệt (x+2)/(x-1)
  const slashMatch = code.match(/\(?([+-\d\.]*x[+-\d\.]*)\)?\s*\/\s*\(?([+-\d\.]*x[+-\d\.]*)\)?/);
  if (slashMatch) {
    const num = parseLinear(slashMatch[1]);
    const den = parseLinear(slashMatch[2]);
    if (num && den && den.c !== 0) {
      return {
        a: num.c,
        b: num.k,
        c: den.c,
        d: den.k,
        xAsym: -den.k / den.c,
        yAsym: num.c / den.c
      };
    }
  }

  // 3. Nhận diện từ nhãn tiệm cận x = x0 và y = y0
  const xNodeMatch = code.match(/node[^}]*\{[^\$}]*\$?\s*x\s*=\s*([-\d\.]+)\s*\$?[^}]*\}/i);
  const yNodeMatch = code.match(/node[^}]*\{[^\$}]*\$?\s*y\s*=\s*([-\d\.]+)\s*\$?[^}]*\}/i);
  if (xNodeMatch && yNodeMatch) {
    const x0 = parseFloat(xNodeMatch[1]);
    const y0 = parseFloat(yNodeMatch[1]);
    if (!isNaN(x0) && !isNaN(y0)) {
      // Mặc định dạng hyperbola qua giao điểm tiệm cận
      return {
        a: y0,
        b: 1 - y0 * x0,
        c: 1,
        d: -x0,
        xAsym: x0,
        yAsym: y0
      };
    }
  }

  // 4. Nhận diện 2 đường tiệm cận nét đứt
  const dashedMatches = [...code.matchAll(/\\draw\[[^\]]*dashed[^\]]*\]\s*\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\)\s*--\s*\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\)/gi)];
  if (dashedMatches.length >= 2) {
    let x0: number | null = null;
    let y0: number | null = null;
    for (const dm of dashedMatches) {
      const x1 = parseFloat(dm[1]), y1 = parseFloat(dm[2]), x2 = parseFloat(dm[3]), y2 = parseFloat(dm[4]);
      if (Math.abs(x1 - x2) < 0.05) x0 = x1;
      if (Math.abs(y1 - y2) < 0.05) y0 = y1;
    }
    if (x0 !== null && y0 !== null) {
      return {
        a: y0,
        b: 1 - x0 * y0,
        c: 1,
        d: -x0,
        xAsym: x0,
        yAsym: y0
      };
    }
  }

  return null;
}

// Vẽ 2 nhánh đường cong hàm phân thức bằng thẻ <path> SVG với nét liền màu xanh dương
function generateRationalFunctionPaths(
  params: RationalParams,
  adjMinX: number,
  adjMaxX: number,
  adjMinY: number,
  adjMaxY: number,
  toSvgX: (x: number) => number,
  toSvgY: (y: number) => number
): string[] {
  const { a, b, c, d, xAsym } = params;
  const paths: string[] = [];
  const evalY = (x: number) => {
    const denom = c * x + d;
    if (Math.abs(denom) < 1e-4) return null;
    return (a * x + b) / denom;
  };

  // Nhánh trái: x < xAsym
  const leftSegments: string[] = [];
  const minX = adjMinX;
  const maxX = xAsym - 0.05;
  if (maxX > minX) {
    const steps = 90;
    const dx = (maxX - minX) / steps;
    let inSeg = false;
    for (let i = 0; i <= steps; i++) {
      const x = minX + i * dx;
      const y = evalY(x);
      if (y !== null && y >= adjMinY - 2.5 && y <= adjMaxY + 2.5) {
        const sx = toSvgX(x).toFixed(1);
        const sy = toSvgY(y).toFixed(1);
        if (!inSeg) {
          leftSegments.push(`M ${sx} ${sy}`);
          inSeg = true;
        } else {
          leftSegments.push(`L ${sx} ${sy}`);
        }
      } else {
        inSeg = false;
      }
    }
  }

  // Nhánh phải: x > xAsym
  const rightSegments: string[] = [];
  const rightMinX = xAsym + 0.05;
  const rightMaxX = adjMaxX;
  if (rightMaxX > rightMinX) {
    const steps = 90;
    const dx = (rightMaxX - rightMinX) / steps;
    let inSeg = false;
    for (let i = 0; i <= steps; i++) {
      const x = rightMinX + i * dx;
      const y = evalY(x);
      if (y !== null && y >= adjMinY - 2.5 && y <= adjMaxY + 2.5) {
        const sx = toSvgX(x).toFixed(1);
        const sy = toSvgY(y).toFixed(1);
        if (!inSeg) {
          rightSegments.push(`M ${sx} ${sy}`);
          inSeg = true;
        } else {
          rightSegments.push(`L ${sx} ${sy}`);
        }
      } else {
        inSeg = false;
      }
    }
  }

  if (leftSegments.length > 2) {
    paths.push(`<path d="${leftSegments.join(' ')}" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`);
  }
  if (rightSegments.length > 2) {
    paths.push(`<path d="${rightSegments.join(' ')}" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`);
  }

  return paths;
}

export function renderTikzFallbackSvg(raw: string): string | null {
  try {
    const cleaned = cleanTikzCode(raw);

    // 1. Check if it is a Table of Variation (tkz-tab)
    if (/\\tkzTabInit/i.test(cleaned)) {
      const tabSvg = renderTkzTabToSvg(cleaned);
      if (tabSvg) return tabSvg;
    }

    const svgElements: string[] = [];
    const allCoords: { x: number; y: number }[] = [];

    // Extract all coordinates from draw and node commands to compute dynamic bounding box
    const coordRegexGlobal = /\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\)/g;
    let anyMatch;
    while ((anyMatch = coordRegexGlobal.exec(cleaned)) !== null) {
      allCoords.push({ x: parseFloat(anyMatch[1]), y: parseFloat(anyMatch[2]) });
    }

    // If coordinate axes or origin are mentioned, ensure (0,0) is in coords
    if (cleaned.includes('$O$') || cleaned.includes('$x$') || cleaned.includes('$y$') || cleaned.includes('Ox') || cleaned.includes('Oy') || cleaned.includes('->')) {
      allCoords.push({ x: 0, y: 0 });
    }

    // Default bounding box if few or no coordinates detected
    let minX = -4, maxX = 4, minY = -3, maxY = 3;
    if (allCoords.length >= 2) {
      minX = Math.min(...allCoords.map(c => c.x));
      maxX = Math.max(...allCoords.map(c => c.x));
      minY = Math.min(...allCoords.map(c => c.y));
      maxY = Math.max(...allCoords.map(c => c.y));
    }

    // Add margin around plot
    const spanX = Math.max(maxX - minX, 2);
    const spanY = Math.max(maxY - minY, 2);
    const padX = spanX * 0.14;
    const padY = spanY * 0.14;
    const adjMinX = minX - padX;
    const adjMaxX = maxX + padX;
    const adjMinY = minY - padY;
    const adjMaxY = maxY + padY;

    const svgWidth = 400;
    const svgHeight = Math.max(220, Math.min(360, Math.round(svgWidth * ((adjMaxY - adjMinY) / (adjMaxX - adjMinX)))));

    const toSvgX = (x: number) => ((x - adjMinX) / (adjMaxX - adjMinX)) * svgWidth;
    const toSvgY = (y: number) => svgHeight - ((y - adjMinY) / (adjMaxY - adjMinY)) * svgHeight;

    svgElements.push(`<defs>
      <marker id="arrow-axis" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M 0 2 L 8 5 L 0 8 z" fill="#1e293b" />
      </marker>
      <marker id="arrow-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M 0 2 L 8 5 L 0 8 z" fill="#334155" />
      </marker>
    </defs>`);

    // Detect function family to avoid invalid slant asymptote lines
    const isCubicOrPoly = /x\^3|x\*x\*x|x\^4|bậc\s*3|bậc\s*ba|trùng\s*phương/i.test(cleaned);
    const hasSlantAsymptote = /x\^2\s*[+\-][^/]*\/\s*[^/]*x|tiệm\s*cận\s*xiên/i.test(cleaned);
    const isRational11 = !hasSlantAsymptote && (
      /(?:\([^\)]*x[^\)]*\)|\w*x\w*)\s*\/\s*(?:\([^\)]*x[^\)]*\)|\w*x\w*)/.test(cleaned) ||
      (/tiệm\s*cận/i.test(cleaned) && !/x\^2/i.test(cleaned))
    );
    const forbidSlantLines = (isCubicOrPoly || isRational11) && !hasSlantAsymptote;

    // Extract draw commands
    const drawRegex = /\\draw(?:\[([^\]]*)\])?\s*([^\;]+);/g;
    let match;
    let hasFunctionCurve = false;
    while ((match = drawRegex.exec(cleaned)) !== null) {
      const opts = match[1] || '';
      const body = match[2] || '';

      const isArrow = opts.includes('->') || opts.includes('stealth') || opts.includes('latex');
      const isDashed = opts.includes('dashed') || opts.includes('dotted');
      const strokeColor = opts.includes('red') ? '#dc2626' : opts.includes('blue') ? '#2563eb' : (opts.includes('emerald') || opts.includes('green')) ? '#059669' : (isDashed ? '#64748b' : '#1e293b');
      const fillColor = (opts.includes('fill') || body.includes('fill')) ? 'rgba(148, 163, 184, 0.22)' : 'none';

      // 1. Grid support: \draw[step=1, color=gray!30] (-4,-3) grid (4,4);
      if (body.includes('grid')) {
        const gridMatch = body.match(/\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\)\s*grid\s*(?:\[[^\]]*\])?\s*\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\)/);
        if (gridMatch) {
          const gx1 = parseFloat(gridMatch[1]);
          const gy1 = parseFloat(gridMatch[2]);
          const gx2 = parseFloat(gridMatch[3]);
          const gy2 = parseFloat(gridMatch[4]);
          const minGX = Math.min(gx1, gx2);
          const maxGX = Math.max(gx1, gx2);
          const minGY = Math.min(gy1, gy2);
          const maxGY = Math.max(gy1, gy2);

          let step = 1;
          const stepMatch = (opts + ' ' + body).match(/step\s*=\s*([0-9\.]+)/);
          if (stepMatch) step = parseFloat(stepMatch[1]) || 1;

          const gridLines: string[] = [];
          for (let gx = minGX; gx <= maxGX + 0.001; gx += step) {
            gridLines.push(`<line x1="${toSvgX(gx).toFixed(1)}" y1="${toSvgY(minGY).toFixed(1)}" x2="${toSvgX(gx).toFixed(1)}" y2="${toSvgY(maxGY).toFixed(1)}" stroke="#e2e8f0" stroke-width="0.8" ${isDashed ? 'stroke-dasharray="3,3"' : ''} />`);
          }
          for (let gy = minGY; gy <= maxGY + 0.001; gy += step) {
            gridLines.push(`<line x1="${toSvgX(minGX).toFixed(1)}" y1="${toSvgY(gy).toFixed(1)}" x2="${toSvgX(maxGX).toFixed(1)}" y2="${toSvgY(gy).toFixed(1)}" stroke="#e2e8f0" stroke-width="0.8" ${isDashed ? 'stroke-dasharray="3,3"' : ''} />`);
          }
          svgElements.push(gridLines.join('\n      '));
          continue;
        }
      }

      // 2. Extract inline node labels from \draw commands (e.g. \draw[->] (-4,0) -- (4,0) node[right] {$x$};)
      const inlineNodeRegex = /node(?:\[([^\]]*)\])?\s*(?:at\s*\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\))?\s*\{([^}]*)\}/g;
      let inMatch;
      while ((inMatch = inlineNodeRegex.exec(body)) !== null) {
        const posOpt = inMatch[1] || '';
        let nx = inMatch[2] !== undefined ? parseFloat(inMatch[2]) : NaN;
        let ny = inMatch[3] !== undefined ? parseFloat(inMatch[3]) : NaN;
        if (isNaN(nx) || isNaN(ny)) {
          const beforeNode = body.slice(0, inMatch.index);
          const prevCoords = [...beforeNode.matchAll(/\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\)/g)];
          if (prevCoords.length > 0) {
            const lastC = prevCoords[prevCoords.length - 1];
            nx = parseFloat(lastC[1]);
            ny = parseFloat(lastC[2]);
          }
        }
        if (!isNaN(nx) && !isNaN(ny)) {
          let text = inMatch[4].replace(/\$/g, '').trim();
          let dx = 0, dy = 4;
          if (posOpt.includes('right')) dx = 12;
          if (posOpt.includes('left')) dx = -12;
          if (posOpt.includes('above')) dy = -10;
          if (posOpt.includes('below')) dy = 16;
          if (posOpt.includes('below left')) { dx = -10; dy = 14; }
          if (posOpt.includes('below right')) { dx = 10; dy = 14; }
          if (posOpt.includes('above left')) { dx = -10; dy = -10; }
          if (posOpt.includes('above right')) { dx = 10; dy = -10; }
          svgElements.push(`<text x="${(toSvgX(nx) + dx).toFixed(1)}" y="${(toSvgY(ny) + dy).toFixed(1)}" font-family="'Times New Roman', Times, serif" font-size="14" font-weight="600" font-style="italic" fill="#0f172a" text-anchor="middle">${text}</text>`);
        }
      }

      // 3. Check for function plot: \draw[domain=a:b] plot (\x, {expr});
      if (body.includes('plot')) {
        const domainMatch = opts.match(/domain\s*=\s*([-\d\.]+)\s*:\s*([-\d\.]+)/) || body.match(/domain\s*=\s*([-\d\.]+)\s*:\s*([-\d\.]+)/);
        let exprStr = '';
        const braceMatch = body.match(/plot\s*(?:\[[^\]]*\])?\s*\(\\x\s*,\s*\{([\s\S]*?)\}\s*\)/);
        if (braceMatch) {
          exprStr = braceMatch[1].trim();
        } else {
          const parenMatch = body.match(/plot\s*(?:\[[^\]]*\])?\s*\(\\x\s*,\s*([\s\S]*?)\)(?:\s*;|\s*$)/);
          if (parenMatch) {
            exprStr = parenMatch[1].trim();
            if (exprStr.startsWith('{') && exprStr.endsWith('}')) {
              exprStr = exprStr.slice(1, -1).trim();
            }
          }
        }

        if (exprStr) {
          const domMin = domainMatch ? parseFloat(domainMatch[1]) : Math.max(minX, -6);
          const domMax = domainMatch ? parseFloat(domainMatch[2]) : Math.min(maxX, 6);
          const steps = 160;
          const stepSize = (domMax - domMin) / steps;
          const pathSegments: string[] = [];
          let inSegment = false;
          let prevY: number | null = null;

          for (let s = 0; s <= steps; s++) {
            const xVal = domMin + s * stepSize;
            const yVal = evaluatePlotExpr(exprStr, xVal);
            
            // Detect vertical asymptote discontinuity jumps in rational functions (bậc 1/1, bậc 2/1)
            const isDiscontinuous = (
              prevY !== null && 
              yVal !== null && 
              Math.abs(yVal - prevY) > spanY * 0.75 && 
              ((yVal > 0 && prevY < 0) || (yVal < 0 && prevY > 0))
            );

            if (yVal !== null && !isDiscontinuous && yVal >= adjMinY - 2.5 && yVal <= adjMaxY + 2.5) {
              const sx = toSvgX(xVal).toFixed(1);
              const sy = toSvgY(yVal).toFixed(1);
              if (!inSegment) {
                pathSegments.push(`M ${sx} ${sy}`);
                inSegment = true;
              } else {
                pathSegments.push(`L ${sx} ${sy}`);
              }
            } else {
              inSegment = false;
            }
            prevY = yVal;
          }

          if (pathSegments.length > 2) {
            // Nét liền màu xanh dương stroke="#2563eb" stroke-width="2" cho đường cong hàm số
            svgElements.push(`<path d="${pathSegments.join(' ')}" fill="none" stroke="#2563eb" stroke-width="${opts.includes('thick') ? 2.5 : 2}" ${isDashed ? 'stroke-dasharray="6,4"' : ''} stroke-linecap="round" stroke-linejoin="round" />`);
            hasFunctionCurve = true;
            continue;
          }
        }
      }

      // 4. Circle support: (x,y) circle [radius=r] or (x,y) circle (r)
      const circleMatch = body.match(/\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\)\s*circle\s*(?:\[radius=\s*([-\d\.]+)\s*\]|\(\s*([-\d\.]+)\s*\))/);
      if (circleMatch) {
        const cx = parseFloat(circleMatch[1]);
        const cy = parseFloat(circleMatch[2]);
        const r = parseFloat(circleMatch[3] || circleMatch[4] || '1');
        const rx = (r / (adjMaxX - adjMinX)) * svgWidth;
        svgElements.push(`<circle cx="${toSvgX(cx)}" cy="${toSvgY(cy)}" r="${rx}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${opts.includes('thick') ? 2 : 1.5}" ${isDashed ? 'stroke-dasharray="5,4"' : ''} />`);
        continue;
      }

      // 5. Match coordinates (x, y) for lines, polygons, and asymptotes
      const coordRegex = /\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\)/g;
      const coords: { x: number; y: number }[] = [];
      let cMatch;
      while ((cMatch = coordRegex.exec(body)) !== null) {
        coords.push({ x: parseFloat(cMatch[1]), y: parseFloat(cMatch[2]) });
      }

      if (coords.length >= 2) {
        if (body.includes('-- cycle') || (opts.includes('fill') && !isArrow)) {
          const pointsStr = coords.map(c => `${toSvgX(c.x).toFixed(1)},${toSvgY(c.y).toFixed(1)}`).join(' ');
          svgElements.push(`<polygon points="${pointsStr}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${opts.includes('thick') ? 2 : 1.5}" ${isDashed ? 'stroke-dasharray="5,4"' : ''} />`);
        } else {
          for (let i = 0; i < coords.length - 1; i++) {
            const pA = coords[i];
            const pB = coords[i + 1];
            const isAxis = (pA.x === 0 && pB.x === 0) || (pA.y === 0 && pB.y === 0);
            const isSlant = !isAxis && Math.abs(pA.x - pB.x) > 0.15 && Math.abs(pA.y - pB.y) > 0.15;

            // If polynomial or 1/1 rational, never draw accidental diagonal/slant lines
            if (forbidSlantLines && isSlant) {
              continue;
            }

            const hasArrow = isArrow && (i === coords.length - 2);
            const lineWidth = isDashed ? (opts.includes('thick') ? 2 : 1.8) : (isArrow ? 1.6 : (opts.includes('thick') ? 2 : 1.5));
            svgElements.push(`<line x1="${toSvgX(pA.x).toFixed(1)}" y1="${toSvgY(pA.y).toFixed(1)}" x2="${toSvgX(pB.x).toFixed(1)}" y2="${toSvgY(pB.y).toFixed(1)}" stroke="${strokeColor}" stroke-width="${lineWidth}" ${isDashed ? 'stroke-dasharray="6,4"' : ''} ${hasArrow ? 'marker-end="url(#arrow-axis)"' : ''} />`);
          }
        }
      }
    }

    // 3.5 BẮT BUỘC: Nếu là đồ thị hàm phân thức y = (ax+b)/(cx+d) mà chưa có nhánh đồ thị \draw plot,
    // tự động vẽ 2 nhánh phân thức giải tích bằng thẻ <path> SVG với stroke="#2563eb" stroke-width="2"
    if (!hasFunctionCurve) {
      const ratParams = extractRationalParams(cleaned);
      if (ratParams) {
        const branches = generateRationalFunctionPaths(
          ratParams,
          adjMinX,
          adjMaxX,
          adjMinY,
          adjMaxY,
          toSvgX,
          toSvgY
        );
        for (const branch of branches) {
          svgElements.push(branch);
        }
      }
    }

    // Extract standalone node labels
    const nodeRegex = /\\node(?:\[([^\]]*)\])?\s*(?:at\s*\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\))?\s*\{([^}]*)\}/g;
    let nMatch;
    while ((nMatch = nodeRegex.exec(cleaned)) !== null) {
      const posOpt = nMatch[1] || '';
      const x = nMatch[2] !== undefined ? parseFloat(nMatch[2]) : 0;
      const y = nMatch[3] !== undefined ? parseFloat(nMatch[3]) : 0;
      let text = nMatch[4].replace(/\$/g, '').trim();
      let dx = 0, dy = 4;
      if (posOpt.includes('right')) dx = 12;
      if (posOpt.includes('left')) dx = -12;
      if (posOpt.includes('above')) dy = -10;
      if (posOpt.includes('below')) dy = 16;
      if (posOpt.includes('below left')) { dx = -10; dy = 14; }
      if (posOpt.includes('below right')) { dx = 10; dy = 14; }
      if (posOpt.includes('above left')) { dx = -10; dy = -10; }
      if (posOpt.includes('above right')) { dx = 10; dy = -10; }
      svgElements.push(`<text x="${(toSvgX(x) + dx).toFixed(1)}" y="${(toSvgY(y) + dy).toFixed(1)}" font-family="'Times New Roman', Times, serif" font-size="14" font-weight="600" font-style="italic" fill="#0f172a" text-anchor="middle">${text}</text>`);
    }

    if (svgElements.length <= 1) return null;

    return `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" class="max-w-full h-auto mx-auto my-2 drop-shadow-sm bg-white rounded-lg p-2 border border-slate-200">
      ${svgElements.join('\n      ')}
    </svg>`;
  } catch (e) {
    return null;
  }
}

export function getTikzSvg(raw: string): string | null {
  if (!raw) return null;
  const cleaned = cleanTikzCode(raw);
  const cached = tikzCache.get(raw) || tikzCache.get(cleaned);
  if (cached) return cached;
  try {
    const key = 'tikz_cache_' + btoa(encodeURIComponent(cleaned.slice(0, 100)));
    const local = localStorage.getItem(key);
    if (local) {
      tikzCache.set(raw, local);
      tikzCache.set(cleaned, local);
      return local;
    }
  } catch (e) {}
  const fallback = renderTikzFallbackSvg(raw);
  if (fallback) {
    tikzCache.set(raw, fallback);
    tikzCache.set(cleaned, fallback);
  }
  return fallback;
}

/**
 * Converts any TikZ blocks inside markdown/html into pre-rendered SVG strings
 * So that students opening the exam experience INSTANT image loading (0.001s)
 */
export function embedTikzSvgsInText(text: string): string {
  if (!text) return '';
  let result = text;
  // Replace ```tikz ... ``` or \begin{tikzpicture} ... \end{tikzpicture}
  result = result.replace(/(?:```[a-z]*\s*([\s\S]*?\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\})\s*```|```tikz\s*([\s\S]*?)```|(\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\}))/gi, (match, inner1, inner2, inner3) => {
    const tikzCode = inner1 || (inner2 ? `\\begin{tikzpicture}\n${inner2}\n\\end{tikzpicture}` : inner3 || match);
    const svg = getTikzSvg(tikzCode);
    if (svg) {
      return `\n\n${svg}\n\n`;
    }
    return match;
  });
  return result;
}

const tikzRenderQueue: Array<() => void> = [];
let isWorkerProcessing = false;

const processQueue = () => {
    if (isWorkerProcessing || tikzRenderQueue.length === 0) return;
    isWorkerProcessing = true;
    
    const task = tikzRenderQueue.shift();
    if (task) {
        task();
    }
};

const fixSvgLines = (svg: SVGSVGElement) => {
    try {
        const paths = Array.from(svg.querySelectorAll('path, line'));
        const segments: any[] = [];
        paths.forEach(p => {
            try {
                const bbox = (p as any).getBBox();
                if (bbox.width < 8 && bbox.height > 10) segments.push({ path: p, isVertical: true, isHorizontal: false, x: bbox.x + bbox.width / 2, y1: bbox.y, y2: bbox.y + bbox.height });
                if (bbox.height < 5 && bbox.width > 10) segments.push({ path: p, isVertical: false, isHorizontal: true, y: bbox.y + bbox.height / 2, x1: bbox.x, x2: bbox.x + bbox.width });
            } catch (e) {}
        });
        const verticals = segments.filter(s => s.isVertical);
        const horizontals = segments.filter(s => s.isHorizontal);
        verticals.forEach(v => {
            let nearestTop = v.y1, topDist = 1000;
            horizontals.forEach(h => { if (h.x1 - 5 <= v.x && v.x <= h.x2 + 5) { const dist = v.y1 - h.y; if (dist > -5 && dist < topDist) { topDist = Math.max(0, dist); nearestTop = h.y; } } });
            let nearestBottom = v.y2, bottomDist = 1000;
            horizontals.forEach(h => { if (h.x1 - 5 <= v.x && v.x <= h.x2 + 5) { const dist = h.y - v.y2; if (dist > -5 && dist < bottomDist) { bottomDist = Math.max(0, dist); nearestBottom = h.y; } } });
            if ((topDist > 0 && topDist < 15) || (bottomDist > 0 && bottomDist < 15)) {
                const finalTop = topDist < 15 ? nearestTop : v.y1;
                const finalBottom = bottomDist < 15 ? nearestBottom : v.y2;
                const oldHeight = v.y2 - v.y1;
                const newHeight = finalBottom - finalTop;
                if (oldHeight > 0 && newHeight > 0) {
                    const scaleY = newHeight / oldHeight;
                    const ty = finalTop - v.y1 * scaleY;
                    v.path.setAttribute('transform', `matrix(1, 0, 0, ${scaleY}, 0, ${ty})`);
                }
            }
        });
    } catch (e) {}
};

export const TikzTableWrapper = ({ children, svgContent }: { children?: React.ReactNode, svgContent?: string }) => {
    const containerRef = useRef<HTMLSpanElement>(null);
    
    useLayoutEffect(() => {
        if (containerRef.current) {
            const svgs = containerRef.current.querySelectorAll('svg');
            svgs.forEach(svg => fixSvgLines(svg));
        }
    }, [svgContent, children]);

    if (svgContent) {
        return (
            <span ref={containerRef} className="tikz-wrapper relative w-full flex flex-col items-center justify-center min-h-[100px]">
                <span className="tikzjax-instance w-full flex justify-center" dangerouslySetInnerHTML={{ __html: svgContent }} />
            </span>
        );
    }

    return (
        <span ref={containerRef} className="tikz-wrapper relative w-full flex flex-col items-center justify-center min-h-[100px]">
            {children}
        </span>
    );
};

export const TikzRenderer = ({ content }: { content: string }) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Instant resolution: use cached SVG or instant geometric fallback SVG
  const initialSvg = getTikzSvg(content);
  const [cachedSvg, setCachedSvg] = useState<string | null>(initialSvg);
  const [isLoading, setIsLoading] = useState(!initialSvg);

  useEffect(() => {
    // If we already have a valid SVG rendered, no need to block
    if (cachedSvg) {
      setIsLoading(false);
      return;
    }

    let timeoutId: any;
    let observer: MutationObserver | null = null;
    let isMounted = true;
    const startTime = Date.now();
    const cleaned = cleanTikzCode(content);

    // Fast initial fallback attempt
    const quickFallback = renderTikzFallbackSvg(cleaned);
    if (quickFallback) {
      tikzCache.set(content, quickFallback);
      tikzCache.set(cleaned, quickFallback);
      setCachedSvg(quickFallback);
      setIsLoading(false);
      return;
    }

    const renderTikz = () => {
      if (!isMounted) return;

      let processFn = (window as any).process_tikz || (window as any).onload;
      if (typeof processFn !== "function") {
        const timeElapsed = Date.now() - startTime;
        if (timeElapsed > 400) {
          // Do not block student. Use fallback immediately.
          const fallback = renderTikzFallbackSvg(cleaned);
          if (fallback) {
            tikzCache.set(content, fallback);
            tikzCache.set(cleaned, fallback);
            setCachedSvg(fallback);
          }
          setIsLoading(false);
          isWorkerProcessing = false;
          processQueue();
          return;
        }
        timeoutId = setTimeout(renderTikz, 100);
        return;
      }
      
      if (!cachedSvg) {
        setIsLoading(true);
      }
      setError(null);
      
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        
        const div = document.createElement("div");
        const script = document.createElement("script");
        script.type = "text/tikz";
        script.textContent = cleaned;
        scriptRef.current = script;
        
        div.appendChild(script);
        containerRef.current.appendChild(div);
        
        try {
          observer = new MutationObserver((mutations) => {
              if (!isMounted) return;
              for (const mutation of mutations) {
                  if (mutation.addedNodes.length > 0) {
                      const svg = containerRef.current?.querySelector('svg');
                      if (svg) {
                          fixSvgLines(svg);
                          const svgContent = svg.outerHTML;
                          tikzCache.set(content, svgContent);
                          tikzCache.set(cleaned, svgContent);
                          try {
                            const key = 'tikz_cache_' + btoa(encodeURIComponent(cleaned.slice(0, 100)));
                            localStorage.setItem(key, svgContent);
                          } catch (e) {}
                          setCachedSvg(svgContent);
                          setIsLoading(false);
                          
                          if (observer) observer.disconnect();
                          
                          isWorkerProcessing = false;
                          setTimeout(processQueue, 30);
                          return;
                      }
                  }
              }
          });

          observer.observe(containerRef.current, { childList: true, subtree: true });

          try {
              if (typeof (window as any).process_tikz === "function") {
                  (window as any).process_tikz(script);
              } else if (typeof (window as any).onload === "function") {
                  (window as any).onload();
              }
          } catch (e) {
              console.error(e);
          }
          
          timeoutId = setTimeout(() => {
              if (isMounted) {
                  const svg = containerRef.current?.querySelector('svg');
                  if (svg) {
                      fixSvgLines(svg);
                      const svgContent = svg.outerHTML;
                      tikzCache.set(content, svgContent);
                      tikzCache.set(cleaned, svgContent);
                      setCachedSvg(svgContent);
                      setIsLoading(false);
                  } else {
                      const fallback = renderTikzFallbackSvg(cleaned);
                      if (fallback) {
                          tikzCache.set(content, fallback);
                          tikzCache.set(cleaned, fallback);
                          setCachedSvg(fallback);
                      }
                      setIsLoading(false);
                  }
                  isWorkerProcessing = false;
                  processQueue();
              }
          }, 600);
          
        } catch (err: any) {
          console.error("Error processing TikZ code:", err);
          if (isMounted) {
            const fallback = renderTikzFallbackSvg(cleaned);
            if (fallback) {
              tikzCache.set(content, fallback);
              tikzCache.set(cleaned, fallback);
              setCachedSvg(fallback);
            } else {
              setError(err.message || "Lỗi khi biên dịch hình ảnh TikZ.");
            }
            setIsLoading(false);
            isWorkerProcessing = false;
            processQueue();
          }
        }
      }
    };

    tikzRenderQueue.push(renderTikz);
    processQueue();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (observer) observer.disconnect();
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, [content, cachedSvg]);

  if (cachedSvg) {
      return <TikzTableWrapper svgContent={cachedSvg} />;
  }

  return (
    <span className="tikz-wrapper relative w-full flex flex-col items-center justify-center min-h-[100px]">
      {isLoading && !error && (
        <span className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 block"></span>
        </span>
      )}
      {error && (
        <span className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 p-4 rounded-lg z-10 text-center text-sm border border-red-200 block">
          {error}
        </span>
      )}
      <span ref={containerRef} className="tikzjax-instance w-full flex justify-center" />
    </span>
  );
};
