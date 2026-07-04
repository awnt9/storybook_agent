import { motion } from "framer-motion";
import { Navigate, useNavigate } from "react-router-dom";
import GamePageBackdrop from "../components/game/GamePageBackdrop";
import GameButton from "../components/game/GameButton";
import Navbar from "../components/Navbar";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const steps = [
  { n: "1", title: "Dibuja", text: "Sube tu personaje a la portada.", color: "bg-pink-300" },
  { n: "2", title: "Cuenta", text: "El agente ilustra cada escena.", color: "bg-cyan-300" },
  { n: "3", title: "Pasa página", text: "Tu libro crece al instante.", color: "bg-lime-300" },
];

export default function Home() {
  const navigate = useNavigate();

  if (localStorage.getItem("access_token")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="game-page">
      <GamePageBackdrop />

      <div className="relative z-10">
        <Navbar />
      </div>

      <main className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pb-20 pt-2 text-center">

        <motion.h1
          {...fadeInUp}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="game-menu-title mt-6 max-w-3xl"
        >
          ¡Convierte tu dibujo en un cuento que se lee solo!
        </motion.h1>

        <motion.p
          {...fadeInUp}
          transition={{ duration: 0.55, delay: 0.18 }}
          className="mt-5 max-w-xl text-lg font-bold text-slate-700"
        >
          Un libro interactivo con crayones, colores locos y un agente que escribe la historia contigo.
        </motion.p>

        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.55, delay: 0.26 }}
          className="mt-10 flex w-full max-w-md flex-col gap-4 sm:flex-row sm:justify-center"
        >
          <GameButton variant="pink" size="lg" className="sm:min-w-[12rem]" onClick={() => navigate("/register")}>
            ¡Jugar ahora!
          </GameButton>
          <GameButton variant="white" size="lg" className="sm:min-w-[12rem]" onClick={() => navigate("/login")}>
            Ya tengo cuenta
          </GameButton>
        </motion.div>

        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.55, delay: 0.34 }}
          className="game-card mt-14 w-full max-w-2xl p-6 text-left"
        >
          <h2 className="text-center text-2xl font-black">¿Cómo se juega?</h2>
          <ul className="mt-6 space-y-4">
            {steps.map((step) => (
              <li key={step.n} className="game-step-chip">
                <span className={`game-step-num ${step.color}`}>{step.n}</span>
                <div>
                  <p className="font-black">{step.title}</p>
                  <p className="text-sm font-bold text-slate-600">{step.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.p
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.42 }}
          className="game-card game-card--lime mt-8 max-w-2xl p-4 text-sm font-bold text-slate-800"
        >
          Usa tu propia API key de OpenAI: tú controlas el consumo, el agente hace la magia.
        </motion.p>
      </main>
    </div>
  );
}
