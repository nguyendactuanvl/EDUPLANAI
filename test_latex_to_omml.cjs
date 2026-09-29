const { latexToOMML } = require('latex-to-omml');

(async () => {
  const tex = "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}";
  try {
    const omml = await latexToOMML(tex);
    console.log(omml);
  } catch(e) {
    console.log("Error:", e);
  }
})();
