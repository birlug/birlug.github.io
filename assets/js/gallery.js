(() => {
  const links = [...document.querySelectorAll("[data-gallery-image]")];
  if (!links.length || typeof HTMLDialogElement === "undefined" || !HTMLDialogElement.prototype.showModal) return;
  const template = document.querySelector("#gallery-lightbox");
  if (!template) return;
  document.body.append(template.content.cloneNode(true));
  const dialog = document.querySelector("dialog.lightbox");
  const image = dialog.querySelector("img");
  const status = dialog.querySelector("[role=status]");
  const previous = dialog.querySelector("[data-prev]");
  const next = dialog.querySelector("[data-next]");
  const original = dialog.querySelector("[data-original]");
  let current = 0;
  let opener;
  let group = [];
  let backdropPressed = false;
  let swipe;
  function onBackdrop(event) {
    const box = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
  }
  function go(index) {
    if (index >= 0 && index < group.length && index !== current) show(index);
  }
  function show(index) {
    swipe = null;
    current = index;
    const link = group[current];
    image.hidden = false;
    image.alt = link.dataset.caption + (link.dataset.credit ? " · " + link.dataset.credit : "");
    status.textContent = "در حال بارگذاری تصویر";
    previous.disabled = current === 0;
    next.disabled = current === group.length - 1;
    original.href = link.href;
    image.src = link.href;
    if (dialog.open && !dialog.contains(document.activeElement)) original.focus({preventScroll:true});
  }
  image.addEventListener("load", () => { status.textContent = "عکس " + new Intl.NumberFormat("fa").format(current + 1) + " از " + new Intl.NumberFormat("fa").format(group.length); });
  image.addEventListener("error", () => { image.hidden = true; status.textContent = "تصویر بارگذاری نشد"; });
  links.forEach(link => link.addEventListener("click", event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    opener = link;
    group = [...link.closest("[data-gallery]").querySelectorAll("[data-gallery-image]")];
    show(group.indexOf(link));
    dialog.showModal();
  }));
  previous.addEventListener("click", () => go(current - 1));
  next.addEventListener("click", () => go(current + 1));
  image.addEventListener("pointerdown", event => {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    if (!event.isPrimary) { swipe = null; return; }
    swipe = {id:event.pointerId, x:event.clientX, y:event.clientY};
    image.setPointerCapture(event.pointerId);
  });
  image.addEventListener("pointerup", event => {
    const start = swipe;
    swipe = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.25) go(current + (dx < 0 ? 1 : -1));
  });
  image.addEventListener("pointercancel", () => { swipe = null; });
  image.addEventListener("lostpointercapture", () => { swipe = null; });
  dialog.addEventListener("pointerdown", event => {
    backdropPressed = onBackdrop(event);
    if (event.pointerType === "touch" && !event.isPrimary) swipe = null;
  });
  dialog.addEventListener("click", event => {
    if (backdropPressed && onBackdrop(event)) dialog.close();
    backdropPressed = false;
  });
  dialog.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
    const index = {ArrowLeft:current - 1, ArrowRight:current + 1, Home:0, End:group.length - 1}[event.key];
    if (typeof index === "number") { event.preventDefault(); go(index); }
  });
  dialog.addEventListener("close", () => { swipe = null; backdropPressed = false; image.removeAttribute("src"); opener?.focus(); });
})();
