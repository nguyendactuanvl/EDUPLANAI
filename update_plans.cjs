const fs = require('fs');

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add import
  if (!content.includes("GDPT_2018_SUBJECTS")) {
    content = content.replace(
      "import { apiFetch } from '../lib/apiFetch';",
      "import { apiFetch } from '../lib/apiFetch';\nimport { GDPT_2018_SUBJECTS } from '../lib/subjects';"
    );
  }

  // Find the select block for subjects.
  // In LessonPlan, there are multiple selects for subject (lines ~302 and ~422).
  // The options look like:
  /*
                <option value="Ngữ văn">Ngữ văn</option>
                <option value="Toán">Toán</option>
                ...
                <option value="Chuyên đề học tập">Chuyên đề học tập</option>
  */
  // We can replace the block using regex.
  const optionRegex = /<option value="Ngữ văn">Ngữ văn<\/option>[\s\S]*?<option value="Chuyên đề học tập">Chuyên đề học tập<\/option>/g;
  const newOptions = `{GDPT_2018_SUBJECTS.map(sub => (<option key={sub} value={sub}>{sub}</option>))}`;

  content = content.replace(optionRegex, newOptions);
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

updateFile('src/pages/LessonPlan.tsx');
updateFile('src/pages/EducationalPlan.tsx');
