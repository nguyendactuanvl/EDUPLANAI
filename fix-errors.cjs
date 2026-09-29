const fs = require('fs');

// Fix api/index.ts
let api = fs.readFileSync('api/index.ts', 'utf8');
api = api.replace('err.status === 400', '(err as any).status === 400');
fs.writeFileSync('api/index.ts', api);

// Fix src/pages/ExamGenerator.tsx
let exam = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');
if (!exam.includes('tfStatements?: {')) {
  exam = exam.replace(
    'correctAnswer?: string;',
    'correctAnswer?: string;\n  tfStatements?: { statement: string; correct: boolean }[];'
  );
  fs.writeFileSync('src/pages/ExamGenerator.tsx', exam);
}

// Fix src/lib/apiFetch.ts
let apiFetch = fs.readFileSync('src/lib/apiFetch.ts', 'utf8');
apiFetch = apiFetch.replace(/import\.meta\.env/g, '(import.meta as any).env');
fs.writeFileSync('src/lib/apiFetch.ts', apiFetch);

// Fix src/lib/exportUtils.ts
let exportUtils = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');
exportUtils = exportUtils.replace(/node\.setAttribute/g, '(node as Element).setAttribute');
exportUtils = exportUtils.replace(/node\.querySelectorAll/g, '(node as Element).querySelectorAll');
exportUtils = exportUtils.replace(/node\.querySelector/g, '(node as Element).querySelector');
fs.writeFileSync('src/lib/exportUtils.ts', exportUtils);

// Fix src/pages/ExerciseSolver.tsx
let exercise = fs.readFileSync('src/pages/ExerciseSolver.tsx', 'utf8');
exercise = exercise.replace('errorData.error', 'data.error');
fs.writeFileSync('src/pages/ExerciseSolver.tsx', exercise);

// Fix src/types.ts
let types = fs.readFileSync('src/types.ts', 'utf8');
types = types.replace('  subject?: string; // 10, 11, 12\n  subject: string;\n', '  subject: string;\n');
fs.writeFileSync('src/types.ts', types);

// Fix src/pages/LessonPlan.tsx
let lesson = fs.readFileSync('src/pages/LessonPlan.tsx', 'utf8');
lesson = lesson.replace(/"upgrade"/g, '"upload"');
fs.writeFileSync('src/pages/LessonPlan.tsx', lesson);

console.log("Fixed errors");
