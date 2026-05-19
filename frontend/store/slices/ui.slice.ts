import { StateCreator } from 'zustand';

export interface UISlice {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  
  // Global Modal Management
  activeModal: string | null;
  modalData: any;
  openModal: (modalId: string, data?: any) => void;
  closeModal: () => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  sidebarOpen: true, // Default state
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebarOpen: (isOpen: boolean) => set({ sidebarOpen: isOpen }),
  
  activeModal: null,
  modalData: null,
  
  openModal: (modalId: string, data: any = null) => set({ 
    activeModal: modalId, 
    modalData: data 
  }),
  
  closeModal: () => set({ 
    activeModal: null, 
    modalData: null 
  }),
});
