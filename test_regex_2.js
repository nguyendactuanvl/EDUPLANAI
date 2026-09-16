let processedContent = `
\\begin{tikzpicture}[scale=0.8]
\\draw[->] (-3,0) -- (3,0) node[right] {$x$};
\\end{tikzpicture}
`;

processedContent = processedContent.replace(/```[a-z]*\s*(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})\s*```/g, '$1');
processedContent = processedContent.replace(/(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})/g, '\n\n```tikz\n$1\n```\n\n');

console.log("Output:");
console.log(processedContent);
