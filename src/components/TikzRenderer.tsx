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

export function renderTikzFallbackSvg(raw: string): string | null {
  try {
    const cleaned = cleanTikzCode(raw);
    const svgElements: string[] = [];
    const allCoords: { x: number; y: number }[] = [];

    // Extract all coordinates from draw and node commands to compute dynamic bounding box
    const coordRegexGlobal = /\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\)/g;
    let anyMatch;
    while ((anyMatch = coordRegexGlobal.exec(cleaned)) !== null) {
      allCoords.push({ x: parseFloat(anyMatch[1]), y: parseFloat(anyMatch[2]) });
    }

    // Default bounding box if few or no coordinates detected
    let minX = -4, maxX = 4, minY = -3, maxY = 3;
    if (allCoords.length >= 2) {
      minX = Math.min(...allCoords.map(c => c.x));
      maxX = Math.max(...allCoords.map(c => c.x));
      minY = Math.min(...allCoords.map(c => c.y));
      maxY = Math.max(...allCoords.map(c => c.y));
    }

    // Add 15% margin
    const spanX = Math.max(maxX - minX, 2);
    const spanY = Math.max(maxY - minY, 2);
    const padX = spanX * 0.15;
    const padY = spanY * 0.15;
    const adjMinX = minX - padX;
    const adjMaxX = maxX + padX;
    const adjMinY = minY - padY;
    const adjMaxY = maxY + padY;

    const svgWidth = 380;
    const svgHeight = Math.max(200, Math.min(340, Math.round(svgWidth * ((adjMaxY - adjMinY) / (adjMaxX - adjMinX)))));

    const toSvgX = (x: number) => ((x - adjMinX) / (adjMaxX - adjMinX)) * svgWidth;
    const toSvgY = (y: number) => svgHeight - ((y - adjMinY) / (adjMaxY - adjMinY)) * svgHeight;

    svgElements.push(`<defs>
      <marker id="arrow-head" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#334155" />
      </marker>
    </defs>`);

    // Extract draw commands
    const drawRegex = /\\draw(?:\[([^\]]*)\])?\s*([^\;]+);/g;
    let match;
    while ((match = drawRegex.exec(cleaned)) !== null) {
      const opts = match[1] || '';
      const body = match[2] || '';

      const isArrow = opts.includes('->') || opts.includes('stealth') || opts.includes('latex');
      const isDashed = opts.includes('dashed') || opts.includes('dotted');
      const strokeColor = opts.includes('red') ? '#dc2626' : opts.includes('blue') ? '#2563eb' : opts.includes('emerald') || opts.includes('green') ? '#059669' : '#334155';
      const fillColor = (opts.includes('fill') || body.includes('fill')) ? 'rgba(148, 163, 184, 0.22)' : 'none';

      // Circle support: (x,y) circle [radius=r] or (x,y) circle (r)
      const circleMatch = body.match(/\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\)\s*circle\s*(?:\[radius=\s*([-\d\.]+)\s*\]|\(\s*([-\d\.]+)\s*\))/);
      if (circleMatch) {
        const cx = parseFloat(circleMatch[1]);
        const cy = parseFloat(circleMatch[2]);
        const r = parseFloat(circleMatch[3] || circleMatch[4] || '1');
        const rx = (r / (adjMaxX - adjMinX)) * svgWidth;
        svgElements.push(`<circle cx="${toSvgX(cx)}" cy="${toSvgY(cy)}" r="${rx}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${opts.includes('thick') ? 2 : 1.5}" ${isDashed ? 'stroke-dasharray="4,4"' : ''} />`);
        continue;
      }

      // Match coordinates (x, y)
      const coordRegex = /\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\)/g;
      const coords: { x: number; y: number }[] = [];
      let cMatch;
      while ((cMatch = coordRegex.exec(body)) !== null) {
        coords.push({ x: parseFloat(cMatch[1]), y: parseFloat(cMatch[2]) });
      }

      if (coords.length >= 2) {
        if (body.includes('-- cycle') || (opts.includes('fill') && !isArrow)) {
          const pointsStr = coords.map(c => `${toSvgX(c.x).toFixed(1)},${toSvgY(c.y).toFixed(1)}`).join(' ');
          svgElements.push(`<polygon points="${pointsStr}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${opts.includes('thick') ? 2 : 1.5}" ${isDashed ? 'stroke-dasharray="4,4"' : ''} />`);
        } else {
          for (let i = 0; i < coords.length - 1; i++) {
            const hasArrow = isArrow && (i === coords.length - 2);
            svgElements.push(`<line x1="${toSvgX(coords[i].x).toFixed(1)}" y1="${toSvgY(coords[i].y).toFixed(1)}" x2="${toSvgX(coords[i+1].x).toFixed(1)}" y2="${toSvgY(coords[i+1].y).toFixed(1)}" stroke="${strokeColor}" stroke-width="${opts.includes('thick') ? 2 : 1.5}" ${isDashed ? 'stroke-dasharray="4,4"' : ''} ${hasArrow ? 'marker-end="url(#arrow-head)"' : ''} />`);
          }
        }
      }
    }

    // Extract node labels
    const nodeRegex = /\\node(?:\[([^\]]*)\])?\s*(?:at\s*\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\))?\s*\{([^}]*)\}/g;
    let nMatch;
    while ((nMatch = nodeRegex.exec(cleaned)) !== null) {
      const posOpt = nMatch[1] || '';
      const x = nMatch[2] !== undefined ? parseFloat(nMatch[2]) : 0;
      const y = nMatch[3] !== undefined ? parseFloat(nMatch[3]) : 0;
      let text = nMatch[4].replace(/\$/g, '').trim();
      let dx = 0, dy = 4;
      if (posOpt.includes('right')) dx = 10;
      if (posOpt.includes('left')) dx = -10;
      if (posOpt.includes('above')) dy = -10;
      if (posOpt.includes('below')) dy = 16;
      svgElements.push(`<text x="${(toSvgX(x) + dx).toFixed(1)}" y="${(toSvgY(y) + dy).toFixed(1)}" font-family="'Times New Roman', Times, serif" font-size="14" font-weight="500" font-style="italic" fill="#0f172a" text-anchor="middle">${text}</text>`);
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
    const containerRef = useRef<HTMLDivElement>(null);
    
    useLayoutEffect(() => {
        if (containerRef.current) {
            const svgs = containerRef.current.querySelectorAll('svg');
            svgs.forEach(svg => fixSvgLines(svg));
        }
    }, [svgContent, children]);

    if (svgContent) {
        return (
            <div ref={containerRef} className="tikz-wrapper relative w-full flex flex-col items-center justify-center min-h-[100px]">
                <div className="tikzjax-instance w-full flex justify-center" dangerouslySetInnerHTML={{ __html: svgContent }} />
            </div>
        );
    }

    return (
        <div ref={containerRef} className="tikz-wrapper relative w-full flex flex-col items-center justify-center min-h-[100px]">
            {children}
        </div>
    );
};

export const TikzRenderer = ({ content }: { content: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
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
      setCachedSvg(quickFallback);
      setIsLoading(false);
    }

    const renderTikz = () => {
      if (!isMounted) return;

      let processFn = (window as any).process_tikz || (window as any).onload;
      if (typeof processFn !== "function") {
        const timeElapsed = Date.now() - startTime;
        if (timeElapsed > 1500) {
          // Do not block student. Use fallback immediately.
          const fallback = renderTikzFallbackSvg(cleaned);
          if (fallback) {
            tikzCache.set(content, fallback);
            tikzCache.set(cleaned, fallback);
            setCachedSvg(fallback);
            setIsLoading(false);
          } else {
            setIsLoading(false);
            setError("Hình vẽ đang được tải...");
          }
          isWorkerProcessing = false;
          processQueue();
          return;
        }
        timeoutId = setTimeout(renderTikz, 150);
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
          }, 2000);
          
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
    <div className="tikz-wrapper relative w-full flex flex-col items-center justify-center min-h-[100px]">
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 p-4 rounded-lg z-10 text-center text-sm border border-red-200">
          {error}
        </div>
      )}
      <div ref={containerRef} className="tikzjax-instance w-full flex justify-center" />
    </div>
  );
};
