# Flipkart Delivery Checker

A Manifest V3 browser extension that checks products on Flipkart search pages against a delivery pincode and marks their delivery status.

## Screenshots

### Extension settings

![The extension popup with pincode, concurrency, and hide-undeliverable options](Screenshot/Screenshot%202026-11-21%20194107.png)

### Delivery results on a Flipkart search page

![Flipkart search results with deliverable and undeliverable badges](Screenshot/Screenshot%202026-11-21%20194210.png)

## Features

- Save a six-digit pincode in the browser.
- Choose 1–50 concurrent product checks (default: 10).
- Optionally hide products confirmed as undeliverable; toggle this setting in the extension popup.
- Check products from the currently loaded Flipkart search results page.
- Open the configured number of product pages at a time in inactive tabs, then close each tab when its check finishes.
- Show **Not deliverable**, **Deliverable**, or **Could not verify delivery** badges on search results.

## Install from source

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome, or `edge://extensions` in Microsoft Edge.
3. Enable **Developer mode** and choose **Load unpacked**.
4. Select the folder containing `manifest.json`.

## Use

1. Open a Flipkart search results page.
2. Select the extension icon, enter a six-digit pincode, set **Concurrent checks** from 1 to 50 (default: 10), and choose **Check this search page**.
3. Keep the search tab open while checks run. Results appear on product cards as each check completes.

The checker recognizes Flipkart's **Not deliverable in your location** message or **Change Address** action as undeliverable, and its **Buy now** action as deliverable. It reports ambiguous cases as **Could not verify delivery** rather than guessing.

## Permissions and data

- `storage`: saves the pincode locally with `chrome.storage.local`.
- `tabs`: opens and closes product tabs and identifies the active search page.
- `https://www.flipkart.com/*`: reads Flipkart's rendered product pages to determine the delivery status.

The extension has no analytics, external services, or account of its own. It uses the selected pincode while loading Flipkart product pages. Flipkart's delivery location can be shared across its tabs, so a check may change the location used by other Flipkart tabs. If Flipkart already has an address selected and does not expose the pincode on the page, checks use that address; ensure it matches the pincode saved in the extension.

## Limitations

- Checks are based on Flipkart's page UI and may need updates if Flipkart changes it.
- High concurrency settings may be throttled by Flipkart or use significant browser resources.
- Delivery availability can change and should be confirmed on Flipkart before ordering.

This is an independent community project and is not affiliated with or endorsed by Flipkart.

## License

This project is licensed under the [MIT License](LICENSE).

## Validate changes

Run JavaScript syntax checks with Node.js:

```powershell
node --check background.js
node --check content.js
node --check popup.js
```
