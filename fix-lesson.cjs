const fs = require('fs');
let lesson = fs.readFileSync('src/pages/LessonPlan.tsx', 'utf8');
lesson = lesson.replace(
  'useState<"system" | "upload">("system");',
  'useState<"system" | "upload" | "upgrade">("system");'
);

// revert `"upload"` back to `"upgrade"` where I replaced it earlier?
// In the previous step I used lesson = lesson.replace(/"upgrade"/g, '"upload"');
// So I should git checkout src/pages/LessonPlan.tsx? Wait, not a git repo.
