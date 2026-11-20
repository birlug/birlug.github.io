function normalizeSearch(value) {
  return value.normalize("NFKC").toLowerCase().replace(/ي|ى/g, "ی").replace(/ك/g, "ک").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[\u200c\u200d]/g, " ").replace(/\s+/g, " ").trim();
}
function searchRecords(records, query) {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  // ponytail: linear substring search for current small archive; use Pagefind when index size matters.
  return records.filter(record => {
    const text = normalizeSearch([record.title, record.text, record.topics, record.speakers].join(" "));
    return words.every(word => text.includes(word));
  });
}
if (typeof document !== "undefined") {
  const form = document.querySelector("[data-search]");
  if (form) {
    const input = form.elements.q;
    const results = document.querySelector("[data-results]");
    const status = document.querySelector("[data-search-status]");
    let records;
    let sequence = 0;
    async function search(event) {
      event?.preventDefault();
      const id = ++sequence;
      const query = input.value.trim().slice(0, 200);
      results.replaceChildren();
      if (!query) { status.textContent = "عبارت موردنظر را وارد کنید"; return; }
      const url = new URL(location.href);
      url.searchParams.set("q", query);
      history.replaceState(null, "", url);
      status.textContent = "در حال جست‌وجو";
      try {
        if (!records) {
          const response = await fetch(form.dataset.index);
          if (!response.ok) throw new Error("Search index unavailable");
          records = await response.json();
        }
        if (id !== sequence) return;
        const matches = searchRecords(records, query);
        status.textContent = matches.length ? new Intl.NumberFormat("fa").format(matches.length) + " نتیجه" + (matches.length > 30 ? "؛ نمایش ۳۰ نتیجه‌ی نخست" : "") : "نتیجه‌ای پیدا نشد";
        matches.slice(0, 30).forEach(record => {
          const li = document.createElement("li");
          li.className = "post-row";
          const link = document.createElement("a");
          link.className = "row-title";
          link.href = record.url;
          link.textContent = record.title;
          const excerpt = document.createElement("p");
          excerpt.textContent = record.text.slice(0, 160);
          li.append(link, excerpt);
          results.append(li);
        });
      } catch {
        if (id === sequence) status.textContent = "جست‌وجو در دسترس نیست؛ دوباره تلاش کنید یا آرشیو را باز کنید.";
      }
    }
    input.value = new URLSearchParams(location.search).get("q")?.slice(0, 200) || "";
    form.addEventListener("submit", search);
    if (input.value) search();
  }
}
