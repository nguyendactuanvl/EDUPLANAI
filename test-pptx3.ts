import pptxgen from "pptxgenjs";
async function test() {
  const pres = new pptxgen();
  const slide = pres.addSlide();
  const bulletItems = [
    { text: 'Bullet 1', options: { bullet: true, fontSize: 18 } },
    { text: 'Bullet 2', options: { bullet: true, fontSize: 18 } }
  ];
  slide.addText(bulletItems, { x: 1, y: 1, w: 5, h: 5 });
  await pres.writeFile({ fileName: 'test3.pptx' });
}
test().catch(console.error);
