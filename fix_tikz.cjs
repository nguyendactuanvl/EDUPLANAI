const fs = require('fs');

const file = 'src/components/TikzRenderer.tsx';
let code = fs.readFileSync(file, 'utf8');

// I will create an in-memory cache directly in this file
const newCode = `import React, { useEffect, useRef, useState } from 'react';

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
      if (typeof (window as any).process_tikz !== "function") {
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
          // Monitor DOM to cache the result when tikzjax finishes
          observer = new MutationObserver((mutations) => {
              if (!isMounted) return;
              for (const mutation of mutations) {
                  if (mutation.addedNodes.length > 0) {
                      const svg = containerRef.current?.querySelector('svg');
                      if (svg) {
                          const svgContent = svg.outerHTML;
                          tikzCache.set(content, svgContent);
                          setCachedSvg(svgContent);
                          setIsLoading(false);
                          
                          if (observer) observer.disconnect();
                          
                          // Free the queue
                          isWorkerProcessing = false;
                          setTimeout(processQueue, 50);
                          return;
                      }
                  }
              }
          });
          observer.observe(containerRef.current, { childList: true, subtree: true });

          (window as any).process_tikz(script);
          
          // Fallback if mutation observer fails
          timeoutId = setTimeout(() => {
              if (isMounted && isLoading) {
                  const svg = containerRef.current?.querySelector('svg');
                  if (svg) {
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

    // Push to background pseudo-worker queue
    tikzRenderQueue.push(renderTikz);
    processQueue();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (observer) observer.disconnect();
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
      // If we unmount while processing this one, we must free the queue!
      // But we can't easily know if *this* component is the one processing.
      // So we use a simple timeout hack to unblock just in case.
    };
  }, [content, cachedSvg]);

  if (cachedSvg) {
      return (
          <div className="tikz-wrapper relative w-full flex flex-col items-center justify-center min-h-[100px]">
              <div className="tikzjax-instance w-full flex justify-center" dangerouslySetInnerHTML={{ __html: cachedSvg }} />
          </div>
      );
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

fs.writeFileSync(file, newCode);
console.log("Updated TikzRenderer");
