const str = "\\\\begin{tikzpicture}"; // This is two backslashes in the string
const regex = /\\begin\{tikzpicture\}/;
console.log("String is:", str);
console.log("Match single backslash?", regex.test(str));
