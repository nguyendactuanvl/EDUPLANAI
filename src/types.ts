export interface KHGDRow {
  id: string;
  grade: number;
  subject?: string;
  stt: number;
  lesson: string;
  periods: number;
  requirement: string;
  digitalComp: string;
  aiComp: string;
  stem: string;
  note: string;
}

export interface Circular {
  id: string;
  date: string;
  title: string;
}

export interface HistoryItem {
  id: string;
  type: "KHBD" | "KHGD" | "PHT" | "GBT";
  grade: number;
  subject: string;
  lessonName: string;
  content: string; // The generated markdown
  createdAt: number;
}

export interface Student {
  id: string;
  name: string;
  role?: string;
  isFixed?: boolean;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  notes?: string;
  dob?: string;
}
