"use strict";

const pageGroups = [
  {name:"Product",pages:[
    ["features","Features","Create receipts with business details, custom line items, discounts, tax, multiple presets, saved history, print, and share. Receipt Studio is designed to work offline after it has been loaded."],
    ["pricing","Pricing","Receipt Studio is currently provided as a free, browser-based receipt maker. This version has no paid plans, subscriptions, or in-app purchases."],
    ["security","Security","Your business details, logo, and receipt history are stored in this browser on your device. Receipt Studio does not send receipt data to a Receipt Studio account or server."],
    ["integrations","Integrations","This version works as a standalone app and does not connect to accounting, payment, or inventory services. Use the built-in print, PDF, and share options to work with your receipts."],
    ["changelog","Changelog","Receipt Studio includes receipt presets, custom fields, saved history, business logos, installable offline support, and print-ready receipts. This page will describe notable updates as they are released."]
  ]},
  {name:"Company",pages:[
    ["about","About","Receipt Studio is a simple receipt-making tool for small businesses and teams. Create a receipt, tailor it to your work, and keep a local history on your device."],
    ["blog","Blog","There are no articles published yet. Check back here for product notes and practical guidance on creating and managing receipts."],
    ["careers","Careers","There are no open roles listed at this time."],
    ["contact","Contact","Receipt Studio does not currently provide a hosted support desk or contact form. For help using the app, start with the Help Center page; your receipt data remains in your browser."]
  ]},
  {name:"Resources",pages:[
    ["documentation","Documentation","Choose a preset, enter your business details, and add or edit line items. Totals update as you type. Use Print or Download PDF to print or save a copy; receipt history and business details stay in this browser."],
    ["help-center","Help Center","Your entries save automatically in the current browser. Add a logo from Business & customer; it is resized and stored with your business details. To use the app offline, load it once while online and install it from your browser when prompted."],
    ["api-reference","API Reference","Receipt Studio is a client-side app and does not currently expose a public API."],
    ["community","Community","A public community space has not been set up yet."]
  ]},
  {name:"Legal",pages:[
    ["privacy-policy","Privacy Policy","Receipt Studio stores business details, your logo, and receipt history in your browser's local storage. This app does not transmit that receipt data to a Receipt Studio server. Clearing browser site data may remove saved information. External font files may be requested from Google Fonts when online."],
    ["terms-of-service","Terms of Service","Receipt Studio is provided as a receipt-creation tool. You are responsible for checking receipt details, tax calculations, and any legal or record-keeping requirements that apply to your business. Keep your own copies of important records."],
    ["cookie-policy","Cookie Policy","Receipt Studio does not set advertising or analytics cookies. It uses browser local storage to keep your business details, preferences, and receipt history on your device. Google Fonts may make a network request when the app is online."],
    ["gdpr","GDPR","Receipt and business information is kept in browser storage on your device, rather than in a Receipt Studio account. You can remove individual receipts in History or clear the app's site data in your browser. Clearing site data also removes saved business details and preferences."]
  ]}
];

const allPages = pageGroups.flatMap(group => group.pages.map(page => ({group:group.name,page})));
const requestedTopic = new URLSearchParams(window.location.search).get("topic");
const selected = allPages.find(item => item.page[0] === requestedTopic) || {
  group:"Receipt Studio",
  page:["not-found","Page not found","That page does not exist. Choose a page from the footer or return to the receipt maker."]
};
const [,title,summary] = selected.page;
document.title = `${title} | Receipt Studio`;
document.querySelector("#pageCategory").textContent = selected.group.toUpperCase();
document.querySelector("#pageTitle").textContent = title;
document.querySelector("#pageSummary").textContent = summary;
document.querySelector("#breadcrumbCategory").textContent = selected.group;
document.querySelector("#breadcrumbTitle").textContent = title;

const content = document.querySelector("#pageContent");
const contentHeading = document.createElement("h2");
contentHeading.textContent = `Explore ${selected.group}`;
const relatedPages = document.createElement("ul");
relatedPages.className = "info-page-links";
for (const item of pageGroups.find(group => group.name === selected.group)?.pages || []) {
  const listItem = document.createElement("li");
  const link = document.createElement("a");
  link.href = `page.html?topic=${item[0]}`;
  link.textContent = item[1];
  if (item[0] === requestedTopic) link.setAttribute("aria-current","page");
  listItem.append(link);
  relatedPages.append(listItem);
}
content.append(contentHeading,relatedPages);

const footer = document.querySelector("#siteFooter");
const brand = document.createElement("div");
brand.className = "footer-brand";
const brandLink = document.createElement("a");
brandLink.className = "brand";
brandLink.href = "index.html#receipt-maker";
brandLink.setAttribute("aria-label","Receipt Studio home");
const mark = document.createElement("span");
mark.className = "brand-mark";
mark.textContent = "R";
const brandName = document.createElement("span");
brandName.append("Receipt Studio");
const tagline = document.createElement("small");
tagline.textContent = "Empowering teams to work smarter.";
brandName.append(tagline);
brandLink.append(mark,brandName);
const brandCopy = document.createElement("p");
brandCopy.textContent = "Your data stays on this device. Install Receipt Studio to use it offline.";
brand.append(brandLink,brandCopy);
footer.append(brand);

const groups = document.createElement("div");
groups.className = "footer-links";
for (const group of pageGroups) {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  heading.textContent = group.name;
  const list = document.createElement("ul");
  for (const [id,label] of group.pages) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `page.html?topic=${id}`;
    link.textContent = label;
    if (id === requestedTopic) link.setAttribute("aria-current","page");
    item.append(link);
    list.append(item);
  }
  section.append(heading,list);
  groups.append(section);
}
footer.append(groups);

const credit = document.createElement("p");
credit.className = "footer-credit";
credit.append("Made with love by ");
const team = document.createElement("strong");
team.textContent = "Rashal & Team";
const heart = document.createElement("span");
heart.className = "footer-heart";
heart.setAttribute("aria-label","love");
heart.textContent = "❤️";
credit.append(team,heart);
footer.append(credit);

const bottom = document.createElement("div");
bottom.className = "footer-bottom";
const copyright = document.createElement("span");
copyright.textContent = "© 2026 Recipt Studio. All rights reserved.";
const actions = document.createElement("div");
actions.className = "footer-bottom-actions";
const developer = document.createElement("a");
developer.className = "developer-link";
developer.href = "https://rashal-dev.pages.dev/";
developer.target = "_blank";
developer.rel = "noopener noreferrer";
developer.append("Contact Developer ");
const external = document.createElement("span");
external.setAttribute("aria-hidden","true");
external.textContent = "↗";
developer.append(external);
const home = document.createElement("a");
home.href = "index.html#receipt-maker";
home.textContent = "Back to receipt maker ↑";
actions.append(developer,home);
bottom.append(copyright,actions);
footer.append(bottom);
