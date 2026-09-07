import * as THREE from "three";

export function seededRandom(seed: number) {
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed);
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Small deterministic surface maps, generated once and shared by each material. */
export function surfaceTexture(kind: "asphalt" | "grass" | "concrete") {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const pixels = context.createImageData(size, size);
  const random = seededRandom(2718);
  const base = kind === "grass" ? [82, 94, 68] : kind === "concrete" ? [131, 134, 129] : [108, 113, 118];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const grain = (random() - 0.5) * (kind === "grass" ? 56 : 36);
      const wear = Math.sin(x * 0.026) * Math.sin(y * 0.018) * 9;
      for (let channel = 0; channel < 3; channel++) pixels.data[index + channel] = base[channel]! + grain + wear;
      pixels.data[index + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  if (kind === "asphalt") {
    // Soft longitudinal rubber marks. Wrapping has no hard transverse seam.
    for (const y of [160, 350]) {
      const gradient = context.createLinearGradient(0, y - 20, 0, y + 20);
      gradient.addColorStop(0, "#13192200");
      gradient.addColorStop(0.5, "#1319224d");
      gradient.addColorStop(1, "#13192200");
      context.fillStyle = gradient;
      context.fillRect(0, y - 20, size, 40);
    }
  }
  if (kind === "concrete") {
    context.strokeStyle = "#303b4040";
    context.lineWidth = 2;
    context.strokeRect(1, 1, size - 2, size - 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
