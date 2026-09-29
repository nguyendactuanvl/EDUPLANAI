const exams = [
  { code: '101', questions: [{ correctOptionIndex: 0 }, { correctOptionIndex: 1 }] },
  { code: '102', questions: [{ correctOptionIndex: 2 }, { correctOptionIndex: 3 }] }
];
let csvContent = "Câu," + exams.map(e => e.code).join(",") + "\n";
const numQuestions = exams[0].questions.length;
for (let i = 0; i < numQuestions; i++) {
  const row = [i + 1];
  for (const exam of exams) {
    const q = exam.questions[i];
    row.push(String.fromCharCode(65 + (q.correctOptionIndex || 0)));
  }
  csvContent += row.join(",") + "\n";
}
console.log(csvContent);
