const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('import Markdown')) {
    let modified = false;
    
    // Add remarkGfm import if not exists
    if (!content.includes("import remarkGfm from 'remark-gfm'") && !content.includes('import remarkGfm from "remark-gfm"')) {
      content = content.replace(/import Markdown from ['"]react-markdown['"];/, "import Markdown from 'react-markdown';\nimport remarkGfm from 'remark-gfm';");
      modified = true;
    }
    
    // update remarkPlugins={[remarkMath]} to include remarkGfm
    if (content.includes('remarkPlugins={[remarkMath]}')) {
      content = content.replace(/remarkPlugins=\{\[remarkMath\]\}/g, "remarkPlugins={[remarkMath, remarkGfm]}");
      modified = true;
    } 

    // For plain Markdown components
    if (content.includes('<Markdown>')) {
      content = content.replace(/<Markdown>/g, "<Markdown remarkPlugins={[remarkGfm]}>");
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
});
