/* #079 Skeleton shimmer sweep & top-down reveal controller */
(function (global) {
  function attachBloom(cardEl, triggerBtn) {
    if (!cardEl) return null;
    cardEl.classList.add("u079-card");
    var sks = cardEl.querySelectorAll(".u079-sk");
    var rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var timer = 0;

    function align() {
      sks.forEach(function (s) {
        var x = 0;
        var el = s.parentNode;
        while (el && el !== cardEl) {
          x += el.offsetLeft;
          el = el.offsetParent;
        }
        s.style.setProperty("--sx", -x + "px");
      });
    }

    function bloom() {
      clearTimeout(timer);
      cardEl.classList.remove("is-done");
      cardEl.classList.add("is-loading");
      cardEl.setAttribute("aria-busy", "true");
      align();
      timer = setTimeout(function () {
        if (!cardEl.isConnected) return;
        cardEl.classList.remove("is-loading");
        cardEl.classList.add("is-done");
        cardEl.setAttribute("aria-busy", "false");
      }, rm ? 300 : 1200);
    }

    if (triggerBtn) {
      triggerBtn.addEventListener("click", bloom);
    }
    window.addEventListener("resize", align);

    return { bloom: bloom };
  }

  global.LumenSkeleton079 = { attachBloom: attachBloom };
})(window);
