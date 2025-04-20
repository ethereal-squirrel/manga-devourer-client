import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Container } from "../components/Container";
import { TabBar } from "../components/common/TabBar";
import { db } from "../lib/database";
import { useCommonStore } from "../store/common";
import { useTranslation } from "../hooks/useTranslation";

export default function OauthGoogleScreen() {
  const { setOauthGoogleAccessToken, setOauthGoogleRefreshToken } =
    useCommonStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (accessToken) {
      setOauthGoogleAccessToken(accessToken);
    }
    if (refreshToken) {
      setOauthGoogleRefreshToken(refreshToken);
    }

    if (accessToken && refreshToken) {
      handleRedirect(accessToken, refreshToken);
    } else {
      // @TODO: Handle error.
    }
  }, []);

  const handleRedirect = async (accessToken: string, refreshToken: string) => {
    const existingAccessToken = await db.select(
      "SELECT * FROM config WHERE key = $1",
      ["oauthGoogleAccessToken"]
    );

    if (existingAccessToken.length > 0) {
      await db.execute("UPDATE config SET value = $1 WHERE key = $2", [
        accessToken,
        "oauthGoogleAccessToken",
      ]);
    } else {
      await db.execute("INSERT INTO config (key, value) VALUES ($1, $2)", [
        "oauthGoogleAccessToken",
        accessToken,
      ]);
    }

    const existingRefreshToken = await db.select(
      "SELECT * FROM config WHERE key = $1",
      ["oauthGoogleRefreshToken"]
    );

    if (existingRefreshToken.length > 0) {
      await db.execute("UPDATE config SET value = $1 WHERE key = $2", [
        refreshToken,
        "oauthGoogleRefreshToken",
      ]);
    } else {
      await db.execute("INSERT INTO config (key, value) VALUES ($1, $2)", [
        "oauthGoogleRefreshToken",
        refreshToken,
      ]);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    navigate("/provider-google");
  };

  return (
    <div className="h-screen flex flex-col">
      <Container className="flex-1 px-5 pb-24 md:px-0">
        <div className="flex flex-col items-center justify-center h-full w-full">
          <div className="mt-5 w-full md:w-1/2 text-center">
            {t("providers.oauthValidity")}
          </div>
        </div>
      </Container>
      <TabBar />
    </div>
  );
}
