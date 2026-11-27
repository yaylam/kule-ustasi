// Reklam katmanı: Capacitor AdMob eklentisi varsa gerçek reklam, yoksa (tarayıcıda) sessizce atlar.
(function () {
  // === REKLAM KİMLİKLERİ ===
  // AdMob hesabı: pub-8647614182701788 (Kule Ustası Android ~5883206359, iOS ~1207970889)
  var CONFIG = {
    testing: false,
    android: {
      banner: 'ca-app-pub-8647614182701788/4432900021',
      interstitial: 'ca-app-pub-8647614182701788/7990494949',
      rewarded: 'ca-app-pub-8647614182701788/9332717967'
    },
    ios: {
      banner: 'ca-app-pub-8647614182701788/3386256710',
      interstitial: 'ca-app-pub-8647614182701788/6190328112',
      rewarded: 'ca-app-pub-8647614182701788/8044841975'
    },
    interstitialEvery: 3,          // her 3 oyun sonunda bir geçiş reklamı
    minSecondsBetweenInterstitial: 60
  };

  var cap = window.Capacitor;
  var AdMob = cap && cap.Plugins && cap.Plugins.AdMob;
  var native = !!(AdMob && cap.isNativePlatform && cap.isNativePlatform());
  var platform = native ? cap.getPlatform() : 'web';
  var ids = platform === 'ios' ? CONFIG.ios : CONFIG.android;

  var privacyRequired = false;
  var interReady = false, rewardReady = false, lastInter = 0, gamesOver = 0;

  function prepInter() {
    if (!native) return;
    AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting: CONFIG.testing })
      .then(function () { interReady = true; })
      .catch(function () { interReady = false; setTimeout(prepInter, 30000); });
  }
  function prepReward() {
    if (!native) return;
    AdMob.prepareRewardVideoAd({ adId: ids.rewarded, isTesting: CONFIG.testing })
      .then(function () { rewardReady = true; })
      .catch(function () { rewardReady = false; setTimeout(prepReward, 30000); });
  }

  function setBannerSpace(h) {
    document.documentElement.style.setProperty('--banner', (h || 0) + 'px');
    if (window.onBannerSpace) window.onBannerSpace(h || 0);
  }

  async function init() {
    if (!native) return;
    try {
      if (platform === 'ios') {
        try {
          var st = await AdMob.trackingAuthorizationStatus();
          if (st.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
        } catch (e) {}
      }
      await AdMob.initialize({ initializeForTesting: CONFIG.testing });
      // AB/İngiltere kullanıcıları için izin formu (GDPR)
      try {
        var ci = await AdMob.requestConsentInfo();
        if (ci.isConsentFormAvailable && ci.status === 'REQUIRED') ci = await AdMob.showConsentForm();
        if (ci && ci.privacyOptionsRequirementStatus === 'REQUIRED') {
          privacyRequired = true;
          if (window.onPrivacyOptions) window.onPrivacyOptions();
        }
      } catch (e) {}

      AdMob.addListener('bannerAdSizeChanged', function (s) { setBannerSpace(s && s.height); });
      await AdMob.showBanner({
        adId: ids.banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: CONFIG.testing
      });
    } catch (e) { console.log('ads init', e); }
    prepInter();
    prepReward();
  }

  window.Ads = {
    native: native,
    privacyOptionsRequired: function () { return privacyRequired; },
    showPrivacyOptions: function () { return native ? AdMob.showPrivacyOptionsForm().catch(function () {}) : Promise.resolve(); },
    // Oyun bittiğinde çağrılır; uygun zamansa geçiş reklamı gösterir
    onGameOver: function () {
      gamesOver++;
      if (!native || !interReady) return Promise.resolve();
      var now = Date.now() / 1000;
      if (gamesOver % CONFIG.interstitialEvery !== 0) return Promise.resolve();
      if (now - lastInter < CONFIG.minSecondsBetweenInterstitial) return Promise.resolve();
      interReady = false; lastInter = now;
      return AdMob.showInterstitial().catch(function () {}).then(function () { prepInter(); });
    },
    rewardAvailable: function () { return native ? rewardReady : true; },
    // Ödüllü reklam: izlenirse true döner
    showRewarded: function () {
      if (!native) return new Promise(function (r) { setTimeout(function () { r(true); }, 600); });
      if (!rewardReady) return Promise.resolve(false);
      rewardReady = false;
      return new Promise(function (resolve) {
        var rewarded = false, subs = [];
        function done() {
          subs.forEach(function (p) { Promise.resolve(p).then(function (h) { h && h.remove && h.remove(); }); });
          lastInter = Date.now() / 1000; // ödüllüden hemen sonra geçiş reklamı çıkmasın
          prepReward();
          resolve(rewarded);
        }
        subs.push(AdMob.addListener('onRewardedVideoAdReward', function () { rewarded = true; }));
        subs.push(AdMob.addListener('onRewardedVideoAdDismissed', done));
        subs.push(AdMob.addListener('onRewardedVideoAdFailedToShow', done));
        AdMob.showRewardVideoAd().catch(function () { done(); });
      });
    }
  };

  if (native) setTimeout(init, 0);
})();
