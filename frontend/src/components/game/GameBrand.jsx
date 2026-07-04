import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function GameBrand({ to = "/" }) {
  return (
    <Link to={to} className="inline-flex items-center gap-3 no-underline text-inherit">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-slate-900 bg-orange-400 shadow-[5px_5px_0_#111827]">
        <Sparkles className="h-6 w-6" aria-hidden="true" />
      </div>
      <span className="text-xl font-black tracking-tight">StoryBook Agent</span>
    </Link>
  );
}
