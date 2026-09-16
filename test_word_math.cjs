const fs = require('fs');
const html = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns:m='http://schemas.microsoft.com/office/2004/12/omml' 
      xmlns:mml='http://www.w3.org/1998/Math/MathML'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'></head>
<body>
  <p>Test MathML:</p>
  <mml:math xmlns:mml="http://www.w3.org/1998/Math/MathML">
    <mml:msup>
      <mml:mi>x</mml:mi>
      <mml:mn>2</mml:mn>
    </mml:msup>
    <mml:mo>+</mml:mo>
    <mml:mml:msup>
      <mml:mi>y</mml:mi>
      <mml:mn>2</mml:mn>
    </mml:msup>
  </mml:math>
</body>
</html>
`;
fs.writeFileSync('test.doc', html);
