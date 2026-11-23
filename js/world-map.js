/* Bản đồ thế giới — path được nhét sẵn trong HTML, không fetch, không thư viện. */
(function () {
  var W = 1000, H = 500;
  var NS = "http://www.w3.org/2000/svg";
  var VN_ID = "704";

  var FLAGS = {
    "Vietnam": "🇻🇳", "Laos": "🇱🇦", "Cambodia": "🇰🇭", "China": "🇨🇳",
    "Thailand": "🇹🇭", "Myanmar": "🇲🇲", "Malaysia": "🇲🇾", "Philippines": "🇵🇭",
    "Indonesia": "🇮🇩", "Singapore": "🇸🇬", "Japan": "🇯🇵", "South Korea": "🇰🇷",
    "North Korea": "🇰🇵", "India": "🇮🇳", "Russia": "🇷🇺", "United States of America": "🇺🇸",
    "United States": "🇺🇸", "Canada": "🇨🇦", "Brazil": "🇧🇷", "Mexico": "🇲🇽",
    "United Kingdom": "🇬🇧", "France": "🇫🇷", "Germany": "🇩🇪", "Italy": "🇮🇹",
    "Spain": "🇪🇸", "Netherlands": "🇳🇱", "Poland": "🇵🇱", "Ukraine": "🇺🇦",
    "Australia": "🇦🇺", "New Zealand": "🇳🇿", "Egypt": "🇪🇬", "Nigeria": "🇳🇬",
    "South Africa": "🇿🇦", "Saudi Arabia": "🇸🇦", "Iran": "🇮🇷", "Iraq": "🇮🇶",
    "Israel": "🇮🇱", "Turkey": "🇹🇷", "Argentina": "🇦🇷", "Chile": "🇨🇱",
    "Colombia": "🇨🇴", "Peru": "🇵🇪", "Pakistan": "🇵🇰", "Bangladesh": "🇧🇩",
    "Sri Lanka": "🇱🇰", "Nepal": "🇳🇵", "Mongolia": "🇲🇳", "Kazakhstan": "🇰🇿"
  };

  var state = { svg: null, paths: [], byId: {}, view: [0, 0, W, H], anim: 0, done: false };

  function bboxOf(el) {
    try { var b = el.getBBox(); return [b.x, b.y, b.width, b.height]; }
    catch (e) { return [0, 0, W, H]; }
  }

  function clampView(v) {
    v[2] = Math.max(20, Math.min(W, v[2]));
    v[3] = Math.max(10, Math.min(H, v[3]));
    v[0] = Math.max(-20, Math.min(W - v[2] + 20, v[0]));
    v[1] = Math.max(-20, Math.min(H - v[3] + 20, v[1]));
    return v;
  }

  function setView(target, animate) {
    if (state.anim) cancelAnimationFrame(state.anim);
    target = clampView(target.slice());
    if (!animate) { state.svg.setAttribute("viewBox", target.join(" ")); state.view = target; return; }
    var from = state.view.slice(), t0 = 0, dur = 520;
    function step(now) {
      if (!t0) t0 = now;
      var k = Math.max(0, Math.min(1, (now - t0) / dur));
      var e = 1 - Math.pow(1 - k, 3);
      var v = clampView(from.map(function (n, i) { return n + (target[i] - n) * e; }));
      state.svg.setAttribute("viewBox", v.join(" "));
      state.view = v;
      if (k < 1) state.anim = requestAnimationFrame(step); else state.anim = 0;
    }
    state.anim = requestAnimationFrame(step);
  }

  function flag(name) { return FLAGS[name] || "🌐"; }

  function showDetail(el) {
    var box = document.getElementById("mapDetail");
    if (!box) return;
    if (!el) {
      box.innerHTML = '<span class="map-detail-empty">Chọn một quốc gia trên bản đồ để xem chi tiết.</span>';
      return;
    }
    var name = el.getAttribute("data-name") || "—";
    var id = el.getAttribute("data-id") || "—";
    var isVN = String(id) === VN_ID;
    var b = bboxOf(el);
    var lon = (b[0] + b[2] / 2) / W * 360 - 180;
    var lat = 90 - (b[1] + b[3] / 2) / H * 180;
    box.innerHTML =
      '<span class="map-detail-flag">' + flag(name) + '</span>' +
      '<span class="map-detail-main"><strong>' + name + '</strong>' +
      '<small>' + (isVN ? 'QUỐC GIA ƯU TIÊN · HCM / VN' : 'ISO 3166-1 · ' + id) +
      ' · ' + lon.toFixed(1) + '°, ' + lat.toFixed(1) + '°</small></span>' +
      (isVN ? '<span class="map-detail-tag">VN</span>' : '');
  }

  function select(el, focus) {
    state.paths.forEach(function (p) { p.classList.remove("is-selected"); });
    el.classList.add("is-selected");
    showDetail(el);
    var marker = document.getElementById("mapMarker");
    if (marker) marker.hidden = !!focus;
    if (focus) {
      var b = bboxOf(el);
      var pad = Math.max(b[2], b[3]) * 0.6 + 26;
      setView([b[0] - pad, b[1] - pad, b[2] + pad * 2, b[3] + pad * 2], true);
    }
  }

  function build() {
    if (state.done) return true;
    var svg = document.getElementById("worldMap");
    if (!svg) return false;
    state.svg = svg;
    state.paths = Array.prototype.slice.call(svg.querySelectorAll(".map-country"));
    if (!state.paths.length) return false;

    state.paths.forEach(function (p) {
      var id = p.getAttribute("data-id");
      if (id) state.byId[id] = p;
      p.setAttribute("tabindex", "0");
      p.setAttribute("role", "button");
      p.setAttribute("aria-label", p.getAttribute("data-name") || "Country");
      var name = p.getAttribute("data-name") || "";
      p.addEventListener("mouseenter", function () {
        var tip = document.getElementById("mapTip");
        if (!tip) return;
        tip.textContent = flag(name) + " " + name;
        tip.hidden = false;
      });
      p.addEventListener("mousemove", function (e) {
        var tip = document.getElementById("mapTip");
        if (!tip) return;
        var r = svg.getBoundingClientRect();
        tip.style.left = (e.clientX - r.left + 12) + "px";
        tip.style.top = (e.clientY - r.top - 10) + "px";
      });
      p.addEventListener("mouseleave", function () {
        var tip = document.getElementById("mapTip");
        if (tip) tip.hidden = true;
      });
      p.addEventListener("click", function () { select(p, true); });
      p.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(p, true); }
      });
    });

    var vnPath = state.byId[VN_ID];
    if (vnPath) {
      var vb = bboxOf(vnPath);
      var marker = document.createElementNS(NS, "g");
      marker.setAttribute("class", "map-marker");
      marker.setAttribute("id", "mapMarker");
      var cx = vb[0] + vb[2] / 2, cy = vb[1] - 8;
      var dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", 3.4);
      var line = document.createElementNS(NS, "line");
      line.setAttribute("x1", cx); line.setAttribute("y1", cy + 2);
      line.setAttribute("x2", cx); line.setAttribute("y2", vb[1] + vb[3] + 4);
      var label = document.createElementNS(NS, "text");
      label.setAttribute("x", cx); label.setAttribute("y", cy - 7);
      label.setAttribute("text-anchor", "middle");
      label.textContent = "VIỆT NAM";
      marker.appendChild(line); marker.appendChild(dot); marker.appendChild(label);
      svg.appendChild(marker);
    }

    var count = document.getElementById("mapCount");
    if (count) count.textContent = state.paths.length + " quốc gia / vùng lãnh thổ";
    showDetail(null);

    var vnBtn = document.getElementById("mapVN");
    if (vnBtn) vnBtn.addEventListener("click", function () {
      if (vnPath) select(vnPath, true);
    });
    var resetBtn = document.getElementById("mapReset");
    if (resetBtn) resetBtn.addEventListener("click", function () {
      state.paths.forEach(function (p) { p.classList.remove("is-selected"); });
      var marker = document.getElementById("mapMarker");
      if (marker) marker.hidden = false;
      showDetail(null); setView([0, 0, W, H], true);
    });
    var search = document.getElementById("mapSearch");
    if (search) search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      state.paths.forEach(function (p) {
        p.classList.toggle("is-dim", !!q && (p.getAttribute("data-name") || "").toLowerCase().indexOf(q) < 0);
      });
    });

    state.done = true;
    return true;
  }

  window.DvaWorldMap = { init: build };
})();
