const { JSDOM } = require("jsdom");
const dom = new JSDOM();
const document = dom.window.document;
const tempDiv = document.createElement('div');
tempDiv.innerHTML = '<mml:math><mml:mi>x</mml:mi></mml:math>';
const newMathNode = tempDiv.firstChild;
if (newMathNode) {
    newMathNode.setAttribute("xmlns:mml", "http://www.w3.org/1998/Math/MathML");
    console.log(tempDiv.innerHTML);
}
