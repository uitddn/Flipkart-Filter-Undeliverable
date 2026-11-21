const form = document.querySelector("#settings-form");
const pincodeInput = document.querySelector("#pincode");
const scanButton = document.querySelector("#scan");
const status = document.querySelector("#status");

chrome.storage.local.get("pincode").then(({ pincode }) => {
  if (pincode) pincodeInput.value = pincode;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!pincodeInput.reportValidity()) return;

  await chrome.storage.local.set({ pincode: pincodeInput.value });
  status.textContent = "Pincode saved.";
});

scanButton.addEventListener("click", async () => {
  const pincode = pincodeInput.value.trim();
  if (!/^[0-9]{6}$/.test(pincode)) {
    status.textContent = "Enter a valid 6-digit pincode first.";
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("https://www.flipkart.com/search")) {
    status.textContent = "Open a Flipkart search results page first.";
    return;
  }

  await chrome.storage.local.set({ pincode });
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "START_SCAN", pincode });
    status.textContent = response?.message ?? "Could not start the scan.";
  } catch {
    status.textContent = "Reload the Flipkart search page, then try again.";
  }
});
