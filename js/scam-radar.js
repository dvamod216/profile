/* DVA Scam Radar — bộ chấm điểm rủi ro URL chạy hoàn toàn trên trình duyệt.
   Không truy cập URL người dùng nhập, không gửi dữ liệu đi đâu (trừ khi bật AI API ở dưới). */
(function (global) {
  var timers = [];
  var last = null;
  var aiKey = "";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function enc(s) { return encodeURIComponent(String(s)); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  var OFFICIAL = {
    paypal: ["paypal.com", "paypal.me", "paypal.co.uk", "paypal.com.au", "paypal.com.sg"],
    facebook: ["facebook.com", "fb.com", "facebook.net"],
    instagram: ["instagram.com", "cdninstagram.com"],
    google: ["google.com", "google.vn", "google.co.uk", "accounts.google.com"],
    apple: ["apple.com", "icloud.com", "apple.co"],
    microsoft: ["microsoft.com", "live.com", "outlook.com", "hotmail.com", "office.com"],
    amazon: ["amazon.com", "amazon.co.uk", "amazon.de", "amazon.in", "amazon.jp"],
    netflix: ["netflix.com"],
    binance: ["binance.com"],
    coinbase: ["coinbase.com"],
    metamask: ["metamask.io"],
    telegram: ["telegram.org", "t.me"],
    zalo: ["zalo.me", "zalo.vn"],
    shopee: ["shopee.vn", "shopee.com", "shopee.co.th", "shopee.ph"],
    lazada: ["lazada.vn", "lazada.com"],
    tiktok: ["tiktok.com"],
    youtube: ["youtube.com", "youtu.be"],
    whatsapp: ["whatsapp.com", "wa.me"],
    linkedin: ["linkedin.com"],
    dropbox: ["dropbox.com"],
    adobe: ["adobe.com"],
    samsung: ["samsung.com"]
  };

  var MODIFIERS = ["secure", "security", "login", "signin", "verify", "validate", "confirm",
    "account", "support", "center", "official", "service", "team", "help", "update",
    "reset", "my", "the", "online", "web", "site", "app", "id", "auth", "check"];

  var BAD_TLD = ["top", "xyz", "click", "link", "info", "biz", "ru", "cn", "tk", "ml", "ga",
    "cf", "gq", "pw", "su", "cc", "ws", "work", "party", "review", "country", "stream",
    "download", "science", "website", "live", "life", "world", "online", "site", "store", "space", "host"];

  var THROWAWAY = ["github.io", "vercel.app", "netlify.app", "pages.dev", "weebly.com",
    "wixsite.com", "blogspot.com", "firebaseapp.com", "web.app", "herokuapp.com",
    "ngrok.io", "trycloudflare.com", "workers.dev", "000webhostapp.com"];

  var SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "ow.ly", "buff.ly",
    "cutt.ly", "rebrand.ly", "shope.ee", "lnkd.in", "fb.me", "s.id", "t.ly"];

  var KEYWORDS = ["login", "signin", "verify", "validate", "confirm", "account", "secure",
    "password", "reset", "wallet", "airdrop", "bonus", "reward", "claim", "gift", "free",
    "crypto", "invest", "withdraw", "deposit", "otp", "kyc", "2fa", "support", "unlock"];

  function deob(s) {
    return String(s).toLowerCase()
      .replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/5/g, "s")
      .replace(/4/g, "a").replace(/@/g, "a").replace(/vv/g, "w").replace(/rn/g, "m")
      .replace(/[^a-z0-9]/g, "");
  }

  function lev(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      }
      prev = cur.slice();
    }
    return prev[b.length];
  }

  function entropy(s) {
    if (!s) return 0;
    var freq = {}, i;
    for (i = 0; i < s.length; i++) freq[s.charAt(i)] = (freq[s.charAt(i)] || 0) + 1;
    var h = 0;
    for (var k in freq) {
      var p = freq[k] / s.length;
      h -= p * (Math.log(p) / Math.LN2);
    }
    return h;
  }

  function sig(level, weight, title, detail) {
    return { level: level, weight: weight, title: title, detail: detail };
  }

  function normalize(raw) {
    var v = String(raw || "").trim();
    if (!v) return { error: "Chưa nhập URL." };
    if (/^\/\//.test(v)) v = "https:" + v;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = "https://" + v;
    var u;
    try { u = new URL(v); } catch (e) { return { error: "URL không hợp lệ. Thử dạng https://example.com/path" }; }
    if (!/^https?:$/i.test(u.protocol)) return { error: "Chỉ hỗ trợ URL http/https." };
    return { u: u, full: u.href };
  }

  function analyze(raw) {
    var n = normalize(raw);
    if (n.error) return { error: n.error };

    var u = n.u;
    var full = n.full;
    var host = u.hostname.toLowerCase().replace(/\.$/, "");
    var bare = host.replace(/^www\./, "");
    var parts = bare.split(".");
    var registrable = parts.length > 2 ? parts.slice(-2).join(".") : bare;
    var tld = parts[parts.length - 1] || "";
    var hits = [];

    if (u.protocol === "http:") hits.push(sig("high", 18, "Không dùng HTTPS", "Dữ liệu truyền dạng rõ, dễ bị nghe lén hoặc chèn nội dung."));
    if (u.username || u.password) hits.push(sig("high", 20, "Có thông tin đăng nhập trong URL", "Dạng user:pass@host thường dùng để lừa hoặc lộ khóa."));
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(bare)) hits.push(sig("med", 14, "Host là địa chỉ IP", "Thường gặp ở trang staged / máy chủ tạm, khó xác minh danh tính."));
    if (bare === "localhost" || bare.endsWith(".local")) hits.push(sig("med", 12, "Host nội bộ", "localhost/.local không phải địa chỉ web công khai."));
    if (u.port && !((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80"))) {
      hits.push(sig("med", 10, "Cổng không chuẩn: " + u.port, "Dịch vụ chạy ngoài cổng 80/443 cần kiểm tra kỹ."));
    }
    if (/xn--/i.test(bare) || /[\u0080-\uFFFF]/.test(host)) {
      hits.push(sig("high", 22, "Tên miền có ký tự đồng dạng / punycode", "Ký tự Unicode hoặc xn-- thường dùng để giả tên miền thương hiệu."));
    }
    if ((host.match(/-/g) || []).length >= 3) hits.push(sig("med", 8, "Quá nhiều dấu gạch ngang", "Tên miền kiểu secure-login-verify-... dễ là trang giả."));
    if (parts.length >= 4) hits.push(sig("med", 9, "Nhiều cấp tên miền phụ", "Subdomain lồng nhau thường dùng để ngụy trang thương hiệu."));
    if (BAD_TLD.indexOf(tld) >= 0) hits.push(sig("med", 12, "Đuôi tên miền rủi ro: ." + tld, "Nhóm TLD này hay xuất hiện trong chiêu lừa đảo / spam."));
    if (THROWAWAY.some(function (d) { return bare === d || bare.endsWith("." + d); })) {
      hits.push(sig("med", 8, "Hosting/free tier", "Trang dựng tạm trên nền tảng miễn phí dễ bị thay đổi hoặc gỡ bỏ."));
    }
    if (SHORTENERS.some(function (d) { return bare === d || bare.endsWith("." + d); })) {
      hits.push(sig("high", 14, "Link rút gọn", "Không nhìn được đích cuối — hãy mở đối chiếu trước khi bấm."));
    }

    var deobHost = deob(bare);
    var tokens = bare.split(/[^a-z0-9]+/i).filter(Boolean).map(deob);
    var brandHit = null;
    for (var brand in OFFICIAL) {
      if (!Object.prototype.hasOwnProperty.call(OFFICIAL, brand)) continue;
      var official = OFFICIAL[brand].some(function (d) {
        return bare === d || bare.slice(-(d.length + 1)) === "." + d;
      });
      if (official) continue;
      var matched = false;
      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        if (token === brand || lev(token, brand) <= 1) { matched = true; break; }
        if (token.indexOf(brand) >= 0 && token.length <= brand.length + 10) {
          var rest = token.split(brand).join("");
          if (MODIFIERS.indexOf(rest) >= 0) { matched = true; break; }
        }
      }
      if (matched || (deobHost.indexOf(brand) >= 0 && deobHost.length <= brand.length + 9)) {
        brandHit = brand;
        break;
      }
    }
    if (brandHit) hits.push(sig("high", 26, "Giả danh thương hiệu: " + brandHit, "Tên miền giống " + brandHit + " nhưng không phải tên miền chính chủ."));

    var haystack = (u.pathname + u.search).toLowerCase();
    var foundWords = KEYWORDS.filter(function (w) { return haystack.indexOf(w) >= 0; });
    if (foundWords.length) {
      hits.push(sig(foundWords.length >= 3 ? "high" : "med", clamp(5 + foundWords.length * 3, 6, 14),
        "Từ khóa nhạy cảm: " + foundWords.slice(0, 4).join(", "),
        "Cụm từ thường gặp trên trang giả đăng nhập / ví / nhận thưởng."));
    }
    if (full.length > 200) hits.push(sig("med", 10, "URL rất dài (" + full.length + " ký tự)", "URL dài bất thường dễ che giấu tham số hoặc chuyển hướng."));
    else if (full.length > 120) hits.push(sig("low", 6, "URL dài (" + full.length + " ký tự)", "Nên kiểm tra kỹ các tham số phía sau."));
    if (u.searchParams && Array.from(u.searchParams.keys()).length >= 6) {
      hits.push(sig("low", 5, "Nhiều tham số truy vấn", "Nhiều tham số có thể dùng để theo dõi hoặc lừa chuyển hướng."));
    }
    var label = parts[parts.length - 2] || bare;
    if (label.length >= 12 && entropy(label) > 3.7 && !/[aeiou]{2}/.test(label)) {
      hits.push(sig("low", 7, "Tên miền ngẫu nhiên", "Chuỗi ký tự entropy cao, ít khả năng là tên thật."));
    }

    var isOfficial = false;
    for (var b in OFFICIAL) {
      if (!Object.prototype.hasOwnProperty.call(OFFICIAL, b)) continue;
      if (OFFICIAL[b].some(function (d) { return bare === d || bare.slice(-(d.length + 1)) === "." + d; })) {
        isOfficial = true; break;
      }
    }
    var risk = hits.reduce(function (a, h) { return a + h.weight; }, 0);
    if (isOfficial && risk <= 10) risk = Math.max(0, risk - 22);
    var score = clamp(Math.round(100 * (1 - Math.exp(-risk / 42))), 0, 100);

    var verdict;
    if (score >= 68) verdict = { key: "danger", badge: "NGUY HIỂM", title: "Có dấu hiệu lừa đảo rõ", desc: "Nên dừng lại, không nhập thông tin hay bấm tiếp. Đối chiếu với nguồn uy tín bên dưới.", color: "var(--ux-danger)" };
    else if (score >= 38) verdict = { key: "warn", badge: "CẦN THẬN TRỌNG", title: "Nhiều điểm bất thường", desc: "Không khẳng định đây là lừa đảo, nhưng cần kiểm chứng thêm trước khi tin.", color: "var(--ux-warn)" };
    else if (score >= 15) verdict = { key: "warn", badge: "HƠI ĐÁNG NGỜ", title: "Một vài tín hiệu lạ", desc: "Có thể hợp lệ. Xem kỹ đường dẫn và nguồn gốc trước khi thao tác.", color: "var(--ux-warn)" };
    else verdict = { key: "safe", badge: "CHƯA THẤY DẤU HIỆU", title: "Chưa phát hiện dấu hiệu lừa đảo", desc: "Chỉ dựa trên cấu trúc URL — vẫn cần kiểm tra nội dung thực tế.", color: "var(--ux-mint)" };

    hits.sort(function (a, b) { return b.weight - a.weight; });

    return {
      raw: String(raw || "").trim(),
      full: full,
      host: bare,
      protocol: u.protocol.replace(":", ""),
      path: u.pathname || "/",
      params: u.searchParams ? Array.from(u.searchParams.keys()).length : 0,
      score: score,
      verdict: verdict,
      signals: hits,
      confidence: clamp(55 + hits.length * 7, 55, 96),
      official: isOfficial,
      links: [
        { n: "VirusTotal", u: "https://www.virustotal.com/gui/search/" + enc(full) },
        { n: "urlscan.io", u: "https://urlscan.io/search/#" + enc(full) },
        { n: "Safe Browsing", u: "https://transparencyreport.google.com/safe-browsing/search?url=" + enc(full) },
        { n: "SecurityHeaders", u: "https://securityheaders.com/?q=" + enc(full) + "&followRedirects=on" },
        { n: "SSL Labs", u: "https://www.ssllabs.com/ssltest/analyze.html?d=" + enc(bare) }
      ]
    };
  }

  function el(id) { return document.getElementById(id); }
  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function setBusy(busy) {
    var btn = el("scamBtn");
    if (!btn) return;
    btn.disabled = busy;
    btn.textContent = busy ? "ĐANG SOI…" : "Soi ngay";
  }

  function renderResult(r) {
    var idle = el("scamIdle");
    var scan = el("scamScan");
    var out = el("scamResult");
    if (!out) return;
    if (idle) idle.hidden = true;
    if (scan) scan.hidden = true;
    out.hidden = false;

    var signalRows = r.signals.length
      ? r.signals.map(function (h) {
          return '<li class="radar-signal radar-signal--' + h.level + '"><span class="radar-dot"></span>' +
            '<span><strong>' + esc(h.title) + '</strong><small>' + esc(h.detail) + '</small></span>' +
            '<b>+' + h.weight + '</b></li>';
        }).join("")
      : '<li class="radar-signal radar-signal--low"><span class="radar-dot"></span><span><strong>Không có tín hiệu đỏ</strong><small>Cấu trúc URL ở mức bình thường.</small></span><b>+0</b></li>';

    var links = r.links.map(function (l) {
      return '<a class="sec-link" href="' + esc(l.u) + '" target="_blank" rel="noopener noreferrer">' + esc(l.n) + ' ↗</a>';
    }).join("");

    out.innerHTML =
      '<div class="radar-top">' +
        '<div class="radar-gauge" style="--score:' + r.score + ';--verdict:' + r.verdict.color + '">' +
          '<div><strong>' + r.score + '</strong><small>/100</small></div>' +
        '</div>' +
        '<div class="radar-verdict">' +
          '<span class="radar-badge radar-badge--' + r.verdict.key + '">' + esc(r.verdict.badge) + '</span>' +
          '<h3>' + esc(r.verdict.title) + '</h3>' +
          '<p>' + esc(r.verdict.desc) + '</p>' +
          '<div class="radar-meta">Độ tin cậy <b>' + r.confidence + '%</b> · ' + r.signals.length + ' tín hiệu · ' + esc(r.protocol) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="radar-parsed">' +
        '<span><i>HOST</i><b>' + esc(r.host) + '</b></span>' +
        '<span><i>PATH</i><b>' + esc(r.path) + '</b></span>' +
        '<span><i>PARAMS</i><b>' + r.params + '</b></span>' +
      '</div>' +
      '<ul class="radar-signals">' + signalRows + '</ul>' +
      '<div class="radar-links"><span class="radar-links-label">ĐỐI CHIẾU THÊM</span><div class="sec-links">' + links + '</div></div>';
  }

  function run(raw) {
    clearTimers();
    var idle = el("scamIdle");
    var scan = el("scamScan");
    var out = el("scamResult");
    var log = el("scamLog");
    var bar = el("scamProgress");
    var state = el("radarState");
    var count = el("radarSignals");
    if (!scan || !out) return;

    idle && (idle.hidden = true);
    out.hidden = true;
    scan.hidden = false;
    if (log) log.innerHTML = "";
    if (bar) bar.style.width = "0%";
    if (state) state.textContent = "ĐANG SOI";
    setBusy(true);

    var steps = [
      "› Chuẩn hóa URL và tách thành phần…",
      "› So khớp tên miền chính chủ / ký tự đồng dạng…",
      "› Quét từ khóa đăng nhập, ví, nhận thưởng…",
      "› Chấm điểm rủi ro theo trọng số…"
    ];
    steps.forEach(function (msg, i) {
      later(function () {
        if (log) {
          var line = document.createElement("div");
          line.textContent = msg;
          line.style.opacity = "0";
          log.appendChild(line);
          requestAnimationFrame(function () { line.style.opacity = "1"; });
        }
        if (bar) bar.style.width = (18 + i * 22) + "%";
      }, 130 + i * 150);
    });

    later(function () {
      var result = analyze(raw);
      if (result.error) {
        scan.hidden = true;
        idle && (idle.hidden = false);
        if (idle) idle.innerHTML = '<span class="radar-idle-icon">!</span><div><strong>URL chưa hợp lệ</strong><p>' + esc(result.error) + '</p></div>';
        if (state) state.textContent = "CHỜ URL";
        setBusy(false);
        return;
      }
      last = result;
      if (bar) bar.style.width = "100%";
      renderResult(result);
      if (state) state.textContent = result.verdict.badge;
      if (count) count.textContent = String(result.signals.length);
      setBusy(false);
    }, 780);
  }

  function aiExplain() {
    var out = el("aiOut");
    if (!out) return;
    if (!last) { out.textContent = "Hãy soi một URL trước rồi mới nhờ AI giải thích."; return; }
    var endpoint = (el("aiEndpoint") && el("aiEndpoint").value.trim()) || "https://api.openai.com/v1/chat/completions";
    var model = (el("aiModel") && el("aiModel").value.trim()) || "gpt-4o-mini";
    var key = (el("aiKey") && el("aiKey").value.trim()) || aiKey;
    if (!key) { out.textContent = "Nhập API key (tuỳ chọn) để dùng tính năng này."; return; }
    aiKey = key;
    try { sessionStorage.setItem("dva-ai-endpoint", endpoint); sessionStorage.setItem("dva-ai-model", model); } catch (e) {}

    var prompt = "URL: " + last.full + "\nĐiểm rủi ro: " + last.score + "/100\nKết luận máy: " + last.verdict.title +
      "\nTín hiệu: " + (last.signals.map(function (s) { return s.title + " (" + s.weight + ")"; }).join("; ") || "không có") +
      "\nHãy trả lời tiếng Việt, tối đa 120 chữ: nhận định ngắn gọn, 3 việc cần kiểm tra trước khi tin, và nhắc rằng đây không phải kết luận chắc chắn.";

    out.textContent = "Đang hỏi AI…";
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeout = setTimeout(function () { if (controller) controller.abort(); }, 25000);
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({ model: model, temperature: 0.2, messages: [
        { role: "system", content: "Bạn là chuyên gia an ninh mạng, trả lời ngắn gọn bằng tiếng Việt, không bịa đặt dữ liệu." },
        { role: "user", content: prompt }
      ] }),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (!res.ok) throw new Error("API trả " + res.status + " " + res.statusText);
      return res.json();
    }).then(function (json) {
      clearTimeout(timeout);
      var text = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
      out.textContent = String(text || "AI không trả nội dung.").trim();
    }).catch(function (err) {
      clearTimeout(timeout);
      out.textContent = "Không gọi được AI: " + (err && err.name === "AbortError" ? "quá thời gian 25s" : (err && err.message ? err.message : "lỗi không xác định"));
    });
  }

  function init() {
    var btn = el("scamBtn");
    if (!btn) return null;
    var input = el("scamUrl");

    btn.addEventListener("click", function () { run(input ? input.value : ""); });
    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); run(input.value); }
      });
    }
    var paste = el("scamPaste");
    if (paste) {
      paste.addEventListener("click", function () {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          input && input.focus();
          return;
        }
        navigator.clipboard.readText().then(function (text) {
          if (input) { input.value = text; input.focus(); }
          run(text);
        }).catch(function () { input && input.focus(); });
      });
    }
    document.querySelectorAll("[data-scam-sample]").forEach(function (b) {
      b.addEventListener("click", function () {
        var samples = {
          paypal: "https://paypa1-secure-login.top/verify?account=1",
          crypto: "https://free-airdrop-claim.xyz/wallet/connect?ref=888",
          safe: "https://www.paypal.com/"
        };
        var v = samples[b.getAttribute("data-scam-sample")] || "";
        if (input) input.value = v;
        run(v);
      });
    });
    var aiBtn = el("aiButton");
    if (aiBtn) aiBtn.addEventListener("click", aiExplain);
    try {
      if (el("aiEndpoint")) el("aiEndpoint").value = sessionStorage.getItem("dva-ai-endpoint") || "";
      if (el("aiModel")) el("aiModel").value = sessionStorage.getItem("dva-ai-model") || "gpt-4o-mini";
    } catch (e) {}
    return { run: run, analyze: analyze };
  }

  global.DvaScamRadar = { init: init, analyze: analyze };
})(window);
