import { create } from "zustand";

export interface CommonState {
  activeTab: string;
  setActiveTab: (activeTab: string) => void;
  server: string;
  setServer: (server: string) => void;
  config: any;
  setConfig: (config: any) => void;
  oauthGoogleAccessToken: string;
  setOauthGoogleAccessToken: (oauthGoogleAccessToken: string) => void;
  oauthGoogleRefreshToken: string;
  setOauthGoogleRefreshToken: (oauthGoogleRefreshToken: string) => void;
  oauthDropboxAccessToken: string;
  setOauthDropboxAccessToken: (oauthDropboxAccessToken: string) => void;
  oauthDropboxRefreshToken: string;
  setOauthDropboxRefreshToken: (oauthDropboxRefreshToken: string) => void;
}

export const useCommonStore = create<CommonState>((set) => ({
  activeTab: "/",
  setActiveTab: (activeTab: string) => set({ activeTab }),
  server: "",
  setServer: (server: string) => set({ server }),
  config: {},
  setConfig: (config: any) => set({ config }),
  oauthGoogleAccessToken: "",
  setOauthGoogleAccessToken: (oauthGoogleAccessToken: string) =>
    set({ oauthGoogleAccessToken }),
  oauthGoogleRefreshToken: "",
  setOauthGoogleRefreshToken: (oauthGoogleRefreshToken: string) =>
    set({ oauthGoogleRefreshToken }),
  oauthDropboxAccessToken: "",
  setOauthDropboxAccessToken: (oauthDropboxAccessToken: string) =>
    set({ oauthDropboxAccessToken }),
  oauthDropboxRefreshToken: "",
  setOauthDropboxRefreshToken: (oauthDropboxRefreshToken: string) =>
    set({ oauthDropboxRefreshToken }),
}));
