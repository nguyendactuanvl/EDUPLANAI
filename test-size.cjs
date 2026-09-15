const zlib = require('zlib');
const data = {
  examName: "ĐỀ KIỂM TRA MÔN TOÁN LỚP 9",
  questions: Array.from({length: 20}).map((_, i) => ({
    id: i,
    content: "Cho tam giác ABC vuông tại A. " + " ".repeat(100),
    options: ["A", "B", "C", "D"],
    correctOptionIndex: 1
  }))
};
const json = JSON.stringify(data);
console.log("Raw JSON:", json.length);
const deflated = zlib.deflateSync(json).toString('base64');
console.log("Deflated Base64:", deflated.length);
