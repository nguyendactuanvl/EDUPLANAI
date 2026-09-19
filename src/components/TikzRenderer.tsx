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
    
    // Scale factor & coordinate center for standard 2D Cartesian diagrams
    const scale = 36;
    const originX = 180;
    const originY = 160;
    const toSvgX = (x: number) => originX + x * scale;
    const toSvgY = (y: number) => originY - y * scale;

    svgElements.push(`<defs>
      <marker id="arrow-head" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#334155" />
      </marker>
    </defs>`);

    // Extract draw commands
    const drawRegex = /\\draw(?:\[([^\]]*)\])?\s*([^\;]+);/g;
    let match;
    while ((match = drawRegex.exec(cleaned)) !== null) {
      const opts = match[1] || '';
      const body = match[2] || '';

      const isArrow = opts.includes('->') || opts.includes('stealth') || opts.includes('latex');
      const isDashed = opts.includes('dashed');
      const strokeColor = opts.includes('red') ? '#dc2626' : opts.includes('blue') ? '#2563eb' : '#334155';
      const fillColor = (opts.includes('fill') || body.includes('fill')) ? 'rgba(148, 163, 184, 0.25)' : 'none';

      // Match coordinates (x, y)
      const coordRegex = /\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*\)/g;
      const coords: { x: number; y: number }[] = [];
      let cMatch;
      while ((cMatch = coordRegex.exec(body)) !== null) {
        coords.push({ x: parseFloat(cMatch[1]), y: parseFloat(cMatch[2]) });
      }

      if (coords.length >= 2) {
        if (body.includes('-- cycle') || opts.includes('fill')) {
          const pointsStr = coords.map(c => `${toSvgX(c.x)},${toSvgY(c.y)}`).join(' ');
          svgElements.push(`<polygon points="${pointsStr}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${opts.includes('thick') ? 2 : 1.5}" ${isDashed ? 'stroke-dasharray="4,4"' : ''} />`);
        } else {
          for (let i = 0; i < coords.length - 1; i++) {
            svgElements.push(`<line x1="${toSvgX(coords[i].x)}" y1="${toSvgY(coords[i].y)}" x2="${toSvgX(coords[i+1].x)}" y2="${toSvgY(coords[i+1].y)}" stroke="${strokeColor}" stroke-width="${opts.includes('thick') ? 2 : 1.5}" ${isDashed ? 'stroke-dasharray="4,4"' : ''} ${isArrow ? 'marker-end="url(#arrow-head)"' : ''} />`);
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
      svgElements.push(`<text x="${toSvgX(x) + dx}" y="${toSvgY(y) + dy}" font-family="sans-serif" font-size="13" font-style="italic" fill="#1e293b" text-anchor="middle">${text}</text>`);
    }

    if (svgElements.length <= 1) return null;

    return `<svg width="360" height="320" viewBox="0 0 360 320" xmlns="http://www.w3.org/2000/svg" class="max-w-full h-auto">
      ${svgElements.join('\n      ')}
    </svg>`;
  } catch (e) {
    return null;
  }
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
  const [isLoading, setIsLoading] = useState(true);
  const [cachedSvg, setCachedSvg] = useState<string | null>(tikzCache.get(content) || null);

  useEffect(() => {
    if (cachedSvg) {
        setIsLoading(false);
        return;
    }

    let timeoutId: any;
    let observer: MutationObserver | null = null;
    let isMounted = true;
    const startTime = Date.now();

    const renderTikz = () => {
      if (!isMounted) return;

      let processFn = (window as any).process_tikz || (window as any).onload;
      if (typeof processFn !== "function") {
        const timeElapsed = Date.now() - startTime;
        if (timeElapsed > 10000) {
            setIsLoading(false);
            setError("Không thể tải thư viện vẽ hình TikZ. Máy chủ TikzJax có thể đang phản hồi chậm hoặc bị chặn.");
            isWorkerProcessing = false;
            processQueue();
            return;
        }
        timeoutId = setTimeout(renderTikz, 200);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const cleaned = cleanTikzCode(content);
        
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
                          setCachedSvg(svgContent);
                          setIsLoading(false);
                          
                          if (observer) observer.disconnect();
                          
                          isWorkerProcessing = false;
                          setTimeout(processQueue, 50);
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
              if (isMounted && isLoading) {
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
                      } else {
                          setError("Không thể biên dịch hình vẽ TikZ.");
                      }
                      setIsLoading(false);
                  }
                  isWorkerProcessing = false;
                  processQueue();
              }
          }, 4000);
          
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
