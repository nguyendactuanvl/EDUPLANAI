const str = "\\begin{tikzpicture}\n\\draw[->] (-3,0) -- (3,0) node[right] {$x$};\n\\end{tikzpicture}";
const base64 = btoa(encodeURIComponent(str));
const decoded = decodeURIComponent(atob(base64));
console.log(str === decoded);
