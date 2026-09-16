const { JSDOM } = require("jsdom");
const dom = new JSDOM();
const document = dom.window.document;
const html = '<mml:math xmlns:mml="http://www.w3.org/1998/Math/MathML"><mml:mi>x</mml:mi></mml:math>';
const div = document.createElement('div');
div.innerHTML = html;
console.log(div.querySelector('math') ? 'found math' : 'no math');
console.log(div.querySelector('mml\\:math') ? 'found mml:math' : 'no mml:math');
console.log(div.firstChild.tagName);
