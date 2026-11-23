/* Lucian UX/UI Prompt #027 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#027 */
(function (global) {
  function init(root, onChooseItem) {
    if (!root) return null;
    var go = root.querySelector(".u027-go");
    var input = root.querySelector(".u027-in");
    var x = root.querySelector(".u027-x");
    var list = root.querySelector(".u027-list");
    var recentBox = root.querySelector(".u027-recent");
    var uid = "u027-" + Math.random().toString(36).slice(2, 7);
    list.id = uid;
    input.setAttribute("aria-controls", uid);

    var shown = [];
    var act = -1;

    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (root.classList.contains("is-open")) close(false); else open(true);
      }
      if (e.key === "Escape" && root.classList.contains("is-open")) close(true);
    });

    document.addEventListener("click", function (e) {
      if (root.classList.contains("is-open") && !root.contains(e.target)) close(false);
    });

    function esc(s) {
      return String(s).replace(/[&<>]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
      });
    }

    function applyLocale(langObj) {
      input.placeholder = langObj.t.searchPlaceholder;
      go.setAttribute("aria-label", langObj.t.openSearch);
      x.setAttribute("aria-label", langObj.t.closeSearch);
      recentBox.innerHTML = "";
      (langObj.recent || []).forEach(function (term) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = term;
        b.addEventListener("click", function () {
          input.value = term;
          render();
          var items = (langObj.searchItems || []);
          for (var i = 0; i < items.length; i++) {
            if (items[i].title === term || items[i].title.indexOf(term) >= 0) {
              if (typeof onChooseItem === "function") onChooseItem(items[i]);
              close(false);
              return;
            }
          }
          input.focus();
        });
        recentBox.appendChild(b);
      });
      render();
    }

    function render() {
      var langObj = global.LumenI18n ? global.LumenI18n.getCurrent() : null;
      var items = (langObj && langObj.searchItems) ? langObj.searchItems : [];
      var q = input.value.trim();
      var qLower = q.toLowerCase();

      shown = items
        .filter(function (d) {
          if (!q) return true;
          return d.title.toLowerCase().indexOf(qLower) >= 0 || d.kind.toLowerCase().indexOf(qLower) >= 0;
        })
        .slice(0, 3);

      act = shown.length ? 0 : -1;

      if (!shown.length) {
        var pre = langObj ? langObj.t.noResultsPrefix : "No results for ‘";
        var suf = langObj ? langObj.t.noResultsSuffix : "’";
        list.innerHTML = '<li class="u027-empty">' + esc(pre + q + suf) + "</li>";
        input.removeAttribute("aria-activedescendant");
        return;
      }

      list.innerHTML = shown
        .map(function (d, i) {
          var t = esc(d.title);
          if (q) {
            var idx = d.title.toLowerCase().indexOf(qLower);
            if (idx >= 0) {
              var match = d.title.slice(idx, idx + q.length);
              t = esc(d.title.slice(0, idx)) + "<mark>" + esc(match) + "</mark>" + esc(d.title.slice(idx + q.length));
            }
          }
          return (
            '<li class="u027-opt" role="option" id="' +
            uid +
            "-" +
            i +
            '" aria-selected="' +
            (i === act) +
            '" style="transition-delay:' +
            i * 40 +
            'ms"><i style="--c:' +
            d.grad +
            '" aria-hidden="true"></i><span><b>' +
            t +
            "</b><small>" +
            esc(d.kind) +
            "</small></span></li>"
          );
        })
        .join("");

      mark();
    }

    function mark() {
      Array.prototype.forEach.call(list.children, function (li, i) {
        if (li.setAttribute) li.setAttribute("aria-selected", String(i === act));
      });
      if (act >= 0) input.setAttribute("aria-activedescendant", uid + "-" + act);
      else input.removeAttribute("aria-activedescendant");
    }

    function open(focus) {
      root.classList.add("is-open");
      go.setAttribute("aria-expanded", "true");
      input.setAttribute("aria-expanded", "true");
      input.tabIndex = 0;
      x.tabIndex = 0;
      render();
      if (focus !== false) {
        setTimeout(function () {
          input.focus();
        }, 120);
      }
    }

    function close(returnFocus) {
      root.classList.remove("is-open");
      go.setAttribute("aria-expanded", "false");
      input.setAttribute("aria-expanded", "false");
      input.tabIndex = -1;
      x.tabIndex = -1;
      input.value = "";
      render();
      if (returnFocus) go.focus();
    }

    go.addEventListener("click", function () {
      if (root.classList.contains("is-open")) input.focus();
      else open(true);
    });

    x.addEventListener("click", function () { close(true); });
    input.addEventListener("input", render);

    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
      if (e.key === "ArrowDown" && shown.length) {
        e.preventDefault();
        act = (act + 1) % shown.length;
        mark();
      }
      if (e.key === "ArrowUp" && shown.length) {
        e.preventDefault();
        act = (act - 1 + shown.length) % shown.length;
        mark();
      }
      if (e.key === "Enter" && act >= 0 && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        var chosen = shown[act];
        input.value = chosen.title;
        render();
        if (typeof onChooseItem === "function") onChooseItem(chosen);
        close(false);
      }
    });

    list.addEventListener("click", function (e) {
      var li = e.target.closest(".u027-opt");
      if (!li) return;
      var i = Array.prototype.indexOf.call(list.children, li);
      if (i < 0 || !shown[i]) return;
      var chosen = shown[i];
      input.value = chosen.title;
      render();
      if (typeof onChooseItem === "function") onChooseItem(chosen);
      close(false);
    });

    if (global.LumenI18n) {
      applyLocale(global.LumenI18n.getCurrent());
      global.LumenI18n.onChange(applyLocale);
    } else {
      render();
    }

    return { open: open, close: close };
  }

  global.LumenSearch027 = { init: init };
})(window);
