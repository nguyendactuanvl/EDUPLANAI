const fs = require('fs');
let code = fs.readFileSync('src/components/TikzRenderer.tsx', 'utf8');

// The logic is currently hardcoded in the observer/fallback. Let's extract it into a wrapper component.
// Wait, the user asked to "Create a Wrapper component for the variation table in which we check the coordinates...".
// It is actually better to just create a new component `TikzWrapper` in `src/components/TikzRenderer.tsx` and export it, or modify the render function.
// Since we already HAVE the logic in the MutationObserver & Fallback inside `TikzRenderer`, let's just make sure we export a clean TikzWrapper if they want to wrap it directly, or just ensure our current logic satisfies the "wrapper component" requirement.
// Our current logic IS inside the `TikzRenderer` component, which is a wrapper around the tikzjax script.
// Let's refactor the logic into a reusable `fixSvgLines` function, and ensure the component is cleanly structured.

const newCode = `import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';

// Global cache for TikZ SVGs
const tikzCache = new Map<string, string>();

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
                    v.path.setAttribute('transform', \`matrix(1, 0, 0, \${scaleY}, 0, \${ty})\`);
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
        
        const div = document.createElement("div");
        const script = document.createElement("script");
        script.type = "text/tikz";
        script.textContent = content;
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
                      setCachedSvg(svgContent);
                  }
                  setIsLoading(false);
                  isWorkerProcessing = false;
                  processQueue();
              }
          }, 5000);
          
        } catch (err: any) {
          console.error("Error processing TikZ code:", err);
          if (isMounted) {
            setError(err.message || "Lỗi khi biên dịch hình ảnh TikZ.");
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
`;

fs.writeFileSync('src/components/TikzRenderer.tsx', newCode);
console.log("Refactored TikzRenderer and added TikzTableWrapper");
