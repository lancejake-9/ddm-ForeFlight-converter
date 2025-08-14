[README.md](https://github.com/user-attachments/files/21777881/README.md)
# Root Site (https://<user>.github.io/) – Drag & Drop

**Files to upload to the ROOT of your site (same folder as `index.html`):**
- `service-worker.js`
- `offline.html`

**Add this registration snippet near the end of `<body>` in `index.html`:**
```html
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
    .catch(console.error);
}
</script>
```

After deploying, open the site once online to install the worker, then test in Airplane Mode.
