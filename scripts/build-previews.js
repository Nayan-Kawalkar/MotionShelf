/**
 * Turns the screen recordings in /media into web-sized card previews for
 * components, templates and sections.
 *
 *   node scripts/build-previews.js
 *
 * The recordings are 1080p, 14–52s and ~440MB in total — far too heavy to
 * ship, and too big for git. They stay out of the repo (see .gitignore); this
 * writes only the derived files:
 *
 *   public/preview/<id>.mp4    ~6s, muted, 800px wide, H.264
 *   public/preview/<id>.webp   poster frame, same width
 *   src/previews.js            generated manifest the cards import
 *
 * SOURCES maps each component to the clip that shows it, because the
 * recordings are named by timestamp and carry no hint of their contents.
 * `start` is where the interesting motion begins in that recording.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// ffmpeg-static ships an ~82MB binary and sharp is a native module. Neither is
// needed to build or deploy the site — the previews under public/preview are
// committed — so they are not project dependencies. Install them only when
// regenerating:  npm i -D ffmpeg-static sharp
let ffmpeg, sharp;
try {
  ({ default: ffmpeg } = await import("ffmpeg-static"));
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error("Missing encode tools. Run:  npm i -D ffmpeg-static sharp");
  process.exit(1);
}

const MEDIA = "media";
const OUT = "public/preview";
const MANIFEST = "src/previews.js";

const WIDTH = 800; // cards are ~390px wide; this covers 2x displays
const SECONDS = 6;
const CRF = 30;
const FPS = 24;

// Recording file names are timestamps, so each component names its clip by the
// timestamp fragment that identifies it, plus where to start the excerpt.
// Matching on the name rather than position in the folder matters: a new
// recording that sorts earlier would otherwise shift every mapping silently.
// `sameAs` points an entry at another's files instead, so a shared preview is
// not encoded or shipped twice.
const SOURCES = {
  "ascii-particle-text": { clip: "14-54-40", start: 4 },
  carousel: { clip: "15-53-34", start: 4 },
  "curved-card-marquee": { clip: "15-05-07", start: 3 },
  "curved-carousel": { clip: "15-06-14", start: 5 },
  "floating-arc-slider": { sameAs: "curved-card-marquee" },
  "image-queue": { clip: "14-45-25", start: 5 },
  "paint-spread-wordmark": { clip: "14-46-21", start: 6 },
  "scroll-assemble-image": { clip: "14-49-23", start: 8 },
  "snap-deck": { clip: "14-55-52", start: 3 },
  "sphere-album": { clip: "14-43-24", start: 4 },
  "spherical-gallery": { clip: "14-50-21", start: 6 },
  "tarot-carousel": { clip: "14-44-29", start: 5 },

  // Templates and sections. Ids are unique across all three registries, so
  // they share this table and the one manifest.
  luxeria: { clip: "Luxeria", start: 5 },
  "nova-cans": { clip: "can with no audio", start: 5 },
  nexbot: { clip: "NexBot", start: 5 },
  "axiom-sneaker": { clip: "ed shoe", start: 5 },
  "moving-garden": { clip: "Moving gardern", start: 5 },
};

const run = (args) => execFileSync(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
const kb = (p) => Math.round(statSync(p).size / 1024);

const clips = readdirSync(MEDIA)
  .filter((f) => f.toLowerCase().endsWith(".mp4"))
  .sort();

if (!clips.length) {
  console.error(`No .mp4 files in /${MEDIA}. Nothing to build.`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const manifest = {};
let totalKb = 0;

const aliases = [];

for (const [id, { clip, start, sameAs }] of Object.entries(SOURCES)) {
  if (sameAs) {
    aliases.push([id, sameAs]);
    continue;
  }
  const matches = clips.filter((f) => f.includes(clip));
  if (matches.length !== 1) {
    console.warn(
      `  ${id.padEnd(24)} SKIPPED — "${clip}" matches ${matches.length} recordings`
    );
    continue;
  }
  const source = matches[0];
  const input = join(MEDIA, source);
  const mp4 = join(OUT, `${id}.mp4`);
  const poster = join(OUT, `${id}.webp`);

  // -ss before -i seeks by keyframe, which is fast and accurate enough here.
  run([
    "-y", "-ss", String(start), "-t", String(SECONDS), "-i", input,
    "-vf", `scale=${WIDTH}:-2:flags=lanczos,fps=${FPS}`,
    "-c:v", "libx264", "-crf", String(CRF), "-preset", "slow", "-profile:v", "high",
    "-pix_fmt", "yuv420p",
    // Loops are seamless only if the clip can start playing before it is fully
    // downloaded, so the index goes at the front.
    "-movflags", "+faststart",
    "-an", mp4, "-loglevel", "error",
  ]);

  const frame = join(OUT, `${id}.png`);
  run(["-y", "-ss", String(start + 1), "-i", input, "-vframes", "1",
       "-vf", `scale=${WIDTH}:-2:flags=lanczos`, frame, "-loglevel", "error"]);
  await sharp(frame).webp({ quality: 72 }).toFile(poster);
  rmSync(frame, { force: true });

  const sizes = `${kb(mp4)}KB mp4 + ${kb(poster)}KB poster`;
  totalKb += kb(mp4) + kb(poster);
  manifest[id] = { video: `/preview/${id}.mp4`, poster: `/preview/${id}.webp` };
  console.log(`  ${id.padEnd(24)} ${sizes}`);
}

// Resolved after the encode loop so the target's files are known to exist.
for (const [id, target] of aliases) {
  if (!manifest[target]) {
    console.warn(`  ${id.padEnd(24)} SKIPPED — no preview built for ${target}`);
    continue;
  }
  manifest[id] = { ...manifest[target] };
  console.log(`  ${id.padEnd(24)} reuses ${target}`);
}

const body = `// GENERATED by scripts/build-previews.js — do not edit by hand.
// Recorded card previews, keyed by component id. Components missing here fall
// back to rendering live in the card.
const previews = ${JSON.stringify(manifest, null, 2)};

export default previews;

export function previewFor(id) {
  return previews[id] ?? null;
}
`;
writeFileSync(MANIFEST, body);

console.log(`\n  ${Object.keys(manifest).length} previews, ${(totalKb / 1024).toFixed(1)}MB total`);
console.log(`  wrote ${MANIFEST}`);
