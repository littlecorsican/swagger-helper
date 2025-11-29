const STORAGE_KEY = "hiddenIds";

let currentHiddenIds = new Set();

/**
 * Hide a parent element and keep track of which IDs are causing it to be hidden.
 */
function hideParentForId(id) {
  const el = document.getElementById(id);
  if (!el || !el.parentElement) return;

  const parent = el.parentElement;

  // Track which IDs have requested this parent to be hidden
  const existingKeys = parent.dataset.hideByIdKeys
    ? parent.dataset.hideByIdKeys.split(",")
    : [];

  if (!existingKeys.includes(id)) {
    existingKeys.push(id);
    parent.dataset.hideByIdKeys = existingKeys.join(",");
  }

  // Only store original display the first time
  if (!parent.dataset.hideByIdOriginalDisplay) {
    parent.dataset.hideByIdOriginalDisplay = parent.style.display || "";
  }

  parent.style.display = "none";
}

/**
 * Unhide a parent element if there are no more IDs that want it hidden.
 */
function unhideParentForId(id) {
  const el = document.getElementById(id);
  if (!el || !el.parentElement) return;

  const parent = el.parentElement;
  const existingKeys = parent.dataset.hideByIdKeys
    ? parent.dataset.hideByIdKeys.split(",").filter((k) => k)
    : [];

  if (!existingKeys.length) return;

  const updatedKeys = existingKeys.filter((k) => k !== id);

  if (updatedKeys.length > 0) {
    parent.dataset.hideByIdKeys = updatedKeys.join(",");
    // Still at least one ID wants this hidden → keep display: none
    return;
  }

  // No IDs left → restore original display
  delete parent.dataset.hideByIdKeys;

  if (parent.dataset.hideByIdOriginalDisplay !== undefined) {
    parent.style.display = parent.dataset.hideByIdOriginalDisplay;
    delete parent.dataset.hideByIdOriginalDisplay;
  } else {
    parent.style.display = "";
  }
}

/**
 * Hide parents for all ids in the list.
 */
function hideParentsOnce(idsArray) {
  idsArray.forEach((id) => hideParentForId(id));
}

/**
 * Unhide parents for ids that were removed from the list.
 */
function unhideParents(idsArray) {
  idsArray.forEach((id) => unhideParentForId(id));
}

/**
 * Load current IDs from storage and apply hide/unhide logic.
 */
function loadIdsAndApply() {
  chrome.storage.sync.get({ [STORAGE_KEY]: [] }, (result) => {
    const newIds = result[STORAGE_KEY] || [];
    const newSet = new Set(newIds);

    // IDs that were previously active but no longer in the list
    const removedIds = [...currentHiddenIds].filter((id) => !newSet.has(id));
    unhideParents(removedIds);

    currentHiddenIds = newSet;

    // Hide parents for all current IDs
    hideParentsOnce(newIds);
  });
}

// Initial load
loadIdsAndApply();

// React when storage changes via popup
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !changes[STORAGE_KEY]) return;

  const newIds = changes[STORAGE_KEY].newValue || [];
  const newSet = new Set(newIds);

  const removedIds = [...currentHiddenIds].filter((id) => !newSet.has(id));
  unhideParents(removedIds);

  currentHiddenIds = newSet;
  hideParentsOnce(newIds);
});

/**
 * Swagger/other SPAs render dynamically.
 * Observe DOM changes and re-apply hiding for any new nodes.
 */
function setupObserver() {
  if (!document.body) return;

  const observer = new MutationObserver(() => {
    if (!currentHiddenIds.size) return;
    hideParentsOnce(Array.from(currentHiddenIds));
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupObserver);
} else {
  setupObserver();
}

/**
 * 🔁 Handle messages from popup
 *  - LOAD_SWAGGER_ROWS: return all h3.opblock-tag[id^="operations-tag-"] IDs
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "LOAD_SWAGGER_ROWS") {
    const nodes = document.querySelectorAll(
      'h3.opblock-tag[id^="operations-tag-"]'
    );
    const ids = Array.from(nodes)
      .map((n) => n.id)
      .filter(Boolean);

    sendResponse({ ids });
  }

  // no async work, so no need to return true
});
