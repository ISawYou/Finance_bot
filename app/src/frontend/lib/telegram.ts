import WebApp from "@twa-dev/sdk";

type MiniAppContext = {
  platform: string;
  userName: string;
};

export function getMiniAppContext(): MiniAppContext {
  try {
    WebApp.ready();
    WebApp.expand();

    return {
      platform: WebApp.platform || "web",
      userName: WebApp.initDataUnsafe.user?.first_name || "guest"
    };
  } catch {
    return {
      platform: "browser",
      userName: "guest"
    };
  }
}
