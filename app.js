"use strict";

const STORAGE = {
  business: "receiptStudio.business",
  history: "receiptStudio.history",
  counters: "receiptStudio.counters",
  lastPreset: "receiptStudio.lastPreset",
  customPresets: "receiptStudio.customPresets"
};

const extra = (id, label, type = "text", options = {}) => ({ id, label, type, ...options });

// Add presets here: copy an object and set its fields, items, tax, footer, and extra fields.
const BUILT_IN_PRESETS = [
  { id:"retail", name:"General Retail / Shop", icon:"🛍️", accent:"#176b5b", prefix:"RET", title:"SALES RECEIPT",
    fields:{item:"Item",qty:"Qty",price:"Price"}, defaultItems:[{name:"",qty:1,price:0}], taxRate:18, footerText:"Thank you, visit again", layout:"classic", extraFields:[] },
  { id:"restaurant", name:"Restaurant / Cafe", icon:"☕", accent:"#a6502e", prefix:"CAFE", title:"DINING RECEIPT",
    fields:{item:"Item",qty:"Qty",price:"Price"}, defaultItems:[{name:"",qty:1,price:0}], taxRate:5, footerText:"Thank you for dining with us!", layout:"food",
    extraFields:[extra("tableNo","Table no."),extra("orderType","Order type","select",{options:["Dine-in","Takeaway","Delivery"]}),extra("serviceChargePercent","Service charge (%)","number",{default:0}),extra("tipAmount","Tip amount","number",{default:0})] },
  { id:"cyber", name:"Cyber Cafe / Printing", icon:"🖨️", accent:"#3563a8", prefix:"PRINT", title:"SERVICE RECEIPT",
    fields:{item:"Service",qty:"Qty",price:"Rate"}, defaultItems:[{name:"Printing",qty:1,price:0},{name:"Photocopy",qty:1,price:0},{name:"Scan",qty:1,price:0},{name:"Online Form",qty:1,price:0},{name:"Lamination",qty:1,price:0},{name:"Typing",qty:1,price:0}], taxRate:0, footerText:"Thank you for using our services.", layout:"service", extraFields:[] },
  { id:"photo", name:"Photography / Studio", icon:"📸", accent:"#8a4b73", prefix:"PHO", title:"PHOTOGRAPHY RECEIPT",
    fields:{item:"Package / shoot",qty:"Qty",price:"Price"}, defaultItems:[{name:"Photography package",qty:1,price:0}], taxRate:0, footerText:"Thank you for choosing our studio.", layout:"studio",
    extraFields:[extra("shootDate","Date of shoot","date"),extra("location","Location"),extra("advancePaid","Advance paid","number",{default:0}),extra("balanceDue","Balance due","computed"),extra("deliveryDate","Delivery date","date"),extra("terms","Terms","textarea",{default:""})] },
  { id:"freelance", name:"Freelance / Service Invoice", icon:"💼", accent:"#4652a0", prefix:"INV", title:"SERVICE INVOICE",
    fields:{item:"Project / work",qty:"Hours",price:"Rate / hr"}, defaultItems:[{name:"",qty:1,price:0}], taxRate:0, footerText:"Thank you for your business.", layout:"invoice",
    extraFields:[extra("clientName","Client name"),extra("project","Project"),extra("dueDate","Payment due date","date"),extra("bankDetails","Bank / UPI details","textarea"),extra("paymentTerms","Payment terms","textarea")] },
  { id:"rent", name:"Rent Receipt", icon:"🏠", accent:"#956b28", prefix:"RENT", title:"RENT RECEIPT",
    fields:{item:"Description",qty:"Months",price:"Rent"}, defaultItems:[{name:"Monthly rent",qty:1,price:0}], taxRate:0, footerText:"Rent received with thanks.", layout:"formal",
    extraFields:[extra("tenantName","Tenant name"),extra("propertyAddress","Property address","textarea"),extra("period","Month / period"),extra("landlordSignature","Landlord signature")] },
  { id:"medical", name:"Medical / Pharmacy", icon:"💊", accent:"#27816c", prefix:"MED", title:"PHARMACY RECEIPT",
    fields:{item:"Medicine",qty:"Qty",price:"Price"}, defaultItems:[{name:"",qty:1,price:0}], taxRate:5, footerText:"Get well soon. Thank you!", layout:"medical",
    extraFields:[extra("patientName","Patient name"),extra("batchNo","Batch no."),extra("expiry","Expiry date","date")] },
  { id:"salon", name:"Salon / Services", icon:"✂️", accent:"#a34272", prefix:"SAL", title:"SALON RECEIPT",
    fields:{item:"Service",qty:"Qty",price:"Price"}, defaultItems:[{name:"",qty:1,price:0}], taxRate:0, footerText:"Thank you. See you again soon!", layout:"beauty",
    extraFields:[extra("staffName","Staff name"),extra("tipAmount","Tip amount","number",{default:0})] },
  { id:"tuition", name:"Fees / Tuition Receipt", icon:"📚", accent:"#476f9d", prefix:"FEE", title:"FEE RECEIPT",
    fields:{item:"Fee type",qty:"Qty",price:"Amount"}, defaultItems:[{name:"Tuition fee",qty:1,price:0}], taxRate:0, footerText:"Thank you for your payment.", layout:"education",
    extraFields:[extra("studentName","Student name"),extra("className","Class"),extra("feeMonth","Month"),extra("balance","Balance due","number",{default:0})] },
  { id:"custom", name:"Custom", icon:"✨", accent:"#596b63", prefix:"CUS", title:"RECEIPT",
    fields:{item:"Item",qty:"Qty",price:"Price"}, defaultItems:[], taxRate:0, footerText:"Thank you.", layout:"custom", extraFields:[], isCustom:true }
];

const CUSTOM_FIELD_OPTIONS = [
  extra("reference","Reference"), extra("email","Email","email"), extra("website","Website","url"),
  extra("notes","Notes","textarea"), extra("dueDate","Payment due date","date"),
  extra("bankDetails","Bank / UPI details","textarea"), extra("deliveryDate","Delivery date","date"),
  extra("location","Location"), extra("terms","Terms","textarea")
];

const $ = selector => document.querySelector(selector);
const form = $("#receiptForm");
const els = {
  chips:$("#presetChips"), savedPresets:$("#savedPresets"), savedWrap:$("#savedPresetsWrap"),
  customWrap:$("#customFieldsWrap"), customChoices:$("#customFieldChoices"), extraFields:$("#extraFields"),
  items:$("#itemsBody"), preview:$("#receiptPreview"), historyList:$("#historyList"),
  historyFilter:$("#historyFilter"), status:$("#statusMessage")
};

let customPresets = readStored(STORAGE.customPresets, []);
if (!Array.isArray(customPresets)) customPresets = [];
let history = readStored(STORAGE.history, []);
if (!Array.isArray(history)) history = [];
let counters = readStored(STORAGE.counters, {});
if (!counters || typeof counters !== "object" || Array.isArray(counters)) counters = {};
let activePreset;
let businessLogo = "";
let currentReceiptId = makeId();
let toastTimer;
let deferredInstallPrompt = null;

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.error(`Could not read ${key} from localStorage.`, error);
    return fallback;
  }
}

function saveStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Could not save ${key} to localStorage.`, error);
    showMessage("Could not save on this device. Check available storage.");
    return false;
  }
}

function showMessage(message) {
  els.status.textContent = message;
  els.status.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.status.classList.remove("visible"), 2800);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
}

function allPresets() {
  return [...BUILT_IN_PRESETS, ...customPresets];
}

function getPreset(id) {
  return allPresets().find(preset => preset.id === id) || BUILT_IN_PRESETS[0];
}

function localDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0,16);
}

function createReceiptNumber(preset) {
  const count = Number(counters[preset.id] || 0) + 1;
  counters[preset.id] = count;
  saveStored(STORAGE.counters, counters);
  return `${preset.prefix}-${String(count).padStart(3,"0")}`;
}

function currency() {
  return $("#currency").value || "₹";
}

function money(amount) {
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `${currency()}${value.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}

function safeText(value) {
  return String(value ?? "").trim();
}

function loadBusiness() {
  const business = readStored(STORAGE.business, {});
  for (const field of ["businessName","address","phone"]) {
    form.elements[field].value = business[field] || "";
  }
  businessLogo = typeof business.logo === "string" ? business.logo : "";
  updateLogoControls();
}

function saveBusiness() {
  const previous = readStored(STORAGE.business,{});
  return saveStored(STORAGE.business, {
    businessName:form.elements.businessName.value,
    address:form.elements.address.value,
    phone:form.elements.phone.value,
    currency:previous.currency || "₹",
    logo:businessLogo
  });
}

function updateLogoControls() {
  const hasLogo = Boolean(businessLogo);
  $("#removeLogoButton").hidden = !hasLogo;
  $("#logoStatus").textContent = hasLogo ? "Logo added" : "No logo added";
}

async function prepareLogo(file) {
  if (!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)) {
    throw new Error("Choose a PNG, JPG, WebP, or GIF image.");
  }
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve,reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("This image could not be opened."));
      image.src = source;
    });
    const scale = Math.min(1,512 / Math.max(image.naturalWidth,image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1,Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1,Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable in this browser.");
    context.drawImage(image,0,0,canvas.width,canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(source);
  }
}

function renderPresetChips() {
  els.chips.replaceChildren();
  for (const preset of BUILT_IN_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `preset-chip${activePreset.id === preset.id ? " active" : ""}`;
    button.style.setProperty("--chip-color",preset.accent);
    button.textContent = `${preset.icon} ${preset.name}`;
    button.setAttribute("aria-pressed",String(activePreset.id === preset.id));
    button.addEventListener("click",() => selectPreset(preset.id));
    els.chips.append(button);
  }
  renderSavedPresets();
}

function renderSavedPresets() {
  els.savedPresets.replaceChildren();
  els.savedWrap.hidden = customPresets.length === 0;
  for (const preset of customPresets) {
    const wrap = document.createElement("span");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `saved-preset-chip${activePreset.id === preset.id ? " active" : ""}`;
    button.textContent = `${preset.icon || "✨"} ${preset.name}`;
    button.addEventListener("click",() => selectPreset(preset.id));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-preset";
    remove.textContent = "×";
    remove.setAttribute("aria-label",`Delete ${preset.name} preset`);
    remove.addEventListener("click",event => {
      event.stopPropagation();
      if (!confirm(`Delete the "${preset.name}" preset? Existing receipts will remain.`)) return;
      customPresets = customPresets.filter(item => item.id !== preset.id);
      saveStored(STORAGE.customPresets,customPresets);
      if (activePreset.id === preset.id) selectPreset("retail");
      else renderPresetChips();
    });
    wrap.append(button,remove);
    els.savedPresets.append(wrap);
  }
}

function selectPreset(id) {
  activePreset = getPreset(id);
  saveStored(STORAGE.lastPreset,activePreset.id);
  currentReceiptId = makeId();
  $("#receiptNumber").value = createReceiptNumber(activePreset);
  $("#receiptDate").value = localDateTime();
  $("#customerName").value = "";
  $("#paymentMethod").value = "Cash";
  $("#discountType").value = "percent";
  $("#discountValue").value = "0";
  $("#taxRate").value = String(activePreset.taxRate ?? 0);
  const business = readStored(STORAGE.business,{});
  $("#currency").value = business.currency || "₹";
  renderPresetChips();
  renderExtraInputs();
  renderItems(activePreset.defaultItems.map(item => ({...item})));
  renderCustomFields();
  syncFieldLabels();
  renderHistoryFilter();
  updateReceipt();
}

function syncFieldLabels() {
  $("#itemNameHeading").textContent = activePreset.fields.item;
  $("#quantityHeading").textContent = activePreset.fields.qty;
  $("#priceHeading").textContent = activePreset.fields.price;
  $("#receiptPreview").dataset.layout = activePreset.layout || "classic";
  $("#receiptPreview").style.setProperty("--receipt-accent",activePreset.accent);
}

function renderExtraInputs(values = {}) {
  els.extraFields.replaceChildren();
  for (const field of activePreset.extraFields || []) {
    if (field.type === "computed") continue;
    const label = document.createElement("label");
    if (field.type === "textarea") label.classList.add("span-2");
    label.append(document.createTextNode(field.label));
    let input;
    if (field.type === "select") {
      input = document.createElement("select");
      for (const option of field.options || []) {
        const element = document.createElement("option");
        element.textContent = option;
        element.value = option;
        input.append(element);
      }
    } else if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 2;
    } else {
      input = document.createElement("input");
      input.type = field.type || "text";
      if (input.type === "number") { input.min = "0"; input.step = "0.01"; }
    }
    input.dataset.extraId = field.id;
    input.value = values[field.id] ?? field.default ?? "";
    label.append(input);
    els.extraFields.append(label);
  }
}

function renderItems(items) {
  els.items.replaceChildren();
  for (const item of items) addItemRow(item);
}

function addItemRow(item = {name:"",qty:1,price:0}) {
  const row = document.createElement("tr");
  const nameCell = document.createElement("td");
  const name = document.createElement("input");
  name.type = "text"; name.placeholder = activePreset.fields.item; name.value = item.name || ""; name.dataset.itemField = "name";
  name.setAttribute("aria-label",activePreset.fields.item);
  nameCell.append(name);
  const qtyCell = document.createElement("td");
  const qty = document.createElement("input");
  qty.type = "number"; qty.min = "0"; qty.step = "0.01"; qty.value = item.qty ?? 1; qty.dataset.itemField = "qty";
  qty.setAttribute("aria-label",activePreset.fields.qty);
  qtyCell.append(qty);
  const priceCell = document.createElement("td");
  const price = document.createElement("input");
  price.type = "number"; price.min = "0"; price.step = "0.01"; price.value = item.price ?? 0; price.dataset.itemField = "price";
  price.setAttribute("aria-label",activePreset.fields.price);
  priceCell.append(price);
  const total = document.createElement("td");
  total.className = "line-total"; total.textContent = money((Number(item.qty)||0)*(Number(item.price)||0));
  const removeCell = document.createElement("td");
  const remove = document.createElement("button");
  remove.type = "button"; remove.className = "remove-item"; remove.textContent = "×"; remove.setAttribute("aria-label","Remove item");
  remove.addEventListener("click",() => { row.remove(); updateReceipt(); });
  removeCell.append(remove);
  row.append(nameCell,qtyCell,priceCell,total,removeCell);
  els.items.append(row);
}

function renderCustomFields() {
  const isCustom = Boolean(activePreset.isCustom);
  els.customWrap.hidden = !isCustom;
  if (!isCustom) return;
  els.customChoices.replaceChildren();
  const selected = new Set((activePreset.extraFields || []).map(field => field.id));
  for (const field of CUSTOM_FIELD_OPTIONS) {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox"; checkbox.checked = selected.has(field.id);
    checkbox.addEventListener("change",() => toggleCustomField(field,checkbox.checked));
    label.append(checkbox,document.createTextNode(field.label));
    els.customChoices.append(label);
  }
}

function toggleCustomField(field, enabled) {
  const current = [...(activePreset.extraFields || [])].filter(item => item.id !== field.id);
  if (enabled) current.push({...field});
  activePreset = {...activePreset,extraFields:current};
  persistActiveCustomPreset();
  renderExtraInputs();
  renderPresetChips();
  updateReceipt();
}

function renderHistoryFilter() {
  const previous = els.historyFilter.value || "all";
  els.historyFilter.replaceChildren();
  const all = document.createElement("option"); all.value = "all"; all.textContent = "All presets"; els.historyFilter.append(all);
  for (const preset of allPresets()) {
    const option = document.createElement("option"); option.value = preset.id; option.textContent = preset.name; els.historyFilter.append(option);
  }
  els.historyFilter.value = allPresets().some(preset => preset.id === previous) ? previous : "all";
  renderHistory();
}

function getExtraValues() {
  const values = {};
  els.extraFields.querySelectorAll("[data-extra-id]").forEach(input => { values[input.dataset.extraId] = input.value; });
  return values;
}

function getItems() {
  return [...els.items.querySelectorAll("tr")].map(row => ({
    name:row.querySelector('[data-item-field="name"]').value,
    qty:Math.max(0,Number(row.querySelector('[data-item-field="qty"]').value)||0),
    price:Math.max(0,Number(row.querySelector('[data-item-field="price"]').value)||0)
  }));
}

function totals() {
  const items = getItems();
  const subtotal = items.reduce((sum,item) => sum + item.qty * item.price,0);
  const discountValue = Math.max(0,Number($("#discountValue").value)||0);
  const discount = $("#discountType").value === "percent" ? subtotal * Math.min(discountValue,100)/100 : Math.min(discountValue,subtotal);
  const extras = getExtraValues();
  const serviceCharge = Math.max(0,subtotal-discount) * Math.max(0,Number(extras.serviceChargePercent)||0)/100;
  const taxable = Math.max(0,subtotal-discount) + serviceCharge;
  const tax = taxable * Math.max(0,Number($("#taxRate").value)||0)/100;
  const tip = Math.max(0,Number(extras.tipAmount)||0);
  return {items,subtotal,discount,serviceCharge,tax,tip,total:taxable+tax+tip};
}

function addTextLine(parent,label,value) {
  if (!safeText(value)) return;
  const line = document.createElement("div");
  line.className = "receipt-extra-line";
  const caption = document.createElement("span"); caption.textContent = label;
  const content = document.createElement("strong"); content.textContent = value;
  line.append(caption,content); parent.append(line);
}

function updateReceipt() {
  if (!activePreset) return;
  const result = totals();
  [...els.items.querySelectorAll("tr")].forEach((row,index) => {
    row.querySelector(".line-total").textContent = money(result.items[index].qty*result.items[index].price);
  });
  const preview = els.preview;
  preview.replaceChildren();
  const header = document.createElement("header"); header.className = "receipt-head";
  if (businessLogo) {
    const logo = document.createElement("img");
    logo.className = "receipt-logo";
    logo.src = businessLogo;
    logo.alt = "Business logo";
    header.append(logo);
  }
  const business = document.createElement("h2"); business.className = "receipt-business"; business.textContent = form.elements.businessName.value || "Your business";
  const title = document.createElement("div"); title.className = "receipt-title"; title.textContent = activePreset.title;
  const contact = document.createElement("div"); contact.className = "receipt-contact";
  contact.textContent = [form.elements.address.value,form.elements.phone.value].filter(Boolean).join("\n");
  header.append(business,title,contact); preview.append(header);

  const meta = document.createElement("section"); meta.className = "receipt-section";
  addTextLine(meta,"Receipt",$("#receiptNumber").value);
  addTextLine(meta,"Date",$("#receiptDate").value ? new Date($("#receiptDate").value).toLocaleString() : "");
  addTextLine(meta,activePreset.fields.customer || "Customer",$("#customerName").value);
  for (const field of activePreset.extraFields || []) {
    let value = getExtraValues()[field.id];
    if (field.id === "balanceDue") value = money(Math.max(0,result.total-(Number(getExtraValues().advancePaid)||0)));
    if (field.id === "balance") value = money(Number(value)||0);
    if (!["serviceChargePercent","tipAmount","terms"].includes(field.id)) addTextLine(meta,field.label,value);
  }
  if (meta.childElementCount) preview.append(meta);

  const itemSection = document.createElement("section"); itemSection.className = "receipt-section";
  const table = document.createElement("table"); table.className = "receipt-items";
  const head = document.createElement("thead"); const headRow = document.createElement("tr");
  for (const text of [activePreset.fields.item,activePreset.fields.qty,"Amount"]) { const th = document.createElement("th"); th.textContent = text; headRow.append(th); }
  head.append(headRow); table.append(head);
  const body = document.createElement("tbody");
  for (const item of result.items) {
    if (!item.name && item.qty === 0 && item.price === 0) continue;
    const row = document.createElement("tr");
    for (const value of [item.name || "—",String(item.qty),money(item.qty*item.price)]) { const td = document.createElement("td"); td.textContent = value; row.append(td); }
    row.firstElementChild.className = "receipt-item-name"; body.append(row);
  }
  table.append(body); itemSection.append(table); preview.append(itemSection);

  const totalsSection = document.createElement("section"); totalsSection.className = "receipt-section";
  addTotal(totalsSection,"Subtotal",result.subtotal);
  if (result.discount > 0) addTotal(totalsSection,"Discount", -result.discount);
  if (result.serviceCharge > 0) addTotal(totalsSection,"Service charge",result.serviceCharge);
  if (result.tax > 0) addTotal(totalsSection,`Tax / GST (${Number($("#taxRate").value)||0}%)`,result.tax);
  if (result.tip > 0) addTotal(totalsSection,"Tip",result.tip);
  const grand = document.createElement("div"); grand.className = "receipt-total-line grand";
  const grandLabel = document.createElement("span"); grandLabel.textContent = "TOTAL";
  const grandAmount = document.createElement("strong"); grandAmount.textContent = money(result.total);
  grand.append(grandLabel,grandAmount); totalsSection.append(grand); preview.append(totalsSection);

  const payment = document.createElement("div"); payment.className = "receipt-payment";
  payment.textContent = `Payment: ${$("#paymentMethod").value}`; preview.append(payment);
  const terms = (activePreset.extraFields || []).find(field => field.id === "terms" || field.id === "paymentTerms");
  const footer = document.createElement("footer"); footer.className = "receipt-footer";
  const termsValue = terms ? getExtraValues()[terms.id] : "";
  footer.textContent = [termsValue,activePreset.footerText].filter(Boolean).join("\n");
  preview.append(footer);
  if ((activePreset.extraFields || []).some(field => field.id === "landlordSignature")) {
    const signature = document.createElement("div"); signature.className = "receipt-signature";
    signature.textContent = getExtraValues().landlordSignature || "Landlord signature"; preview.append(signature);
  }
  saveCurrentReceipt();
}

function addTotal(parent,label,amount) {
  const line = document.createElement("div"); line.className = "receipt-total-line";
  const name = document.createElement("span"); name.textContent = label;
  const value = document.createElement("span"); value.textContent = `${amount < 0 ? "−" : ""}${money(Math.abs(amount))}`;
  line.append(name,value); parent.append(line);
}

function collectReceipt() {
  return {
    id:currentReceiptId,presetId:activePreset.id,presetName:activePreset.name,
    preset:{...activePreset,defaultItems:(activePreset.defaultItems||[]).map(item=>({...item})),extraFields:(activePreset.extraFields||[]).map(field=>({...field}))},
    business:{businessName:form.elements.businessName.value,address:form.elements.address.value,phone:form.elements.phone.value},
    receiptNumber:$("#receiptNumber").value,date:$("#receiptDate").value,customer:$("#customerName").value,
    payment:$("#paymentMethod").value,currency:currency(),discountType:$("#discountType").value,
    discountValue:$("#discountValue").value,taxRate:$("#taxRate").value,items:getItems(),extras:getExtraValues(),
    total:totals().total,updatedAt:Date.now()
  };
}

function saveCurrentReceipt() {
  const receipt = collectReceipt();
  const index = history.findIndex(item => item.id === receipt.id);
  if (index >= 0) history[index] = receipt;
  else history.push(receipt);
  history.sort((a,b) => b.updatedAt-a.updatedAt);
  if (saveStored(STORAGE.history,history)) {
    $("#historyCount").textContent = String(history.length);
    renderHistory();
  }
}

function renderHistory() {
  const filter = els.historyFilter.value || "all";
  const receipts = history.filter(receipt => filter === "all" || receipt.presetId === filter).sort((a,b)=>b.updatedAt-a.updatedAt);
  els.historyList.replaceChildren();
  if (!receipts.length) {
    const empty = document.createElement("div"); empty.className = "empty-state"; empty.textContent = "No receipts here yet. Create a receipt and it will appear here."; els.historyList.append(empty); return;
  }
  for (const receipt of receipts) {
    const card = document.createElement("article"); card.className = "history-card";
    const main = document.createElement("div"); main.className = "history-main";
    const name = document.createElement("h3"); name.textContent = `${receipt.business?.businessName || "Receipt"} · ${receipt.receiptNumber || ""}`;
    const meta = document.createElement("p"); meta.className = "history-meta";
    const preset = getPreset(receipt.presetId);
    meta.textContent = `${preset.icon || "🧾"} ${receipt.presetName || preset.name} · ${receipt.customer || "No customer"} · ${receipt.date ? new Date(receipt.date).toLocaleDateString() : ""}`;
    main.append(name,meta);
    const amount = document.createElement("div"); amount.className = "history-amount"; amount.textContent = `${receipt.currency || "₹"}${Number(receipt.total||0).toFixed(2)}`;
    const actions = document.createElement("div"); actions.className = "history-actions";
    const open = document.createElement("button"); open.type = "button"; open.textContent = "Open"; open.addEventListener("click",()=>openReceipt(receipt.id));
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "delete-history"; remove.textContent = "Delete"; remove.addEventListener("click",()=>deleteReceipt(receipt.id));
    actions.append(open,remove); card.append(main,amount,actions); els.historyList.append(card);
  }
}

function openReceipt(id) {
  const receipt = history.find(item => item.id === id);
  if (!receipt) { showMessage("That receipt is no longer available."); return; }
  const knownPreset = allPresets().find(item => item.id === receipt.presetId);
  activePreset = knownPreset || receipt.preset || getPreset(receipt.presetId);
  currentReceiptId = receipt.id;
  for (const field of ["businessName","address","phone"]) form.elements[field].value = receipt.business?.[field] || "";
  $("#receiptNumber").value = receipt.receiptNumber || "";
  $("#receiptDate").value = receipt.date || "";
  $("#customerName").value = receipt.customer || "";
  $("#paymentMethod").value = receipt.payment || "Cash";
  $("#currency").value = receipt.currency || "₹";
  $("#discountType").value = receipt.discountType || "percent";
  $("#discountValue").value = receipt.discountValue || "0";
  $("#taxRate").value = receipt.taxRate ?? activePreset.taxRate;
  renderPresetChips(); renderExtraInputs(receipt.extras || {}); renderItems(receipt.items || []);
  renderCustomFields(); syncFieldLabels(); saveBusiness(); saveStored(STORAGE.lastPreset,activePreset.id);
  switchTab("create");
  updateReceipt();
}

function deleteReceipt(id) {
  if (!confirm("Delete this receipt from history?")) return;
  history = history.filter(receipt => receipt.id !== id);
  saveStored(STORAGE.history,history);
  $("#historyCount").textContent = String(history.length);
  renderHistory();
  if (currentReceiptId === id) currentReceiptId = makeId();
}

function switchTab(tab) {
  const create = tab === "create";
  $("#createTab").hidden = !create;
  $("#historyTab").hidden = create;
  document.querySelectorAll(".tab").forEach(button => {
    const active = button.dataset.tab === tab;
    button.classList.toggle("active",active);
    button.setAttribute("aria-selected",String(active));
  });
}

function saveAsPreset() {
  const entered = prompt("Name this preset:");
  if (!entered || !entered.trim()) return;
  const name = entered.trim();
  const preset = {
    ...activePreset,id:`custom-${makeId()}`,name,icon:"✨",accent:activePreset.accent || "#596b63",
    prefix:(name.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4)||"CUS"),
    title:activePreset.title,fields:{...activePreset.fields},
    defaultItems:getItems().map(item=>({...item})),taxRate:Number($("#taxRate").value)||0,
    footerText:activePreset.footerText,layout:activePreset.layout||"custom",
    extraFields:(activePreset.extraFields||[]).map(field=>({...field})),isCustom:true
  };
  customPresets.push(preset);
  if (!saveStored(STORAGE.customPresets,customPresets)) { customPresets.pop(); return; }
  selectPreset(preset.id);
  showMessage("Preset saved.");
}

function addCustomField() {
  const label = prompt("Enter a label for your new field:");
  if (!label || !label.trim()) return;
  const id = `field-${makeId()}`;
  activePreset = {...activePreset,extraFields:[...(activePreset.extraFields||[]),extra(id,label.trim())]};
  persistActiveCustomPreset();
  renderExtraInputs(); renderCustomFields(); renderPresetChips(); updateReceipt();
}

function persistActiveCustomPreset() {
  const index = customPresets.findIndex(preset => preset.id === activePreset.id);
  if (index < 0) return;
  const previous = customPresets[index];
  customPresets[index] = {...activePreset,name:previous.name};
  saveStored(STORAGE.customPresets,customPresets);
}

function resetReceipt() {
  if (!confirm("Start a new receipt? The current one will stay in history.")) return;
  selectPreset(activePreset.id);
}

function receiptText() {
  const receipt = collectReceipt();
  const lines = [
    receipt.business.businessName,receipt.business.address,receipt.business.phone,
    activePreset.title,`Receipt: ${receipt.receiptNumber}`,`Date: ${receipt.date ? new Date(receipt.date).toLocaleString() : ""}`,
    `Customer: ${receipt.customer || "—"}`,"--------------------------------"
  ];
  for (const item of receipt.items) lines.push(`${item.name || "Item"}  x${item.qty}  ${money(item.qty*item.price)}`);
  lines.push("--------------------------------",`TOTAL: ${money(receipt.total)}`,`Payment: ${receipt.payment}`,activePreset.footerText);
  return lines.filter(Boolean).join("\n");
}

function canvasBlob(canvas,type,quality) {
  return new Promise((resolve,reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("The receipt image could not be created."));
    },type,quality);
  });
}

function concatenateBytes(chunks) {
  const result = new Uint8Array(chunks.reduce((length,chunk) => length + chunk.length,0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk,offset);
    offset += chunk.length;
  }
  return result;
}

async function createReceiptPdf() {
  const preview = els.preview;
  await Promise.all([...preview.querySelectorAll("img")].map(image => image.decode()));
  const bounds = preview.getBoundingClientRect();
  const scale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(bounds.width * scale);
  canvas.height = Math.ceil(bounds.height * scale);
  if (!canvas.width || !canvas.height) throw new Error("The receipt preview is empty.");

  const context = canvas.getContext("2d");
  if (!context) throw new Error("PDF export is unavailable in this browser.");
  context.scale(scale,scale);
  context.fillStyle = "#fff";
  context.fillRect(0,0,bounds.width,bounds.height);

  const elements = [preview,...preview.querySelectorAll("*")];
  for (const element of elements) {
    if (element instanceof HTMLImageElement) {
      if (element.naturalWidth) {
        const rect = element.getBoundingClientRect();
        context.drawImage(element,rect.left-bounds.left,rect.top-bounds.top,rect.width,rect.height);
      }
      continue;
    }
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;

    if (style.backgroundColor !== "rgba(0, 0, 0, 0)") {
      context.fillStyle = style.backgroundColor;
      context.fillRect(rect.left-bounds.left,rect.top-bounds.top,rect.width,rect.height);
    }
    const borderColor = style.borderBottomColor;
    const borderWidth = Number.parseFloat(style.borderBottomWidth) || 0;
    if (borderWidth && style.borderBottomStyle !== "none") {
      context.save();
      context.strokeStyle = borderColor;
      context.lineWidth = borderWidth;
      context.setLineDash(style.borderBottomStyle === "dashed" || style.borderBottomStyle === "dotted" ? [3,3] : []);
      context.beginPath();
      context.moveTo(rect.left-bounds.left,rect.bottom-bounds.top-borderWidth/2);
      context.lineTo(rect.right-bounds.left,rect.bottom-bounds.top-borderWidth/2);
      context.stroke();
      context.restore();
    }
  }

  const walker = document.createTreeWalker(preview,NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent) continue;
    const parent = node.parentElement;
    if (!parent || parent.closest("img")) continue;
    const style = getComputedStyle(parent);
    if (style.display === "none" || style.visibility === "hidden") continue;
    context.font = style.font;
    context.fillStyle = style.color;
    context.textBaseline = "alphabetic";
    const fontSize = Number.parseFloat(style.fontSize) || 12;
    const lines = [];
    for (let index = 0; index < node.length; index++) {
      range.setStart(node,index);
      range.setEnd(node,index+1);
      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) continue;
      const y = rect.top-bounds.top;
      let line = lines.find(entry => Math.abs(entry.y-y)<1.5);
      if (!line) {
        line = {y,x:rect.left-bounds.left,text:""};
        lines.push(line);
      }
      if (!line.text) line.x = rect.left-bounds.left;
      line.text += node.textContent[index];
    }
    for (const line of lines) {
      const text = line.text.replace(/\s+$/,"");
      if (text) context.fillText(text,line.x,line.y+fontSize*.85);
    }
  }

  const jpeg = new Uint8Array(await (await canvasBlob(canvas,"image/jpeg",.94)).arrayBuffer());
  const width = 80 * 72 / 25.4;
  const height = bounds.height * 72 / 96;
  const encoder = new TextEncoder();
  const text = value => encoder.encode(value);
  const imageObject = concatenateBytes([
    text(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
    jpeg,
    text("\nendstream\nendobj\n")
  ]);
  const objects = [
    text("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    text("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
    text(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(2)} ${height.toFixed(2)}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`),
    text(`4 0 obj\n<< /Length ${text(`q\n${width.toFixed(2)} 0 0 ${height.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\n`).length} >>\nstream\nq\n${width.toFixed(2)} 0 0 ${height.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\nendstream\nendobj\n`),
    imageObject
  ];
  const header = concatenateBytes([text("%PDF-1.4\n"),new Uint8Array([0x25,0xe2,0xe3,0xcf,0xd3,0x0a])]);
  const chunks = [header];
  const offsets = [0];
  let byteLength = header.length;
  for (const object of objects) {
    offsets.push(byteLength);
    chunks.push(object);
    byteLength += object.length;
  }
  const xrefOffset = byteLength;
  const xref = `xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(text(xref));
  return new Blob([concatenateBytes(chunks)],{type:"application/pdf"});
}

async function downloadReceiptPdf() {
  const button = $("#pdfButton");
  button.disabled = true;
  try {
    const pdf = await createReceiptPdf();
    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a");
    const number = ($("#receiptNumber").value || "receipt").replace(/[^a-z0-9_-]/gi,"-");
    link.href = url;
    link.download = `${number}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    showMessage("Receipt PDF downloaded.");
  } catch (error) {
    console.error("Could not download receipt PDF.",error);
    showMessage(error.message || "Could not create the receipt PDF.");
  } finally {
    button.disabled = false;
  }
}

async function shareReceipt() {
  const text = receiptText();
  if (navigator.share) {
    try { await navigator.share({title:"Receipt",text}); }
    catch (error) { if (error.name !== "AbortError") { console.error("Receipt share failed.",error); showMessage("Could not share this receipt."); } }
  } else if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); showMessage("Receipt copied to clipboard."); }
    catch (error) { console.error("Could not copy receipt.",error); window.prompt("Copy your receipt:",text); }
  } else {
    window.prompt("Copy your receipt:",text);
  }
}

form.addEventListener("input",event => {
  if (["businessName","address","phone"].includes(event.target.name)) saveBusiness();
  updateReceipt();
});
form.addEventListener("change",updateReceipt);
$("#addLogoButton").addEventListener("click",() => $("#logoUpload").click());
$("#logoUpload").addEventListener("change",async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const previousLogo = businessLogo;
  try {
    businessLogo = await prepareLogo(file);
    if (!saveBusiness()) businessLogo = previousLogo;
    updateLogoControls();
    updateReceipt();
  } catch (error) {
    console.error("Could not add the business logo.",error);
    showMessage(error.message || "Could not add this logo.");
  } finally {
    event.target.value = "";
  }
});
$("#removeLogoButton").addEventListener("click",() => {
  const previousLogo = businessLogo;
  businessLogo = "";
  if (!saveBusiness()) businessLogo = previousLogo;
  updateLogoControls();
  updateReceipt();
});
els.extraFields.addEventListener("input",updateReceipt);
els.extraFields.addEventListener("change",updateReceipt);
els.items.addEventListener("input",updateReceipt);
$("#currency").addEventListener("change",() => {
  const business = readStored(STORAGE.business,{});
  business.currency = currency();
  saveStored(STORAGE.business,business);
});
$("#addItemButton").addEventListener("click",() => { addItemRow(); updateReceipt(); });
$("#newReceiptButton").addEventListener("click",resetReceipt);
$("#savePresetButton").addEventListener("click",saveAsPreset);
$("#addCustomFieldButton").addEventListener("click",addCustomField);
$("#historyFilter").addEventListener("change",renderHistory);
document.querySelectorAll(".tab").forEach(button=>button.addEventListener("click",()=>switchTab(button.dataset.tab)));
$("#printButton").addEventListener("click",()=>window.print());
$("#pdfButton").addEventListener("click",downloadReceiptPdf);
$("#shareButton").addEventListener("click",shareReceipt);

function setupInstallPrompt() {
  const installButton = $("#installButton");
  const iosHint = $("#iosHint");
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  installButton.hidden = standalone;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  iosHint.hidden = !isIOS || standalone;
  window.addEventListener("beforeinstallprompt",event => {
    event.preventDefault();
    deferredInstallPrompt = event;
  });
  installButton.addEventListener("click",async () => {
    if (!deferredInstallPrompt) {
      if (isIOS) {
        iosHint.hidden = false;
        showMessage("Tap Share, then choose Add to Home Screen.");
      } else {
        showMessage("Use your browser menu and choose Install app or Add to Home screen.");
      }
      return;
    }
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") installButton.hidden = true;
    } catch (error) {
      console.error("The app install prompt failed.",error);
      showMessage("Could not open the install prompt. Try your browser menu.");
    }
  });
  window.addEventListener("appinstalled",() => {
    installButton.hidden = true;
    iosHint.hidden = true;
    showMessage("Receipt Studio is installed.");
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load",() => navigator.serviceWorker.register("./sw.js").catch(error => {
    console.error("Service worker registration failed.",error);
    showMessage("Offline mode could not be enabled.");
  }));
}

loadBusiness();
$("#historyCount").textContent = String(history.length);
const lastPreset = readStored(STORAGE.lastPreset,"retail");
selectPreset(typeof lastPreset === "string" ? lastPreset : "retail");
setupInstallPrompt();
registerServiceWorker();

function splitWords(element) {
  const walker = document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  let wordIndex = 0;
  for (const textNode of textNodes) {
    const parts = textNode.textContent.split(/(\s+)/);
    const fragment = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        fragment.append(document.createTextNode(part));
      } else {
        const word = document.createElement("span");
        word.className = "word";
        word.style.setProperty("--word-index",wordIndex++);
        word.textContent = part;
        fragment.append(word);
      }
    }
    textNode.replaceWith(fragment);
  }
}

function setupRevealAnimations() {
  document.querySelectorAll("[data-split]").forEach(splitWords);
  document.querySelectorAll("[data-rev]").forEach((element,index) => {
    element.style.setProperty("--d",`${40+(index%9)*8}ms`);
  });
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll("[data-rev],[data-split]").forEach(element => element.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  },{threshold:.12});
  document.querySelectorAll("[data-rev],[data-split]").forEach(element => observer.observe(element));
}

function fitHeroWordmark() {
  const heading = document.querySelector(".hero-title");
  if (!heading) return;
  heading.style.removeProperty("font-size");
  const available = heading.clientWidth;
  const measured = heading.scrollWidth;
  if (available && measured > available) {
    const size = Number.parseFloat(getComputedStyle(heading).fontSize);
    heading.style.fontSize = `${size*(available/measured)*.98}px`;
  }
}

const coolingPoints = [1500,1200,900,650,480];
let motionFramePending = false;
let lastCurveReading = "";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const stageElements = [...document.querySelectorAll("[data-stage]")];
const glowCanvas = document.querySelector(".glow-canvas");
const curveCanvas = document.querySelector(".curve-canvas");
const formCanvas = document.querySelector(".form-canvas");

function fitCanvas(canvas) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = Math.min(window.devicePixelRatio || 1,2);
  const width = Math.round(rect.width*ratio);
  const height = Math.round(rect.height*ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (context) context.setTransform(ratio,0,0,ratio,0,0);
}

function stageProgress(stage) {
  if (prefersReducedMotion.matches) return stage.dataset.stage === "curve" ? 1 : 0;
  const rect = stage.getBoundingClientRect();
  return Math.max(0,Math.min(1,-rect.top/(rect.height-window.innerHeight)));
}

function drawGlow(time,progress) {
  const context = glowCanvas?.getContext("2d");
  if (!context) return;
  const width = glowCanvas.clientWidth;
  const height = glowCanvas.clientHeight;
  context.clearRect(0,0,width,height);
  context.globalCompositeOperation = "screen";
  const lights = [
    [.13,.18,.33,.7], [.82,.14,.28,1.2], [.68,.78,.36,2.1],
    [.25,.81,.3,2.8], [.53,.43,.22,4]
  ];
  for (const [originX,originY,size,phase] of lights) {
    const drift = prefersReducedMotion.matches ? 0 : time*.00012;
    const x = width*(originX + Math.sin(drift+phase)*.055);
    const y = height*(originY + Math.cos(drift*.83+phase)*.075);
    const radius = Math.max(width,height)*size*(.78+progress*.22);
    const gradient = context.createRadialGradient(x,y,0,x,y,radius);
    gradient.addColorStop(0,"rgba(228,75,60,.22)");
    gradient.addColorStop(.42,"rgba(228,75,60,.09)");
    gradient.addColorStop(1,"rgba(228,75,60,0)");
    context.fillStyle = gradient;
    context.fillRect(0,0,width,height);
  }
  context.globalCompositeOperation = "source-over";
}

function curvePoint(progress,width,height) {
  const scaled = progress*coolingPoints.length;
  const index = Math.min(Math.floor(scaled),coolingPoints.length-2);
  const fraction = progress >= (coolingPoints.length-1)/coolingPoints.length ? 1 : scaled-index;
  const value = coolingPoints[index]+(coolingPoints[index+1]-coolingPoints[index])*fraction;
  const min = coolingPoints[coolingPoints.length-1];
  const max = coolingPoints[0];
  return {
    x:width*progress,
    y:height-((value-min)/(max-min))*height,
    value
  };
}

function drawCurve(time,progress) {
  const context = curveCanvas?.getContext("2d");
  if (!context) return;
  const width = curveCanvas.clientWidth;
  const height = curveCanvas.clientHeight;
  context.clearRect(0,0,width,height);
  const left = 12,right = width-12,top = 12,bottom = height-12;
  const plotWidth = right-left,plotHeight = bottom-top;
  const pointAt = fraction => {
    const point = curvePoint(fraction,width,height);
    return {x:left+(point.x/width)*plotWidth,y:top+(point.y/height)*plotHeight,value:point.value};
  };
  context.lineWidth = 1;
  context.strokeStyle = "rgba(233,237,230,.08)";
  for (let row=0;row<4;row++) {
    const y = top+plotHeight*row/3;
    context.beginPath();context.moveTo(left,y);context.lineTo(right,y);context.stroke();
  }
  for (let column=0;column<5;column++) {
    const x = left+plotWidth*column/4;
    context.beginPath();context.moveTo(x,top);context.lineTo(x,bottom);context.stroke();
  }
  const drawLine = (fraction,lineWidth,color) => {
    const samples = Math.max(2,Math.ceil(fraction*80));
    context.beginPath();
    for (let i=0;i<=samples;i++) {
      const point = pointAt(fraction*i/samples);
      if (i===0) context.moveTo(point.x,point.y); else context.lineTo(point.x,point.y);
    }
    context.lineWidth = lineWidth;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.strokeStyle = color;
    context.stroke();
  };
  drawLine(1,1,"rgba(233,237,230,.22)");
  drawLine(progress,2.4,"#e44b3c");
  const head = pointAt(progress);
  const pulse = prefersReducedMotion.matches ? 1 : .75+Math.sin(time*.006)*.2;
  const halo = context.createRadialGradient(head.x,head.y,1,head.x,head.y,17*pulse);
  halo.addColorStop(0,"rgba(228,75,60,.38)");
  halo.addColorStop(1,"rgba(228,75,60,0)");
  context.fillStyle=halo;context.beginPath();context.arc(head.x,head.y,17*pulse,0,Math.PI*2);context.fill();
  context.fillStyle="#e44b3c";context.beginPath();context.arc(head.x,head.y,3.5,0,Math.PI*2);context.fill();
  const reading = Math.round(head.value).toLocaleString();
  if (reading !== lastCurveReading) {
    lastCurveReading = reading;
    const output = document.querySelector(".curve-readout-number");
    if (output) output.textContent = reading;
  }
  const activeIndex = Math.min(Math.floor(progress*coolingPoints.length),coolingPoints.length-1);
  if (activeIndex !== lastProcessIndex) {
    lastProcessIndex = activeIndex;
    document.querySelectorAll("[data-process-row]").forEach((row,index) => {
      row.classList.toggle("is-lit",index<=activeIndex);
    });
  }
}

function drawGatherForms(time) {
  const context = formCanvas?.getContext("2d");
  if (!context) return;
  const width = formCanvas.clientWidth;
  const height = formCanvas.clientHeight;
  context.clearRect(0,0,width,height);
  context.globalCompositeOperation = "screen";
  const centerX = width*.69;
  const centerY = height*.49;
  const baseRadius = Math.min(width,height)*.28;
  const phase = prefersReducedMotion.matches ? 0 : time*.00045;
  for (let form=0;form<3;form++) {
    const radius = baseRadius*(1-form*.2);
    context.beginPath();
    for (let step=0;step<=180;step++) {
      const angle = step/180*Math.PI*2;
      const wobble = Math.sin(angle*3+phase+form)*.08+Math.sin(angle*5-phase*1.3+form*2)*.045;
      const r = radius*(1+wobble);
      const x = centerX+Math.cos(angle)*r*1.1;
      const y = centerY+Math.sin(angle)*r*.83;
      if (step===0) context.moveTo(x,y); else context.lineTo(x,y);
    }
    context.closePath();
    const fill = context.createRadialGradient(centerX-radius*.25,centerY-radius*.36,0,centerX,centerY,radius*1.15);
    fill.addColorStop(0,"rgba(228,75,60,.16)");
    fill.addColorStop(.68,"rgba(228,75,60,.045)");
    fill.addColorStop(1,"rgba(228,75,60,0)");
    context.fillStyle=fill;context.fill();
    context.strokeStyle="rgba(228,75,60,.34)";context.lineWidth=1;context.stroke();
  }
  context.globalCompositeOperation = "source-over";
}

function updateScrollMotion(time) {
  motionFramePending = false;
  let activeAnimatedStage = false;
  for (const stage of stageElements) {
    const progress = stageProgress(stage);
    stage.style.setProperty("--p",progress.toFixed(4));
    if (stage.dataset.stage === "wipe") {
      const wipe = Math.min(1,progress*1.2);
      stage.style.setProperty("--wipe",`${(wipe*100).toFixed(2)}%`);
      stage.style.setProperty("--wipe-clip",`${(wipe*100).toFixed(2)}%`);
    }
    const rect = stage.getBoundingClientRect();
    const visible = rect.bottom>0 && rect.top<window.innerHeight;
    if (visible && ["hero","curve","gather"].includes(stage.dataset.stage)) activeAnimatedStage = true;
    if (visible && stage.dataset.stage === "curve") drawCurve(time,progress);
    if (visible && stage.dataset.stage === "hero") drawGlow(time,progress);
    if (visible && stage.dataset.stage === "gather") drawGatherForms(time);
  }
  if (activeAnimatedStage && !prefersReducedMotion.matches) {
    motionFramePending = true;
    requestAnimationFrame(updateScrollMotion);
  }
}

function scheduleScrollMotion() {
  if (motionFramePending) return;
  motionFramePending = true;
  requestAnimationFrame(updateScrollMotion);
}

function setupScrollChoreography() {
  setupRevealAnimations();
  fitHeroWordmark();
  if (document.fonts?.ready) document.fonts.ready.then(fitHeroWordmark);
  [glowCanvas,curveCanvas,formCanvas].forEach(fitCanvas);
  window.addEventListener("scroll",scheduleScrollMotion,{passive:true});
  window.addEventListener("resize",() => {
    fitHeroWordmark();
    [glowCanvas,curveCanvas,formCanvas].forEach(fitCanvas);
    scheduleScrollMotion();
  });
  prefersReducedMotion.addEventListener("change",scheduleScrollMotion);
  scheduleScrollMotion();
}
