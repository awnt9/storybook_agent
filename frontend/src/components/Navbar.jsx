import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GameBrand from "./game/GameBrand";
import GameButton from "./game/GameButton";
import ProfileModal from "./ProfileModal";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";
  const isNewStory = location.pathname === "/nueva-historia";
  const isMyStories = location.pathname === "/mis-historias";
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("access_token")),
  );

  useEffect(() => {
    setIsAuthenticated(Boolean(localStorage.getItem("access_token")));
  }, [location.pathname]);

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
      <header className="game-navbar-wrap">
        <div className="game-navbar">
          <GameBrand to="/dashboard" />
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="game-navbar-wrap">
        <div className="game-navbar">
          <GameBrand to={isAuthenticated ? "/dashboard" : "/"} />

          <nav>
            {!isAuthenticated && (
              <>
                <GameButton variant="white" size="sm" onClick={() => navigate("/login")}>
                  Entrar
                </GameButton>
                <GameButton variant="cyan" size="sm" onClick={() => navigate("/register")}>
                  Registro
                </GameButton>
              </>
            )}

            {isAuthenticated && (
              <>
                {isDashboard && (
                  <GameButton variant="cyan" size="sm" onClick={() => setIsProfileOpen(true)}>
                    API keys
                  </GameButton>
                )}
                {!isMyStories && (
                  <GameButton variant="white" size="sm" onClick={logout}>
                    Salir
                  </GameButton>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      {isAuthenticated && isDashboard && (
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      )}
    </>
  );
}
