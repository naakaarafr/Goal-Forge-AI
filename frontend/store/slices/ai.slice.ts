import { StateCreator } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AISlice {
  isAIPanelOpen: boolean;
  messages: Message[];
  isTyping: boolean;
  
  toggleAIPanel: () => void;
  setAIPanelOpen: (isOpen: boolean) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setTyping: (isTyping: boolean) => void;
  clearHistory: () => void;
}

export const createAISlice: StateCreator<AISlice> = (set) => ({
  isAIPanelOpen: false,
  messages: [],
  isTyping: false,
  
  toggleAIPanel: () => set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),
  
  setAIPanelOpen: (isOpen) => set({ isAIPanelOpen: isOpen }),
  
  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...message,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
      }
    ]
  })),
  
  setTyping: (isTyping) => set({ isTyping }),
  
  clearHistory: () => set({ messages: [] }),
});
