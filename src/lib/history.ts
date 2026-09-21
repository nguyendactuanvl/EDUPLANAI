import { HistoryItem } from "../types";

const HISTORY_KEY = "eduplan_history";

export const getHistory = (): HistoryItem[] => {
  const data = localStorage.getItem(HISTORY_KEY);
  if (!data) return [];
  try {
    const items = JSON.parse(data);
    return items.map((item: any) => {
      if (item.content && typeof item.content === 'object') {
        // Try to extract text if it was a GenerateContentResponse object
        let textContent = '';
        try {
          if (item.content.candidates && item.content.candidates[0]?.content?.parts) {
            textContent = item.content.candidates[0].content.parts.map((p: any) => p.text).join('');
          } else if (item.content.text) {
            textContent = typeof item.content.text === 'function' ? item.content.text() : item.content.text;
          } else {
            textContent = JSON.stringify(item.content);
          }
        } catch(e) {
          textContent = "[Lỗi định dạng dữ liệu]";
        }
        return { ...item, content: textContent };
      }
      return item;
    });
  } catch (e) {
    return [];
  }
};

export const saveToHistory = (item: Omit<HistoryItem, "id" | "createdAt">) => {
  try {
    const history = getHistory();
    const newItem: HistoryItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      createdAt: Date.now()
    };
    history.unshift(newItem);
    // Keep max 25 items to prevent localStorage QuotaExceededError
    const trimmed = history.slice(0, 25);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch (quotaError) {
      // If still quota exceeded, keep only top 10
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed.slice(0, 10)));
    }
    return newItem;
  } catch (e) {
    console.warn("Could not save to history:", e);
    return null;
  }
};

export const deleteFromHistory = (id: string) => {
  const history = getHistory();
  const newHistory = history.filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
};

export const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};
