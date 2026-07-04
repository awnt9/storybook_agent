import { LogOut } from "lucide-react";
import { useBlocker } from "react-router-dom";
import { StoryBookPreview } from "../components/book";
import ConfirmDialog from "../components/ConfirmDialog";
import Navbar from "../components/Navbar";

export default function NewStory() {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname === "/nueva-historia" &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  return (
    <div className="game-page min-h-screen">
      <Navbar />

      <main className="mx-auto mt-8 max-w-6xl px-6 pb-8">
        <StoryBookPreview />
      </main>

      <ConfirmDialog
        isOpen={blocker.state === "blocked"}
        title="¿Salir de la historia?"
        description="Volverás al menú principal. Si sales ahora, podrías perder el progreso de esta sesión."
        confirmLabel="Salir"
        confirmIcon={LogOut}
        confirmTone="exit"
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
}
