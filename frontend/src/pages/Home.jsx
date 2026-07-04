import { motion } from "framer-motion";
import {
  BookOpen,
  Bot,
  Database,
  ImageIcon,
  Layers,
  Lock,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const steps = [
  {
    title: "Sube un personaje",
    description:
      "Arrastra una foto o dibujo a la portada del libro. El agente lo usará como punto de partida visual.",
    color: "bg-pink-300",
  },
  {
    title: "Continúa la historia",
    description:
      "Cada turno el agente genera una nueva escena ilustrada. El libro se va escribiendo delante de tus ojos.",
    color: "bg-cyan-300",
  },
  {
    title: "Pasa páginas y guarda",
    description:
      "Navega por el cuento como un libro real. Tu progreso queda asociado a tu cuenta.",
    color: "bg-lime-300",
  },
];

const techStack = [
  { label: "React + Vite", detail: "Interfaz interactiva del libro y streaming en tiempo real." },
  { label: "FastAPI", detail: "API REST con autenticación JWT y respuestas SSE." },
  { label: "Pydantic Graph", detail: "Pipeline de generación por pasos (story_pipeline)." },
  { label: "OpenAI", detail: "Modelos de texto e imágenes con la API key de cada usuario." },
  { label: "PostgreSQL", detail: "Estado de las historias y datos de usuario." },
  { label: "MinIO", detail: "Almacenamiento de ilustraciones generadas." },
];

export default function Home() {
  const navigate = useNavigate();

  if (localStorage.getItem("access_token")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fff5cf] text-slate-900">
      <motion.header
        {...fadeInUp}
        transition={{ duration: 0.5 }}
        className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-6 py-6"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-slate-900 bg-orange-400 shadow-[5px_5px_0_#111827]">
            <Sparkles className="h-6 w-6" />
          </div>
          <span className="text-xl font-black tracking-tight">StoryBook Agent</span>
        </div>

        <nav className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-lg font-semibold text-slate-700 hover:text-slate-900"
          >
            Iniciar sesión
          </button>
          <span aria-hidden="true" className="text-lg font-semibold text-slate-500">
            |
          </span>
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="text-lg font-semibold text-slate-700 hover:text-slate-900"
          >
            Registrarse
          </button>
          <span aria-hidden="true" className="text-lg font-semibold text-slate-500">
            |
          </span>
          <a
            href="https://github.com/awnt9/StoryBook_Agent"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold text-slate-700 hover:text-slate-900"
          >
            GitHub
          </a>
        </nav>
      </motion.header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-20">
          <div>
            <motion.p
              {...fadeInUp}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="inline-flex items-center gap-2 rounded-2xl border-4 border-slate-900 bg-white px-4 py-2 text-sm font-black shadow-[4px_4px_0_#111827]"
            >
              <Bot className="h-4 w-4" />
              Cuentos ilustrados con IA
            </motion.p>

            <motion.h1
              {...fadeInUp}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 max-w-xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl"
            >
              Tu dibujo cobra vida en un libro.
            </motion.h1>

            <motion.p
              {...fadeInUp}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 max-w-lg text-lg font-semibold leading-relaxed text-slate-700"
            >
              StoryBook Agent convierte personajes dibujados en historias interactivas. Un agente de
              inteligencia artificial escribe, ilustra y hace avanzar el cuento mientras pasas las
              páginas.
            </motion.p>

            <motion.div
              {...fadeInUp}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <motion.button
                whileHover={{ y: -4 }}
                whileTap={{ y: 0, scale: 0.98 }}
                type="button"
                onClick={() => navigate("/register")}
                className="rounded-3xl border-4 border-slate-900 bg-pink-400 px-7 py-4 text-lg font-black shadow-[6px_6px_0_#111827]"
              >
                Crear cuenta gratis
              </motion.button>
              <motion.button
                whileHover={{ y: -4 }}
                whileTap={{ y: 0, scale: 0.98 }}
                type="button"
                onClick={() => navigate("/login")}
                className="rounded-3xl border-4 border-slate-900 bg-white px-7 py-4 text-lg font-black shadow-[6px_6px_0_#111827]"
              >
                Ya tengo cuenta
              </motion.button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="rounded-[2rem] border-4 border-slate-900 bg-white p-6 shadow-[12px_12px_0_#111827] md:p-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-3 border-slate-900 bg-orange-300">
                <Workflow className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black">Cómo funciona</h2>
            </div>
            <ol className="mt-6 space-y-5">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-3 border-slate-900 font-black ${step.color}`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-black">{step.title}</h3>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </motion.div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.6 }}
            className="rounded-[2rem] border-4 border-slate-900 bg-cyan-100 p-6 shadow-[8px_8px_0_#111827] md:p-10"
          >
            <div className="flex items-center gap-3">
              <Zap className="h-7 w-7" />
              <h2 className="text-3xl font-black">Experiencia del agente</h2>
            </div>
            <p className="mt-4 max-w-3xl text-lg font-semibold leading-relaxed text-slate-700">
              Cada acción del usuario dispara un pipeline en el backend: se registra el turno, se
              genera la ilustración de fondo con OpenAI y el resultado se transmite al navegador en
              tiempo real mediante Server-Sent Events. Así ves el libro actualizarse escena a escena
              sin recargar la página.
            </p>
          </motion.div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <motion.h2
            {...fadeInUp}
            transition={{ duration: 0.5 }}
            className="text-3xl font-black md:text-4xl"
          >
            Tecnología
          </motion.h2>
          <motion.p
            {...fadeInUp}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-3 max-w-2xl font-semibold text-slate-700"
          >
            Stack moderno pensado para agentes, persistencia y una interfaz de libro interactiva.
          </motion.p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {techStack.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 + index * 0.06 }}
                className="rounded-2xl border-4 border-slate-900 bg-white p-5 shadow-[5px_5px_0_#111827]"
              >
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 shrink-0" />
                  <h3 className="font-black">{item.label}</h3>
                </div>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                  {item.detail}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20 pt-4 md:pb-28">
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6 rounded-[2rem] border-4 border-slate-900 bg-lime-200 p-6 shadow-[8px_8px_0_#111827] md:flex-row md:items-center md:justify-between md:p-10"
          >
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-3 border-slate-900 bg-white">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black">Tus claves, tu consumo</h2>
                <p className="mt-2 max-w-xl font-semibold leading-relaxed text-slate-700">
                  Cada usuario configura su propia API key de OpenAI. El agente genera historias con
                  los créditos de tu cuenta, no con una clave compartida de la plataforma.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="shrink-0 rounded-3xl border-4 border-slate-900 bg-white px-7 py-4 text-lg font-black shadow-[6px_6px_0_#111827] transition-transform hover:-translate-y-0.5"
            >
              Empezar ahora
            </button>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
