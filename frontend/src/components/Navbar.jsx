import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import ProfileModal from "./ProfileModal";

function BrandMark() {
  return (
    <>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-slate-900 bg-orange-400 shadow-[5px_5px_0_#111827]">
        <Sparkles className="h-6 w-6" />
      </div>
      <span className="text-xl font-black tracking-tight">StoryBook Agent</span>
    </>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";
  const isNewStory = location.pathname === "/nueva-historia";
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("access_token")),
  );

  const logout = async () => {
    const accessToken = localStorage.getItem("access_token");

    if (accessToken) {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => null);
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setIsProfileOpen(false);
    setIsAuthenticated(false);
    navigate("/");
  };

  if (isNewStory) {
    return (
      <header className="relative z-20 mx-auto flex max-w-7xl items-center px-6 py-6">
        <div className="flex items-center gap-6">
          <BrandMark />
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="relative z-20 mx-auto flex max-w-7xl items-center px-6 py-6">
        <div className="flex flex-wrap items-center gap-6">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-6">
            <BrandMark />
          </Link>

          <nav className="flex flex-wrap items-center gap-4">
            {!isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-lg font-semibold leading-relaxed text-slate-700 hover:text-slate-900"
                >
                  Iniciar sesión/Registrarse
                </button>
                <span aria-hidden="true" className="text-lg font-semibold text-slate-500">
                  |
                </span>
                <a
                  href="https://github.com/awnt9/StoryBook_Agent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold leading-relaxed text-slate-700 hover:text-slate-900"
                >
                  Repositorio de GitHub
                </a>
              </>
            )}

            {isAuthenticated && (
              <>
                {isDashboard && (
                  <>
                    <span aria-hidden="true" className="text-lg font-semibold text-slate-500">
                      |
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsProfileOpen(true)}
                      className="text-lg font-semibold leading-relaxed text-slate-700 hover:text-slate-900"
                    >
                      Mis API keys
                    </button>
                  </>
                )}
                <span aria-hidden="true" className="text-lg font-semibold text-slate-500">
                  |
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="text-lg font-semibold leading-relaxed text-slate-700 hover:text-slate-900"
                >
                  Cerrar sesión
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {isAuthenticated && isDashboard && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </>
  );
}
