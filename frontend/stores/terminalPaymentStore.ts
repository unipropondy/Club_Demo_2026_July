import { create, StateCreator } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { socket } from "../constants/socket";

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
  cleanupInterruptedSessions: () => void;
  applySessionFromSocket: (tableId: string, session: TerminalPaymentSession | null) => void;
}

const cleanId = (tableId: string) =>
  String(tableId || "")
    .replace(/^\{|\}$/g, "")
    .trim()
    .toLowerCase();

const storeCreator: StateCreator<
  TerminalPaymentStoreState,
  [["zustand/persist", unknown]]
> = (set, get) => ({
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
    const session = {
      tableId: id,
      method,
      amount,
      status: "processing" as const,
      message: "Processing payment...",
      sessionId,
      timestamp: Date.now(),
      isSplit,
      splitRowId,
    };
    set((state) => ({
      sessions: {
        ...state.sessions,
        [id]: session,
      },
    }));
    try {
      socket.emit("terminal_session_update", { tableId: id, session });
    } catch (e) {
      console.warn("Failed to emit terminal_session_update:", e);
    }
  },

  updateSession: (tableId: string, updates: Partial<TerminalPaymentSession>) => {
    const id = cleanId(tableId);
    if (!id) return;
    set((state) => {
      const existing = state.sessions[id];
      if (!existing) return state;
      const updated = { ...existing, ...updates };
      try {
        socket.emit("terminal_session_update", { tableId: id, session: updated });
      } catch (e) {
        console.warn("Failed to emit terminal_session_update:", e);
      }
      return {
        sessions: {
          ...state.sessions,
          [id]: updated,
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
      try {
        socket.emit("terminal_session_update", { tableId: id, session: null });
      } catch (e) {
        console.warn("Failed to emit terminal_session_update:", e);
      }
      return { sessions: next };
    });
  },

  cleanupInterruptedSessions: () => {
    const { sessions } = get();
    let hasChanges = false;
    const nextSessions = { ...sessions };
    
    Object.keys(nextSessions).forEach((key) => {
      const session = nextSessions[key];
      if (session.status === "processing") {
        const updated = {
          ...session,
          status: "failed" as const,
          message: "Payment interrupted by refresh, Cancel and pls try again",
        };
        nextSessions[key] = updated;
        hasChanges = true;
        try {
          socket.emit("terminal_session_update", { tableId: key, session: updated });
        } catch (e) {
          console.warn("Failed to emit terminal_session_update:", e);
        }
      }
    });

    if (hasChanges) {
      set({ sessions: nextSessions });
    }
  },

  applySessionFromSocket: (tableId: string, session: TerminalPaymentSession | null) => {
    const id = cleanId(tableId);
    if (!id) return;
    set((state) => {
      const next = { ...state.sessions };
      if (session) {
        next[id] = session;
      } else {
        delete next[id];
      }
      return { sessions: next };
    });
  },
});

export const useTerminalPaymentStore = create<TerminalPaymentStoreState>()(
  persist(
    storeCreator,
    {
      name: "terminal-payment-storage",
      storage: createJSONStorage(() => 
        Platform.OS === 'web' ? window.sessionStorage : AsyncStorage
      ),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.cleanupInterruptedSessions();
        }
      },
    }
  )
);
