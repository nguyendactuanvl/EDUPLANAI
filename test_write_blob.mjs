import pptxgen from 'pptxgenjs';
async function test() {
  const pres = new pptxgen();
  pres.addSlide().addText("Hello");
  const blob = await pres.write({ outputType: 'blob' });
  console.log("Success, type:", typeof blob);
}
test();
