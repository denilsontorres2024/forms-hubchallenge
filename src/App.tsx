import { FinalistConfirmationPage } from "./pages/FinalistConfirmationPage";
import { InterestPresencePage } from "./pages/InterestPresencePage";
import { SubmissionsTablePage } from "./pages/SubmissionsTablePage";

export function App() {
  const pathname = window.location.pathname;

  if (pathname === "/confirmacao-finalistas") {
    return <FinalistConfirmationPage />;
  }

  if (pathname === "/interesse-presencial") {
    return <InterestPresencePage />;
  }

  if (pathname === "/submissoes") {
    return <SubmissionsTablePage />;
  }

  return <FinalistConfirmationPage />;
}
