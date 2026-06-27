/**
 * Скачивает PDF-книги библиотеки с archive.org в public/library/.
 * Источники — открытые сканы (public domain / свободное распространение).
 * Файлы не коммитятся в git (см. .gitignore) — запусти этот скрипт на любом сервере.
 *
 * Запуск: node prisma/fetch-pdfs.mjs
 */
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

dns.setDefaultResultOrder("ipv4first");

const OUT_DIR = path.resolve("public/library");

const PDFS = [
  {
    out: "madinah-arabic-1.pdf",
    url: "https://archive.org/download/madinah_arabic__dr_v_abdur_rahim/book_1%2Fmadinah_arabic_1.pdf",
  },
  {
    out: "mualim-sani.pdf",
    url: "https://archive.org/download/rosha74_mail_20180204/%D0%9C%D1%83%D0%B0%D0%BB%D0%BB%D0%B8%D0%BC%20%D1%81%D0%B0%D0%BD%D0%B8%20%D1%82%D0%B0%D0%B4%D0%B6%D0%B2%D0%B8%D0%B4.pdf",
  },
];

async function download(url, outPath) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { connection: "close" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await pipeline(res.body, fs.createWriteStream(outPath));
      const size = fs.statSync(outPath).size;
      console.log(`  ✓ ${path.basename(outPath)} — ${(size / 1024 / 1024).toFixed(1)} MB`);
      return;
    } catch (e) {
      console.log(`  ⚠ ${path.basename(outPath)} — ${e.message}, retry ${attempt}`);
      if (attempt === 4) throw e;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    } finally {
      clearTimeout(timer);
    }
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`🌱 Скачивание PDF в ${OUT_DIR}...`);
  for (const p of PDFS) {
    await download(p.url, path.join(OUT_DIR, p.out));
  }
  console.log("✅ PDF-книги скачаны.");
}

main().catch((e) => {
  console.error("❌ Ошибка скачивания PDF:", e);
  process.exit(1);
});
