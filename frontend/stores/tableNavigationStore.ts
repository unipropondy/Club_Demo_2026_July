import { create } from "zustand";
import { socket } from "../constants/socket";

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
  applyNavigationFromSocket: (tableId: string, data: Partial<TableNavigationPayload>) => void;
}

interface TableNavigationPayload {
  screen?: NavScreen | null;
  isSplit?: boolean | null;
  rows?: any[] | null;
  selectedMethod?: string | null;
  clear?: boolean;
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
    if (get().navigationMap[id] === screen) return;
    set((state) => ({
      navigationMap: {
        ...state.navigationMap,
        [id]: screen,
      },
    }));
    try {
      socket.emit("table_navigation_update", { tableId: id, screen });
    } catch (e) {
      console.warn("Failed to emit table_navigation_update:", e);
    }
  },

  getLastScreen: (tableId: string) => {
    const id = cleanId(tableId);
    if (!id) return null;
    return get().navigationMap[id] || null;
  },

  setSplitActive: (tableId: string, isSplit: boolean) => {
    const id = cleanId(tableId);
    if (!id) return;
    if (get().splitStateMap[id] === isSplit) return;
    set((state) => ({
      splitStateMap: {
        ...state.splitStateMap,
        [id]: isSplit,
      },
    }));
    try {
      socket.emit("table_navigation_update", { tableId: id, isSplit });
    } catch (e) {
      console.warn("Failed to emit table_navigation_update:", e);
    }
  },

  getSplitActive: (tableId: string) => {
    const id = cleanId(tableId);
    if (!id) return false;
    return get().splitStateMap[id] || false;
  },

  setSplitRows: (tableId: string, rows: any[]) => {
    const id = cleanId(tableId);
    if (!id) return;
    if (JSON.stringify(get().splitRowsMap[id]) === JSON.stringify(rows)) return;
    set((state) => ({
      splitRowsMap: {
        ...state.splitRowsMap,
        [id]: rows,
      },
    }));
    try {
      socket.emit("table_navigation_update", { tableId: id, rows });
    } catch (e) {
      console.warn("Failed to emit table_navigation_update:", e);
    }
  },

  getSelectedMethod: (tableId: string) => {
    const id = cleanId(tableId);
    if (!id) return null;
    return get().selectedMethodMap[id] || null;
  },

  setSelectedMethod: (tableId: string, method: string) => {
    const id = cleanId(tableId);
    if (!id) return;
    if (get().selectedMethodMap[id] === method) return;
    set((state) => ({
      selectedMethodMap: {
        ...state.selectedMethodMap,
        [id]: method,
      },
    }));
    try {
      socket.emit("table_navigation_update", { tableId: id, selectedMethod: method });
    } catch (e) {
      console.warn("Failed to emit table_navigation_update:", e);
    }
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
      try {
        socket.emit("table_navigation_update", { tableId: id, clear: true });
      } catch (e) {
        console.warn("Failed to emit table_navigation_update:", e);
      }
      return {
        navigationMap: newMap,
        splitStateMap: newSplitMap,
        splitRowsMap: newRowsMap,
        selectedMethodMap: newMethodMap,
      };
    });
  },

  applyNavigationFromSocket: (tableId: string, data: Partial<TableNavigationPayload>) => {
    const id = cleanId(tableId);
    if (!id) return;
    set((state) => {
      if (data.clear) {
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
      }

      const nextState: Partial<TableNavigationState> = {};
      if (data.screen !== undefined) {
        nextState.navigationMap = { ...state.navigationMap };
        if (data.screen === null) {
          delete nextState.navigationMap[id];
        } else {
          nextState.navigationMap[id] = data.screen;
        }
      }
      if (data.isSplit !== undefined) {
        nextState.splitStateMap = { ...state.splitStateMap };
        if (data.isSplit === null) {
          delete nextState.splitStateMap[id];
        } else {
          nextState.splitStateMap[id] = data.isSplit;
        }
      }
      if (data.rows !== undefined) {
        nextState.splitRowsMap = { ...state.splitRowsMap };
        if (data.rows === null) {
          delete nextState.splitRowsMap[id];
        } else {
          nextState.splitRowsMap[id] = data.rows;
        }
      }
      if (data.selectedMethod !== undefined) {
        nextState.selectedMethodMap = { ...state.selectedMethodMap };
        if (data.selectedMethod === null) {
          delete nextState.selectedMethodMap[id];
        } else {
          nextState.selectedMethodMap[id] = data.selectedMethod;
        }
      }
      return nextState;
    });
  },
}));
