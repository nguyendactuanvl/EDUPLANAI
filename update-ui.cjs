const fs = require('fs');
let content = fs.readFileSync('src/pages/LessonPlan.tsx', 'utf8');

// 1. Move subject selector out.
// Wait, actually I can just put it above the `activeTab === 'system' ?` block.

content = content.replace(
`        <div className="flex bg-slate-100 p-1 rounded-lg">`,
`        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Môn học</label>
          <select 
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-4 bg-white"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="Ngữ văn">Ngữ văn</option>
            <option value="Toán">Toán</option>
            <option value="Tiếng Anh">Tiếng Anh</option>
            <option value="Giáo dục thể chất">Giáo dục thể chất</option>
            <option value="Lịch sử">Lịch sử</option>
            <option value="Địa lí">Địa lí</option>
            <option value="Giáo dục kinh tế và pháp luật">Giáo dục kinh tế và pháp luật</option>
            <option value="Vật lí">Vật lí</option>
            <option value="Hoá học">Hoá học</option>
            <option value="Sinh học">Sinh học</option>
            <option value="Công nghệ">Công nghệ</option>
            <option value="Tin học">Tin học</option>
            <option value="Âm nhạc">Âm nhạc</option>
            <option value="Mĩ thuật">Mĩ thuật</option>
            <option value="Hoạt động trải nghiệm, hướng nghiệp">Hoạt động trải nghiệm, hướng nghiệp</option>
            <option value="Giáo dục quốc phòng và an ninh">Giáo dục quốc phòng và an ninh</option>
            <option value="Chuyên đề học tập">Chuyên đề học tập</option>
          </select>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">`
);

// 2. Remove the old subject selector from the else block.
content = content.replace(
`            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Môn học</label>
              <select 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-4 bg-white"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="Ngữ văn">Ngữ văn</option>
                <option value="Toán">Toán</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Giáo dục thể chất">Giáo dục thể chất</option>
                <option value="Lịch sử">Lịch sử</option>
                <option value="Địa lí">Địa lí</option>
                <option value="Giáo dục kinh tế và pháp luật">Giáo dục kinh tế và pháp luật</option>
                <option value="Vật lí">Vật lí</option>
                <option value="Hoá học">Hoá học</option>
                <option value="Sinh học">Sinh học</option>
                <option value="Công nghệ">Công nghệ</option>
                <option value="Tin học">Tin học</option>
                <option value="Âm nhạc">Âm nhạc</option>
                <option value="Mĩ thuật">Mĩ thuật</option>
                <option value="Hoạt động trải nghiệm, hướng nghiệp">Hoạt động trải nghiệm, hướng nghiệp</option>
                <option value="Giáo dục quốc phòng và an ninh">Giáo dục quốc phòng và an ninh</option>
                <option value="Chuyên đề học tập">Chuyên đề học tập</option>
              </select>
            </div>`,
``);

// 3. Update the availableLessons filter
content = content.replace(
`  const availableLessons = useMemo(() => {
    return fullPlan.filter(plan => plan.grade === selectedGrade);
  }, [selectedGrade]);`,
`  const availableLessons = useMemo(() => {
    return fullPlan.filter(plan => plan.grade === selectedGrade && (plan.subject === subject || (!plan.subject && subject === "Toán")));
  }, [selectedGrade, subject]);`
);

// 4. Update the empty message
content = content.replace(
`Hệ thống hiện tại chỉ tích hợp sẵn Kế hoạch mẫu cho môn <b>Toán (10, 11, 12)</b>.`,
`Hệ thống hiện tại chỉ tích hợp sẵn Kế hoạch mẫu cho một số môn học phổ biến.`
);

fs.writeFileSync('src/pages/LessonPlan.tsx', content);
