const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');
content = content.replace('          </div></div>)}</div>);}', '          </div>\n        </div>\n      )}\n    </div>\n  );\n}\n');
fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
