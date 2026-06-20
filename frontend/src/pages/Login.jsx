import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("No se pudo iniciar sesion");
      }

      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast.success("Sesion iniciada");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fff5cf] text-slate-900">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 0.7, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.05 }}
          className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-pink-300 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 0.7, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="absolute top-32 -right-20 h-80 w-80 rounded-full bg-cyan-300 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.25 }}
          className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-yellow-300 blur-3xl"
        />
      </div>

      <motion.header
        {...fadeInUp}
        transition={{ duration: 0.5 }}
        className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-4"
      >
        <motion.div
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <Link to="/" className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.7, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-slate-900 bg-orange-400 shadow-[5px_5px_0_#111827]"
            >
            <Sparkles className="h-6 w-6" />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="text-xl font-black tracking-tight"
            >
              StoryBook Agent
            </motion.span>
          </Link>
        </motion.div>
      </motion.header>

      <main className="relative z-10 mx-auto grid max-w-7xl items-start gap-8 px-6 py-6 md:grid-cols-[1fr_440px] md:py-8">
        <section>
          <motion.h1
            {...fadeInUp}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mt-5 max-w-xl text-5xl font-black leading-[0.95] tracking-tight md:text-6xl"
          >
            Entra para crear historias.
          </motion.h1>
          <motion.p
            {...fadeInUp}
            transition={{ duration: 0.6, delay: 0.34 }}
            className="mt-5 max-w-lg text-lg font-semibold leading-relaxed text-slate-700"
          >
            Inicia sesion para guardar tus cuentos, continuar aventuras y volver a tus historias cuando quieras.
          </motion.p>
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.6, delay: 0.46 }}
            className="mt-5 flex max-w-lg gap-3 rounded-3xl border-4 border-slate-900 bg-white p-4 font-semibold leading-relaxed shadow-[6px_6px_0_#111827]"
          >
            <ShieldCheck className="mt-1 h-6 w-6 shrink-0" />
            <p className="text-slate-700">
              El agente usa modelos de IA que consumen tokens. Cada usuario podra configurar sus credenciales
              por separado para generar historias con los creditos de su cuenta y no con una clave compartida.
            </p>
          </motion.div>
        </section>

        <motion.form
          initial={{ opacity: 0, scale: 0.92, rotate: 3 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.7, delay: 0.18 }}
          onSubmit={handleSubmit}
          className="rounded-[2rem] border-4 border-slate-900 bg-white p-5 shadow-[12px_12px_0_#111827] md:-translate-x-16 md:-translate-y-6"
        >
          <motion.h2
            {...fadeInUp}
            transition={{ duration: 0.45, delay: 0.32 }}
            className="text-3xl font-black tracking-tight"
          >
            Login
          </motion.h2>

          <motion.label
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.44 }}
            className="mt-5 block"
          >
            <span className="text-sm font-black uppercase tracking-wide text-slate-700">Email</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border-4 border-slate-900 bg-cyan-100 px-4 py-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.56 }}
              >
                <Mail className="h-5 w-5 shrink-0" />
              </motion.div>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-transparent font-bold outline-none placeholder:text-slate-500"
                placeholder="tu@email.com"
                autoComplete="email"
                required
              />
            </div>
          </motion.label>

          <motion.label
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.56 }}
            className="mt-5 block"
          >
            <span className="text-sm font-black uppercase tracking-wide text-slate-700">Password</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border-4 border-slate-900 bg-pink-100 px-4 py-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.68 }}
              >
                <Lock className="h-5 w-5 shrink-0" />
              </motion.div>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent font-bold outline-none placeholder:text-slate-500"
                placeholder="********"
                autoComplete="current-password"
                required
              />
            </div>
          </motion.label>

          <motion.button
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.68 }}
            whileHover={{ y: -4 }}
            whileTap={{ y: 0, scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-3xl border-4 border-slate-900 bg-lime-400 px-7 py-3.5 text-lg font-black shadow-[6px_6px_0_#111827] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
            Entrar
          </motion.button>

          <p className="mt-5 text-center text-sm font-bold text-slate-700">
            No tienes una cuenta?{" "}
            <Link to="/register" className="underline decoration-4 underline-offset-4 hover:text-slate-950">
              Registrate
            </Link>
          </p>
        </motion.form>
      </main>
    </div>
  );
}
