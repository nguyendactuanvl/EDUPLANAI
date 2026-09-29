const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const docxEndpoint = `
app.post('/api/export-docx', async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) {
      return res.status(400).json({ error: 'Missing HTML content' });
    }
    
    // Convert inch to twips (1 inch = 1440 twips)
    // 2cm is ~0.787 inches = ~1134 twips
    const fileBuffer = await HTMLtoDOCX(html, null, {
      orientation: 'portrait',
      margins: { top: 1134, right: 1134, bottom: 1134, left: 1134, header: 720, footer: 720, gutter: 0 },
      font: 'Times New Roman',
      fontSize: 26, // 13pt (half-points)
      size: { width: 11906, height: 16838 }, // A4
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="document.docx"');
    res.send(fileBuffer);
  } catch (error) {
    console.error('DOCX Export error:', error);
    res.status(500).json({ error: 'Failed to generate Word document' });
  }
});
`;

if (!code.includes('/api/export-docx')) {
    // find app.use("/api", ...) and insert before it
    code = code.replace('app.use("/api", (req, res) => {', docxEndpoint + '\napp.use("/api", (req, res) => {');
    fs.writeFileSync('api/index.ts', code);
    console.log('Successfully injected /api/export-docx');
} else {
    console.log('Already exists');
}
