import pptxgen from "pptxgenjs";
async function test() {
  const pres = new pptxgen();
  const slide = pres.addSlide();
  slide.addText([ { text: 'Hello', options: { bullet: true } } ]);
  await pres.writeFile({ fileName: 'test.pptx' });
}
test().catch(console.error);
