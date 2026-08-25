import { create } from "zustand";

export type NavScreen = "payment" | "summary" | "kitchen";

interface TableNavigationState {
  navigationMap: Record<string, NavScreen>;
  splitStateMap: Record<string, boolean>;
  splitRowsMap: Record<string, any[]>;
  selectedMethodMap: Record<string, string>;
  setLastScreen: (tableId: string, screen: NavScreen) => void;
  getLastScreen: (tableId: string) => NavScreen | null;
  setSplitActive: (tableId: string, isSplit: boolean) => void;
  getSplitActive: (tableId: string) => boolean;
  setSplitRows: (tableId: string, rows: any[]) => void;
  getSplitRows: (tableId: string) => any[] | null;
  setSelectedMethod: (tableId: string, method: string) => void;
  getSelectedMethod: (tableId: string) => string | null;
  clearLastScreen: (tableId: string) => void;
}

const cleanId = (tableId: string) =>
  String(tableId || "")
    .replace(/^\{|\}$/g, "")
    .trim()
    .toLowerCase();

export const useTableNavigationStore = create<TableNavigationState>((set, get) => ({
  navigationMap: {},
  splitStateMap: {},
  splitRowsMap: {},
  selectedMethodMap: {},

  setLastScreen: (tableId: string, screen: NavScreen) => {
    const id = cleanId(tableId);
    if (!id) return;
    set((state) => ({
      navigationMap: {
        ...state.navigationMap,
        [id]: screen,
      },
    }));
  },

  getLastScreen: (tableId: string) => {
    const id = cleanId(tableId);
    if (!id) return null;
    return get().navigationMap[id] || null;
  },

  setSplitActive: (tableId: string, isSplit: boolean) => {
    const id = cleanId(tableId);
    if (!id) return;
    set((state) => ({
      splitStateMap: {
        ...state.splitStateMap,
        [id]: isSplit,
      },
    }));
  },

  getSplitActive: (tableId: string) => {
    const id = cleanId(tableId);
    if (!id) return false;
    return get().splitStateMap[id] || false;
  },

  setSplitRows: (tableId: string, rows: any[]) => {
    const id = cleanId(tableId);
    if (!id) return;
    set((state) => ({
      splitRowsMap: {
        ...state.splitRowsMap,
        [id]: rows,
      },
    }));
  },

  getSelectedMethod: (tableId: string) => {
    const id = cleanId(tableId);
    if (!id) return null;
    return get().selectedMethodMap[id] || null;
  },

  setSelectedMethod: (tableId: string, method: string) => {
    const id = cleanId(tableId);
    if (!id) return;
    set((state) => ({
      selectedMethodMap: {
        ...state.selectedMethodMap,
        [id]: method,
      },
    }));
  },

  getSplitRows: (tableId: string) => {
    const id = cleanId(tableId);
    if (!id) return null;
    return get().splitRowsMap[id] || null;
  },

  clearLastScreen: (tableId: string) => {
    const id = cleanId(tableId);
    if (!id) return;
    set((state) => {
      const newMap = { ...state.navigationMap };
      delete newMap[id];
      const newSplitMap = { ...state.splitStateMap };
      delete newSplitMap[id];
      const newRowsMap = { ...state.splitRowsMap };
      delete newRowsMap[id];
      const newMethodMap = { ...state.selectedMethodMap };
      delete newMethodMap[id];
      return {
        navigationMap: newMap,
        splitStateMap: newSplitMap,
        splitRowsMap: newRowsMap,
        selectedMethodMap: newMethodMap,
      };
    });
  },
}));
