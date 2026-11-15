const viewer = document.querySelector("#viewer");
const viewerTitle = document.querySelector("#viewer-title");
const viewerTools = document.querySelector("#viewer-tools");
const viewerContent = document.querySelector("#viewer-content");
const viewerNote = document.querySelector("#viewer-note");
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

function setPhoto(image, work, view) {
  const [width, height] = work.dimensions[view === "original" ? 0 : 1];
  image.width = width;
  image.height = height;
  image.alt = work.alt + "（" + viewNames[view] + "）";
  image.src = photoSource(work, view);
  image.srcset = view === "art" ? `assets/${work.id}-v2.webp ${work.dimensions[1][0]}w, assets/${work.id}-large.webp ${work.largeDimensions[0]}w` : "";
  image.sizes = "(max-width: 760px) 89vw, 80vw";
}

function createButton(label, className, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

function createViewButtons(onSelect) {
  return Object.entries(viewNames).map(([view, label]) => {
    const button = createButton(label, "view-button", () => onSelect(view));
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
    setPhoto(image, work, view);
    selectButton(tools, view);
  };
  tools.append(...createViewButtons(update));
  const compare = createButton("并排对照", "compare-button", () => openViewer(index, "compare", compare));
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

function setViewerMode(value) {
  viewerMode = value;
  const work = works[currentIndex];
  selectButton(viewerTools, value);
  viewerContent.classList.toggle("compare", value === "compare");
  viewerContent.classList.remove('zoomed');
  viewerContent.scrollTo(0, 0);
  const download = document.querySelector('#download-photo');
  if (download) {
    const original = value === 'original';
    download.href = `assets/${work.id}-${original ? 'original' : 'large'}.webp`;
    download.download = `${work.id}-${original ? 'original' : '3840'}.webp`;
    download.textContent = original ? '下载原片 ↓' : '下载 3840px 调整版 ↓';
  }
  const views = value === "compare" ? ["original", "art"] : [value];
  viewerContent.replaceChildren(...views.map(view => {
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    const label = document.createElement("figcaption");
    label.textContent = viewNames[view];
    setPhoto(image, work, view);
    if(view === "art") { image.src = `assets/${work.id}-large.webp`; image.removeAttribute("srcset"); }
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `${viewNames[view]}：点击放大，再次点击还原`);
    image.setAttribute('aria-pressed', 'false');
    const toggleZoom = () => {
      const zoomed = image.classList.toggle('is-zoomed');
      image.setAttribute('aria-pressed', String(zoomed));
      viewerContent.classList.toggle('zoomed', !!viewerContent.querySelector('.is-zoomed'));
    };
    image.addEventListener('click', toggleZoom);
    image.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleZoom(); }
    });
    figure.append(image, label);
    return figure;
  }));
}

function updateViewer() {
  const work = works[currentIndex];
  viewerTitle.textContent = work.title;
  viewerCount.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(works.length).padStart(2, '0')}`;
  viewerNote.textContent = work.edit;
  const oldDownload = document.querySelector("#download-photo");
  if(oldDownload) oldDownload.remove();
  const download = document.createElement("a");
  download.id = "download-photo"; download.className = "download"; download.href = `assets/${work.id}-large.webp`; download.download = `${work.id}-3840.webp`; download.textContent = "下载 3840px 放大版 ↗"; viewerTools.append(download);
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

viewerTools.append(...createViewButtons(setViewerMode));
const viewerCompare = createButton("并排对照", "view-button", () => setViewerMode("compare"));
viewerCompare.dataset.view = "compare";
viewerTools.append(viewerCompare);
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
const chapterLinks = [...document.querySelectorAll(".chapter-links a")];
const chapterObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    for (const link of chapterLinks) {
      if (link.hash === "#" + entry.target.id) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }
}, { rootMargin: "-24% 0px -56%" });
for (const chapter of document.querySelectorAll(".work")) chapterObserver.observe(chapter);
