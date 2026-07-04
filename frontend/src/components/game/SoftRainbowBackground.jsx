import { motion } from "framer-motion";

const blobs = [
  { className: "absolute -top-20 -left-16 h-72 w-72 bg-pink-400", delay: 0.05, opacity: 0.55 },
  { className: "absolute top-24 right-0 h-80 w-80 bg-cyan-400", delay: 0.12, opacity: 0.5 },
  { className: "absolute bottom-16 left-1/4 h-80 w-80 bg-yellow-300", delay: 0.18, opacity: 0.48 },
  { className: "absolute top-1/2 -left-10 h-64 w-64 bg-violet-400", delay: 0.24, opacity: 0.42 },
  { className: "absolute bottom-8 right-1/4 h-72 w-72 bg-lime-400", delay: 0.3, opacity: 0.45 },
];

/**
 * Soft rainbow ambience for lobby screens. Keep cards/buttons solid on top.
 */
export default function SoftRainbowBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#fff5cf]" />
      <div className="absolute inset-0 bg-gradient-to-br from-pink-200/25 via-transparent to-cyan-200/20" />

      {blobs.map((blob) => (
        <motion.div
          key={blob.className}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: blob.opacity, scale: 1 }}
          transition={{ duration: 0.9, delay: blob.delay }}
          className={`${blob.className} rounded-full blur-3xl`}
        />
      ))}
    </div>
  );
}
