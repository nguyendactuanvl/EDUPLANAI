import pptxgen from "pptxgenjs";
async function test() {
  const pres = new pptxgen();
  const slide = pres.addSlide();
  slide.addText([{ text: '', options: { bullet: true } }]);
  await pres.writeFile({ fileName: 'test4.pptx' });
}
test().catch(console.error);
