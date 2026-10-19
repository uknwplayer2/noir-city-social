import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Game } from "@/components/patio/Game";
import "@/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento raiz ausente");
createRoot(root).render(<StrictMode><Game /></StrictMode>);
