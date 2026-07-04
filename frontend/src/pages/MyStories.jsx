import { BookOpen } from "lucide-react";
import Navbar from "../components/Navbar";

export default function MyStories() {
  return (
    <div className="game-page flex min-h-screen flex-col">
      <div className="relative z-10">
        <Navbar />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-10">
        <div className="game-card p-8 text-center">
          <span className="game-badge bg-cyan-300">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            Mis historias
          </span>

          <h1 className="mt-6 text-4xl font-black leading-tight">Todavía vacío...</h1>
          <p className="mt-4 text-lg font-bold text-slate-700">
            Cuando guardes un cuento, aparecerá aquí como en un cartucho del juego.
          </p>

          <div className="game-card game-card--pink mx-auto mt-8 max-w-xs p-6">
            <p className="text-5xl font-black">?</p>
            <p className="mt-2 text-sm font-bold text-slate-600">Próximamente: lista de aventuras</p>
          </div>
        </div>
      </main>
    </div>
  );
}
