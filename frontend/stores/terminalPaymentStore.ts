import { create } from "zustand";

export type TerminalPaymentStatus = "idle" | "processing" | "success" | "cancelled" | "failed";

export interface TerminalPaymentSession {
  tableId: string;
  method: string;
  amount: number;
  status: TerminalPaymentStatus;
  message: string;
  sessionId?: string;
  timestamp: number;
  result?: any;
  isSplit?: boolean;
  splitRowId?: string;
}

interface TerminalPaymentStoreState {
  sessions: Record<string, TerminalPaymentSession>;
  startSession: (
    tableId: string,
    method: string,
    amount: number,
    sessionId?: string,
    isSplit?: boolean,
    splitRowId?: string
  ) => void;
  updateSession: (tableId: string, updates: Partial<TerminalPaymentSession>) => void;
  getSession: (tableId: string) => TerminalPaymentSession | null;
  clearSession: (tableId: string) => void;
}

const cleanId = (tableId: string) =>
  String(tableId || "")
    .replace(/^\{|\}$/g, "")
    .trim()
    .toLowerCase();

export const useTerminalPaymentStore = create<TerminalPaymentStoreState>((set, get) => ({
  sessions: {},

  startSession: (
    tableId: string,
    method: string,
    amount: number,
    sessionId?: string,
    isSplit?: boolean,
    splitRowId?: string
  ) => {
    const id = cleanId(tableId);
    if (!id) return;
    set((state) => ({
      sessions: {
        ...state.sessions,
        [id]: {
          tableId: id,
          method,
          amount,
          status: "processing",
          message: "Processing payment...",
          sessionId,
          timestamp: Date.now(),
          isSplit,
          splitRowId,
        },
      },
    }));
  },

  updateSession: (tableId: string, updates: Partial<TerminalPaymentSession>) => {
    const id = cleanId(tableId);
    if (!id) return;
    set((state) => {
      const existing = state.sessions[id];
      if (!existing) return state;
      return {
        sessions: {
          ...state.sessions,
          [id]: {
            ...existing,
            ...updates,
          },
        },
      };
    });
  },

  getSession: (tableId: string) => {
    const id = cleanId(tableId);
    if (!id) return null;
    return get().sessions[id] || null;
  },

  clearSession: (tableId: string) => {
    const id = cleanId(tableId);
    if (!id) return;
    set((state) => {
      const next = { ...state.sessions };
      delete next[id];
      return { sessions: next };
    });
  },
}));
