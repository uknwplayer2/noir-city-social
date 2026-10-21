import assert from "node:assert/strict";
import { BackgroundRemoval } from "../engine/BackgroundRemoval.js";

// Simula o ImageData do navegador para testar no Node.js.
globalThis.ImageData = class ImageData {
  constructor(data, width, height) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
};

const width = 5;
const height = 5;
const pixels = new Uint8ClampedArray(width * height * 4);

// Imagem totalmente preta e opaca.
for (let i = 0; i < width * height; i++) {
  pixels[i * 4] = 0;
  pixels[i * 4 + 1] = 0;
  pixels[i * 4 + 2] = 0;
  pixels[i * 4 + 3] = 255;
}

// Quadrado vermelho 3x3 no centro.
for (let y = 1; y <= 3; y++) {
  for (let x = 1; x <= 3; x++) {
    const i = (y * width + x) * 4;
    pixels[i] = 255;
    pixels[i + 1] = 0;
    pixels[i + 2] = 0;
  }
}

const original = new ImageData(
  new Uint8ClampedArray(pixels),
  width,
  height
);

const result = BackgroundRemoval.remove(original);

assert.equal(result.stats.removedPixels, 16);
assert.equal(result.stats.remainingPixels, 9);

// Os cantos devem ficar transparentes.
assert.equal(result.imageData.data[3], 0);

// O centro vermelho deve continuar opaco.
const center = (2 * width + 2) * 4;
assert.equal(result.imageData.data[center], 255);
assert.equal(result.imageData.data[center + 3], 255);

// O original não pode ser alterado.
assert.equal(original.data[3], 255);

console.log("==================================");
console.log("TESTE DE REMOÇÃO DE FUNDO");
console.log("==================================");
console.log("Pixels removidos:", result.stats.removedPixels);
console.log("Pixels preservados:", result.stats.remainingPixels);
console.log("Centro vermelho preservado: SIM");
console.log("Imagem original preservada: SIM");
console.log("RESULTADO: TODOS OS TESTES PASSARAM");
