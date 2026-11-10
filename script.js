// Add your Ghana WhatsApp number before launch: country code + number, digits only (example: 233XXXXXXXXX).
const WHATSAPP_NUMBER = "";

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
document.querySelectorAll(".add-button").forEach(button=>button.addEventListener("click",()=>{
 const name=button.dataset.name,price=Number(button.dataset.price),existing=cart.find(item=>item.name===name);
 if(existing)existing.qty++;else cart.push({name,price,qty:1});saveCart();renderCart();openCart();
}));
if(byId("cartItems"))byId("cartItems").addEventListener("click",event=>{
 const remove=event.target.closest("[data-remove]");if(!remove)return;cart.splice(Number(remove.dataset.remove),1);saveCart();renderCart();
});
if(byId("openCart"))byId("openCart").addEventListener("click",openCart);
if(byId("closeCart"))byId("closeCart").addEventListener("click",closeCart);
if(byId("shade"))byId("shade").addEventListener("click",closeCart);
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeCart();});
if(byId("checkout"))byId("checkout").addEventListener("click",()=>{
 if(!cart.length){alert("Your bag is empty. Add a product first.");return;}
 if(!WHATSAPP_NUMBER){alert("The shopping bag is working. We will connect your business WhatsApp number before launch.");return;}
 const total=cart.reduce((sum,item)=>sum+item.price*item.qty,0);
 const lines=cart.map(item=>`${item.qty} × ${item.name} — ${money(item.price*item.qty)}`);
 const message=`Hello Teaspoon Jewelry, I would like to enquire about this order:\n${lines.join("\n")}\nSubtotal: ${money(total)}\nPlease confirm availability and delivery.`;
 window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
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
