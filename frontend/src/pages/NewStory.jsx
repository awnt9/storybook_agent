import { useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StoryBookPreview } from "../components/book";
import ConfirmDialog from "../components/ConfirmDialog";
import Navbar from "../components/Navbar";

export default function NewStory() {
  const navigate = useNavigate();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleExit = () => {
    setShowExitConfirm(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#fff5cf] text-slate-900">
      <Navbar />

      <main className="mx-auto mt-12 max-w-6xl px-6 pb-8">
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="inline-flex items-center gap-2 rounded-2xl border-4 border-slate-900 bg-white px-5 py-3 text-lg font-black shadow-[4px_4px_0_#111827] transition-transform hover:-translate-y-0.5"
          >
            <LogOut aria-hidden="true" className="h-5 w-5" />
            Salir
          </button>
        </div>

        <div className="mt-6">
          <StoryBookPreview />
        </div>
      </main>

      <ConfirmDialog
        isOpen={showExitConfirm}
        title="¿Salir de la historia?"
        description="Volverás a la página inicial. Si sales ahora, podrías perder el progreso de esta sesión."
        confirmLabel="Salir"
        confirmIcon={LogOut}
        confirmTone="exit"
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={handleExit}
      />
    </div>
  );
}
