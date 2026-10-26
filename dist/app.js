const gallery = document.querySelector("#gallery");
const dialog = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxDate = document.querySelector("#lightbox-date");
const lightboxTitle = document.querySelector("#lightbox-title");
const lightboxFile = document.querySelector("#lightbox-file");
const yearSelect = document.querySelector("#year-select");
const monthTabs = document.querySelector("#month-tabs");
let records = [];
let activeYear = "2026";
let activeMonth = "October";
let activeFilter = "all";

const titleFor = record => record.title || record.placement;
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
const monthsForYear = year => [...new Map(records.filter(record => record.year === year).sort((a, b) => b.monthOrder - a.monthOrder || a.month.localeCompare(b.month)).map(record => [record.month, record])).values()];
const recordsForSelection = () => records.filter(record => record.year === activeYear && record.month === activeMonth);

function renderYearPicker() {
  const years = [...new Set(records.map(record => record.year))].sort((a, b) => b.localeCompare(a));
  yearSelect.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join("");
  yearSelect.value = activeYear;
}

function renderMonthTabs() {
  const months = monthsForYear(activeYear);
  if (!months.some(record => record.month === activeMonth)) activeMonth = months[0]?.month || "";
  monthTabs.innerHTML = months.map(record => {
    const count = records.filter(item => item.year === activeYear && item.month === record.month).length;
    return `<button role="tab" aria-selected="${record.month === activeMonth}" class="${record.month === activeMonth ? "active" : ""}" data-month="${record.month}">${record.month}<small>${count}</small></button>`;
  }).join("");
  monthTabs.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    activeMonth = button.dataset.month;
    activeFilter = "all";
    document.querySelector(".filters .active").classList.remove("active");
    document.querySelector('[data-filter="all"]').classList.add("active");
    render();
  }));
}

function renderGallery() {
  const selected = recordsForSelection();
  const visible = selected.filter(record => activeFilter === "all" || record.type === activeFilter);
  const printCount = selected.filter(record => record.type === "print").length;
  const onlineCount = selected.filter(record => record.type === "online").length;
  document.querySelector("#active-month").textContent = activeMonth;
  document.querySelector("#active-year").textContent = activeYear;
  document.querySelector("#month-summary").innerHTML = `<strong>${printCount}</strong> print captures<br /><strong>${onlineCount}</strong> online captures`;
  document.querySelector("#gallery-count").textContent = activeFilter === "all" ? plural(visible.length, "publication record") : plural(visible.length, `${activeFilter} record`);
  gallery.innerHTML = "";
  visible.forEach(record => {
    const button = document.createElement("button");
    button.className = `card ${record.featured ? "featured" : ""}`;
    button.type = "button";
    button.innerHTML = `<img src="${encodeURI(record.file)}" alt="${record.date} ${record.placement} published photograph" loading="lazy" /><span class="card-info"><span class="card-label">${record.type === "online" ? "Online" : record.featured ? "Featured placement" : "Print"}</span><h3>${titleFor(record)}</h3><p>${record.date}</p></span>`;
    button.addEventListener("click", () => {
      lightboxImage.src = encodeURI(record.file);
      lightboxImage.alt = `${record.date} ${record.placement} published photograph`;
      lightboxDate.textContent = record.date;
      lightboxTitle.textContent = titleFor(record);
      lightboxFile.textContent = record.filename;
      dialog.showModal();
    });
    gallery.appendChild(button);
  });
}

function render() { renderYearPicker(); renderMonthTabs(); renderGallery(); }
yearSelect.addEventListener("change", () => { activeYear = yearSelect.value; activeMonth = monthsForYear(activeYear)[0]?.month || ""; activeFilter = "all"; document.querySelector(".filters .active").classList.remove("active"); document.querySelector('[data-filter="all"]').classList.add("active"); render(); });
document.querySelectorAll(".filters button").forEach(button => button.addEventListener("click", () => { document.querySelector(".filters .active").classList.remove("active"); button.classList.add("active"); activeFilter = button.dataset.filter; renderGallery(); }));
document.querySelector(".close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
fetch("records.json").then(response => response.json()).then(data => { records = data; document.querySelector("#hero-count").textContent = records.length; render(); }).catch(() => { gallery.innerHTML = "<p class=\"load-error\">The archive records could not be loaded.</p>"; });
