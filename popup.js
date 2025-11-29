const STORAGE_KEY = "hiddenIds";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addForm");
  const input = document.getElementById("idInput");
  const list = document.getElementById("idList");
  const emptyState = document.getElementById("emptyState");
  const clearBtn = document.getElementById("clearBtn");

  let currentIds = [];

  function renderList() {
    list.innerHTML = "";
    if (!currentIds.length) {
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";

    currentIds.forEach((id) => {
      const li = document.createElement("li");

      const span = document.createElement("span");
      span.className = "id-text";
      span.textContent = id;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "×";
      removeBtn.dataset.id = id;

      li.appendChild(span);
      li.appendChild(removeBtn);
      list.appendChild(li);
    });
  }

  function saveIds() {
    chrome.storage.sync.set({ [STORAGE_KEY]: currentIds });
  }

  // Load existing IDs on popup open
  chrome.storage.sync.get({ [STORAGE_KEY]: [] }, (result) => {
    currentIds = result[STORAGE_KEY];
    renderList();
  });

  // Add new ID
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;

    if (!currentIds.includes(value)) {
      currentIds.push(value);
      currentIds.sort();
      saveIds();
      renderList();
    }

    input.value = "";
    input.focus();
  });

  // Remove one ID
  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-btn");
    if (!btn) return;

    const idToRemove = btn.dataset.id;
    currentIds = currentIds.filter((id) => id !== idToRemove);
    saveIds();
    renderList();
  });

  // 🔥 CLEAR ALL IDS
  clearBtn.addEventListener("click", () => {
    currentIds = [];
    saveIds();
    renderList();
  });
});
