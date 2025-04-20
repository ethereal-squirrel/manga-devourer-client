import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { DeepLinkHandler } from "./components/common/DeepLinkHandler";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ImportQueueProcessor } from "./hooks/ImportQueueProcessor";
import ServerScreen from "./screens/server";
import LibrariesScreen from "./screens/libraries";
import LibraryScreen from "./screens/library";
import SeriesScreen from "./screens/series";
import ReadScreen from "./screens/read";
import LocalScreen from "./screens/local";
import LocalAddSeriesScreen from "./screens/local-addseries";
import SettingsScreen from "./screens/settings";
import HowToUseScreen from "./screens/how-to-use";
import OauthGoogleScreen from "./screens/oauth-google";
import ProviderGoogleScreen from "./screens/provider-google";
import OauthDropboxScreen from "./screens/oauth-dropbox";
import ProviderDropboxScreen from "./screens/provider-dropbox";
import SeriesMetadataScreen from "./screens/series-metadata";

import "./index.css";
import "react-toastify/dist/ReactToastify.css";

function App() {
  useEffect(() => {
    /*const handleContextMenu = (e: Event) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };*/
  }, []);

  return (
    <LanguageProvider defaultLocale="en">
      <BrowserRouter>
        <DeepLinkHandler />
        <ImportQueueProcessor />
        <Routes>
          <Route path="/" element={<ServerScreen />} />
          <Route path="/libraries" element={<LibrariesScreen />} />
          <Route path="/library" element={<LibraryScreen />} />
          <Route path="/local" element={<LocalScreen />} />
          <Route path="/local/create" element={<LocalAddSeriesScreen />} />
          <Route path="/series/:id" element={<SeriesScreen />} />
          <Route
            path="/series-metadata/:id"
            element={<SeriesMetadataScreen />}
          />
          <Route path="/read/:id" element={<ReadScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/how-to-use" element={<HowToUseScreen />} />
          <Route path="/oauth-dropbox" element={<OauthDropboxScreen />} />
          <Route path="/oauth-google" element={<OauthGoogleScreen />} />
          <Route path="/provider-dropbox" element={<ProviderDropboxScreen />} />
          <Route path="/provider-google" element={<ProviderGoogleScreen />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
