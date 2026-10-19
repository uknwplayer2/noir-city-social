import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/components/patio/Game";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Game />;
}
