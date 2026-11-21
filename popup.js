const form = document.querySelector("#settings-form");
const pincodeInput = document.querySelector("#pincode");
const concurrentChecksInput = document.querySelector("#concurrent-checks");
const hideUndeliverableInput = document.querySelector("#hide-undeliverable");
const scanButton = document.querySelector("#scan");
const status = document.querySelector("#status");

chrome.storage.local.get({ pincode: "", hideUndeliverable: false, concurrentChecks: 10 }).then(({ pincode, hideUndeliverable, concurrentChecks }) => {
  if (pincode) pincodeInput.value = pincode;
  concurrentChecksInput.value = String(isValidConcurrency(concurrentChecks) ? concurrentChecks : 10);
  hideUndeliverableInput.checked = hideUndeliverable === true;
});

hideUndeliverableInput.addEventListener("change", async () => {
  await chrome.storage.local.set({ hideUndeliverable: hideUndeliverableInput.checked });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  await saveSettings();
  status.textContent = "Settings saved.";
});

scanButton.addEventListener("click", async () => {
  if (!form.reportValidity()) return;
  const pincode = pincodeInput.value.trim();
  const concurrentChecks = concurrentChecksInput.valueAsNumber;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("https://www.flipkart.com/search")) {
    status.textContent = "Open a Flipkart search results page first.";
    return;
  }

  await chrome.storage.local.set({ pincode, concurrentChecks });
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "START_SCAN", pincode, concurrentChecks });
    status.textContent = response?.message ?? "Could not start the scan.";
  } catch {
    status.textContent = "Reload the Flipkart search page, then try again.";
  }
});

function isValidConcurrency(value) {
  return Number.isInteger(value) && value >= 1 && value <= 50;
}

function saveSettings() {
  return chrome.storage.local.set({
    pincode: pincodeInput.value.trim(),
    concurrentChecks: concurrentChecksInput.valueAsNumber
  });
}
