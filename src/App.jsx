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
import { SCREEN } from "./constants.js";

export function App() {
  const account = useStore((s) => s.currentAccount);
  const screen = useStore((s) => s.screen);
  const authView = useStore((s) => s.authView);
  const loggedIn = !!account;

  useWakeLock(loggedIn);

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
      {screen === SCREEN.dashboard && <DashboardPage />}
      {screen === SCREEN.rides && <RidesPage />}
      {screen === SCREEN.wallet && <WalletPage />}
      {screen === SCREEN.settings && <SettingsPage />}
      <BottomNav />
      <Toast />
    </>
  );
}
