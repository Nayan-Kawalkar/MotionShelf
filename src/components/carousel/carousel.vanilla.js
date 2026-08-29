// Coverflow Carousel — no framework required.
//
//   import mount from "./carousel.vanilla.js";
//   const carousel = mount(document.getElementById("carousel"));
//   carousel.destroy();
//
// Needs carousel.css alongside it.

const DEFAULT_SLIDES = [
  { id: 1, title: "Kyoto, Japan", subtitle: "Maples along the Philosopher's Path", image: "https://picsum.photos/seed/kyoto-path/900/1100" },
  { id: 2, title: "Faroe Islands", subtitle: "Grass-roofed villages above the fjord", image: "https://picsum.photos/seed/faroe-islands/900/1100" },
  { id: 3, title: "Marrakech", subtitle: "Spice stalls in the Jemaa el-Fnaa souk", image: "https://picsum.photos/seed/marrakech-souk/900/1100" },
  { id: 4, title: "Patagonia", subtitle: "Granite towers over Lago Torre", image: "https://picsum.photos/seed/patagonia-towers/900/1100" },
  { id: 5, title: "Lofoten", subtitle: "Fishing huts under the midnight sun", image: "https://picsum.photos/seed/lofoten-huts/900/1100" },
];

/* @controls:start */
const DEFAULTS = {
  accent: "#ffffff",
  dotColor: "#d4d4d8",
  cardWidth: 280,
  cardHeight: 400,
  radius: 16,
  spacing: 62,
  sideScale: 0.74,
  speed: 520,
  showArrows: true,
  showDots: true,
  showCaption: true,
};
/* @controls:end */

const CHEVRON = {
  left: "15 18 9 12 15 6",
  right: "9 18 15 12 9 6",
};

function ringOffset(i, index, count) {
  let d = i - index;
  if (d > count / 2) d -= count;
  if (d < -count / 2) d += count;
  return d;
}

function el(tag, className, attrs) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.assign(node, attrs || {});
  return node;
}

function chevron(direction) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", CHEVRON[direction]);
  svg.appendChild(line);
  return svg;
}

export default function mount(target, options) {
  const opts = { ...DEFAULTS, slides: DEFAULT_SLIDES, ...options };
  const slides = opts.slides;
  const count = slides.length;
  let index = 0;

  const root = el("div", "carousel");
  root.tabIndex = 0;
  root.style.setProperty("--carousel-accent", opts.accent);
  root.style.setProperty("--carousel-card-w", opts.cardWidth + "px");
  root.style.setProperty("--carousel-card-h", opts.cardHeight + "px");
  root.style.setProperty("--carousel-radius", opts.radius + "px");

  const stage = el("div", "carousel-stage");
  root.appendChild(stage);

  // One card per slide, reused on every render — only the transforms change.
  const cards = slides.map((slide, i) => {
    const card = el("button", "carousel-card");
    card.type = "button";

    const img = el("img", "carousel-card__img");
    img.src = slide.image;
    img.alt = slide.title;
    img.draggable = false;
    card.appendChild(img);
    card.appendChild(el("div", "carousel-card__shade"));

    if (opts.showCaption) {
      const info = el("div", "carousel-card__info");
      const countLabel = el("span", "carousel-card__count");
      countLabel.textContent =
        String(i + 1).padStart(2, "0") + " / " + String(count).padStart(2, "0");
      const title = el("h3", "carousel-card__title");
      title.textContent = slide.title;
      const subtitle = el("p", "carousel-card__subtitle");
      subtitle.textContent = slide.subtitle;
      info.append(countLabel, title, subtitle);
      card.appendChild(info);
    }

    card.addEventListener("click", () => {
      if (ringOffset(i, index, count) !== 0) goTo(i);
    });

    stage.appendChild(card);
    return card;
  });

  let prevButton = null;
  let nextButton = null;
  if (opts.showArrows) {
    prevButton = el("button", "carousel-control carousel-control--prev");
    prevButton.type = "button";
    prevButton.setAttribute("aria-label", "Previous slide");
    prevButton.appendChild(chevron("left"));
    prevButton.addEventListener("click", () => goTo(index - 1));

    nextButton = el("button", "carousel-control carousel-control--next");
    nextButton.type = "button";
    nextButton.setAttribute("aria-label", "Next slide");
    nextButton.appendChild(chevron("right"));
    nextButton.addEventListener("click", () => goTo(index + 1));

    root.append(prevButton, nextButton);
  }

  let dots = [];
  if (opts.showDots) {
    const dotRow = el("div", "carousel-dots");
    dots = slides.map((slide, i) => {
      const dot = el("button", "carousel-dot");
      dot.type = "button";
      dot.setAttribute("aria-label", "Go to slide " + (i + 1));
      dot.addEventListener("click", () => goTo(i));
      dotRow.appendChild(dot);
      return dot;
    });
    root.appendChild(dotRow);
  }

  function render() {
    cards.forEach((card, i) => {
      const offset = ringOffset(i, index, count);
      const abs = Math.abs(offset);

      if (abs > 2) {
        card.style.display = "none";
        return;
      }
      card.style.display = "";

      const scale = offset === 0 ? 1 : abs === 1 ? opts.sideScale : opts.sideScale * opts.sideScale;
      const step = opts.spacing + (abs - 1) * (opts.spacing * 0.65);
      const shift = offset === 0 ? 0 : offset > 0 ? step : -step;

      card.style.transform =
        "translate(-50%, -50%) translateX(" + shift + "%) scale(" + scale + ")";
      card.style.opacity = abs === 2 ? "0.35" : abs === 1 ? "0.75" : "1";
      card.style.zIndex = String(10 - abs);
      card.style.filter = abs >= 2 ? "blur(1px)" : "none";
      card.style.cursor = offset === 0 ? "default" : "pointer";
      card.style.transition =
        "transform " + opts.speed + "ms cubic-bezier(0.22, 1, 0.36, 1), opacity " +
        opts.speed + "ms ease, filter " + opts.speed + "ms ease";
      card.classList.toggle("carousel-card--active", offset === 0);

      const caption = card.querySelector(".carousel-card__info");
      if (caption) caption.style.display = offset === 0 ? "" : "none";
    });

    dots.forEach((dot, i) => {
      const active = i === index;
      dot.style.width = active ? "22px" : "8px";
      dot.style.backgroundColor = active ? opts.accent : opts.dotColor;
      dot.setAttribute("aria-current", String(active));
    });
  }

  function goTo(i) {
    index = ((i % count) + count) % count;
    render();
  }

  function onKey(e) {
    if (e.key === "ArrowLeft") goTo(index - 1);
    if (e.key === "ArrowRight") goTo(index + 1);
  }
  root.addEventListener("keydown", onKey);

  target.appendChild(root);
  render();

  return {
    goTo,
    next: () => goTo(index + 1),
    prev: () => goTo(index - 1),
    destroy() {
      root.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}
