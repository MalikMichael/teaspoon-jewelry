(() => {
  const $ = (id) => document.getElementById(id);
  const client = window.supabase.createClient(window.TEASPOON_SUPABASE_URL, window.TEASPOON_SUPABASE_PUBLISHABLE_KEY);
  let products = [], orders = [], reviews = [];
  const money = (n) => `GHS ${Number(n || 0).toLocaleString('en-GH', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
  const message = (text, error=false) => { $('globalMessage').textContent = text; $('globalMessage').style.color = error ? '#8b3b2f' : '#285b35'; };
  const escapeHtml = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function requireAdmin(session) {
    if (!session) return false;
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user || user.app_metadata?.role !== 'admin') {
      await client.auth.signOut();
      $('loginMessage').textContent = 'This account does not have administrator access.';
      return false;
    }
    return true;
  }
  async function showSession(session) {
    const ok = await requireAdmin(session);
    $('loginPanel').hidden = ok;
    $('dashboardPanel').hidden = !ok;
    if (ok) await refreshAll();
  }
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); $('loginMessage').textContent = 'Signing in…';
    const { data, error } = await client.auth.signInWithPassword({email:$('loginEmail').value.trim(), password:$('loginPassword').value});
    if (error) { $('loginMessage').textContent = error.message; return; }
    await showSession(data.session);
  });
  $('logoutButton').addEventListener('click', async () => { await client.auth.signOut(); location.reload(); });
  client.auth.onAuthStateChange((_event, session) => { if (session) showSession(session); });
  $('admin-tabs');
  document.querySelectorAll('.admin-tabs button').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tabs button').forEach(b=>b.classList.toggle('selected',b===btn));
    document.querySelectorAll('.admin-section').forEach(sec=>sec.hidden=sec.id!==`tab-${btn.dataset.tab}`);
  }));
  async function refreshAll(){ await Promise.all([loadProducts(),loadOrders(),loadReviews()]); await loadInventory(); }
  async function loadProducts(){
    const {data,error}=await client.from('products').select('id,name,description,price,metal_type,image_url,is_active,category_id,categories(name)').order('created_at',{ascending:false});
    if(error){message(`Products: ${error.message}`,true);$('productsTable').innerHTML='<tr><td colspan="6">Could not load products.</td></tr>';return;}
    products=data||[]; $('statProducts').textContent=products.length; $('statActive').textContent=products.filter(p=>p.is_active).length;
    $('productsTable').innerHTML=products.length?products.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.categories?.name||'—')}</td><td>${escapeHtml(p.metal_type||'—')}</td><td>${money(p.price)}</td><td><span class="status-pill ${p.is_active?'active':''}">${p.is_active?'Active':'Hidden'}</span></td><td><button data-edit="${p.id}">Edit</button><button data-delete="${p.id}">Delete</button></td></tr>`).join(''):'<tr><td colspan="6">No products yet. Add your first product above.</td></tr>';
  }
  async function loadInventory(){
    const {data,error}=await client.from('inventory').select('id,product_id,quantity,products(name)').order('updated_at',{ascending:false});
    if(error){$('inventoryTable').innerHTML=`<tr><td colspan="3">${escapeHtml(error.message)}</td></tr>`;return;}
    const rows=data||[]; $('inventoryTable').innerHTML=rows.length?rows.map(r=>`<tr><td>${escapeHtml(r.products?.name||'Deleted product')}</td><td><input type="number" min="0" step="1" value="${r.quantity}" id="qty-${r.id}" style="max-width:120px"></td><td><button data-stock="${r.id}">Save</button></td></tr>`).join(''):'<tr><td colspan="3">No stock records yet. Add a product, then inventory can be recorded here.</td></tr>';
  }
 
async function loadOrders(){
  const {data,error}=await client.from('orders')
    .select('id,customer_name,customer_phone,total_amount,status,created_at,items')
    .order('created_at',{ascending:false});

  if(error){
    $('ordersTable').innerHTML=`<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  orders=data||[];
  $('statOrders').textContent=orders.length;
  $('statPending').textContent=orders.filter(o=>o.status==='Pending').length;

  const states=['Pending','Confirmed','Processing','Shipped','Delivered','Cancelled'];

  $('ordersTable').innerHTML=orders.length?orders.map(o=>{
    const items=Array.isArray(o.items)?o.items:[];
    const itemRows=items.length?items.map(item=>`
      <tr>
        <td>${escapeHtml(item.name||item.product_name||'Product')}</td>
        <td>${Number(item.quantity||1)}</td>
        <td>${money(item.price||0)}</td>
      </tr>
    `).join(''):'<tr><td colspan="3">No item details recorded.</td></tr>';

    const whatsappNumber=String(o.customer_phone||'').replace(/\D/g,'');
    const whatsappLink=whatsappNumber
      ? `https://wa.me/${whatsappNumber}`
      : '#';

    return `
      <tr>
        <td>${new Date(o.created_at).toLocaleDateString()}</td>
        <td>${escapeHtml(o.customer_name)}</td>
        <td><a href="${whatsappLink}" target="_blank" rel="noopener">${escapeHtml(o.customer_phone)}</a></td>
        <td>${money(o.total_amount)}</td>
        <td>${escapeHtml(o.status)}</td>
        <td>
          <button type="button" data-view-order="${o.id}">View Details</button>
          <select data-order-status="${o.id}">
            ${states.map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}
          </select>
          <button type="button" data-save-order="${o.id}">Save</button>
        </td>
      </tr>
      <tr id="order-details-${o.id}" hidden>
        <td colspan="6">
          <strong>Order reference:</strong> ${escapeHtml(o.id)}
          <table>
            <thead><tr><th>Item</th><th>Quantity</th><th>Price</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
        </td>
      </tr>
    `;
  }).join(''):'<tr><td colspan="6">No orders have been received.</td></tr>';
}


  async function loadReviews(){
    const {data,error}=await client.from('reviews')
      .select('id,order_id,product_id,customer_name,rating,comment,status,created_at,products(name)')
      .order('created_at',{ascending:false});
    if(error){
      $('reviewsTable').innerHTML=`<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
      return;
    }
    reviews=data||[];
    $('reviewsTable').innerHTML=reviews.length?reviews.map(r=>`
      <tr>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
        <td>${escapeHtml(r.customer_name||'Verified customer')}</td>
        <td>${escapeHtml(r.products?.name||'Product unavailable')}</td>
        <td>${'★'.repeat(Number(r.rating)||0)}${'☆'.repeat(5-(Number(r.rating)||0))}</td>
        <td>${escapeHtml(r.comment||'—')}</td>
        <td><span class="status-pill ${r.status==='Approved'?'active':''}">${escapeHtml(r.status)}</span></td>
        <td>
          <button type="button" data-review-status="Approved" data-review-id="${r.id}">Approve</button>
          <button type="button" data-review-status="Rejected" data-review-id="${r.id}">Reject</button>
        </td>
      </tr>`).join(''):'<tr><td colspan="7">No reviews have been submitted yet.</td></tr>';
  }

  $('reviewsTable').addEventListener('click',async e=>{
    const button=e.target.closest('[data-review-status]');
    if(!button)return;
    const reviewId=button.dataset.reviewId;
    const newStatus=button.dataset.reviewStatus;
    button.disabled=true;
    const {error}=await client.from('reviews').update({status:newStatus}).eq('id',reviewId);
    if(error){
      message(`Could not update review: ${error.message}`,true);
      button.disabled=false;
      return;
    }
    message(`Review ${newStatus.toLowerCase()}.`);
    await loadReviews();
  });

  $('productForm').addEventListener('submit',async e=>{
    e.preventDefault(); const id=$('productId').value;
    const categoryName=$('productCategory').value;
    let categoryId=null;
    const {data:cat,error:catErr}=await client.from('categories').upsert({name:categoryName},{onConflict:'name'}).select('id').single();
    if(catErr){message(catErr.message,true);return;} categoryId=cat.id;
    const payload={name:$('productName').value.trim(),price:Number($('productPrice').value),category_id:categoryId,metal_type:$('productMetal').value,image_url:$('productImage').value.trim()||null,description:$('productDescription').value.trim()||null,is_active:$('productActive').checked};
    const result=id?await client.from('products').update(payload).eq('id',id):await client.from('products').insert(payload).select('id').single();
    if(result.error){message(result.error.message,true);return;}
    if(!id && result.data?.id){const {error:stockError}=await client.from('inventory').upsert({product_id:result.data.id,quantity:0},{onConflict:'product_id'});if(stockError){message(`Product saved, but inventory setup failed: ${stockError.message}`,true);return;}}
    $('productForm').reset();$('productId').value='';$('productActive').checked=true;$('productFormTitle').textContent='Add a product';$('cancelEdit').hidden=true;message('Product saved.');await refreshAll();
  });
  $('cancelEdit').addEventListener('click',()=>{$('productForm').reset();$('productId').value='';$('productActive').checked=true;$('productFormTitle').textContent='Add a product';$('cancelEdit').hidden=true;});
  $('productsTable').addEventListener('click',async e=>{
    const edit=e.target.closest('[data-edit]');const del=e.target.closest('[data-delete]');
    if(edit){const p=products.find(x=>x.id===edit.dataset.edit);if(!p)return;$('productId').value=p.id;$('productName').value=p.name;$('productPrice').value=p.price;$('productCategory').value=p.categories?.name||'Other';$('productMetal').value=p.metal_type||'Gold';$('productImage').value=p.image_url||'';$('productDescription').value=p.description||'';$('productActive').checked=p.is_active;$('productFormTitle').textContent='Edit product';$('cancelEdit').hidden=false;window.scrollTo({top:0,behavior:'smooth'});}
    if(del&&confirm('Delete this product?')){const {error}=await client.from('products').delete().eq('id',del.dataset.delete);if(error)message(error.message,true);else{message('Product deleted.');await refreshAll();}}
  });
 
$('ordersTable').addEventListener('click',async e=>{
  const viewButton=e.target.closest('[data-view-order]');

  if(viewButton){
    const details=document.getElementById(
      `order-details-${viewButton.dataset.viewOrder}`
    );
    if(details) details.hidden=!details.hidden;
    return;
  }

  const b=e.target.closest('[data-save-order]');
  if(!b)return;

  const id=b.dataset.saveOrder;
  const status=document.querySelector(`[data-order-status="${id}"]`).value;

  const {error}=await client.from('orders').update({status}).eq('id',id);

  if(error)message(error.message,true);
  else{
    message('Order status updated.');
    await loadOrders();
  }
});

})();
