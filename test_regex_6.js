const str = "Câu 2: Cho hàm số\n\\begin{tikzpicture}[scale=0.8]\n\\draw (-3,0);\n\\end{tikzpicture}\nHàm số...";

const regex = /(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})/g;

console.log("Original string:");
console.log(str);
console.log("Regex matches:", str.match(regex));
console.log("Replaced:");
console.log(str.replace(regex, '\n\n```tikz\n$1\n```\n\n'));
