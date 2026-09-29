const html = '<math><mrow><msub><mi>u</mi><mn>6</mn></msub></mrow></math>';
const prefixed = html.replace(/<(\/?)([a-z]+)/gi, '<$1mml:$2');
console.log(prefixed);
