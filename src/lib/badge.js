// src/lib/badge.js
// App Badge API varsa onu kullanır; yoksa başlıkta (N) olarak gösterir.

export function setBadge(count) {
    try {
      if ("setAppBadge" in navigator && "clearAppBadge" in navigator) {
        if (count > 0) navigator.setAppBadge(count);
        else navigator.clearAppBadge();
        return;
      }
    } catch {}
  
    // Fallback: sekme/pencere başlığında göster
    try {
      const titleEl = document.querySelector("head > title");
      if (!titleEl) return;
  
      if (!titleEl.dataset.baseTitle) {
        titleEl.dataset.baseTitle = document.title || "TickList";
      }
      const base = titleEl.dataset.baseTitle;
  
      document.title = count > 0 ? `(${count}) ${base}` : base;
    } catch {}
  }
  
  export function clearBadge() {
    setBadge(0);
  }
  