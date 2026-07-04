import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Lock, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import GamePageBackdrop from "../components/game/GamePageBackdrop";
import GameButton from "../components/game/GameButton";
import Navbar from "../components/Navbar";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("No se pudo registrar el usuario");
      }

      toast.success("Usuario registrado");
      navigate("/login");
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
          ¡Nuevo jugador!
        </motion.h1>
        <motion.p
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="mt-3 font-bold text-slate-700"
        >
          Crea tu cuenta y empieza tu primer cuento.
        </motion.p>

        <motion.form
          {...fadeInUp}
          transition={{ duration: 0.55, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="game-card mt-8 p-6"
        >
          <h2 className="text-2xl font-black">Registro</h2>

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
                autoComplete="new-password"
                minLength={8}
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
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            Registrarse
          </GameButton>

          <p className="mt-5 text-center text-sm font-bold text-slate-700">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="underline decoration-4 underline-offset-4">
              Inicia sesión
            </Link>
          </p>
        </motion.form>
      </main>
    </div>
  );
}
