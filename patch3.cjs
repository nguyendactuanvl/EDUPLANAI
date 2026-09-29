const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

const regex = /<div className="answers-title">Đáp án Mã đề \{exam\.code\}:<\/div>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\}\)\}\s*<\/div>\s*<\/>/;

const newAnswerHtml = `
                            <div className="answers-title text-center uppercase mt-8 mb-4">BẢNG ĐÁP ÁN (Mã đề {exam.code})</div>
                            <table className="w-full border-collapse border border-black mt-2 text-center text-sm" style={{fontFamily: '"Times New Roman", Times, serif'}}>
                              <tbody>
                                {Array.from({ length: Math.ceil(exam.questions.length / 10) }).map((_, rowIndex) => (
                                  <tr key={rowIndex}>
                                    {exam.questions.slice(rowIndex * 10, rowIndex * 10 + 10).map((q, colIndex) => {
                                      const ansIndex = rowIndex * 10 + colIndex;
                                      let ans = "";
                                      if (q.type === 'mc') {
                                        ans = String.fromCharCode(65 + (q.correctOptionIndex || 0));
                                      } else if (q.type === 'tf' && q.tfStatements) {
                                        ans = q.tfStatements.map(s => s.correct ? 'Đ' : 'S').join('');
                                      }
                                      return (
                                        <td key={colIndex} className="border border-black p-1">
                                          <strong>{ansIndex + 1}.</strong> {q.type !== 'mc' && q.type !== 'tf' ? (
                                            <div className="markdown-body inline-markdown" style={{display: 'inline'}}><Markdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} >{q.correctAnswer || ''}</Markdown></div>
                                          ) : ans}
                                        </td>
                                      )
                                    })}
                                    {/* Fill empty cells if the last row has less than 10 columns */}
                                    {Array.from({ length: 10 - exam.questions.slice(rowIndex * 10, rowIndex * 10 + 10).length }).map((_, emptyColIndex) => (
                                      <td key={'empty-' + emptyColIndex} className="border border-black p-1"></td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>`;

if (regex.test(content)) {
  content = content.replace(regex, newAnswerHtml);
  fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
  console.log("Patched Answer Table successfully!");
} else {
  console.log("Regex did not match.");
}
