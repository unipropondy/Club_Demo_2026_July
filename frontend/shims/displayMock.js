const reactNative = require("react-native");

const mockDisplayModule = {
  init: () => {},
  getInitialScreens: () => ({ SCREEN_INFO: {} }),
  SCREEN_INFO: {},
  requestScene: () => false,
  closeScene: () => false,
  isMainSceneActive: () => true,
  resumeMainScene: () => true,
  addListener: () => {},
  removeListeners: () => {},
};

if (reactNative && reactNative.NativeModules) {
  try {
    const originalNativeModules = reactNative.NativeModules;
    
    // Create a mock for ThermalPrinter native module
    const mockThermalPrinter = {
      printTcp: async () => {},
      printBluetooth: async () => {},
      printUsb: async () => {},
    };

    // Create a proxy to intercept RNExternalDisplayEvent dynamically without overwriting existing native modules
    const nativeModulesProxy = new Proxy(originalNativeModules, {
      get(target, prop, receiver) {
        const realModule = Reflect.get(target, prop, receiver);
        if (realModule) return realModule;
        if (prop === "RNExternalDisplayEvent") {
          return mockDisplayModule;
        }
        if (prop === "ThermalPrinter") {
          return mockThermalPrinter;
        }
        return undefined;
      }
    });

    const descriptor = Object.getOwnPropertyDescriptor(reactNative, "NativeModules");
    if (!descriptor || descriptor.configurable) {
      Object.defineProperty(reactNative, "NativeModules", {
        value: nativeModulesProxy,
        configurable: true,
        writable: true,
      });
    } else {
      try {
        if (!originalNativeModules.RNExternalDisplayEvent) {
          originalNativeModules.RNExternalDisplayEvent = mockDisplayModule;
        }
        if (!originalNativeModules.ThermalPrinter) {
          originalNativeModules.ThermalPrinter = mockThermalPrinter;
        }
      } catch (mutateErr) {
        // Fallback silently if sealed
      }
    }
  } catch (e) {
    console.warn("⚠️ [DisplayMock] Failed to proxy NativeModules:", e.message);
  }
}

if (reactNative && reactNative.TurboModuleRegistry && typeof reactNative.TurboModuleRegistry.get === "function") {
  try {
    const originalGet = reactNative.TurboModuleRegistry.get;
    reactNative.TurboModuleRegistry.get = (name) => {
      const realModule = originalGet(name);
      if (realModule) return realModule;
      if (name === "RNExternalDisplayEvent") {
        return mockDisplayModule;
      }
      if (name === "ThermalPrinter") {
        return mockThermalPrinter;
      }
      return realModule;
    };
  } catch (e) {
    console.warn("⚠️ [DisplayMock] Failed to patch TurboModuleRegistry:", e.message);
  }
}
