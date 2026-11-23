/* #267 Language switch controller with text swap & smooth pill width */
(function (global) {
  var languages = (global.DVA_DATA && global.DVA_DATA.languages) || [];
  var currentIndex = 0;
  var listeners = [];

  function getCurrent() {
    return languages[currentIndex] || languages[0];
  }

  function swapAllText(animate) {
    var langObj = getCurrent();
    if (!langObj) return;
    var rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.lang = langObj.lang;

    var cdEl = document.querySelector(".u267-cd");
    if (cdEl) cdEl.textContent = langObj.code;

    var autoPill = document.querySelector(".u267-pill-auto");
    var w0 = autoPill ? autoPill.offsetWidth : 0;

    var nodes = document.querySelectorAll("[data-i18n]");
    nodes.forEach(function (el, idx) {
      var key = el.getAttribute("data-i18n");
      var val = langObj.t[key];
      if (val === undefined) return;

      var sw = el.querySelector(".u267-sw");
      var inner = sw ? sw.querySelector("span") : null;
      if (!sw || !inner) {
        el.innerHTML = val;
        return;
      }

      if (!animate || rm) {
        sw.classList.remove("is-go", "is-in");
        inner.innerHTML = val;
        return;
      }

      setTimeout(function () {
        sw.classList.remove("is-in");
        sw.classList.add("is-go");
        setTimeout(function () {
          inner.innerHTML = val;
          sw.classList.remove("is-go");
          void sw.offsetWidth;
          sw.classList.add("is-in");
        }, 240);
      }, idx * 25);
    });

    if (autoPill && animate && !rm && w0 > 0) {
      setTimeout(function () {
        autoPill.style.width = w0 + "px";
        var clone = autoPill.cloneNode(true);
        clone.style.cssText = "position:absolute;visibility:hidden;width:auto;pointer-events:none;";
        document.body.appendChild(clone);
        var cloneSpan = clone.querySelector(".u267-sw > span");
        if (cloneSpan) cloneSpan.innerHTML = langObj.t.soundOn;
        var w1 = clone.offsetWidth;
        clone.remove();
        requestAnimationFrame(function () {
          autoPill.style.width = w1 + "px";
        });
      }, 260);
    }
  }

  function setLanguage(index, animate) {
    if (index < 0 || index >= languages.length) return;
    currentIndex = index;
    swapAllText(animate !== false);
    listeners.forEach(function (fn) {
      fn(getCurrent());
    });
  }

  function init() {
    var wrap = document.querySelector(".u267-wrap");
    var gb = document.querySelector(".u267-gb");
    var dd = document.querySelector(".u267-dd");
    if (!wrap || !gb || !dd) return;

    var options = [];
    languages.forEach(function (item, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "u267-op";
      btn.setAttribute("role", "option");
      btn.lang = item.lang;
      btn.innerHTML =
        '<em aria-hidden="true">' +
        item.flag +
        "</em><span>" +
        item.name +
        '</span><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      btn.addEventListener("click", function () {
        setOpen(false);
        setLanguage(idx, true);
      });
      dd.appendChild(btn);
      options.push(btn);
    });

    function mark() {
      var cur = getCurrent();
      options.forEach(function (op, k) {
        var sel = k === currentIndex;
        op.classList.toggle("is-on", sel);
        op.setAttribute("aria-selected", String(sel));
      });
      gb.setAttribute("aria-label", cur.name + " selected");
    }

    function setOpen(open) {
      wrap.classList.toggle("is-open", open);
      gb.setAttribute("aria-expanded", String(open));
    }

    gb.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!wrap.classList.contains("is-open"));
    });

    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });

    listeners.push(mark);
    swapAllText(false);
    mark();
  }

  global.LumenI18n = {
    init: init,
    getCurrent: getCurrent,
    setLanguage: setLanguage,
    onChange: function (fn) {
      listeners.push(fn);
    }
  };
})(window);
