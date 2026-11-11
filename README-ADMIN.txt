TEASPOON JEWELRY — ADMIN DASHBOARD UPDATE

New files:
- admin.html: private sign-in and management interface
- admin.js: Supabase authentication and admin CRUD
- admin.css: dashboard styling
- supabase-config.js: Supabase project URL and publishable key

IMPORTANT BEFORE USE
1. Upload all files in this folder to the ROOT of the existing GitHub repository, replacing the existing matching files.
2. The admin page will be available at /admin.html after Vercel deploys.
3. Sign in with the Supabase Auth user whose app_metadata.role is "admin".
4. The browser publishable key is intentionally public. Never add a service_role/secret key to these files.
5. Keep Row Level Security enabled. The dashboard relies on the admin policies already created in Supabase.

CURRENT LIMITATIONS
- This adds the first admin dashboard version for products, inventory and viewing/updating orders.
- The public storefront is not yet reading its catalogue from Supabase; that is a separate integration step.
- Customer checkout is not yet creating database orders.
- Product image upload/storage is not yet implemented; this version accepts an image URL.
- The inventory table is created automatically with quantity 0 for products added through this dashboard.
- Categories are created on demand when adding a product.

If the browser blocks the Supabase CDN, check the network connection and retry.
