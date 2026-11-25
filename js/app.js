/* Unified controller for DVA Systems web bundle */
(function () {
  var data = window.DVA_DATA || {};
  var langObj = window.LumenI18n.getCurrent();

  // Clock UTC+7
  var clockEl = document.getElementById("live-clock");
  function tickClock() {
    if (!clockEl) return;
    var now = new Date();
    var utc7 = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
    var hh = String(utc7.getHours()).padStart(2, "0");
    var mm = String(utc7.getMinutes()).padStart(2, "0");
    var ss = String(utc7.getSeconds()).padStart(2, "0");
    clockEl.textContent = hh + ":" + mm + ":" + ss + " UTC+7";
  }
  tickClock();
  setInterval(tickClock, 1000);

  // Telemetry counters
  var opensCount = 2;
  var interactionsCount = 15;
  var opensEl = document.getElementById("stat-opens");
  var interEl = document.getElementById("stat-interactions");
  function bumpInteractions(n) {
    interactionsCount += (n || 1);
    if (interEl) interEl.textContent = String(interactionsCount);
  }
  if (opensEl) opensEl.textContent = String(opensCount);
  if (interEl) interEl.textContent = String(interactionsCount);

  document.addEventListener("click", function (e) {
    if (e.target.closest("button, a, .dva-track-row")) {
      bumpInteractions(1);
    }
  });

  // Avatar & Channels render
  var avatarImg = document.getElementById("profile-avatar");
  if (avatarImg && data.avatarUrl) {
    var revealAvatar = function () {
      var wrap = avatarImg.closest(".pro-avatar");
      if (wrap) wrap.classList.add("is-loaded");
    };
    avatarImg.addEventListener("load", revealAvatar);
    avatarImg.addEventListener("error", revealAvatar);
    avatarImg.src = data.avatarUrl;
    if (avatarImg.complete) revealAvatar();
  }

  var channelListEl = document.getElementById("channel-list");
  function renderChannels(currentLang) {
    if (!channelListEl || !data.channels) return;
    channelListEl.innerHTML = "";
    data.channels.forEach(function (ch) {
      var row = document.createElement("div");
      row.className = "dva-channel-item" + (ch.featured ? " is-featured" : "");
      var subText = ch.subKey ? currentLang.t[ch.subKey] : ch.sub;
      row.innerHTML =
        "<div>" +
        '<div class="dva-channel-title">' +
        currentLang.t[ch.titleKey] +
        "</div>" +
        '<div class="dva-channel-sub">' +
        subText +
        "</div>" +
        "</div>" +
        '<a class="dva-channel-btn" href="' +
        ch.url +
        '" target="_blank" rel="noopener noreferrer">' +
        currentLang.t[ch.btnKey] +
        "</a>";
      channelListEl.appendChild(row);
    });
  }

  // Bots render
  var botGridEl = document.getElementById("bot-grid");
  function renderBots(currentLang) {
    if (!botGridEl || !data.bots) return;
    botGridEl.innerHTML = "";
    data.bots.forEach(function (bot) {
      var card = document.createElement("div");
      card.className = "dva-bot-card";
      card.innerHTML =
        '<div class="dva-bot-handle">' +
        bot.handle +
        "</div>" +
        '<div class="dva-bot-role">' +
        bot.role +
        "</div>" +
        '<p class="dva-bot-desc">' +
        currentLang.t[bot.descKey] +
        "</p>" +
        '<div class="dva-bot-actions">' +
        '<button type="button" class="dva-btn copy-bot-btn" data-handle="' +
        bot.handle +
        '">' +
        currentLang.t.copyUserBtn +
        "</button>" +
        '<a class="dva-bot-open" href="' +
        bot.url +
        '" target="_blank" rel="noopener noreferrer">' +
        currentLang.t.openBotBtn +
        "</a>" +
        "</div>";

      var copyBtn = card.querySelector(".copy-bot-btn");
      copyBtn.addEventListener("click", function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(bot.handle).catch(function () {});
        }
        copyBtn.textContent = currentLang.t.copiedBtn;
        setTimeout(function () {
          copyBtn.textContent = currentLang.t.copyUserBtn;
        }, 1200);
      });

      botGridEl.appendChild(card);
    });
  }

  // Audio player & playlist (#079 cover bloom + real HTMLAudioElement when audioUrl is provided)
  var tracks = data.tracks || [];
  var activeTrackIdx = 0;
  var audioEl = new Audio();
  audioEl.volume = 0.75;
  var isPlaying = false;

  var npCover = document.getElementById("np-cover");
  var npTitle = document.getElementById("np-title");
  var npMeta = document.getElementById("np-meta");
  var playBtn = document.getElementById("btn-play");
  var prevBtn = document.getElementById("btn-prev");
  var nextBtn = document.getElementById("btn-next");
  var seekRange = document.getElementById("seek-range");
  var volRange = document.getElementById("vol-range");
  var timeCurEl = document.getElementById("time-cur");
  var timeDurEl = document.getElementById("time-dur");
  var playlistEl = document.getElementById("playlist-box");
  var miniPlay = document.getElementById("spotifyMiniPlay");
  var miniArt = document.getElementById("spotifyMiniArt");
  var miniTitle = document.getElementById("spotifyMiniTitle");
  var miniArtist = document.getElementById("spotifyMiniArtist");
  var miniLabel = document.getElementById("spotifyMiniLabel");
  var miniStatus = "";

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function syncPlayerUI(currentLang) {
    var tr = tracks[activeTrackIdx] || tracks[0];
    if (!tr) return;
    if (npCover) npCover.src = tr.coverUrl;
    if (npTitle) npTitle.textContent = tr.title;
    if (npMeta) npMeta.textContent = tr.artist + " · " + tr.genre;
    if (playBtn) playBtn.textContent = isPlaying ? currentLang.t.pauseBtn : currentLang.t.playBtn;

    if (miniArt) miniArt.src = tr.coverUrl;
    if (miniTitle) miniTitle.textContent = tr.title;
    if (miniArtist) miniArtist.textContent = tr.artist + " · " + tr.genre;
    if (miniLabel) miniLabel.textContent = miniStatus || (isPlaying ? "DVA · PLAYING" : (tr.audioUrl ? "DVA · AUDIO" : "DVA · NO AUDIO LINK"));
    if (miniPlay) miniPlay.textContent = isPlaying ? "❚❚" : "▶";

    if (playlistEl) {
      playlistEl.innerHTML = "";
      tracks.forEach(function (item, idx) {
        var row = document.createElement("div");
        row.className = "dva-track-row" + (idx === activeTrackIdx ? " is-active" : "");
        var statusTag = item.audioUrl ? currentLang.t.hasAudioLink : currentLang.t.noAudioLink;
        row.innerHTML =
          '<div class="dva-track-left">' +
          '<img class="dva-track-thumb" src="' +
          item.coverUrl +
          '" alt="' +
          item.title +
          '" />' +
          "<span>" +
          (idx + 1) +
          ". " +
          item.title +
          " — " +
          item.artist +
          "</span>" +
          "</div>" +
          '<span class="dva-track-right">' +
          item.genre +
          " · " +
          statusTag +
          "</span>";
        row.addEventListener("click", function () {
          selectTrack(idx, true);
        });
        playlistEl.appendChild(row);
      });
    }
  }

  function selectTrack(idx, autoPlay) {
    activeTrackIdx = (idx + tracks.length) % tracks.length;
    var tr = tracks[activeTrackIdx];
    var curLang = window.LumenI18n.getCurrent();
    miniStatus = "";
    if (tr && tr.audioUrl) {
      audioEl.src = tr.audioUrl;
      if (autoPlay) {
        audioEl.play().then(function () {
          isPlaying = true;
          syncPlayerUI(curLang);
        }).catch(function () {
          isPlaying = false;
          syncPlayerUI(curLang);
        });
        return;
      }
    } else {
      audioEl.removeAttribute("src");
      isPlaying = false;
    }
    syncPlayerUI(curLang);
  }

  if (playBtn) {
    playBtn.addEventListener("click", function () {
      var tr = tracks[activeTrackIdx];
      var curLang = window.LumenI18n.getCurrent();
      if (!tr || !tr.audioUrl) {
        isPlaying = !isPlaying;
        syncPlayerUI(curLang);
        return;
      }
      if (audioEl.paused) {
        audioEl.play().then(function () {
          isPlaying = true;
          syncPlayerUI(curLang);
        }).catch(function () {});
      } else {
        audioEl.pause();
        isPlaying = false;
        syncPlayerUI(curLang);
      }
    });
  }

  if (miniPlay) {
    miniPlay.addEventListener("click", function () {
      var tr = tracks[activeTrackIdx];
      var curLang = window.LumenI18n.getCurrent();
      if (!tr || !tr.audioUrl) {
        miniStatus = "DVA · THÊM audioUrl TRONG mediaConfig.js";
        syncPlayerUI(curLang);
        return;
      }
      if (audioEl.paused) {
        if (!audioEl.getAttribute("src")) audioEl.src = tr.audioUrl;
        miniStatus = "DVA · ĐANG TẢI…";
        syncPlayerUI(curLang);
        audioEl.play().then(function () {
          isPlaying = true;
          miniStatus = "DVA · PLAYING";
          syncPlayerUI(curLang);
        }).catch(function () {
          isPlaying = false;
          miniStatus = "DVA · KHÔNG PHÁT ĐƯỢC";
          syncPlayerUI(curLang);
        });
      } else {
        audioEl.pause();
        isPlaying = false;
        miniStatus = "DVA · PAUSED";
        syncPlayerUI(curLang);
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      selectTrack(activeTrackIdx - 1, isPlaying);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      selectTrack(activeTrackIdx + 1, isPlaying);
    });
  }

  if (volRange) {
    volRange.addEventListener("input", function () {
      audioEl.volume = Number(volRange.value) / 100;
    });
  }

  if (seekRange) {
    seekRange.addEventListener("input", function () {
      if (isFinite(audioEl.duration) && audioEl.duration > 0) {
        audioEl.currentTime = (Number(seekRange.value) / 100) * audioEl.duration;
      }
    });
  }

  audioEl.addEventListener("timeupdate", function () {
    if (timeCurEl) timeCurEl.textContent = fmtTime(audioEl.currentTime);
    if (timeDurEl) timeDurEl.textContent = fmtTime(audioEl.duration);
    if (seekRange && isFinite(audioEl.duration) && audioEl.duration > 0) {
      seekRange.value = String(Math.round((audioEl.currentTime / audioEl.duration) * 100));
    }
  });

  audioEl.addEventListener("ended", function () {
    selectTrack(activeTrackIdx + 1, true);
  });

  audioEl.addEventListener("error", function () {
    isPlaying = false;
    miniStatus = "DVA · LINK NHẠC LỖI";
    syncPlayerUI(window.LumenI18n.getCurrent());
  });

  // Sound FX toggle (Web Audio subtle tick)
  var soundBtn = document.getElementById("sound-toggle-btn");
  var soundEnabled = true;
  if (soundBtn) {
    soundBtn.addEventListener("click", function () {
      soundEnabled = !soundEnabled;
      var curLang = window.LumenI18n.getCurrent();
      var span = soundBtn.querySelector("[data-i18n] .u267-sw > span");
      if (span) span.textContent = soundEnabled ? curLang.t.soundOn : curLang.t.soundOff;
    });
  }

  // Interactive Terminal
  var termScreen = document.getElementById("term-screen");
  var termInput = document.getElementById("term-input");
  var termRunBtn = document.getElementById("term-run-btn");
  var cmdChips = document.querySelectorAll(".dva-cmd-chip");

  function appendTerm(text) {
    if (!termScreen) return;
    termScreen.textContent += (termScreen.textContent ? "\n" : "") + text;
    termScreen.scrollTop = termScreen.scrollHeight;
  }

  function runCommand(rawCmd) {
    var cmd = (rawCmd || "").trim().toLowerCase();
    if (!cmd) return;
    appendTerm("$ " + cmd);
    if (cmd === "help") {
      appendTerm("Commands: help, whoami, stack, bots, zalo, theme, roll, clear");
    } else if (cmd === "whoami") {
      appendTerm("dvamod2k15 — Web engineering, pentest & redteam tooling");
    } else if (cmd === "stack") {
      appendTerm("Python · PHP · JavaScript · HTML/CSS · SQL · Bash | Nmap, Burp Suite, Nuclei, SQLmap, Metasploit");
    } else if (cmd === "bots") {
      appendTerm("@grtqscanner_bot (Mini Vulnerability Scanner) | @giarequocte_bot (Digital Accounts & Tools)");
    } else if (cmd === "zalo") {
      appendTerm("Zalo / Telegram: https://t.me/dvamod2k15");
    } else if (cmd === "theme") {
      var tBtn = document.getElementById("theme-toggle-btn");
      if (tBtn) tBtn.click();
      appendTerm("Toggled light/dark theme.");
    } else if (cmd === "roll") {
      appendTerm("Rolled: #" + Math.floor(100 + Math.random() * 900));
    } else if (cmd === "clear") {
      if (termScreen) termScreen.textContent = "";
    } else {
      appendTerm("Unknown command '" + cmd + "'. Type 'help'.");
    }
  }

  cmdChips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var c = chip.getAttribute("data-cmd");
      if (termInput) termInput.value = c;
      runCommand(c);
    });
  });

  if (termRunBtn) {
    termRunBtn.addEventListener("click", function () {
      runCommand(termInput ? termInput.value : "");
      if (termInput) termInput.value = "";
    });
  }

  if (termInput) {
    termInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        runCommand(termInput.value);
        termInput.value = "";
      }
    });
  }

  // Tabs & Dock navigation
  var tabs = document.querySelectorAll(".dva-tab");
  var sections = document.querySelectorAll("[data-sec]");
  function setActiveTab(tabName) {
    tabs.forEach(function (t) {
      var active = t.getAttribute("data-tab") === tabName;
      t.setAttribute("aria-selected", String(active));
    });
    sections.forEach(function (sec) {
      var secTags = (sec.getAttribute("data-sec") || "").split(",");
      if (tabName === "overview") {
        sec.hidden = false;
      } else {
        sec.hidden = secTags.indexOf(tabName) < 0;
      }
    });
    if (tabName === "map" && window.DvaWorldMap && !window.__dvaMapReady) {
      window.__dvaMapReady = window.DvaWorldMap.init();
    }
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      setActiveTab(t.getAttribute("data-tab"));
    });
  });

  var dockPrev = document.getElementById("dock-prev");
  var dockNext = document.getElementById("dock-next");
  var dockMenu = document.getElementById("dock-menu");
  var dockCopy = document.getElementById("dock-copy");
  var tabOrder = ["overview", "profile", "bots", "activity", "terminal", "map", "security", "scam"];
  var tabIdx = 0;

  if (dockPrev) {
    dockPrev.addEventListener("click", function () {
      tabIdx = (tabIdx - 1 + tabOrder.length) % tabOrder.length;
      setActiveTab(tabOrder[tabIdx]);
    });
  }
  if (dockNext) {
    dockNext.addEventListener("click", function () {
      tabIdx = (tabIdx + 1) % tabOrder.length;
      setActiveTab(tabOrder[tabIdx]);
    });
  }
  if (dockMenu) {
    dockMenu.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  if (dockCopy) {
    dockCopy.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).catch(function () {});
      }
    });
  }

  // Attach #079 Skeleton bloom to major cards
  var bloomControllers = [];
  document.querySelectorAll("[data-bloom-card]").forEach(function (card) {
    var btn = card.querySelector("[data-bloom-trigger]");
    var ctrl = window.LumenSkeleton079.attachBloom(card, btn);
    if (ctrl) {
      bloomControllers.push(ctrl);
      ctrl.bloom();
    }
  });

  // Initialize I18n, Theme, and Search
  window.LumenI18n.init();
  window.LumenTheme219.init();
  if (window.DvaSecOps) window.DvaSecOps.init();
  if (window.DvaScamRadar) window.DvaScamRadar.init();

  function refreshDynamic(cur) {
    renderChannels(cur);
    renderBots(cur);
    syncPlayerUI(cur);
    if (termScreen && !termScreen.textContent) {
      termScreen.textContent = cur.t.shellReady;
    }
  }

  refreshDynamic(langObj);

  window.LumenI18n.onChange(function (nextLang) {
    refreshDynamic(nextLang);
    bloomControllers.forEach(function (c) {
      c.bloom();
    });
  });

  function searchLoading(label, done) {
    var old = document.getElementById("dvaSearchLoading");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var box = document.createElement("div");
    box.id = "dvaSearchLoading";
    box.className = "dva-boot";
    box.setAttribute("aria-hidden", "false");
    box.innerHTML = '<div class="dva-boot-box"><div class="dva-boot-top"><span class="dva-boot-dot"></span><span class="dva-boot-host">dvamod.top</span></div><div class="dva-boot-cmd">ĐANG MỞ · ' +
      String(label || "").replace(/[<>&]/g, "") + '</div><div class="dva-boot-track"><div class="dva-boot-fill" id="dvaSearchBar"></div></div></div>';
    document.body.appendChild(box);
    var bar = document.getElementById("dvaSearchBar");
    var pct = 8;
    var timer = setInterval(function () {
      pct = Math.min(92, pct + 14);
      if (bar) bar.style.width = pct + "%";
    }, 70);
    setTimeout(function () {
      clearInterval(timer);
      if (bar) bar.style.width = "100%";
      done();
      setTimeout(function () {
        box.classList.add("is-hide");
        setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 380);
      }, 180);
    }, 620);
  }

  window.LumenSearch027.init(document.getElementById("search-widget"), function (chosen) {
    if (!chosen || !chosen.target) return;
    var mappedTab = chosen.target === "music" ? "overview" : chosen.target;
    searchLoading(chosen.title, function () {
      setActiveTab(mappedTab);
    });
  });

  function splitLetters(el) {
    if (!el || el.getAttribute("data-letterized")) return;
    el.setAttribute("data-letterized", "1");
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);
    var order = 0;
    nodes.forEach(function (n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return;
      var frag = document.createDocumentFragment();
      for (var i = 0; i < n.nodeValue.length; i++) {
        var s = document.createElement("span");
        s.className = "dva-letter";
        s.style.setProperty("--i", order++);
        s.textContent = n.nodeValue.charAt(i);
        frag.appendChild(s);
      }
      n.parentNode.replaceChild(frag, n);
    });
  }

  function startReveal() {
    if (document.body.classList.contains("is-revealed")) return;
    document.body.classList.add("is-revealed");
    document.querySelectorAll("[data-reveal]").forEach(splitLetters);
  }

  window.DVAMOD_REVEAL = startReveal;
  document.addEventListener("dvamod:loaded", startReveal);
})();
