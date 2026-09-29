const fs = require('fs');

let code = fs.readFileSync('src/components/TikzRenderer.tsx', 'utf8');

const oldLogicStart = `
                          try {
                              const paths = Array.from(svg.querySelectorAll('path, line'));
`;

const oldLogicEnd = `
                      } catch (e) {}
`;

// Let's replace the whole setTimeout content just to be sure we add an outer wrapper
const targetFallback = `
          timeoutId = setTimeout(() => {
              if (isMounted && isLoading) {
                  const svg = containerRef.current?.querySelector('svg');
                  if (svg) {
                      try {
                          const paths = Array.from(svg.querySelectorAll('path, line'));
                          const segments = [];
                          paths.forEach(p => {
                              try {
                                  const bbox = p.getBBox();
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
                      
                      const svgContent = svg.outerHTML;
                      tikzCache.set(content, svgContent);
                      setCachedSvg(svgContent);
                  }
                  setIsLoading(false);
                  isWorkerProcessing = false;
                  processQueue();
              }
          }, 5000);
`;


// I will just use the current TikzRenderer, read it completely, then build the Wrapper component.
