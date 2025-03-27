import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";

// Obalení aplikace v StrictMode pro lepší detekci chyb během vývoje
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
