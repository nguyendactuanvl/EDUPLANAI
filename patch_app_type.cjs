const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  'const [retryStatus, setRetryStatus] = useState<{ attempt: number, maxRetries: number } | null>(null);',
  'const [retryStatus, setRetryStatus] = useState<{ attempt: number, maxRetries: number, message?: string } | null>(null);'
);
fs.writeFileSync('src/App.tsx', content);
