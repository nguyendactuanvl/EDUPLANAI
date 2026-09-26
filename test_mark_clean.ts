function cleanMarkTags(text: string): string {
  if (!text) return '';
  let s = text;
  // Strip mangled style=\text... or style="..." or style='...'
  s = s.replace(/<mark\s+style=[^>]*>([\s\S]*?)<\/mark>/gi, (_m, content) => {
    const cleanContent = content.replace(/<\/?mark[^>]*>/gi, '').trim();
    return `**${cleanContent}**`;
  });
  s = s.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, (_m, content) => {
    const cleanContent = content.replace(/<\/?mark[^>]*>/gi, '').trim();
    return `**${cleanContent}**`;
  });
  s = s.replace(/<\/?mark[^>]*>/gi, '');
  return s;
}

const img1 = `c) Gắn kết với <mark style=\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {"}}}}}}}}}}}}}}}}background-color: #dbeafe; color: #1d4ed8; font-weight: bold; padding: 2px 4px; border-radius: 4px;\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {\\text {"}}}}}}}}}}}}}}}}>GeoGebra</mark>.`;

const img4 = `b) Nội dung: Tìm tất cả các đường tiệm cận ngang và tiệm cận đứng của đồ thị hàm số y = \\frac{2x+3}{x-1}. Kiểm tra lại bằng <mark style="background-color: #dbeafe; color: #1d4ed8; font-weight: bold; padding: 2px 4px; border-radius: 4px;">GeoGebra</mark>.`;

const userExample = `Kiểm tra lại bằng <mark style="\\"" background-color: #dbeafe; color: #1d4ed8; font-weight: bold; padding: 2px 4px; border-radius: 4px;"\\"">GeoGebra<"/" mark>.`;

console.log("IMG1:", cleanMarkTags(img1));
console.log("IMG4:", cleanMarkTags(img4));
console.log("USER:", cleanMarkTags(userExample));
