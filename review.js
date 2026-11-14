(() => {
  const $ = (id) => document.getElementById(id);
  const client = window.supabase.createClient(
    window.TEASPOON_SUPABASE_URL,
    window.TEASPOON_SUPABASE_PUBLISHABLE_KEY
  );

  let verifiedOrder = null;
  let verifiedProducts = [];

  function showMessage(text, success = false) {
    $('reviewMessage').textContent = text;
    $('reviewMessage').classList.toggle('success', success);
  }

  function setBusy(button, busy, text, original) {
    button.disabled = busy;
    button.textContent = busy ? text : original;
  }

  $('year').textContent = new Date().getFullYear();

  $('verifyForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    $('reviewSection').hidden = true;
    verifiedOrder = null;
    verifiedProducts = [];

    const order_reference = $('orderReference').value.trim();
    const phone = $('phone').value.trim();
    if (!order_reference || !phone) {
      showMessage('Enter both your order reference and phone number.');
      return;
    }

    const button = $('verifyButton');
    setBusy(button, true, 'VERIFYING…', 'VERIFY MY ORDER');
    showMessage('Checking your order details…');

    try {
      const { data, error } = await client.functions.invoke('lookup-delivered-order', {
        body: { order_reference, phone }
      });

      if (error || !data?.success) {
        showMessage(data?.error || 'We could not verify this order. Check the details and make sure the order has been marked Delivered.');
        return;
      }

      verifiedOrder = data.order_reference || order_reference;
      verifiedProducts = Array.isArray(data.products) ? data.products : [];
      if (!verifiedProducts.length) {
        showMessage('No eligible products were found for this order.');
        return;
      }

      $('productSelect').innerHTML = verifiedProducts.map((product) =>
        `<option value="${String(product.product_id).replace(/["&<>']/g, '')}">${String(product.name || 'Purchased product').replace(/[&<>"]/g, '')}</option>`
      ).join('');
      $('verifiedProductList').textContent =
        `Order verified. ${verifiedProducts.length} product${verifiedProducts.length === 1 ? '' : 's'} found. Select a product below to review.`;
      $('reviewSection').hidden = false;
      showMessage('Your order has been verified.', true);
    } catch (error) {
      showMessage('We could not complete verification. Please try again shortly.');
    } finally {
      setBusy(button, false, '', 'VERIFY MY ORDER');
    }
  });

  $('reviewForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!verifiedOrder || !verifiedProducts.length) {
      showMessage('Verify your delivered order first.');
      return;
    }

    const rating = Number($('rating').value);
    const product_id = $('productSelect').value;
    const comment = $('comment').value.trim();

    if (!product_id || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      showMessage('Please select a product and a rating from 1 to 5.');
      return;
    }

    const button = $('submitButton');
    setBusy(button, true, 'SUBMITTING…', 'SUBMIT REVIEW');
    showMessage('Submitting your review…');

    try {
      const { data, error } = await client.functions.invoke('submit-review', {
        body: {
          order_id: verifiedOrder,
          phone: $('phone').value.trim(),
          product_id,
          rating,
          comment
        }
      });

      if (error || !data?.success) {
        const message = data?.error || 'Your review could not be submitted.';
        showMessage(message);
        return;
      }

      showMessage('Thank you. Your review has been submitted and is awaiting approval.', true);
      $('reviewForm').reset();
      $('reviewSection').hidden = true;
    } catch (error) {
      showMessage('We could not submit your review. Please try again shortly.');
    } finally {
      setBusy(button, false, '', 'SUBMIT REVIEW');
    }
  });
})();
