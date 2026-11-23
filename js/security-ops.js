/* Trung tâm bảo mật — tra cứu IOC & dò lỗ hổng chạy trên browser.
   Không gửi dữ liệu đi đâu; mọi đối chiếu sâu đều mở link tới dịch vụ uy tín. */
(function () {
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function enc(s) { return encodeURIComponent(s); }

  function detectIOC(raw) {
    var v = raw.trim();
    if (!v) return null;
    var oct = "(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)";
    var ipv4re = new RegExp("^" + oct + "(?:\\." + oct + "){3}$");
    if (ipv4re.test(v)) return ipv4(v);
    if (/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(v) && ipv4re.test(v.split("/")[0])) return ipv4(v);
    if (/^[0-9a-fA-F:]{6,45}$/.test(v) && (v.match(/:/g) || []).length >= 2) {
      return { type: "IPv6", label: "Địa chỉ IPv6", links: [
        { n: "AbuseIPDB", u: "https://www.abuseipdb.com/check/" + enc(v) },
        { n: "VirusTotal", u: "https://www.virustotal.com/gui/search/" + enc(v) }
      ] };
    }
    if (/^[a-fA-F0-9]{64}$/.test(v)) return hash(v, "SHA-256");
    if (/^[a-fA-F0-9]{40}$/.test(v)) return hash(v, "SHA-1");
    if (/^[a-fA-F0-9]{32}$/.test(v)) return hash(v, "MD5");
    if (/^https?:\/\//i.test(v)) {
      try { new URL(v); } catch (e) { return { type: "INVALID", label: "URL không hợp lệ", links: [] }; }
      return { type: "URL", label: "Địa chỉ web (URL)", links: [
        { n: "VirusTotal", u: "https://www.virustotal.com/gui/search/" + enc(v) },
        { n: "urlscan.io", u: "https://urlscan.io/search/#" + enc(v) },
        { n: "SecurityHeaders", u: "https://securityheaders.com/?q=" + enc(v) + "&followRedirects=on" }
      ] };
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return { type: "EMAIL", label: "Địa chỉ email", links: [
        { n: "Have I Been Pwned", u: "https://haveibeenpwned.com/" },
        { n: "VirusTotal", u: "https://www.virustotal.com/gui/search/" + enc(v) }
      ] };
    }
    if (/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(v)) {
      return { type: "DOMAIN", label: "Tên miền", links: [
        { n: "VirusTotal", u: "https://www.virustotal.com/gui/search/" + enc(v) },
        { n: "urlscan.io", u: "https://urlscan.io/search/#" + enc(v) },
        { n: "SSL Labs", u: "https://www.ssllabs.com/ssltest/analyze.html?d=" + enc(v) }
      ] };
    }
    return null;
  }

  function ipv4(v) {
    return { type: "IP", label: v.indexOf("/") > -1 ? "Dải IP / CIDR" : "Địa chỉ IPv4", links: [
      { n: "AbuseIPDB", u: "https://www.abuseipdb.com/check/" + enc(v.split("/")[0]) },
      { n: "VirusTotal", u: "https://www.virustotal.com/gui/search/" + enc(v) },
      { n: "GreyNoise", u: "https://viz.greynoise.io/query/?gnql=" + enc(v) }
    ] };
  }

  function hash(v, type) {
    return { type: type, label: "Hash " + type, links: [
      { n: "MalwareBazaar", u: "https://bazaar.abuse.ch/browse.php?search=" + enc(v) },
      { n: "VirusTotal", u: "https://www.virustotal.com/gui/search/" + enc(v) }
    ] };
  }

  function renderIOC() {
    var input = document.getElementById("iocInput");
    var out = document.getElementById("iocResult");
    if (!input || !out) return;
    var raw = input.value.trim();
    if (!raw) { out.innerHTML = '<p class="sec-muted">Nhập IP, tên miền, URL, email hoặc hash để nhận diện định dạng.</p>'; return; }
    var r = detectIOC(raw);
    if (!r) {
      out.innerHTML = '<p class="sec-bad">✕ Không nhận diện được định dạng. Thử IP (1.2.3.4),domain.com, https://... hoặc hash.</p>';
      return;
    }
    var links = r.links.map(function (l) {
      return '<a class="sec-link" href="' + l.u + '" target="_blank" rel="noopener noreferrer">' + esc(l.n) + ' ↗</a>';
    }).join("");
    out.innerHTML =
      '<div class="sec-result-head"><span class="sec-ok">✓ ' + esc(r.label) + '</span>' +
      '<span class="sec-chip">' + esc(r.type) + '</span></div>' +
      '<p class="sec-muted">Định dạng hợp lệ. Đối chiếu tại nguồn bên dưới — công cụ này không tự đưa ra đánh giá.</p>' +
      '<div class="sec-links">' + links + '</div>';
  }

  function finding(sev, title, detail) {
    return '<li class="sec-finding sec-finding--' + sev + '"><span class="sec-sev">' +
      (sev === "high" ? "CAO" : sev === "med" ? "TB" : "INFO") + '</span>' +
      '<span><strong>' + esc(title) + '</strong><small>' + esc(detail) + '</small></span></li>';
  }

  function renderScan() {
    var input = document.getElementById("scanInput");
    var out = document.getElementById("scanResult");
    if (!input || !out) return;
    var raw = input.value.trim();
    if (!raw) {
      out.innerHTML = '<p class="sec-muted">Nhập URL (có hoặc không có http://) để phân tích cấu trúc và bề mặt tấn công.</p>';
      return;
    }
    var full = /^https?:\/\//i.test(raw) ? raw : "http://" + raw;
    var u;
    try { u = new URL(full); } catch (e) {
      out.innerHTML = '<p class="sec-bad">✕ URL không hợp lệ.</p>'; return;
    }
    var host = u.hostname, qs = u.searchParams, params = [];
    qs.forEach(function (v, k) { params.push(k); });
    var findings = [];

    if (u.protocol === "http:") findings.push(finding("high", "Không dùng HTTPS", "Dữ liệu truyền dạng rõ, có thể bị nghe lén hoặc chỉnh sửa."));
    else findings.push(finding("info", "HTTPS đã bật", "Kênh truyền được mã hóa (cần kiểm tra thêm cấu hình TLS tại SSL Labs)."));

    if (u.username || u.password) findings.push(finding("high", "Thông tin đăng nhập trong URL", "user:pass@host dễ lộ trong log và lịch sử trình duyệt."));

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) findings.push(finding("med", "Host là địa chỉ IP", "Thường gặp trong staging — dễ bị quét trực tiếp."));

    if (u.port && !((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80"))) {
      findings.push(finding("med", "Cổng không chuẩn: " + u.port, "Kiểm tra dịch vụ đang chạy trên cổng này."));
    }

    var risky = params.filter(function (k) {
      return /(^|_)(id|file|path|page|url|redirect|next|cmd|exec|q|s|search|download|include|template|view|doc|target|callback)($|_)/i.test(k);
    });
    if (risky.length) findings.push(finding("med", "Tham số nhạy cảm: " + risky.slice(0, 6).join(", "), "Có thể là điểm injection hoặc mở chuyển hướng — cần test tay."));

    var decoded;
    try { decoded = decodeURIComponent(raw.replace(/\+/g, " ")); } catch (e) { decoded = raw; }
    var injection = /(%3c|%27|%22|\bor\b\s+\d+=\d+|union\s+select|\.\.\/|%2e%2e)/i.test(raw) || /(<\s*script|union\s+select|\.\.\/)/i.test(decoded);
    if (injection) findings.push(finding("high", "Dấu hiệu payload trong URL", "Chứa ký tự/classic pattern của XSS, SQLi hoặc path traversal."));

    if (raw.length > 2048) findings.push(finding("info", "URL rất dài", "Nên rút gọn để tránh giới hạn proxy/WAF."));

    if (!params.length) findings.push(finding("info", "Không có query parameter", "Bề mặt injection thấp hơn (chưa tính form/header/body)."));

    var manual =
      '<div class="sec-manual"><strong>Kiểm tra sâu (mở dịch vụ ngoài, có độ chính xác cao hơn):</strong>' +
      '<div class="sec-links">' +
      '<a class="sec-link" href="https://securityheaders.com/?q=' + enc(u.href) + '&followRedirects=on" target="_blank" rel="noopener noreferrer">SecurityHeaders ↗</a>' +
      '<a class="sec-link" href="https://www.ssllabs.com/ssltest/analyze.html?d=' + enc(host) + '" target="_blank" rel="noopener noreferrer">SSL Labs ↗</a>' +
      '<a class="sec-link" href="https://www.virustotal.com/gui/search/' + enc(u.href) + '" target="_blank" rel="noopener noreferrer">VirusTotal ↗</a>' +
      '<a class="sec-link" href="https://urlscan.io/search/#' + enc(host) + '" target="_blank" rel="noopener noreferrer">urlscan.io ↗</a>' +
      '</div></div>';

    out.innerHTML =
      '<div class="sec-result-head"><span class="sec-ok">✓ Đã phân tích ' + esc(host) + '</span>' +
      '<span class="sec-chip">' + findings.length + ' phát hiện</span></div>' +
      '<ul class="sec-findings">' + findings.join("") + '</ul>' + manual +
      '<p class="sec-disclaimer">Giới hạn: trình duyệt không đọc được response header cross-origin. ' +
      'Đây là phân tích cấu trúc URL, không phải quét lỗ hổng chủ động (active scan). ' +
      'Chỉ kiểm tra hệ thống bạn có quyền.</p>';
  }

  function init() {
    var iocBtn = document.getElementById("iocBtn");
    var iocInput = document.getElementById("iocInput");
    if (iocBtn) iocBtn.addEventListener("click", renderIOC);
    if (iocInput) iocInput.addEventListener("keydown", function (e) { if (e.key === "Enter") renderIOC(); });

    var scanBtn = document.getElementById("scanBtn");
    var scanInput = document.getElementById("scanInput");
    if (scanBtn) scanBtn.addEventListener("click", renderScan);
    if (scanInput) scanInput.addEventListener("keydown", function (e) { if (e.key === "Enter") renderScan(); });

    var toolCount = document.getElementById("secToolCount");
    if (toolCount) toolCount.textContent = document.querySelectorAll(".sec-tool-card").length + " công cụ";
  }

  window.DvaSecOps = { init: init };
})();
