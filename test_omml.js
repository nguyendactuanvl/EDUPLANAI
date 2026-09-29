import temml from 'temml';
import omml from 'latex-to-omml';

const tex = "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}";
try {
  console.log("latex-to-omml:", omml(tex));
} catch(e) {
  console.log("latex-to-omml error:", e.message);
}
