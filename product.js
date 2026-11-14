(() => {
  const $ = id => document.getElementById(id);
  const client = window.supabase.createClient(
    window.TEASPOON_SUPABASE_URL,
    window.TEASPOON_SUPABASE_PUBLISHABLE_KEY
  );
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));
  const formatPrice = value => "GHS " + Number(value || 0).toLocaleString("en-GH", {
    minimumFractionDigits:2, maximumFractionDigits:2
  });
  const stars = rating => "★".repeat(Number(rating)||0) + "☆".repeat(5-(Number(rating)||0));

  $("year").textContent = new Date().getFullYear();
  $("menuToggle").addEventListener("click", () => {
    const isOpen = $("nav").classList.toggle("open");
    $("menuToggle").setAttribute("aria-expanded", String(isOpen));
    $("menuToggle").setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });
  $("nav").querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    $("nav").classList.remove("open");
    $("menuToggle").setAttribute("aria-expanded", "false");
  }));

  async function loadProduct() {
    const productId = new URLSearchParams(location.search).get("id");
    if (!productId) {
      $("productDetail").innerHTML = '<p class="catalog-message">This product could not be found. <a href="shop.html">Return to the collection</a>.</p>';
      $("reviewList").innerHTML = "";
      return;
    }

    const [{data: product, error: productError}, {data: reviews, error: reviewError}] = await Promise.all([
      client.from("products").select("id,name,description,price,metal_type,image_url,categories(name)")
        .eq("id", productId).eq("is_active", true).maybeSingle(),
      client.from("reviews").select("rating,comment,created_at")
        .eq("product_id", productId).eq("status", "Approved")
        .order("created_at", {ascending:false})
    ]);

    if (productError || !product) {
      $("productDetail").innerHTML = '<p class="catalog-message">We could not find this product. <a href="shop.html">Return to the collection</a>.</p>';
      $("reviewList").innerHTML = "";
      return;
    }

    const image = product.image_url
      ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}">`
      : '<span>TEASPOON JEWELRY</span>';
    $("productDetail").innerHTML = `
      <div class="product-detail-layout">
        <div class="detail-photo">${image}</div>
        <div class="detail-copy">
          <p class="eyebrow">${escapeHtml(product.metal_type || "Jewelry")} · ${escapeHtml(product.categories?.name || "Collection")}</p>
          <h1>${escapeHtml(product.name)}</h1>
          <div class="detail-price">${formatPrice(product.price)}</div>
          <p class="detail-description">${escapeHtml(product.description || "A thoughtfully selected piece from Teaspoon Jewelry.")}</p>
          <div class="detail-actions"><a href="shop.html">Continue shopping</a><a href="review.html">Share your experience</a></div>
        </div>
      </div>`;

    if (reviewError) {
      $("reviewSummary").textContent = "Customer reviews are temporarily unavailable.";
      $("reviewList").innerHTML = '<p class="review-empty">Please check back shortly.</p>';
      console.error("Teaspoon product reviews:", reviewError);
      return;
    }

    const approved = reviews || [];
    if (!approved.length) {
      $("reviewSummary").textContent = "No approved reviews yet.";
      $("reviewList").innerHTML = '<p class="review-empty">Be the first to share your experience with this piece after your order has been delivered.</p>';
      return;
    }

    const average = approved.reduce((sum, item) => sum + Number(item.rating || 0), 0) / approved.length;
    $("reviewSummary").innerHTML = `<span class="detail-stars">${stars(Math.round(average))}</span><span>${average.toFixed(1)} out of 5 · ${approved.length} ${approved.length === 1 ? "review" : "reviews"}</span>`;
    $("reviewList").innerHTML = approved.map(review => `
      <article class="review-item">
        <div class="review-item-head">
          <span class="review-item-stars" aria-label="${Number(review.rating)} out of 5 stars">${stars(review.rating)}</span>
          <span class="review-meta">Verified customer · ${new Date(review.created_at).toLocaleDateString()}</span>
        </div>
        <p>${escapeHtml(review.comment || "Customer left a star rating without a written comment.")}</p>
      </article>`).join("");
  }

  loadProduct().catch(error => {
    console.error("Teaspoon product page error:", error);
    $("productDetail").innerHTML = '<p class="catalog-message">We could not load this product right now. Please try again.</p>';
    $("reviewSummary").textContent = "";
    $("reviewList").innerHTML = "";
  });
})();
