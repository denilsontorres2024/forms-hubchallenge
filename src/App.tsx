import { FinalistConfirmationPage } from "./pages/FinalistConfirmationPage";
import { InterestPresencePage } from "./pages/InterestPresencePage";

export function App() {
  const pathname = window.location.pathname;

  if (pathname === "/confirmacao-finalistas") {
    return <FinalistConfirmationPage />;
  }

  if (pathname === "/interesse-presencial") {
    return <InterestPresencePage />;
  }

  return <FinalistConfirmationPage />;
}
