import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import GamePageBackdrop from "../components/game/GamePageBackdrop";
import GameButton from "../components/game/GameButton";
import Navbar from "../components/Navbar";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail = payload?.detail;
        throw new Error(
          detail === "Invalid credentials"
            ? "Email o contraseña incorrectos"
            : detail || "No se pudo iniciar sesión",
        );
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
    <div className="game-page">
      <GamePageBackdrop stickers={false} />

      <div className="relative z-10">
        <Navbar />
      </div>

      <main className="relative z-10 mx-auto max-w-lg px-6 pb-16 pt-2">
        <motion.h1
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="game-menu-title text-4xl"
        >
          ¡Hola de nuevo!
        </motion.h1>
        <motion.p
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="mt-3 font-bold text-slate-700"
        >
          Entra y sigue coloreando historias.
        </motion.p>

        <motion.form
          {...fadeInUp}
          transition={{ duration: 0.55, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="game-card mt-8 p-6"
        >
          <h2 className="text-2xl font-black">Login</h2>

          <label className="mt-5 block">
            <span className="text-sm font-black uppercase tracking-wide text-slate-700">Email</span>
            <div className="game-input-wrap game-input-wrap--cyan">
              <Mail className="h-5 w-5 shrink-0" aria-hidden="true" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-black uppercase tracking-wide text-slate-700">Password</span>
            <div className="game-input-wrap game-input-wrap--pink">
              <Lock className="h-5 w-5 shrink-0" aria-hidden="true" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          <GameButton
            type="submit"
            variant="lime"
            size="lg"
            className="game-btn--block mt-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
            Entrar
          </GameButton>

          <p className="mt-5 text-center text-sm font-bold text-slate-700">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="underline decoration-4 underline-offset-4">
              Regístrate
            </Link>
          </p>
        </motion.form>
      </main>
    </div>
  );
}
