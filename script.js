// Teaspoon Jewelry starter storefront.
// Add your WhatsApp number in international format (Ghana: 233XXXXXXXXX), digits only.
const WHATSAPP_NUMBER = "";
const cart = [];
const body = document.body;
const panel = document.getElementById("cartPanel");
const backdrop = document.getElementById("cartBackdrop");
const count = document.getElementById("cartCount");
const items = document.getElementById("cartItems");
const total = document.getElementById("cartTotal");
document.getElementById("year").textContent = new Date().getFullYear();

function money(value){return "GHS " + value.toFixed(2).replace(/\.00$/,"")}
function renderCart(){
  count.textContent = cart.reduce((sum,item)=>sum+item.qty,0);
  const subtotal = cart.reduce((sum,item)=>sum+item.price*item.qty,0);
  total.textContent = money(subtotal);
  if(!cart.length){items.innerHTML='<p class="empty-cart">Your bag is waiting for something lovely.</p>';return}
  items.innerHTML = cart.map((item,index)=>`<div class="cart-row"><div>${item.name}<small>${item.qty} × ${money(item.price)}</small></div><div>${money(item.qty*item.price)} <button class="remove-item" data-remove="${index}">Remove</button></div></div>`).join("");
}
function openCart(){body.classList.add("cart-open");panel.setAttribute("aria-hidden","false")}
function closeCart(){body.classList.remove("cart-open");panel.setAttribute("aria-hidden","true")}
document.querySelectorAll(".add-button").forEach(button=>button.addEventListener("click",()=>{
  const name=button.dataset.name, price=Number(button.dataset.price);
  const found=cart.find(item=>item.name===name);
  if(found)found.qty++;else cart.push({name,price,qty:1});
  renderCart();openCart();
}));
items.addEventListener("click",event=>{
  const remove=event.target.closest("[data-remove]");
  if(remove){cart.splice(Number(remove.dataset.remove),1);renderCart()}
});
document.getElementById("cartOpen").addEventListener("click",openCart);
document.getElementById("cartClose").addEventListener("click",closeCart);
backdrop.addEventListener("click",closeCart);
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeCart()});
document.getElementById("checkoutButton").addEventListener("click",()=>{
  if(!cart.length){alert("Your bag is empty. Add a piece first.");return}
  if(!WHATSAPP_NUMBER){alert("Your shopping bag works! Before launch, add your WhatsApp number in script.js so customers can send orders.");return}
  const lines=cart.map(item=>`${item.qty} x ${item.name} — ${money(item.qty*item.price)}`);
  const subtotal=cart.reduce((sum,item)=>sum+item.price*item.qty,0);
  const message=`Hello Teaspoon Jewelry! I'd like to place an order:\n\n${lines.join("\n")}\n\nSubtotal: ${money(subtotal)}\n\nPlease confirm availability, delivery and payment details.`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,"_blank","noopener");
});
document.getElementById("customWhatsApp").addEventListener("click",event=>{
  if(!WHATSAPP_NUMBER){event.preventDefault();alert("We'll connect your WhatsApp number before launch.");}
  else{event.preventDefault();window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello Teaspoon Jewelry! I'd like to enquire about a custom handmade piece.")}`,"_blank","noopener")}
});
const menu=document.getElementById("menuToggle"),nav=document.getElementById("mainNav");
menu.addEventListener("click",()=>{const opened=nav.classList.toggle("nav-open");menu.setAttribute("aria-expanded",String(opened))});
nav.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{nav.classList.remove("nav-open");menu.setAttribute("aria-expanded","false")}));
renderCart();
