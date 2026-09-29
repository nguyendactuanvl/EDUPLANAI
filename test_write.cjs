const pptxgen = require('pptxgenjs');
async function test() {
  const pres = new pptxgen();
  pres.addSlide().addText("Hello");
  const blob = await pres.write({ outputType: 'base64' });
  console.log("Success, length:", blob.length);
}
test();
