import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado no DOM.");

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
