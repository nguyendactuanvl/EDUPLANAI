let content = `Câu 2: Cho hàm số bậc bốn $y = f(x)$ có đồ thị là đường cong trong hình dưới đây:
    \\begin{tikzpicture}[scale=0.8]
    \\draw[->] (-3,0) -- (3,0) node[right] {$x$};
    \\draw[->] (0,-3.5) -- (0,3.5) node[above] {$y$};
    \\node[below left] at (0,0) {$0$};
    \\draw[dashed] (-2,0) -- (-2,3) -- (0,3);
    \\draw[dashed] (2,0) -- (2,3) -- (0,3);
    \\draw[dashed] (-1,0) -- (-1,1) -- (0,1);
    \\draw[dashed] (1,0) -- (1,1) -- (0,1);
    \\draw[thick, domain=-2.3:2.3, samples=100] plot (\\x, {-(\\x)^4 + 4*(\\x)^2});
    \\node[below] at (-2,0) {$-2$};
    \\node[below] at (-1,0) {$-1$};
    \\node[below] at (1,0) {$1$};
    \\node[below] at (2,0) {$2$};
    \\node[left] at (0,3) {$3$};
    \\node[left] at (0,1) {$1$};
    \\node[left] at (0,-1) {$-1$};
    \\node[left] at (0,-3) {$-3$};
    \\end{tikzpicture}
    Hàm số đã cho đồng biến trên khoảng nào dưới đây?`;

let processedContent = content;
processedContent = processedContent.replace(/```[a-z]*\s*(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})\s*```/g, '$1');
processedContent = processedContent.replace(/(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})/g, '\n\n```tikz\n$1\n```\n\n');

console.log(processedContent);
