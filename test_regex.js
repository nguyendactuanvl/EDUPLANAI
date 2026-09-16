let text = `
Here is a graph:
\\begin{tikzpicture}
\\draw (0,0) -- (1,1);
\\end{tikzpicture}

Here is another one wrapped properly:
\`\`\`tikz
\\begin{tikzpicture}
\\draw (2,2) -- (3,3);
\\end{tikzpicture}
\`\`\`

And another with just \`\`\`:
\`\`\`
\\begin{tikzpicture}
\\draw (2,2) -- (3,3);
\\end{tikzpicture}
\`\`\`
`;

// 1. Unwrap
text = text.replace(/```[a-z]*\s*(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})\s*```/g, '$1');

// 2. Wrap
text = text.replace(/(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})/g, '\n```tikz\n$1\n```\n');

console.log(text);
