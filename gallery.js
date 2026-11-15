const viewer = document.querySelector("#viewer");
const viewerTitle = document.querySelector("#viewer-title");
const viewerTools = document.querySelector("#viewer-tools");
const viewerContent = document.querySelector("#viewer-content");
const viewerNote = document.querySelector("#viewer-note");
const compareSwitch = document.querySelector(".compare-switch");
const previous = document.querySelector("#previous");
const next = document.querySelector("#next");
const closeViewer = document.querySelector("#close");
const viewNames = { art: "调整版", original: "原片" };
const selectedViews = works.map(work => work.defaultView);
let currentIndex = 0;
let viewerMode = "original";
let opener;
const viewerCount = document.querySelector('#viewer-count');

function photoSource(work, view) {
  return "assets/" + work.id + (view === "art" ? "-v2" : "-original") + ".webp";
}

function setPhoto(image, work, view, { sizes, fullSize = false } = {}) {
  const [width, height] = fullSize ? work.largeDimensions : work.dimensions[view === "original" ? 0 : 1];
  image.width = width;
  image.height = height;
  image.alt = work.alt + "（" + viewNames[view] + "）";
  image.sizes = sizes ?? "";
  image.srcset = view === "art" && sizes
    ? `assets/${work.id}-v2.webp ${width}w, assets/${work.id}-large.webp ${work.largeDimensions[0]}w`
    : "";
  image.src = fullSize ? `assets/${work.id}-large.webp` : photoSource(work, view);
}

function createButton(label, className, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

function createViewButtons(onSelect, views = ["art", "original"]) {
  return views.map(view => {
    const button = createButton(viewNames[view], "view-button", () => onSelect(view));
    button.dataset.view = view;
    return button;
  });
}

function selectButton(group, value) {
  for (const button of group.querySelectorAll("[data-view]")) {
    button.setAttribute("aria-pressed", String(button.dataset.view === value));
  }
}

function mountWork(work, index) {
  const extra = index >= 5;
  const article = document.createElement("article");
  article.id = work.anchor;
  article.className = extra ? "extra" : "work";
  if (index === 2) article.classList.add("split-work");
  const heading = document.createElement("div");
  heading.className = "work-heading";
  const title = document.createElement(extra ? "h3" : "h2");
  title.textContent = work.title;
  if (!extra) {
    const chapter = document.createElement("p");
    chapter.className = "eyebrow";
    chapter.textContent = "0" + (index + 1) + " / " + work.chapter;
    heading.append(chapter);
  }
  heading.append(title);
  const figure = document.createElement("figure");
  const picture = createButton("", "work-photo", () => openViewer(index, selectedViews[index], picture));
  picture.setAttribute("aria-label", "放大查看｜" + work.title);
  const image = document.createElement("img");
  image.loading = "lazy";
  image.decoding = "async";
  const zoom = document.createElement("span");
  zoom.className = "zoom";
  zoom.setAttribute("aria-hidden", "true");
  zoom.textContent = "＋";
  picture.append(image, zoom);
  const tools = document.createElement("div");
  tools.className = "gallery-tools";
  tools.setAttribute("role", "group");
  tools.setAttribute("aria-label", work.title + "的版本");
  const update = view => {
    selectedViews[index] = view;
    setPhoto(image, work, view, { sizes: `(max-width: 760px) 89vw, ${extra ? "42vw" : "80vw"}` });
    selectButton(tools, view);
  };
  tools.append(...createViewButtons(update));
  const compare = createButton("原片对照", "compare-button", () => openViewer(index, "compare", compare));
  tools.append(compare);
  figure.append(picture, tools);
  update(selectedViews[index]);
  const description = document.createElement("div");
  description.className = extra ? "extra-text" : "work-description";
  const caption = document.createElement("p");
  caption.textContent = work.text;
  description.append(caption);
  if (extra) article.append(figure, heading, description);
  else article.append(heading, figure, description);
  document.querySelector(extra ? "#extra-works" : "#chapters").append(article);
}

function setCompareView(view) {
  viewerContent.dataset.compareView = view;
  selectButton(compareSwitch, view);
  setDownload(works[currentIndex], view);
}

function setDownload(work, view) {
  const original = view === "original";
  download.href = `assets/${work.id}-${original ? "original" : "large"}.webp`;
  download.download = `${work.id}-${original ? "original" : "3840"}.webp`;
  download.textContent = original ? "下载原片 ↓" : "下载 3840px 调整版 ↓";
}

function createViewerPhoto(work, view, comparison) {
  const figure = document.createElement("figure");
  const image = document.createElement("img");
  const label = document.createElement("figcaption");
  figure.dataset.version = view;
  label.textContent = viewNames[view];
  image.decoding = "async";
  setPhoto(image, work, view, { fullSize: !comparison && view === "art" });

  if (comparison) {
    image.decode?.().catch(() => {});
  } else {
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `${viewNames[view]}：点击放大，再次点击还原`);
    image.setAttribute("aria-pressed", "false");
    const toggleZoom = () => {
      const zoomed = image.classList.toggle("is-zoomed");
      image.setAttribute("aria-pressed", String(zoomed));
      viewerContent.classList.toggle("zoomed", zoomed);
      if (!zoomed) viewerContent.scrollTo(0, 0);
    };
    image.addEventListener("click", toggleZoom);
    image.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleZoom();
    });
  }

  figure.append(image, label);
  return figure;
}

function setViewerMode(value) {
  viewerMode = value;
  const work = works[currentIndex];
  const comparison = value === "compare";
  viewer.dataset.mode = value;
  selectButton(viewerTools, value);
  viewerContent.classList.toggle("compare", comparison);
  viewerContent.classList.remove("zoomed");

  if (comparison) {
    const [width, height] = work.dimensions[1];
    viewerContent.style.setProperty("--photo-ratio", `${width} / ${height}`);
    setCompareView("art");
  } else {
    setDownload(work, value);
  }
  const views = comparison ? ["original", "art"] : [value];
  viewerContent.replaceChildren(...views.map(view => createViewerPhoto(work, view, comparison)));
  viewerContent.scrollTo(0, 0);
}

function updateViewer() {
  const work = works[currentIndex];
  viewerTitle.textContent = work.title;
  viewerCount.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(works.length).padStart(2, '0')}`;
  viewerNote.textContent = work.edit;
  previous.disabled = currentIndex === 0;
  next.disabled = currentIndex === works.length - 1;
  setViewerMode(viewerMode);
}

function openViewer(index, mode, trigger) {
  opener = trigger;
  currentIndex = index;
  viewerMode = mode;
  updateViewer();
  viewer.showModal();
  closeViewer.focus();
}

function navigateViewer(direction) {
  const target = currentIndex + direction;
  if (target < 0 || target >= works.length) return;
  currentIndex = target;
  if (viewerMode !== "compare") viewerMode = selectedViews[target];
  updateViewer();
}

compareSwitch.append(...createViewButtons(setCompareView, ["original", "art"]));
const download = document.createElement("a");
download.className = "download";
const viewerCompare = createButton("对照", "view-button", () => {
  setViewerMode("compare");
  if (compareSwitch.offsetHeight) compareSwitch.querySelector("[aria-pressed=true]").focus();
});
viewerCompare.dataset.view = "compare";
const openSingle = createButton("查看大图", "view-button compare-open-single", () => {
  setViewerMode(viewerContent.dataset.compareView);
  viewerTools.querySelector("[aria-pressed=true]").focus();
});
viewerTools.append(...createViewButtons(setViewerMode), viewerCompare, openSingle, download);
previous.addEventListener("click", () => navigateViewer(-1));
next.addEventListener("click", () => navigateViewer(1));
closeViewer.addEventListener("click", () => viewer.close());
viewer.addEventListener("close", () => opener?.focus({ preventScroll: true }));
viewer.addEventListener("click", event => {
  if (event.target !== viewer) return;
  const bounds = viewer.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
});
viewer.addEventListener("keydown", event => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  if (viewerContent.classList.contains('zoomed')) return;
  event.preventDefault();
  navigateViewer(event.key === "ArrowLeft" ? -1 : 1);
});

let swipeStart = null;
viewerContent.addEventListener('touchstart', event => {
  swipeStart = event.touches.length === 1 && !viewerContent.classList.contains('zoomed')
    ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
}, { passive: true });
viewerContent.addEventListener('touchmove', event => {
  if (event.touches.length !== 1) swipeStart = null;
}, { passive: true });
viewerContent.addEventListener('touchend', event => {
  if (!swipeStart) return;
  const dx = event.changedTouches[0].clientX - swipeStart.x;
  const dy = event.changedTouches[0].clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.6) navigateViewer(dx < 0 ? 1 : -1);
}, { passive: true });
viewerContent.addEventListener('touchcancel', () => { swipeStart = null; }, { passive: true });

works.forEach(mountWork);

function startScrollReveals() {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motion.matches || !("IntersectionObserver" in window)) return;

  const targets = document.querySelectorAll([
    ".intro > div", ".work-heading", ".work-photo", ".work-description",
    ".section-heading", ".extra-text", ".process h2", ".author-statement"
  ].join(", "));
  const reveal = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      target.classList.remove("awaiting-entry");
      reveal.unobserve(target);
    }
  }, { rootMargin: "0px 0px -5% 0px" });

  for (const target of targets) {
    if (target.getBoundingClientRect().top < window.innerHeight) continue;
    target.classList.add("awaiting-entry");
    reveal.observe(target);
  }

  motion.addEventListener("change", ({ matches }) => {
    if (!matches) return;
    reveal.disconnect();
    for (const target of targets) target.classList.remove("awaiting-entry");
  });
}

function trackChapters() {
  const nav = document.querySelector(".chapter-nav");
  const progress = nav.querySelector(".chapter-progress");
  const links = [...nav.querySelectorAll("a")];
  const chapters = links.map(link => document.getElementById(link.hash.slice(1)));
  let activeIndex = -1;
  let pendingFrame;

  function update() {
    pendingFrame = undefined;
    const marker = nav.offsetHeight + Math.min(100, window.innerHeight * .18);
    const bounds = chapters.map(chapter => chapter.getBoundingClientRect());
    const start = bounds[0].top;
    const end = bounds.at(-1).bottom;
    const fraction = Math.max(0, Math.min(1, (marker - start) / (end - start)));
    const index = end > nav.offsetHeight ? bounds.findLastIndex(chapter => chapter.top <= marker) : -1;

    progress.style.setProperty("--chapter-progress", fraction);
    if (index === activeIndex) return;
    links[activeIndex]?.removeAttribute("aria-current");
    links[index]?.setAttribute("aria-current", "location");
    activeIndex = index;
  }

  function scheduleUpdate() {
    pendingFrame ??= requestAnimationFrame(update);
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("pageshow", scheduleUpdate);
  new ResizeObserver(scheduleUpdate).observe(document.querySelector(".chapter-gallery"));
  update();
}

startScrollReveals();
trackChapters();
