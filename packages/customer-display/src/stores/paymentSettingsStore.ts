import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import { API_URL } from '../constants/Config';

/**
 * Platform-aware persistent storage — same pattern as companySettingsStore.
 */
const getStorage = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) =>
        Promise.resolve(localStorage.setItem(key, value)),
      removeItem: (key: string) =>
        Promise.resolve(localStorage.removeItem(key)),
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@react-native-async-storage/async-storage').default;
};

export interface PaymentSettings {
  upiId: string | null;
  payNowQrUrl: string | null;
  shopName: string;
  customerSideDisplay: boolean;
}

export interface CachedPaymentMethod {
  payMode: string;
  description: string;
  position: number;
  active: any;
  commission: number;
  serviceCharge: number;
  isEntertainment: boolean;
  isVoucher: boolean;
  yeahPayEnabled: boolean;
  deviceSn: string | null;
  deviceSalt: string | null;
}

interface PaymentSettingsState {
  settings: PaymentSettings;
  loading: boolean;
  paymentMethods: CachedPaymentMethod[];
  hasLoadedMethods: boolean;
  lastFetchedSettings: number | null;
  lastFetchedMethods: number | null;
  fetchSettings: () => Promise<void>;
  fetchPaymentMethods: () => Promise<void>;
  updateSettings: (newSettings: Partial<PaymentSettings>) => void;
}

export const usePaymentSettingsStore = create<PaymentSettingsState>()(
  persist(
    (set) => ({
      settings: {
        upiId: null,
        payNowQrUrl: null,
        shopName: 'My Restaurant',
        customerSideDisplay: true,
      },
      loading: false,
      paymentMethods: [],
      hasLoadedMethods: false,
      lastFetchedSettings: null,
      lastFetchedMethods: null,

      fetchSettings: async () => {
        const currentStore = usePaymentSettingsStore.getState();
        const now = Date.now();
        if (currentStore.lastFetchedSettings && (now - currentStore.lastFetchedSettings < 300000)) {
          return;
        }
        set({ loading: true });
        try {
          const response = await fetch(`${API_URL}/api/settings`);
          if (response.ok) {
            const data = await response.json();
            if (data) {
              set({
                settings: {
                  upiId: data.UPI_ID || null,
                  payNowQrUrl: data.PayNow_QR_Url || null,
                  shopName: data.ShopName || 'My Restaurant',
                  customerSideDisplay:
                    data.CustomerSideDisplay !== undefined
                      ? Boolean(data.CustomerSideDisplay)
                      : true,
                },
                lastFetchedSettings: now,
              });
            }
          }
        } catch (error) {
          console.error('❌ [PaymentSettingsStore] Fetch Error:', error);
        } finally {
          set({ loading: false });
        }
      },

      fetchPaymentMethods: async () => {
        const currentStore = usePaymentSettingsStore.getState();
        const now = Date.now();
        if (currentStore.lastFetchedMethods && (now - currentStore.lastFetchedMethods < 300000)) {
          return;
        }
        try {
          const res = await fetch(`${API_URL}/api/sales/payment-methods`);
          if (!res.ok) return;
          const data: any[] = await res.json();
          const mapped: CachedPaymentMethod[] = data.map((d) => ({
            payMode: d.payMode || '',
            description: d.description || d.payMode || '',
            position: d.Position || 0,
            active: d.active,
            commission: parseFloat(d.commission) || 0,
            serviceCharge: parseFloat(d.serviceCharge) || 0,
            isEntertainment: d.isEntertainment === 1 || d.isEntertainment === true,
            isVoucher: d.isVoucher === 1 || d.isVoucher === true,
            yeahPayEnabled: d.YeahPayEnabled === 1 || d.YeahPayEnabled === true,
            deviceSn: d.DeviceSN || null,
            deviceSalt: d.DeviceSalt || null,
          }));
          set({ paymentMethods: mapped, hasLoadedMethods: true, lastFetchedMethods: now });
        } catch (error) {
          console.error('❌ [PaymentSettingsStore] fetchPaymentMethods Error:', error);
        }
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
          lastFetchedSettings: null,
        }));
      },
    }),
    {
      name: 'payment-settings-storage',
      storage: createJSONStorage(getStorage),
      partialize: (state) => ({
        settings: state.settings,
        paymentMethods: state.paymentMethods,
        hasLoadedMethods: state.hasLoadedMethods,
      }),
    },
  ),
);
