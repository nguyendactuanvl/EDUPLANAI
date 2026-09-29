import localforage from 'localforage';

export interface Textbook {
  id: string;
  name: string;
  isCustom: boolean;
  files?: { name: string, data: string, type: string }[];
}

const DEFAULT_TEXTBOOKS: Textbook[] = [
  { id: 'default-1', name: 'Kết nối tri thức với cuộc sống', isCustom: false }
];

export async function getTextbooks(): Promise<Textbook[]> {
  try {
    const customBooks: Textbook[] = await localforage.getItem('custom_textbooks') || [];
    return [...DEFAULT_TEXTBOOKS, ...customBooks];
  } catch (error) {
    console.error("Error getting textbooks", error);
    return DEFAULT_TEXTBOOKS;
  }
}

export async function saveCustomTextbook(book: Textbook): Promise<void> {
  try {
    const customBooks: Textbook[] = await localforage.getItem('custom_textbooks') || [];
    customBooks.push(book);
    await localforage.setItem('custom_textbooks', customBooks);
  } catch (error) {
    console.error("Error saving custom textbook", error);
  }
}

export async function deleteCustomTextbook(id: string): Promise<void> {
  try {
    const customBooks: Textbook[] = await localforage.getItem('custom_textbooks') || [];
    const filtered = customBooks.filter(b => b.id !== id);
    await localforage.setItem('custom_textbooks', filtered);
  } catch (error) {
    console.error("Error deleting custom textbook", error);
  }
}
