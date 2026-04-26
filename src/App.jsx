import { useEffect } from "react";
import { useStore } from "./state/store.js";
import { localExpireSweep } from "./state/actions.js";
import { useWakeLock } from "./lib/use-wake-lock.js";
import { TopBar } from "./components/TopBar.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { Toast } from "./components/Toast.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SignupPage } from "./pages/SignupPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { RidesPage } from "./pages/RidesPage.jsx";
import { WalletPage } from "./pages/WalletPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";

export function App() {
  const { account, screen, authView } = useStore((s) => ({
    account: s.currentAccount,
    screen: s.screen,
    authView: s.authView,
  }));
  const loggedIn = !!account;

  useWakeLock(loggedIn);

  // Client-side expiry sweep every 30s.
  useEffect(() => {
    if (!loggedIn) return;
    const t = setInterval(localExpireSweep, 30_000);
    return () => clearInterval(t);
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <>
        {authView === "signup" ? <SignupPage /> : <LoginPage />}
        <Toast />
      </>
    );
  }

  return (
    <>
      <TopBar />
      {screen === "dashboard" && <DashboardPage />}
      {screen === "rides" && <RidesPage />}
      {screen === "wallet" && <WalletPage />}
      {screen === "settings" && <SettingsPage />}
      <BottomNav />
      <Toast />
    </>
  );
}
