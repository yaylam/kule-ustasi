(function () {
  'use strict';

  // ---------- Dil ----------
  var T = {
    tr: { title: 'KULE USTASI', tagline: 'Blokları üst üste diz, en yükseğe çık!', best: 'En iyi', tapToStart: 'Başlamak için dokun',
      score: 'Skor', newBest: 'YENİ REKOR!', continue: '▶ Devam Et', watchAd: 'Kısa bir video izle', playAgain: 'Tekrar Oyna',
      share: 'Paylaş', privacy: 'Gizlilik Politikası', adPrivacy: 'Reklam tercihleri', perfect: 'Mükemmel!',
      shareText: 'Kule Ustası\'nda {n} kat çıktım! Sen kaç kat çıkabilirsin?' },
    en: { title: 'TOWER MASTER', tagline: 'Stack the blocks, reach the sky!', best: 'Best', tapToStart: 'Tap to start',
      score: 'Score', newBest: 'NEW BEST!', continue: '▶ Continue', watchAd: 'Watch a short video', playAgain: 'Play Again',
      share: 'Share', privacy: 'Privacy Policy', adPrivacy: 'Ad choices', perfect: 'Perfect!',
      shareText: 'I stacked {n} blocks in Tower Master! How high can you go?' }
  };
  var lang = (navigator.language || 'tr').toLowerCase().indexOf('tr') === 0 ? 'tr' : 'en';
  var L = T[lang];
  document.documentElement.lang = lang;
  document.title = L.title.charAt(0) + L.title.slice(1).toLowerCase();
  document.querySelectorAll('[data-t]').forEach(function (el) { el.textContent = L[el.getAttribute('data-t')]; });

  // ---------- Kayıt ----------
  function load(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var best = load('ku_best', 0);
  var soundOn = load('ku_sound', true);

  // ---------- Ekran ----------
  var cv = document.getElementById('c'), ctx = cv.getContext('2d');
  var W = 0, H = 0, DPR = 1, S = 1, bannerH = 0;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 3);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    S = Math.min(W, H * 0.62) * 0.5 / 17.32;
  }
  window.addEventListener('resize', resize);
  window.onBannerSpace = function (h) { bannerH = h; };
  resize();

  // ---------- Ses ----------
  var ac = null;
  function tone(freq, dur, type, vol) {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.15, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
    } catch (e) {}
  }
  function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
  var soundBtn = document.getElementById('soundBtn');
  function drawSoundBtn() { soundBtn.textContent = soundOn ? '🔊' : '🔇'; }
  drawSoundBtn();
  soundBtn.addEventListener('click', function (e) { e.stopPropagation(); soundOn = !soundOn; save('ku_sound', soundOn); drawSoundBtn(); });

  // ---------- Oyun durumu ----------
  var BH = 2, SIZE = 10, RANGE = 12, TOL = 0.3;
  var stack, cur, debris, rings, score, combo, state, camY, camYT, zoom, zoomT, hue0, usedContinue, t0;

  function newGame() {
    hue0 = Math.floor(Math.random() * 360);
    stack = [{ x0: -SIZE / 2, x1: SIZE / 2, z0: -SIZE / 2, z1: SIZE / 2, y: -BH * 6, h: BH * 6, hue: hue0 }];
    debris = []; rings = []; score = 0; combo = 0; usedContinue = false;
    camY = camYT = 0; zoom = zoomT = 1;
    spawn();
  }
  function top() { return stack[stack.length - 1]; }
  function topY() { var t = top(); return t.y + t.h; }

  function spawn() {
    var t = top();
    var axis = stack.length % 2 === 0 ? 'x' : 'z';
    cur = { x0: t.x0, x1: t.x1, z0: t.z0, z1: t.z1, y: topY(), h: BH, hue: (hue0 + stack.length * 7) % 360,
      axis: axis, off: -RANGE, dir: 1, speed: Math.min(14 + score * 0.35, 30) };
    if (Math.random() < 0.5) { cur.off = RANGE; cur.dir = -1; }
    applyOff();
    camYT = Math.max(0, topY() - BH * 3);
  }
  function applyOff() {
    var t = top();
    if (cur.axis === 'x') { cur.x0 = t.x0 + cur.off; cur.x1 = t.x1 + cur.off; }
    else { cur.z0 = t.z0 + cur.off; cur.z1 = t.z1 + cur.off; }
  }

  function place() {
    var t = top(), a0, a1, b0, b1, k0 = cur.axis + '0', k1 = cur.axis + '1';
    a0 = t[k0]; a1 = t[k1]; b0 = cur[k0]; b1 = cur[k1];
    var ov = Math.min(a1, b1) - Math.max(a0, b0);
    if (ov <= 0) {
      debris.push(fall(cur, cur.axis, cur.dir));
      cur = null; gameOver(); return;
    }
    var placed = copy(cur);
    if (Math.abs(b0 - a0) < TOL) {
      placed[k0] = a0; placed[k1] = a1;
      combo++;
      if (combo >= 3) { // ardışık mükemmellerde blok biraz büyür
        var grow = 0.5, len = placed[k1] - placed[k0];
        if (len + grow <= SIZE) { placed[k0] -= grow / 2; placed[k1] += grow / 2; }
      }
      rings.push({ b: copy(placed), t: 0 });
      tone(440 * Math.pow(2, Math.min(combo, 12) / 12), 0.25, 'triangle', 0.18);
      buzz(15);
      showCombo();
    } else {
      combo = 0;
      placed[k0] = Math.max(a0, b0); placed[k1] = Math.min(a1, b1);
      var piece = copy(cur);
      if (b0 < a0) { piece[k1] = a0; } else { piece[k0] = a1; }
      debris.push(fall(piece, cur.axis, b0 < a0 ? -1 : 1));
      tone(220 + Math.random() * 40, 0.12, 'square', 0.06);
      buzz(8);
    }
    stack.push(placed);
    score++;
    updateScore();
    spawn();
  }
  function copy(b) { return { x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, y: b.y, h: b.h, hue: b.hue }; }
  function fall(b, axis, dir) {
    var d = copy(b); d.vy = 0; d.vx = axis === 'x' ? dir * 3 : 0; d.vz = axis === 'z' ? dir * 3 : 0; d.a = 1; return d;
  }

  // ---------- Arayüz ----------
  var $ = function (id) { return document.getElementById(id); };
  var elScore = $('score'), elCombo = $('combo'), menu = $('menu'), over = $('over');
  $('bestMenu').textContent = best;
  var comboTimer;
  function showCombo() {
    elCombo.textContent = L.perfect + (combo > 1 ? ' x' + combo : '');
    elCombo.style.opacity = 1;
    clearTimeout(comboTimer);
    comboTimer = setTimeout(function () { elCombo.style.opacity = 0; }, 900);
  }
  function updateScore() { elScore.textContent = score; }

  function start() {
    if (state === 'play') return;
    newGame();
    state = 'play';
    menu.classList.add('hidden'); over.classList.add('hidden');
    elScore.classList.remove('hidden'); updateScore();
    tone(523, 0.12, 'triangle', 0.12);
  }

  function gameOver() {
    state = 'over';
    tone(150, 0.4, 'sawtooth', 0.08); buzz(60);
    // tüm kuleyi göstermek için uzaklaş
    var hgt = topY() + BH * 6;
    var need = (hgt * S + 17.32 * S) / (H * 0.6);
    zoomT = need > 1 ? 1 / need : 1;
    camYT = topY() / 2 - BH * 2;
    var isNew = score > best;
    if (isNew) { best = score; save('ku_best', best); }
    setTimeout(function () {
      if (state !== 'over') return;
      $('finalScore').textContent = score;
      $('bestOver').textContent = best; $('bestMenu').textContent = best;
      $('newBest').classList.toggle('hidden', !isNew || score === 0);
      $('continueBtn').classList.toggle('hidden', usedContinue || score < 3 || !Ads.rewardAvailable());
      $('shareBtn').classList.toggle('hidden', !canShare());
      elScore.classList.add('hidden');
      over.classList.remove('hidden');
    }, 900);
  }

  $('againBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    over.classList.add('hidden');
    Ads.onGameOver().then(function () { state = 'menu'; start(); });
  });
  $('continueBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    var btn = this; btn.disabled = true;
    Ads.showRewarded().then(function (ok) {
      btn.disabled = false;
      if (!ok) return;
      usedContinue = true;
      over.classList.add('hidden'); elScore.classList.remove('hidden');
      zoomT = 1; combo = 0;
      state = 'play';
      spawn();
    });
  });
  function canShare() {
    var P = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Share;
    return !!(P || navigator.share);
  }
  $('shareBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    var text = L.shareText.replace('{n}', score);
    var url = 'https://play.google.com/store/apps/details?id=com.kuleustasi.app';
    var P = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Share;
    if (P) P.share({ title: document.title, text: text, url: url }).catch(function () {});
    else if (navigator.share) navigator.share({ title: document.title, text: text, url: url }).catch(function () {});
  });
  $('privacy').addEventListener('click', function (e) { e.stopPropagation(); });
  $('adPriv').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); Ads.showPrivacyOptions(); });
  window.onPrivacyOptions = function () { $('adPrivWrap').classList.remove('hidden'); };
  if (Ads.privacyOptionsRequired()) window.onPrivacyOptions();

  function onTap(e) {
    if (e.target.closest && e.target.closest('button,a')) return;
    e.preventDefault();
    if (state === 'menu') start();
    else if (state === 'play' && cur) place();
  }
  window.addEventListener('pointerdown', onTap, { passive: false });
  window.addEventListener('keydown', function (e) { if (e.code === 'Space' || e.code === 'Enter') onTap(e); });

  // ---------- Çizim ----------
  function proj(x, y, z) {
    var cx = W / 2, cy = (H - bannerH) * 0.58;
    var s = S * zoom;
    return [cx + (x - z) * 0.866 * s, cy + ((x + z) * 0.5 - (y - camY)) * s];
  }
  function hsl(h, s, l, a) { return 'hsla(' + h + ',' + s + '%,' + l + '%,' + (a === undefined ? 1 : a) + ')'; }
  function poly(pts, fill) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function box(b, alpha) {
    var y0 = b.y, y1 = b.y + b.h, a = alpha === undefined ? 1 : alpha;
    var A = proj(b.x0, y1, b.z0), B = proj(b.x1, y1, b.z0), C = proj(b.x1, y1, b.z1), D = proj(b.x0, y1, b.z1);
    var Cb = proj(b.x1, y0, b.z1), Db = proj(b.x0, y0, b.z1), Bb = proj(b.x1, y0, b.z0);
    poly([D, C, Cb, Db], hsl(b.hue, 55, 52, a));   // ön-sol yüz (z1)
    poly([C, B, Bb, Cb], hsl(b.hue, 55, 40, a));   // ön-sağ yüz (x1)
    poly([A, B, C, D], hsl(b.hue, 65, 66, a));     // üst yüz
  }

  function drawBg() {
    var h = (hue0 + topY() * 2) % 360;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, hsl(h, 45, 26)); g.addColorStop(1, hsl((h + 40) % 360, 45, 14));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05); last = now;

    if (state === 'play' && cur) {
      cur.off += cur.dir * cur.speed * dt;
      if (cur.off > RANGE) { cur.off = RANGE; cur.dir = -1; }
      if (cur.off < -RANGE) { cur.off = -RANGE; cur.dir = 1; }
      applyOff();
    }
    if (state === 'menu') { camYT = 0; }
    camY += (camYT - camY) * Math.min(1, dt * 5);
    zoom += (zoomT - zoom) * Math.min(1, dt * 3);

    for (var i = debris.length - 1; i >= 0; i--) {
      var d = debris[i];
      d.vy -= 60 * dt; d.y += d.vy * dt;
      d.x0 += d.vx * dt; d.x1 += d.vx * dt; d.z0 += d.vz * dt; d.z1 += d.vz * dt;
      d.a -= dt * 0.6;
      if (d.a <= 0 || d.y < camY - 80) debris.splice(i, 1);
    }

    drawBg();
    var tc = top(), tcx = (tc.x0 + tc.x1 + tc.z0 + tc.z1) / 2;
    function front(d) { return (d.x0 + d.x1 + d.z0 + d.z1) / 2 > tcx; }
    debris.forEach(function (d) { if (!front(d)) box(d, Math.max(0, d.a)); });
    var minY = camY - 60 / zoom;
    for (var j = 0; j < stack.length; j++) if (stack[j].y + stack[j].h > minY) box(stack[j]);
    for (var r = rings.length - 1; r >= 0; r--) {
      var rg = rings[r]; rg.t += dt;
      if (rg.t > 0.5) { rings.splice(r, 1); continue; }
      var e = rg.t * 3, b = rg.b, y = b.y + b.h;
      var p = [proj(b.x0 - e, y, b.z0 - e), proj(b.x1 + e, y, b.z0 - e), proj(b.x1 + e, y, b.z1 + e), proj(b.x0 - e, y, b.z1 + e)];
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (var q = 1; q < 4; q++) ctx.lineTo(p[q][0], p[q][1]); ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - rg.t * 2) + ')'; ctx.lineWidth = 3; ctx.stroke();
    }
    if (cur && state === 'play') box(cur);
    debris.forEach(function (d) { if (front(d)) box(d, Math.max(0, d.a)); });

    requestAnimationFrame(frame);
  }

  window.__kule = { get cur() { return cur; }, get state() { return state; } };
  newGame();
  state = 'menu';
  requestAnimationFrame(frame);
})();
