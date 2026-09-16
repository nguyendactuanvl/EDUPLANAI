const { latexToOMML } = require('latex-to-omml');
async function run() {
  const omml = await latexToOMML('u_6 = u_1 \\cdot q^5');
  console.log(omml);
}
run();
