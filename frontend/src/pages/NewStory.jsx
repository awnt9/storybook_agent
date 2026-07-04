import { useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StoryBookPreview } from "../components/book";
import ConfirmDialog from "../components/ConfirmDialog";
import GameButton from "../components/game/GameButton";
import Navbar from "../components/Navbar";

export default function NewStory() {
  const navigate = useNavigate();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleExit = () => {
    setShowExitConfirm(false);
    navigate("/dashboard");
  };

  return (
    <div className="game-page min-h-screen">
      <Navbar />

      <main className="mx-auto mt-8 max-w-6xl px-6 pb-8">
        <GameButton variant="white" size="sm" onClick={() => setShowExitConfirm(true)}>
          <LogOut aria-hidden="true" className="h-5 w-5" />
          Salir
        </GameButton>

        <div className="mt-6">
          <StoryBookPreview />
        </div>
      </main>

      <ConfirmDialog
        isOpen={showExitConfirm}
        title="¿Salir de la historia?"
        description="Volverás al menú principal. Si sales ahora, podrías perder el progreso de esta sesión."
        confirmLabel="Salir"
        confirmIcon={LogOut}
        confirmTone="exit"
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={handleExit}
      />
    </div>
  );
}
