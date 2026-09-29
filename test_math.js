const fs = require('fs');
const html = `<html><body><math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>x</mi><mn>2</mn></msup><mo>&#x2265;</mo><mn>0</mn></math></body></html>`;
fs.writeFileSync('test.doc', html);
