let content = `
\\begin{tikzpicture}
\\end{tikzpicture}
`;
console.log(content.replace(/(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})/g, '\n\n```tikz\n$1\n```\n\n'));
