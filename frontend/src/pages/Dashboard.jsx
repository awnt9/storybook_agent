import { motion } from "framer-motion";
import { LibraryBig, PenLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GamePageBackdrop from "../components/game/GamePageBackdrop";
import GameButton from "../components/game/GameButton";
import Navbar from "../components/Navbar";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="game-page flex min-h-screen flex-col">
      <GamePageBackdrop stickers={false} />
      <div className="relative z-10">
        <Navbar />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-10">
        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="game-card p-8 text-center"
        >
          <span className="game-badge bg-orange-300">Menú principal</span>

          <h1 className="game-menu-title mt-6 text-4xl md:text-5xl">¡Elige aventura!</h1>

          <p className="mt-4 text-lg font-bold text-slate-700">
            Crea un cuento nuevo o mira los que ya guardaste.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            <GameButton
              variant="pink"
              size="lg"
              className="game-btn--block"
              onClick={() => navigate("/nueva-historia")}
            >
              <PenLine className="h-6 w-6" aria-hidden="true" />
              Nueva historia
            </GameButton>
            <GameButton
              variant="cyan"
              size="lg"
              className="game-btn--block"
              onClick={() => navigate("/mis-historias")}
            >
              <LibraryBig className="h-6 w-6" aria-hidden="true" />
              Mis historias
            </GameButton>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
