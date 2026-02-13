/* UV service worker bridge */
importScripts('/uv/uv.bundle.js');
importScripts('/uv/uv.config.js');
importScripts('/uv/uv.sw.js');

const uv = new UVServiceWorker();

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const uvPrefix = new URL(self.__uv$config.prefix, self.location.origin).pathname;

  if (requestUrl.pathname.startsWith(uvPrefix)) {
    event.respondWith(uv.fetch(event));
  }
});
