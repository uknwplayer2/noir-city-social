/**
 * Noir City Lab — BackgroundRemoval
 *
 * Remove o fundo conectado às bordas da imagem.
 * Preserva os pixels que não estão conectados ao fundo.
 *
 * Não modifica o ImageData original.
 */
export class BackgroundRemoval {
  static remove(imageData, options = {}) {
    if (!imageData || !imageData.data) {
      throw new TypeError("ImageData inválido.");
    }

    const {
      color = "#000000",
      tolerance = 18,
      eightConnected = false
    } = options;

    if (!Number.isFinite(tolerance) || tolerance < 0) {
      throw new RangeError("A tolerância deve ser um número >= 0.");
    }

    const width = imageData.width;
    const height = imageData.height;
    const source = imageData.data;
    const output = new ImageData(
      new Uint8ClampedArray(source),
      width,
      height
    );

    const target = color.match(/^#([0-9a-f]{6})$/i);

    if (!target) {
      throw new TypeError("Use uma cor hexadecimal, como #000000.");
    }

    const hex = target[1];
    const targetR = parseInt(hex.slice(0, 2), 16);
    const targetG = parseInt(hex.slice(2, 4), 16);
    const targetB = parseInt(hex.slice(4, 6), 16);

    const total = width * height;
    const visited = new Uint8Array(total);
    const queue = new Int32Array(total);

    let head = 0;
    let tail = 0;
    let removedPixels = 0;

    function matchesBackground(pixel) {
      const offset = pixel * 4;

      return (
        Math.abs(source[offset] - targetR) <= tolerance &&
        Math.abs(source[offset + 1] - targetG) <= tolerance &&
        Math.abs(source[offset + 2] - targetB) <= tolerance &&
        source[offset + 3] > 0
      );
    }

    function addPixel(pixel) {
      if (visited[pixel] || !matchesBackground(pixel)) {
        return;
      }

      visited[pixel] = 1;
      queue[tail++] = pixel;
    }

    // Começa pelas quatro bordas.
    for (let x = 0; x < width; x++) {
      addPixel(x);
      addPixel((height - 1) * width + x);
    }

    for (let y = 0; y < height; y++) {
      addPixel(y * width);
      addPixel(y * width + width - 1);
    }

    const directions = eightConnected
      ? [
          [-1, -1], [0, -1], [1, -1],
          [-1,  0],           [1,  0],
          [-1,  1], [0,  1], [1,  1]
        ]
      : [
          [0, -1],
          [-1, 0],
          [1, 0],
          [0, 1]
        ];

    // Percorre apenas a região de fundo conectada às bordas.
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;

        if (
          nx < 0 ||
          ny < 0 ||
          nx >= width ||
          ny >= height
        ) {
          continue;
        }

        addPixel(ny * width + nx);
      }
    }

    // Torna transparente o fundo identificado.
    for (let i = 0; i < total; i++) {
      if (!visited[i]) {
        continue;
      }

      output.data[i * 4 + 3] = 0;
      removedPixels++;
    }

    return {
      imageData: output,
      stats: {
        width,
        height,
        totalPixels: total,
        removedPixels,
        remainingPixels: total - removedPixels,
        tolerance,
        backgroundColor: color,
        eightConnected
      }
    };
  }
}
