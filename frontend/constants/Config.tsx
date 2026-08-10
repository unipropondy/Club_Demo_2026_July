import Constants from "expo-constants";
import { Platform } from "react-native";

const getLocalBackendIP = (): string => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.hostname;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost;

  if (hostUri) {
    return hostUri.split(":")[0];
  }

  return "localhost";
};

const localIP = getLocalBackendIP();

const getApiUrl = (): string => {
  if (__DEV__) {
    return `http://${localIP}:3000`;
  }
  
  let envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    envUrl = envUrl.trim();
    if (!/^https?:\/\//i.test(envUrl)) {
      envUrl = `https://${envUrl}`;
    }
    return envUrl;
  }
  
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ""}`;
  }
  
  return "https://clubdemo2026july-production.up.railway.app";
};

export const API_URL = getApiUrl();

if (__DEV__) {
  console.log(`🌐 [Config] API_URL: ${API_URL} | Platform: ${Platform.OS}`);
}

