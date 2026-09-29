function stripInternalTags(text: string): string {
  if (!text) return '';
  const hasLeadingSpace = /^\s/.test(text);
  const hasTrailingSpace = /\s$/.test(text);
  let res = text
    .replace(/(Câu\s*\d+)\s*[:\.]?\s*[\(\[]\s*Loại(?:\s*trắc\s*nghiệm|\s*đúng\s*sai|\s*trả\s*lời\s*ngắn|\s*tự\s*luận|[:\s]+[a-z0-9_\-]+)?\s*[\)\]]\s*[:\.]?/gi, '$1:')
    .replace(/[\(\[]\s*Loại(?:\s*trắc\s*nghiệm|\s*đúng\s*sai|\s*trả\s*lời\s*ngắn|\s*tự\s*luận|[:\s]+[a-z0-9_\-]+)?\s*[\)\]]\s*:?/gi, '')
    .replace(/(Câu\s*\d+[:\.])\s*/gi, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!res) return hasLeadingSpace || hasTrailingSpace ? ' ' : '';
  if (hasLeadingSpace) res = ' ' + res;
  if (hasTrailingSpace) res = res + ' ';
  return res;
}

console.log("TEST stripInternalTags with spaces:");
console.log(JSON.stringify(stripInternalTags("Đường thẳng ")));
console.log(JSON.stringify(stripInternalTags(" là tiệm cận ngang ")));
console.log(JSON.stringify(stripInternalTags(" nếu ")));
