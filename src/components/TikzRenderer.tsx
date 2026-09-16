import React, { useEffect, useRef, useState } from 'react';

export const TikzRenderer = ({ content }: { content: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let timeoutId: any;
    let isMounted = true;

    const renderTikz = () => {
      if (!isMounted) return;
      if (typeof (window as any).process_tikz !== "function") {
        timeoutId = setTimeout(renderTikz, 100); // Poll every 100ms
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      if (containerRef.current) {
        // Clear previous content
        containerRef.current.innerHTML = '';
        
        const div = document.createElement("div");
        const script = document.createElement("script");
        script.type = "text/tikz";
        script.textContent = content;
        scriptRef.current = script;
        
        div.appendChild(script);
        containerRef.current.appendChild(div);
        
        try {
          // TikzJax modifies the DOM asynchronously, but process_tikz starts it.
          (window as any).process_tikz(script);
          // Hide loading after a short delay assuming processing starts
          setTimeout(() => { if (isMounted) setIsLoading(false); }, 500);
        } catch (err: any) {
          console.error("Error processing TikZ code:", err);
          if (isMounted) {
            setError(err.message || "Lỗi khi biên dịch hình ảnh TikZ.");
            setIsLoading(false);
          }
        }
      }
    };

    renderTikz();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, [content]);

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
