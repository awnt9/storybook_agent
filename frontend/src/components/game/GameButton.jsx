import { motion } from "framer-motion";

const variants = {
  pink: "game-btn--pink",
  cyan: "game-btn--cyan",
  lime: "game-btn--lime",
  orange: "game-btn--orange",
  white: "game-btn--white",
};

export default function GameButton({
  children,
  variant = "pink",
  size = "md",
  className = "",
  type = "button",
  disabled,
  onClick,
}) {
  const sizeClass = size === "lg" ? "game-btn--lg" : size === "sm" ? "game-btn--sm" : "";

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileTap={disabled ? undefined : { y: 2, scale: 0.98 }}
      className={`game-btn ${variants[variant] ?? variants.pink} ${sizeClass} ${className}`.trim()}
    >
      {children}
    </motion.button>
  );
}
