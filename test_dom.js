import { JSDOM } from 'jsdom';
const dom = new JSDOM();
const document = dom.window.document;
const mathmlHtml = '<mml:math><mml:mrow><mml:mi>x</mml:mi></mml:mrow></mml:math>';
const tempDiv = document.createElement('div');
tempDiv.innerHTML = mathmlHtml;
console.log(tempDiv.innerHTML);
