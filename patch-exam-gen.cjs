const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

// Patch 1: Original View
content = content.replace(
  "{q.type === 'mc' && q.options && (",
  `{q.type === 'tf' && q.tfStatements && (
                          <div className="flex flex-col gap-3 pl-4">
                            {q.tfStatements.map((stmt, sIdx) => (
                              <div key={sIdx} className="flex items-start gap-1 p-2 rounded-md border border-transparent">
                                <span className="shrink-0 font-medium">{['a)', 'b)', 'c)', 'd)'][sIdx] || String.fromCharCode(97 + sIdx) + ')'}</span>
                                <div className="markdown-body inline-markdown flex-1"><Markdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} >{stmt.statement}</Markdown></div>
                                <span className={\`shrink-0 font-bold px-2 rounded \${stmt.correct ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'}\`}>
                                  {stmt.correct ? 'Đ' : 'S'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === 'mc' && q.options && (`
);

// Patch 2: Print View
content = content.replace(
  "{q.type !== 'mc' && (",
  `{q.type === 'tf' && q.tfStatements && (
                                  <div className="options" style={{display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px'}}>
                                    {q.tfStatements.map((stmt, sIdx) => (
                                      <div key={sIdx} className="option" style={{paddingLeft: '10px', display: 'flex', gap: '4px', alignItems: 'flex-start'}}>
                                        <span style={{fontWeight: 'bold', flexShrink: 0}}>{['a)', 'b)', 'c)', 'd)'][sIdx] || String.fromCharCode(97 + sIdx) + ')'}</span>
                                        <div className="markdown-body inline-markdown" style={{flex: 1}}><Markdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} >{stmt.statement}</Markdown></div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {q.type !== 'mc' && q.type !== 'tf' && (`
);

// Patch 3: Answers
content = content.replace(
  "{q.type === 'mc' ? String.fromCharCode(65 + (q.correctOptionIndex || 0)) : <div className=\"markdown-body inline-markdown\" style={{display: 'inline'}}><Markdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} >{q.correctAnswer || ''}</Markdown></div>}",
  "{q.type === 'mc' ? String.fromCharCode(65 + (q.correctOptionIndex || 0)) : (q.type === 'tf' && q.tfStatements ? q.tfStatements.map(s => s.correct ? 'Đ' : 'S').join('-') : <div className=\"markdown-body inline-markdown\" style={{display: 'inline'}}><Markdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} >{q.correctAnswer || ''}</Markdown></div>)}"
);

fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
console.log("Patched src/pages/ExamGenerator.tsx");
