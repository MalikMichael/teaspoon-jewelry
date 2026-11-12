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
  // Attach product IDs to older saved cart entries when there is one unambiguous match.
  let cartUpdated = false;
  cart.forEach(item => {
    if (item.productId) return;
    const matches = data.filter(product =>
      product.name === item.name && Number(product.price) === Number(item.price)
    );
    if (matches.length === 1) {
      item.productId = matches[0].id;
      cartUpdated = true;
    }
  });
  if (cartUpdated) saveCart();

  productGrid.innerHTML = data.map(product => {
    const category = product.categories?.name || "Other";
    const metal = product.metal_type || "Gold";
    const image = product.image_url
      ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">`
      : "";
    return `<article class="product-card" data-category="${escapeHtml(category)}" data-metal="${escapeHtml(metal)}">
      <div class="product-image">${image}<span class="product-tag">${escapeHtml(metal.toUpperCase())}</span></div>
      <div class="product-info"><div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(metal)} · ${escapeHtml(category)}</p></div><strong>${formatPrice(product.price)}</strong></div>
      <button class="add-button" data-id="${escapeHtml(product.id)}" data-name="${escapeHtml(product.name)}" data-price="${Number(product.price)}">ADD TO BAG <span>+</span></button>
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

  const productId = button.dataset.id;
  const name = button.dataset.name;
  const price = Number(button.dataset.price);

  const existing = cart.find(item =>
    item.productId === productId ||
    (!item.productId && item.name === name && Number(item.price) === price)
  );

  if (existing) {
    existing.productId = productId;
    existing.qty++;
  } else {
    cart.push({productId, name, price, qty:1});
  }

  saveCart();
  renderCart();
  openCart();
});
if(byId("cartItems"))byId("cartItems").addEventListener("click",event=>{
 const remove=event.target.closest("[data-remove]");if(!remove)return;cart.splice(Number(remove.dataset.remove),1);saveCart();renderCart();
});
if(byId("openCart"))byId("openCart").addEventListener("click",openCart);
if(byId("closeCart"))byId("closeCart").addEventListener("click",closeCart);
if(byId("shade"))byId("shade").addEventListener("click",closeCart);
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeCart();});
if(byId("checkout"))byId("checkout").addEventListener("click", async ()=>{
 if(!cart.length){alert("Your bag is empty. Add a product first.");return;}
 if(!WHATSAPP_NUMBER){alert("WhatsApp checkout is not configured yet.");return;}
 if(!supabaseClient){alert("We cannot connect to the order system right now. Please try again shortly.");return;}
 const customerName = prompt("Please enter your full name:");
 if(!customerName || !customerName.trim()) return;
 const customerPhone = prompt("Please enter your contact number (including country code if outside Ghana):");
 if(!customerPhone || !customerPhone.trim()) return;
  const total=cart.reduce((sum,item)=>sum+item.price*item.qty,0);
  // Every order item must retain its Supabase product ID for verified reviews.
  if (cart.some(item => !item.productId)) {
    alert("One or more items in your bag need to be refreshed. Please remove and add those products again before checkout.");
    return;
  }

  const orderItems=cart.map(item=>({
    product_id:item.productId,
    name:item.name,
    price:Number(item.price),
    quantity:Number(item.qty),
    line_total:Number(item.price)*Number(item.qty)
  }));

  const orderReference = crypto.randomUUID();

  const lines=cart.map(item=>`${item.qty} × ${item.name} — ${money(item.price*item.qty)}`);

  const orderMessage=`Hello Teaspoon Jewelry, I would like to place this order.
Order reference: ${orderReference}
Customer: ${customerName.trim()}
Contact: ${customerPhone.trim()}
${lines.join("\n")}
Subtotal: ${money(total)}
Please confirm availability and delivery.`;

  const whatsappWindow=window.open("about:blank","_blank");

  try {
    const {error}=await supabaseClient.from("orders").insert({
      id:orderReference,
      customer_name:customerName.trim(),
      customer_phone:customerPhone.trim(),
      total_amount:total,
      items:orderItems,
      status:"Pending"
    });

    if(error) throw error;

    if(whatsappWindow) {
      whatsappWindow.location.href=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage)}`;
    } else {
      window.location.href=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage)}`;
    }

    cart.length=0;
    saveCart();
    renderCart();
    closeCart();

  } catch(error) {
    if(whatsappWindow) whatsappWindow.close();
    console.error("Order submission failed:",error);
    alert("Your order could not be saved. Please try again. If the problem continues, contact us on WhatsApp.");
  }
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
