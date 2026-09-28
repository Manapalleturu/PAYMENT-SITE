/* ===== EDIT YOUR BUSINESS DETAILS HERE ===== */
const PRODUCT_NAME = "FAH Crunchies";
const PRICE_PER_PACK = 69;          // ₹ per pack
const PACK_SIZE = "May vary — please see pack label";           // CONFIRM against your pack label
const FLAVOUR = "Desi Masala";
const UPI_ID = "sumanthkumar1202-5@okicici";       // e.g. name@bank
const MERCHANT_NAME = "FAH - Find All Happiness";
const MAX_QTY = 20;
const SHIPPING_CHARGE = 0;          // ₹ per order; 0 = FREE
const WHATSAPP_NUMBER = ""; // country code + number, no + or spaces
const INSTAGRAM_URL = "https://www.instagram.com/fah_findallhappiness";

const INFO = {
  PRODUCT_NAME, PACK_SIZE, FLAVOUR, PRICE_PER_PACK,
  INGREDIENTS: "Refined Wheat Flour (Maida), Groundnut Oil, Yeast, Salt, Chilli Powder, Kesari Powder (Permitted Food Colour), Seasoning (Citric Powder)",
  ALLERGENS: "Gluten. Contains traces of milk and milk solids. Produced in a factory that handles soy and nuts.",
  STORAGE: "Store in a cool & dry place.",
  VEG_MARK: "Vegetarian (green dot)",
  MANUFACTURING: "[ENTER MANUFACTURING DATE / BATCH DETAILS]",
  BATCH: "[ENTER BATCH NO.]",
  BEST_BEFORE: "[ENTER BEST-BEFORE INFO]",
  FSSAI: "20126232001106",
  TRADEMARK: "FAH™",  // change to "FAH®" ONLY after registration is granted
  EMAIL: "supportfahfoods@gmail.com"
};
/* ===== END OF EDIT AREA ===== */

document.querySelectorAll("[data-cfg]").forEach(el => { el.textContent = INFO[el.dataset.cfg] ?? ""; });
document.getElementById("year").textContent = new Date().getFullYear();
const $ = id => document.getElementById(id);
const rupee = n => "₹" + n;

// menu
const menuBtn = document.querySelector(".menu-btn"), menu = $("menu");
menuBtn.onclick = () => menuBtn.setAttribute("aria-expanded", menu.classList.toggle("open"));
menu.onclick = e => { if (e.target.tagName === "A") { menu.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); } };

// contact links
const waLink = $("wa-link");
if (waLink && WHATSAPP_NUMBER) {
  waLink.href = `https://wa.me/${WHATSAPP_NUMBER}`;
} else if (waLink) {
  waLink.hidden = true;
}
const mailLink = $("mail-link");
if (mailLink) mailLink.href = `mailto:${INFO.EMAIL}`;
const igLink = $("ig-link");
if (igLink) igLink.href = INSTAGRAM_URL;

// quantity: always re-read and re-validate from the input, never from displayed totals
function getQty() {
  const raw = $("qty").value.trim();
  const n = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isInteger(n) || n < 1) return { ok: false, msg: "Enter a whole number of packs (minimum 1)." };
  if (n > MAX_QTY) return { ok: false, msg: `Maximum ${MAX_QTY} packs per order.` };
  return { ok: true, qty: n };
}
function calc(qty) {
  const subtotal = qty * PRICE_PER_PACK;
  return { subtotal, shipping: SHIPPING_CHARGE, total: subtotal + SHIPPING_CHARGE };
}
function render() {
  const q = getQty(), payBtn = $("pay");
  $("qty-error").textContent = q.ok ? "" : q.msg;
  payBtn.disabled = !q.ok;
  payBtn.style.opacity = q.ok ? 1 : .5;
  if (!q.ok) { payBtn.textContent = "Enter a valid quantity"; return; }
  const c = calc(q.qty);
  $("s-qty").textContent = q.qty;
  $("s-price").textContent = rupee(PRICE_PER_PACK);
  $("s-sub").textContent = `${q.qty} × ${rupee(PRICE_PER_PACK)} = ${rupee(c.subtotal)}`;
  $("s-ship").textContent = c.shipping ? rupee(c.shipping) : "FREE";
  $("s-total").textContent = rupee(c.total);
  payBtn.textContent = `Pay ${rupee(c.total)} with UPI`;
}
function step(d) { const q = getQty(); $("qty").value = Math.min(MAX_QTY, Math.max(1, (q.ok ? q.qty : 1) + d)); render(); }
$("minus").onclick = () => step(-1);
$("plus").onclick = () => step(1);
$("qty").addEventListener("input", render);

// UPI payment: generate a fresh payment link + QR using the current quantity.
function buildUpiUri(amount) {
  const p = new URLSearchParams({
    pa: UPI_ID,
    pn: MERCHANT_NAME,
    am: amount.toFixed(2),
    cu: "INR",
    tn: `${PRODUCT_NAME} order`
  });
  return "upi://pay?" + p.toString();
}

function ensurePaymentArea() {
  let area = $("upi-payment-area");
  if (area) return area;

  area = document.createElement("div");
  area.id = "upi-payment-area";
  area.hidden = true;
  area.innerHTML = `
    <div class="upi-box">
      <h3>Complete your UPI payment</h3>
      <p id="upi-amount-text" class="upi-amount"></p>
      <div id="upi-qrcode" class="upi-qrcode"></div>
      <a id="upi-pay-link" class="btn wide" href="#" rel="noopener">Open UPI App &amp; Pay</a>
      <button type="button" id="copy-upi-link" class="btn ghost wide">Copy Payment Link</button>
      <p id="upi-copy-status" class="note" aria-live="polite"></p>
      <p class="note">Verify the amount in your UPI app before confirming payment. Your UPI PIN/OTP is entered only inside your UPI app.</p>
    </div>
  `;
  $("pay").insertAdjacentElement("afterend", area);

  $("copy-upi-link").addEventListener("click", async () => {
    const link = $("upi-pay-link").href;
    const status = $("upi-copy-status");
    try {
      await navigator.clipboard.writeText(link);
      status.textContent = "Payment link copied.";
    } catch {
      status.textContent = "Copy is unavailable here. Use the Open UPI App button.";
    }
  });

  return area;
}

function generatePayment() {
  const q = getQty();
  if (!q.ok) return render();

  const amount = calc(q.qty).total;
  const upiLink = buildUpiUri(amount);
  const area = ensurePaymentArea();

  $("upi-amount-text").textContent = `Amount to pay: ${rupee(amount)}`;
  $("upi-pay-link").href = upiLink;
  $("upi-pay-link").textContent = `Open UPI App & Pay ${rupee(amount)}`;

  const qr = $("upi-qrcode");
  qr.innerHTML = "";

  if (window.QRCode) {
    new QRCode(qr, {
      text: upiLink,
      width: 200,
      height: 200,
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    qr.innerHTML = "<p>QR code could not load. Please use the payment link.</p>";
  }

  area.hidden = false;
  $("pay-msg").hidden = true;
  area.scrollIntoView({ behavior: "smooth", block: "center" });
}

$("pay").onclick = generatePayment;

// Order details -> WhatsApp (manual verification; replace with backend/gateway later)
$("order").addEventListener("submit", e => {
  e.preventDefault();
  const q = getQty(), f = e.target, err = $("order-error");
  if (!q.ok) { err.textContent = q.msg; return; }
  if (!f.checkValidity()) { f.reportValidity(); return; }
  err.textContent = "";
  const d = Object.fromEntries(new FormData(f)), c = calc(q.qty);
  const msg = [`New order — ${PRODUCT_NAME} (${FLAVOUR}, ${PACK_SIZE})`,
    `Qty: ${q.qty}  Total: ${rupee(c.total)}`, `Name: ${d.name}`, `Mobile: ${d.mobile}`, `Email: ${d.email || "-"}`,
    `Address: ${d.address}, ${d.city}, ${d.state} - ${d.pin}`, `Order ref: ${d.ref || "-"}`, `UPI txn ID: ${d.txn || "-"}`].join("\n");
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
});

render();
