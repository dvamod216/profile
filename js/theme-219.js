/* #219 Circular dark/light theme wipe & dock accent swatches */
(function (global) {
  function init() {
    var reveal = document.querySelector(".u219-reveal");
    var themeBtn = document.getElementById("theme-toggle-btn");
    var dockThemeBtn = document.getElementById("dock-theme-btn");
    var swatches = document.querySelectorAll(".dva-swatch");
    var dockBadge = document.getElementById("dock-accent-badge");

    var isDark = document.documentElement.getAttribute("data-theme") === "dark";

    function syncThemeState() {
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
      if (themeBtn) {
        themeBtn.setAttribute("aria-pressed", String(isDark));
        var labelSpan = themeBtn.querySelector("[data-i18n] .u267-sw > span");
        var lang = global.LumenI18n ? global.LumenI18n.getCurrent() : null;
        if (labelSpan && lang) {
          labelSpan.textContent = isDark ? lang.t.lightMode : lang.t.darkMode;
        }
      }
      if (dockThemeBtn) {
        dockThemeBtn.textContent = isDark ? "☀" : "☾";
      }
    }

    function toggleThemeAt(originEl) {
      var rect = originEl ? originEl.getBoundingClientRect() : { left: window.innerWidth - 40, top: 30, width: 32, height: 32 };
      var cx = Math.round(rect.left + rect.width / 2);
      var cy = Math.round(rect.top + rect.height / 2);
      isDark = !isDark;

      if (reveal) {
        reveal.style.setProperty("--cx", cx + "px");
        reveal.style.setProperty("--cy", cy + "px");
        reveal.classList.remove("is-animating");
        void reveal.offsetWidth;
        reveal.classList.add("is-animating");
        setTimeout(function () {
          reveal.classList.remove("is-animating");
        }, 850);
      }
      syncThemeState();
    }

    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        toggleThemeAt(themeBtn);
      });
    }

    if (dockThemeBtn) {
      dockThemeBtn.addEventListener("click", function () {
        toggleThemeAt(dockThemeBtn);
      });
    }

    swatches.forEach(function (sw) {
      sw.addEventListener("click", function () {
        swatches.forEach(function (s) {
          s.classList.remove("is-active");
        });
        sw.classList.add("is-active");
        var accent = sw.getAttribute("data-accent");
        var name = sw.getAttribute("data-name") || "63";
        if (accent) {
          document.documentElement.style.setProperty("--ux-accent", accent);
        }
        if (dockBadge) {
          dockBadge.textContent = name;
        }
      });
    });

    if (global.LumenI18n) {
      global.LumenI18n.onChange(syncThemeState);
    }
    initDemo();
    syncThemeState();
  }

  /* Prompt #219 — thẻ xem trước sáng/tối với hiệu ứng loang tròn */
  function initDemo() {
    var root = document.getElementById("u219Demo");
    if (!root || root.getAttribute("data-ready")) return;
    var lt = root.querySelector(".u219-lt"), dk = root.querySelector(".u219-dk");
    if (!lt || !dk) return;
    root.setAttribute("data-ready", "1");

    var SUN = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="currentColor"/><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 1.5v1.4M8 13.1v1.4M1.5 8h1.4M13.1 8h1.4M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"/></g></svg>';
    var MOON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.8A5.6 5.6 0 0 1 6.2 2.5a5.6 5.6 0 1 0 7.3 7.3z" fill="currentColor"/></svg>';

    function page(dark) {
      return '<div class="u219-nv"><b><i></i>Pulse</b><span>Dashboard</span><span>Reports</span><button type="button" class="u219-tg">' + (dark ? MOON : SUN) + '</button></div>' +
        '<h3 class="u219-h">October summary</h3><div class="u219-kp"><div><small>Visits</small><b>18.4k</b></div><div><small>Sign-ups</small><b>1,206</b></div><div><small>Conversion</small><b>6.5%</b></div></div>' +
        '<div class="u219-ch"><small>Weekly visits</small><svg viewBox="0 0 280 112" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ac)" stop-opacity=".35"/><stop offset="1" stop-color="var(--ac)" stop-opacity="0"/></linearGradient></defs><path d="M0 84 C30 70 50 92 80 66 S130 40 160 54 S220 20 280 26 L280 112 L0 112 Z" fill="url(#g)"/><path d="M0 84 C30 70 50 92 80 66 S130 40 160 54 S220 20 280 26" fill="none" stroke="var(--ac)" stroke-width="2.5"/></svg></div>';
    }
    lt.innerHTML = page(false);
    dk.innerHTML = page(true);

    var uid = "u219demo" + Math.random().toString(36).slice(2, 7);
    [lt, dk].forEach(function (pg, i) {
      var g = pg.querySelector("linearGradient");
      g.id = uid + i;
      pg.querySelector("path").setAttribute("fill", "url(#" + uid + i + ")");
    });

    var on = false, T = [lt.querySelector(".u219-tg"), dk.querySelector(".u219-tg")];
    function setCenter(btn) {
      var r = root.getBoundingClientRect(), b = btn.getBoundingClientRect(), k = root.offsetWidth / (r.width || 1);
      root.style.setProperty("--cx", ((b.left + b.width / 2 - r.left) * k).toFixed(0) + "px");
      root.style.setProperty("--cy", ((b.top + b.height / 2 - r.top) * k).toFixed(0) + "px");
    }
    function clip() {
      var cx = root.style.getPropertyValue("--cx") || "300px";
      var cy = root.style.getPropertyValue("--cy") || "30px";
      dk.style.clipPath = "circle(" + (on ? 520 : 0) + "px at " + cx + " " + cy + ")";
    }
    setCenter(T[0]);
    function sync() {
      root.classList.toggle("is-on", on);
      clip();
      dk.setAttribute("aria-hidden", String(!on));
      lt.setAttribute("aria-hidden", String(on));
      T[0].tabIndex = on ? -1 : 0;
      T[1].tabIndex = on ? 0 : -1;
      T.forEach(function (t) {
        t.setAttribute("aria-label", on ? "Switch to light mode" : "Switch to dark mode");
        t.setAttribute("aria-pressed", String(on));
      });
    }
    T.forEach(function (t) {
      t.addEventListener("click", function () {
        setCenter(t);
        on = !on;
        sync();
        (on ? T[1] : T[0]).focus({ preventScroll: true });
      });
    });
    sync();
  }

  global.LumenTheme219 = { init: init };
})(window);
