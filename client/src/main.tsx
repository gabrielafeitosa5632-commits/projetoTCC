import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { AppProvider } from "./context/AppContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <AppProvider>
      <App />
    </AppProvider>
  </ThemeProvider>
);
