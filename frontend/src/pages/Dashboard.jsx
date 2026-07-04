import { motion } from "framer-motion";
import { LibraryBig, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fff5cf] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-2xl border-4 border-slate-900 bg-orange-300 px-4 py-2 font-black shadow-[4px_4px_0_#111827]"
        >
          <Sparkles className="h-5 w-5" />
          Panel principal
        </motion.div>

        <motion.h1
          {...fadeInUp}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="mt-6 text-5xl font-black leading-none tracking-tight md:text-6xl"
        >
          ¿Qué quieres hacer hoy?
        </motion.h1>

        <motion.p
          {...fadeInUp}
          transition={{ duration: 0.6, delay: 0.16 }}
          className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-slate-700"
        >
          Crea un cuento nuevo, continúa una aventura en curso o revisa las historias que ya has
          guardado.
        </motion.p>

        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.6, delay: 0.24 }}
          className="mt-10 flex flex-wrap gap-4"
        >
          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ y: 0, scale: 0.98 }}
            type="button"
            onClick={() => navigate("/nueva-historia")}
            className="rounded-3xl border-4 border-slate-900 bg-pink-400 px-7 py-4 text-lg font-black shadow-[6px_6px_0_#111827]"
          >
            Nueva historia
          </motion.button>
          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ y: 0, scale: 0.98 }}
            type="button"
            onClick={() => navigate("/mis-historias")}
            className="inline-flex items-center gap-2 rounded-3xl border-4 border-slate-900 bg-cyan-300 px-7 py-4 text-lg font-black shadow-[6px_6px_0_#111827]"
          >
            <LibraryBig className="h-5 w-5" />
            Mis historias
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
}
