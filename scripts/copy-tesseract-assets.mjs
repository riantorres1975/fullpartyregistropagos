// Copia los assets de Tesseract.js (worker, core WASM y datos de idioma)
// desde node_modules a public/tesseract/ para auto-hospedarlos.
//
// Así el OCR NO depende de CDNs externos y la Content-Security-Policy puede
// seguir restringida a 'self' (sin abrir script-src/connect-src a jsdelivr).
//
// Se ejecuta en `postinstall` (para dev local) y al inicio de `build` (para
// que Vercel los incluya en el deploy). Los archivos copiados están en
// .gitignore: son reproducibles desde node_modules, no se versionan.

import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const out = join(root, "public", "tesseract");
const coreOut = join(out, "core");
const langOut = join(out, "lang");

// Worker + variantes LSTM del core (las que usa Tesseract v7 por defecto,
// para soporte SIMD / relaxed-SIMD / sin-SIMD según el navegador).
const tareas = [
  ["node_modules/tesseract.js/dist/worker.min.js", join(out, "worker.min.js")],
];
const coreDir = "node_modules/tesseract.js-core";
for (const f of [
  "tesseract-core-relaxedsimd-lstm.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm",
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-lstm.wasm",
]) {
  tareas.push([join(coreDir, f), join(coreOut, f)]);
}
// Datos de idioma español (variante best_int, la que empareja con el core LSTM).
tareas.push([
  "node_modules/@tesseract.js-data/spa/4.0.0_best_int/spa.traineddata.gz",
  join(langOut, "spa.traineddata.gz"),
]);

try {
  mkdirSync(coreOut, { recursive: true });
  mkdirSync(langOut, { recursive: true });
  let n = 0;
  for (const [src, dst] of tareas) {
    if (!existsSync(src)) {
      console.warn(`  [tesseract] falta (omitido): ${src}`);
      continue;
    }
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    n++;
  }
  console.log(`[tesseract] ${n}/${tareas.length} assets copiados a public/tesseract/`);
} catch (err) {
  // Nunca romper la instalación/build por esto; el OCR es opcional.
  console.warn("[tesseract] no se pudieron copiar los assets:", err?.message ?? err);
}
