(() => {
  const $ = (id) => document.getElementById(id);
  const client = window.supabase.createClient(window.TEASPOON_SUPABASE_URL, window.TEASPOON_SUPABASE_PUBLISHABLE_KEY);
  let products = [], orders = [];
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
  async function refreshAll(){ await Promise.all([loadProducts(),loadOrders()]); await loadInventory(); }
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
    const {data,error}=await client.from('orders').select('id,customer_name,customer_phone,total_amount,status,created_at').order('created_at',{ascending:false});
    if(error){$('ordersTable').innerHTML=`<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;return;}
    orders=data||[]; $('statOrders').textContent=orders.length; $('statPending').textContent=orders.filter(o=>o.status==='Pending').length;
    const states=['Pending','Confirmed','Processing','Shipped','Delivered','Cancelled'];
    $('ordersTable').innerHTML=orders.length?orders.map(o=>`<tr><td>${new Date(o.created_at).toLocaleDateString()}</td><td>${escapeHtml(o.customer_name)}</td><td>${escapeHtml(o.customer_phone)}</td><td>${money(o.total_amount)}</td><td>${escapeHtml(o.status)}</td><td><select data-order-status="${o.id}">${states.map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select><button data-save-order="${o.id}">Save</button></td></tr>`).join(''):'<tr><td colspan="6">No orders have been received.</td></tr>';
  }
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
  $('inventoryTable').addEventListener('click',async e=>{const b=e.target.closest('[data-stock]');if(!b)return;const id=b.dataset.stock;const qty=Number($(`qty-${id}`).value);if(!Number.isInteger(qty)||qty<0){message('Enter a whole number zero or greater.',true);return;}const {error}=await client.from('inventory').update({quantity:qty,updated_at:new Date().toISOString()}).eq('id',id);if(error)message(error.message,true);else message('Stock quantity updated.');});
  $('ordersTable').addEventListener('click',async e=>{const b=e.target.closest('[data-save-order]');if(!b)return;const id=b.dataset.saveOrder;const status=document.querySelector(`[data-order-status="${id}"]`).value;const {error}=await client.from('orders').update({status}).eq('id',id);if(error)message(error.message,true);else{message('Order status updated.');await loadOrders();}});
  client.auth.getSession().then(({data})=>showSession(data.session));
})();
