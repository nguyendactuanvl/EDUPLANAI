const fs = require('fs');

// 1. Add KaTeX CSS to index.html
let htmlContent = fs.readFileSync('index.html', 'utf8');
if (!htmlContent.includes("katex.min.css")) {
  htmlContent = htmlContent.replace(
    '</head>',
    '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71bZlhw9vS" crossorigin="anonymous">\n  </head>'
  );
  fs.writeFileSync('index.html', htmlContent);
  console.log("Added KaTeX CSS to index.html");
}

