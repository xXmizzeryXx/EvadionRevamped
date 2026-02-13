# Ultraviolet static assets

This folder is expected to contain the Ultraviolet distribution files:

- `uv.bundle.js`
- `uv.handler.js`
- `uv.sw.js`

The app now registers `/sw.js` for `/service/` scope and routes non-local URLs through UV when those files are present.

If these files are missing, the browser falls back to direct iframe navigation.
