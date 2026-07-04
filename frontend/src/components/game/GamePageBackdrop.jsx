import ColorStickers from "./ColorStickers";
import SoftRainbowBackground from "./SoftRainbowBackground";

export default function GamePageBackdrop({ stickers = true }) {
  return (
    <>
      <SoftRainbowBackground />
      {stickers ? <ColorStickers /> : null}
    </>
  );
}
