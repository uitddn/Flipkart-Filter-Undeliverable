let scanInProgress = false;
const MAX_CONCURRENT_CHECKS = 10;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "delivery-scan") {
    port.onMessage.addListener(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "QUEUE_SCAN") return;

  const searchTabId = sender.tab?.id;
  if (!Number.isInteger(searchTabId)) {
    sendResponse({ message: "Could not identify the Flipkart search tab." });
    return;
  }

  if (scanInProgress) {
    sendResponse({ message: "A scan is already running." });
    return;
  }

  scanInProgress = true;
  sendResponse({ message: `Checking ${message.products.length} products...` });
  checkProducts({ ...message, searchTabId })
    .catch((error) => console.error("Flipkart scan failed", error))
    .finally(() => {
      scanInProgress = false;
    });
});

async function checkProducts({ products, pincode, searchTabId }) {
  let nextIndex = 0;
  let completedCount = 0;

  async function checkNextProduct() {
    while (nextIndex < products.length) {
      const index = nextIndex;
      nextIndex += 1;
      const product = products[index];
      let result = "unknown";
      let probeTabId;

      try {
        const tab = await chrome.tabs.create({ url: product.url, active: false });
        probeTabId = tab.id;
        if (!Number.isInteger(probeTabId)) throw new Error("Could not open a product tab.");
        await waitForTabLoad(probeTabId);
        const response = await chrome.tabs.sendMessage(probeTabId, {
          type: "CHECK_DELIVERY",
          pincode
        });
        result = response?.status ?? "unknown";
      } catch (error) {
        console.warn("Could not check a Flipkart product", error);
      } finally {
        if (probeTabId !== undefined) {
          await chrome.tabs.remove(probeTabId).catch((error) => {
            console.warn("Could not close a Flipkart product tab", error);
          });
        }
      }

      completedCount += 1;
      await chrome.tabs.sendMessage(searchTabId, {
        type: "PRODUCT_RESULT",
        url: product.url,
        status: result,
        pincode,
        progress: `${completedCount}/${products.length}`
      }).catch((error) => {
        console.warn("Could not update the Flipkart search page", error);
      });
    }
  }

  const workerCount = Math.min(MAX_CONCURRENT_CHECKS, products.length);
  await Promise.all(Array.from({ length: workerCount }, () => checkNextProduct()));

  await chrome.tabs.sendMessage(searchTabId, { type: "SCAN_COMPLETE" }).catch((error) => {
    console.warn("Could not notify the Flipkart search page that scanning finished", error);
  });
}

function waitForTabLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("Timed out loading the product page."));
    }, 20000);

    function onUpdated(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") onUpdated(tabId, { status: "complete" });
    }).catch((error) => {
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(error);
    });
  });
}
