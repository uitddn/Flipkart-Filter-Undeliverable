const badgeByUrl = new Map();
let scanPort;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_SCAN") {
    const products = collectProducts();
    scanPort?.disconnect();
    scanPort = chrome.runtime.connect({ name: "delivery-scan" });
    for (const product of products) setBadge(product.url, "Checking...", "checking");

    chrome.runtime.sendMessage({
      type: "QUEUE_SCAN",
      products,
      pincode: message.pincode
    }).then((response) => sendResponse(response));
    return true;
  }

  if (message.type === "PRODUCT_RESULT") {
    const label = message.status === "undeliverable"
      ? `Not deliverable to ${message.pincode}`
      : message.status === "deliverable"
        ? `Deliverable to ${message.pincode}`
        : "Could not verify delivery";
    setBadge(message.url, label, message.status);
    return;
  }

  if (message.type === "SCAN_COMPLETE") {
    document.querySelectorAll(".fkud-checking").forEach((badge) => {
      if (badge.textContent === "Checking...") badge.remove();
    });
    scanPort?.disconnect();
    scanPort = undefined;
    return;
  }

  if (message.type === "CHECK_DELIVERY") {
    checkDelivery(message.pincode).then(sendResponse);
    return true;
  }
});

function collectProducts() {
  const unique = new Map();
  for (const link of document.querySelectorAll('a[href*="/p/"]')) {
    const url = new URL(link.href);
    if (url.hostname !== "www.flipkart.com" || !url.pathname.includes("/p/")) continue;
    const productKey = `${url.pathname}?pid=${url.searchParams.get("pid") ?? ""}`;
    if (!unique.has(productKey)) unique.set(productKey, { url: url.href });
  }

  return [...unique.values()];
}

function setBadge(url, text, state) {
  const link = [...document.querySelectorAll('a[href*="/p/"]')]
    .find((candidate) => sameProduct(candidate.href, url));
  if (!link) return;

  let badge = badgeByUrl.get(url);
  if (!badge || !badge.isConnected) {
    badge = document.createElement("span");
    badge.className = "fkud-badge";
    link.append(badge);
    badgeByUrl.set(url, badge);
  }

  badge.textContent = text;
  badge.className = `fkud-badge fkud-${state}`;
  badge.title = text;
}

function sameProduct(left, right) {
  const a = new URL(left);
  const b = new URL(right);
  return a.pathname === b.pathname && a.searchParams.get("pid") === b.searchParams.get("pid");
}

async function checkDelivery(pincode) {
  const locationLabel = [...document.querySelectorAll("body *")]
    .find((element) => element.children.length === 0 && element.textContent.trim() === "Select delivery location");

  if (locationLabel) {
    locationLabel.click();

    const input = await waitFor(() => [...document.querySelectorAll('input[placeholder*="pin code"]')]
      .find(isVisible), 5000);
    if (!input) return { status: "unknown" };

    setNativeValue(input, pincode);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    const suggestion = await waitFor(() => [...document.querySelectorAll("body *")]
      .find((element) => element.children.length === 0 && element.textContent.trim() === pincode && isVisible(element)), 5000);

    if (suggestion) {
      suggestion.click();
    } else {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
    }

    const applied = await waitFor(() => {
      const visibleInputs = [...document.querySelectorAll('input[placeholder*="pin code"]')].filter(isVisible);
      const bodyText = document.body.innerText;
      return visibleInputs.length === 0 && bodyText.includes(pincode) ? bodyText : null;
    }, 10000);

    if (!applied) return { status: "unknown" };
  }

  const pageText = document.body.innerText;
  if (!locationLabel && /location not set/i.test(pageText)) return { status: "unknown" };
  if (/not deliverable in your location|delivery (?:is )?not available|cannot be delivered|not deliverable/i.test(pageText)) {
    return { status: "undeliverable" };
  }

  if (hasAction(/\bchange address\b/i)) return { status: "undeliverable" };
  if (hasBuyNowAction()) {
    return { status: "deliverable" };
  }
  return { status: "unknown" };
}

function hasBuyNowAction() {
  return hasAction(/\bbuy now\b/i);
}

function hasAction(pattern) {
  return [...document.querySelectorAll("body *")]
    .some((element) => element.children.length === 0
      && isVisible(element)
      && pattern.test(element.textContent.trim().replace(/\s+/g, " ")));
}

function setNativeValue(element, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(element, value);
}

function isVisible(element) {
  return element.getClientRects().length > 0;
}

function waitFor(predicate, timeoutMs) {
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = setInterval(() => {
      const result = predicate();
      if (result || Date.now() - started >= timeoutMs) {
        clearInterval(timer);
        resolve(result);
      }
    }, 200);
  });
}
