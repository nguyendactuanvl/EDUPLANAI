const fs = require('fs');
let content = fs.readFileSync('src/pages/EducationalPlan.tsx', 'utf8');

if (!content.includes('{error &&')) {
  content = content.replace(
    'const [isGenerating, setIsGenerating] = useState(false);',
    'const [isGenerating, setIsGenerating] = useState(false);\n  const [error, setError] = useState<string | null>(null);'
  );
  
  content = content.replace(
    'const [error, setError] = useState<string | null>(null);\n  const [error, setError] = useState<string | null>(null);',
    'const [error, setError] = useState<string | null>(null);'
  );

  content = content.replace(
    '<button onClick={handleGenerate} disabled={isGenerating}',
    '{error && <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">{error}</div>}\n            <button onClick={handleGenerate} disabled={isGenerating}'
  );
  
  content = content.replace(
    /catch\s*\(\s*err\s*:\s*any\s*\)\s*\{\s*alert\(err\.message\);\s*\}/,
    'catch (err: any) { setError(err.message); }'
  );
  
  content = content.replace(
    'setIsGenerating(true);',
    'setIsGenerating(true);\n    setError(null);'
  );
  
  fs.writeFileSync('src/pages/EducationalPlan.tsx', content);
}
