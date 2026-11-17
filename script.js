// Add your Ghana WhatsApp number before launch: country code + number, digits only (example: 233XXXXXXXXX).
const WHATSAPP_NUMBER = "233546553631";

const cart = JSON.parse(sessionStorage.getItem("teaspoonCart") || "[]");
let selectedCategory = "all";
let selectedMetal = "all";
const byId = (id) => document.getElementById(id);
if (byId("year")) byId("year").textContent = new Date().getFullYear();

// Highlight the current page in the shared navigation.
const currentFile = location.pathname.split("/").pop() || "index.html";
const pageMap = {"index.html":"home","shop.html":"shop","story.html":"story","custom.html":"custom"};
document.querySelectorAll(".main-nav a").forEach((link) => {
  if (link.dataset.page === pageMap[currentFile]) link.setAttribute("aria-current","page");
});

function updateFilters() {
  document.querySelectorAll(".product-card").forEach((card) => {
    const categoryMatch = selectedCategory === "all" || card.dataset.category === selectedCategory;
    const metalMatch = selectedMetal === "all" || card.dataset.metal === selectedMetal;
    card.classList.toggle("hidden", !(categoryMatch && metalMatch));
  });
}
document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => {
  selectedCategory = button.dataset.category;
  document.querySelectorAll(".filter").forEach((item) => {
    const active = item === button; item.classList.toggle("active",active); item.setAttribute("aria-pressed",String(active));
  }); updateFilters();
}));
document.querySelectorAll(".metal").forEach((button) => button.addEventListener("click", () => {
  selectedMetal = button.dataset.metal;
  document.querySelectorAll(".metal").forEach((item) => {
    const active = item === button; item.classList.toggle("active",active); item.setAttribute("aria-pressed",String(active));
  }); updateFilters();
}));

// The public shop reads active products from Supabase instead of hard-coded samples.
const productGrid = byId("productGrid");
const sampleNote = document.querySelector(".sample-note");
const supabaseClient = (window.supabase && window.TEASPOON_SUPABASE_URL && window.TEASPOON_SUPABASE_PUBLISHABLE_KEY)
  ? window.supabase.createClient(window.TEASPOON_SUPABASE_URL, window.TEASPOON_SUPABASE_PUBLISHABLE_KEY)
  : null;
const escapeHtml = (value="") => String(value).replace(/[&<>"']/g, ch => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[ch]));
function formatPrice(value) {
  return "GHS " + Number(value || 0).toLocaleString("en-GH", {minimumFractionDigits:2, maximumFractionDigits:2});
}
async function loadStoreProducts() {
  if (!productGrid || !window.supabase || !window.TEASPOON_SUPABASE_URL || !window.TEASPOON_SUPABASE_PUBLISHABLE_KEY) return;
  productGrid.innerHTML = '<p class="catalog-message">Loading the collection…</p>';
  const client = supabaseClient;
  const { data, error } = await client.from("products")
    .select("id,name,description,price,metal_type,image_url,is_active,categories(name)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) {
    productGrid.innerHTML = '<p class="catalog-message">The collection could not be loaded just now. Please try again shortly.</p>';
    console.error("Teaspoon catalogue error:", error);
    return;
  }
  if (!data || data.length === 0) {
    productGrid.innerHTML = '<p class="catalog-message">Our collection is being prepared. Please check back soon.</p>';
    if (sampleNote) sampleNote.hidden = true;
    return;
  }
  const { data: approvedReviews, error: reviewError } = await client.from("reviews")
    .select("product_id,rating")
    .eq("status", "Approved");
  if (reviewError) console.warn("Teaspoon review summaries unavailable:", reviewError);
  const reviewStats = {};
  (approvedReviews || []).forEach(review => {
    const key = review.product_id;
    if (!reviewStats[key]) reviewStats[key] = { total: 0, count: 0 };
    reviewStats[key].total += Number(review.rating) || 0;
    reviewStats[key].count += 1;
  });

  productGrid.innerHTML = data.map(product => {
    const category = product.categories?.name || "Other";
    const metal = product.metal_type || "Gold";
    const stats = reviewStats[product.id] || { total: 0, count: 0 };
    const average = stats.count ? (stats.total / stats.count) : 0;
    const ratingMarkup = stats.count
      ? `<div class="product-rating-summary"><span class="stars" aria-label="${average.toFixed(1)} out of 5 stars">${"★".repeat(Math.round(average))}${"☆".repeat(5-Math.round(average))}</span><span>${average.toFixed(1)} (${stats.count} ${stats.count === 1 ? "review" : "reviews"})</span></div>`
      : `<div class="product-rating-summary">No reviews yet</div>`;
    const image = product.image_url
      ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">`
      : "";
    return `<article class="product-card" data-category="${escapeHtml(category)}" data-metal="${escapeHtml(metal)}">
      <a class="product-detail-link" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View ${escapeHtml(product.name)} details">VIEW DETAILS</a>
      <div class="product-image">${image}<span class="product-tag">${escapeHtml(metal.toUpperCase())}</span></div>
      <div class="product-info"><div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(metal)} · ${escapeHtml(category)}</p></div><strong>${formatPrice(product.price)}</strong></div>
      ${ratingMarkup}
      <button class="add-button" data-name="${escapeHtml(product.name)}" data-price="${Number(product.price)}">ADD TO BAG <span>+</span></button>
    </article>`;
  }).join("");
  if (sampleNote) sampleNote.hidden = true;
  updateFilters();
}
loadStoreProducts();

function money(value){return "GHS "+Number(value).toLocaleString("en-GH");}
function saveCart(){sessionStorage.setItem("teaspoonCart",JSON.stringify(cart));}
function renderCart(){
  const count=cart.reduce((sum,item)=>sum+item.qty,0), total=cart.reduce((sum,item)=>sum+item.price*item.qty,0);
  if(byId("bagCount"))byId("bagCount").textContent=count;
  if(byId("cartTotal"))byId("cartTotal").textContent=money(total);
  if(byId("cartItems"))byId("cartItems").innerHTML=cart.length?cart.map((item,index)=>`<div class="cart-row"><div>${item.name}<small>${item.qty} × ${money(item.price)}</small></div><div>${money(item.qty*item.price)}<button class="remove" data-remove="${index}">Remove</button></div></div>`).join(""):'<p class="empty">Your bag is waiting for something lovely.</p>';
}
function openCart(){document.body.classList.add("cart-open");if(byId("cart"))byId("cart").setAttribute("aria-hidden","false");}
function closeCart(){document.body.classList.remove("cart-open");if(byId("cart"))byId("cart").setAttribute("aria-hidden","true");}
if (byId("productGrid")) byId("productGrid").addEventListener("click", event => {
 const button = event.target.closest(".add-button");
 if (!button) return;
 const name=button.dataset.name,price=Number(button.dataset.price),existing=cart.find(item=>item.name===name);
 if(existing)existing.qty++;else cart.push({name,price,qty:1});saveCart();renderCart();openCart();
});
if(byId("cartItems"))byId("cartItems").addEventListener("click",event=>{
 const remove=event.target.closest("[data-remove]");if(!remove)return;cart.splice(Number(remove.dataset.remove),1);saveCart();renderCart();
});
if(byId("openCart"))byId("openCart").addEventListener("click",openCart);
if(byId("closeCart"))byId("closeCart").addEventListener("click",closeCart);
if(byId("shade"))byId("shade").addEventListener("click",closeCart);
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeCart();});
// Branded customer-details modal replaces browser-native prompt boxes.
function ensureCheckoutModal() {
  if (byId("checkoutModal")) return;

  const style = document.createElement("style");
  style.id = "teaspoon-checkout-modal-styles";
  style.textContent = `
    .ts-checkout-overlay{position:fixed;inset:0;z-index:10050;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(23,22,18,.66);backdrop-filter:blur(5px)}
    .ts-checkout-overlay.is-open{display:flex}
    .ts-checkout-dialog{position:relative;width:min(100%,520px);max-height:min(92vh,820px);overflow:auto;background:#f7f4ee;color:#25231f;border:1px solid #d9d0c2;box-shadow:0 24px 80px rgba(0,0,0,.28);padding:clamp(24px,5vw,42px)}
    .ts-checkout-close{position:absolute;right:18px;top:16px;border:0;background:transparent;color:#25231f;font-size:27px;line-height:1;cursor:pointer;padding:6px}
    .ts-checkout-eyebrow{margin:0 36px 10px 0;color:#a47a43;font-size:10px;letter-spacing:.24em;text-transform:uppercase}
    .ts-checkout-dialog h2{font-family:'Playfair Display',Georgia,serif;font-weight:400;font-size:clamp(30px,6vw,42px);line-height:1.12;margin:0 0 10px}
    .ts-checkout-intro{font-size:13px;line-height:1.7;color:#756d62;margin:0 0 24px}
    .ts-checkout-summary{background:#eee8de;border:1px solid #ded5c8;padding:14px 16px;margin:0 0 22px}
    .ts-checkout-summary-title{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#8b765b;margin:0 0 10px}
    .ts-checkout-summary-line{display:flex;justify-content:space-between;gap:12px;font-size:12px;line-height:1.5;padding:5px 0}
    .ts-checkout-summary-line span:first-child{min-width:0;overflow-wrap:anywhere}
    .ts-checkout-summary-total{border-top:1px solid #d5cabb;margin-top:8px;padding-top:11px;font-weight:700}
    .ts-checkout-field{display:block;margin:0 0 16px}
    .ts-checkout-field span{display:block;font-size:11px;font-weight:600;margin:0 0 7px;color:#34312b}
    .ts-checkout-field input{display:block;width:100%;box-sizing:border-box;border:1px solid #d7cec0;border-radius:0;background:#fffdfa;color:#25231f;padding:14px 13px;font:inherit;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s}
    .ts-checkout-field input:focus{border-color:#a47a43;box-shadow:0 0 0 3px rgba(164,122,67,.13)}
    .ts-checkout-field input[aria-invalid="true"]{border-color:#a94335}
    .ts-checkout-help{display:block;margin-top:6px;font-size:10px;color:#81786c;line-height:1.5}
    .ts-checkout-error{min-height:18px;margin:0 0 10px;color:#a94335;font-size:12px;line-height:1.5}
    .ts-checkout-actions{display:flex;gap:10px;align-items:center;margin-top:18px}
    .ts-checkout-submit{flex:1;border:1px solid #25231f;background:#25231f;color:#fff;padding:16px 14px;font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;cursor:pointer}
    .ts-checkout-submit:hover{background:#3a372f}
    .ts-checkout-submit:disabled{opacity:.6;cursor:wait}
    .ts-checkout-cancel{border:1px solid #d7cec0;background:transparent;color:#514b42;padding:15px 17px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
    .ts-checkout-footnote{font-size:10px;line-height:1.6;color:#82796d;margin:15px 0 0;text-align:center}
    @media(max-width:480px){.ts-checkout-overlay{padding:10px}.ts-checkout-dialog{padding:26px 20px}.ts-checkout-actions{flex-direction:column-reverse}.ts-checkout-submit,.ts-checkout-cancel{width:100%}}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "ts-checkout-overlay";
  overlay.id = "checkoutModal";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <section class="ts-checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="tsCheckoutTitle">
      <button class="ts-checkout-close" type="button" id="tsCheckoutClose" aria-label="Close checkout">&times;</button>
      <p class="ts-checkout-eyebrow">A NOTE BEFORE WE CONTINUE</p>
      <h2 id="tsCheckoutTitle">Your details.</h2>
      <p class="ts-checkout-intro">Please share your contact details so we can prepare your order and assist you personally.</p>
      <div class="ts-checkout-summary" id="tsCheckoutSummary"></div>
      <form id="tsCheckoutForm" novalidate>
        <label class="ts-checkout-field"><span>Full name</span><input id="tsCustomerName" name="customerName" type="text" autocomplete="name" maxlength="120" placeholder="Enter your full name" required></label>
        <label class="ts-checkout-field"><span>Contact number</span><input id="tsCustomerPhone" name="customerPhone" type="tel" autocomplete="tel" inputmode="tel" maxlength="24" placeholder="e.g. 054 655 3631" required><small class="ts-checkout-help">Ghana numbers are welcome. If you are outside Ghana, include your country code.</small></label>
        <p class="ts-checkout-error" id="tsCheckoutError" role="alert" aria-live="polite"></p>
        <div class="ts-checkout-actions"><button class="ts-checkout-cancel" type="button" id="tsCheckoutCancel">Cancel</button><button class="ts-checkout-submit" type="submit" id="tsCheckoutSubmit">Continue to WhatsApp <span aria-hidden="true">↗</span></button></div>
      </form>
      <p class="ts-checkout-footnote">Your order will be saved and then opened in WhatsApp for confirmation. No payment is taken here.</p>
    </section>`;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  byId("tsCheckoutClose").addEventListener("click", close);
  byId("tsCheckoutCancel").addEventListener("click", close);
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) close();
  });
  byId("tsCheckoutForm").addEventListener("submit", submitCheckoutDetails);
}

function openCheckoutModal() {
  ensureCheckoutModal();
  const total = cart.reduce((sum,item) => sum + item.price * item.qty, 0);
  byId("tsCheckoutSummary").innerHTML = `<p class="ts-checkout-summary-title">Your selection</p>
    ${cart.map(item => `<div class="ts-checkout-summary-line"><span>${escapeHtml(item.qty)} × ${escapeHtml(item.name)}</span><strong>${money(item.price * item.qty)}</strong></div>`).join("")}
    <div class="ts-checkout-summary-line ts-checkout-summary-total"><span>Subtotal</span><strong>${money(total)}</strong></div>`;
  byId("tsCheckoutError").textContent = "";
  byId("tsCustomerName").value = "";
  byId("tsCustomerPhone").value = "";
  byId("tsCustomerName").removeAttribute("aria-invalid");
  byId("tsCustomerPhone").removeAttribute("aria-invalid");
  const modal = byId("checkoutModal");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  window.setTimeout(() => byId("tsCustomerName").focus(), 50);
}

async function submitCheckoutDetails(event) {
  event.preventDefault();
  const nameInput = byId("tsCustomerName");
  const phoneInput = byId("tsCustomerPhone");
  const errorBox = byId("tsCheckoutError");
  const submitButton = byId("tsCheckoutSubmit");
  const customerName = nameInput.value.trim();
  const customerPhone = phoneInput.value.trim();

  nameInput.removeAttribute("aria-invalid");
  phoneInput.removeAttribute("aria-invalid");
  errorBox.textContent = "";

  if (customerName.length < 2) {
    nameInput.setAttribute("aria-invalid", "true");
    errorBox.textContent = "Please enter your full name.";
    nameInput.focus();
    return;
  }
  const phoneDigits = customerPhone.replace(/\D/g, "");
  if (phoneDigits.length < 9 || phoneDigits.length > 15) {
    phoneInput.setAttribute("aria-invalid", "true");
    errorBox.textContent = "Please enter a valid contact number, including your country code if needed.";
    phoneInput.focus();
    return;
  }
  if (!cart.length) { errorBox.textContent = "Your bag is empty. Add a product before checking out."; return; }
  if (!WHATSAPP_NUMBER) { errorBox.textContent = "WhatsApp checkout is not configured yet."; return; }
  if (!supabaseClient) { errorBox.textContent = "We cannot connect to the order system right now. Please try again shortly."; return; }

  const total = cart.reduce((sum,item) => sum + item.price * item.qty, 0);
  const orderItems = cart.map(item => ({name:item.name,price:Number(item.price),quantity:Number(item.qty),line_total:Number(item.price)*Number(item.qty)}));
  const lines = cart.map(item => `${item.qty} × ${item.name} — ${money(item.price*item.qty)}`);
  const message = `Hello Teaspoon Jewelry, I would like to place this order.\nOrder reference: will be provided after submission\nCustomer: ${customerName}\nContact: ${customerPhone}\n${lines.join("\n")}\nSubtotal: ${money(total)}\nPlease confirm availability and delivery.`;

  const whatsappWindow = window.open("about:blank", "_blank");
  submitButton.disabled = true;
  submitButton.textContent = "PREPARING YOUR ORDER…";

  try {
    const {data,error} = await supabaseClient.from("orders").insert({
      customer_name:customerName,
      customer_phone:customerPhone,
      total_amount:total,
      items:orderItems,
      status:"Pending"
    }).select("id").single();
    if (error) throw error;

    const orderMessage = message.replace("will be provided after submission", data.id);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage)}`;
    if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
    else window.location.href = whatsappUrl;

    cart.length = 0;
    saveCart();
    renderCart();
    closeCart();
    byId("checkoutModal").classList.remove("is-open");
    byId("checkoutModal").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  } catch (error) {
    if (whatsappWindow) whatsappWindow.close();
    console.error("Order submission failed:", error);
    errorBox.textContent = "Your order could not be saved. Please try again. If the problem continues, contact us on WhatsApp.";
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Continue to WhatsApp <span aria-hidden="true">↗</span>';
  }
}

if(byId("checkout"))byId("checkout").addEventListener("click", ()=>{
 if(!cart.length){alert("Your bag is empty. Add a product first.");return;}
 if(!WHATSAPP_NUMBER){alert("WhatsApp checkout is not configured yet.");return;}
 if(!supabaseClient){alert("We cannot connect to the order system right now. Please try again shortly.");return;}
 openCheckoutModal();
});

if(byId("menuToggle"))byId("menuToggle").addEventListener("click",()=>{
 const nav=byId("nav"),isOpen=nav.classList.toggle("open");
 byId("menuToggle").setAttribute("aria-expanded",String(isOpen));
 byId("menuToggle").setAttribute("aria-label",isOpen?"Close navigation":"Open navigation");
});
if(byId("nav"))byId("nav").querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{
 byId("nav").classList.remove("open");if(byId("menuToggle"))byId("menuToggle").setAttribute("aria-expanded","false");
}));
if(byId("customForm"))byId("customForm").addEventListener("submit",event=>{
 event.preventDefault();
 const form=new FormData(event.currentTarget);
 const name=form.get("name"),contact=form.get("contact"),design=form.get("design");
 if(!WHATSAPP_NUMBER){alert("The custom enquiry form is ready. We will connect your business WhatsApp number before launch.");return;}
 const message=`Hello Teaspoon Jewelry, I would like to discuss a custom order.\nName: ${name}\nContact: ${contact}\nDesign idea: ${design}`;
 window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
});
renderCart();
