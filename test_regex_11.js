const str = "\\begin{tikzpicture }";
const regex = /(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})/g;
console.log(regex.test(str));
