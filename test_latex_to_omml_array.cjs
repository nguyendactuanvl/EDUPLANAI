const { latexToOMML } = require('latex-to-omml');
(async () => {
  const tex = "\\begin{array}{|c|lccc|} \\hline x & -\\infty & & -b/2a & & +\\infty \\\\ \\hline y & +\\infty & \\searrow & & \\nearrow & +\\infty \\\\ & & & -\\Delta/4a & & \\\\ \\hline \\end{array}";
  try {
    const omml = await latexToOMML(tex);
    console.log(omml.substring(0, 100));
  } catch(e) {
    console.log("Error:", e);
  }
})();
