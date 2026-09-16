const str = "\\\\begin{tikzpicture}"; // Four backslashes in JS string literal means two actual backslashes in the string
const regex = /\\begin\{tikzpicture\}/g;
console.log("Original string:", str);
console.log("Replaced:", str.replace(regex, "MATCH"));
