// ===== Cookie consent =====
(function cookieConsent() {
  var banner = document.getElementById('cookie-banner');
  if (!banner) return;
  var stored = localStorage.getItem('cookie-consent');
  if (!stored) banner.classList.add('show');

  document.getElementById('cookie-accept').addEventListener('click', function () {
    localStorage.setItem('cookie-consent', 'accepted');
    banner.classList.remove('show');
  });
  document.getElementById('cookie-decline').addEventListener('click', function () {
    localStorage.setItem('cookie-consent', 'declined');
    banner.classList.remove('show');
  });
})();

// ===== TikTok carousel =====
(function tiktokCarousel() {
  var track = document.getElementById('tiktok-grid');
  var prevBtn = document.querySelector('.tiktok-nav-prev');
  var nextBtn = document.querySelector('.tiktok-nav-next');
  if (!track || !prevBtn || !nextBtn) return;

  var items = track.querySelectorAll('.tiktok-item');
  if (!items.length) return;

  function currentIndex() {
    var trackEdge = track.getBoundingClientRect().right;
    var closest = 0;
    var closestDist = Infinity;
    Array.prototype.forEach.call(items, function (item, i) {
      var dist = Math.abs(item.getBoundingClientRect().right - trackEdge);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    return closest;
  }

  function goTo(index) {
    var wrapped = ((index % items.length) + items.length) % items.length;
    items[wrapped].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }

  prevBtn.addEventListener('click', function () { goTo(currentIndex() - 1); });
  nextBtn.addEventListener('click', function () { goTo(currentIndex() + 1); });

  // Stop every video except the one currently in view by reloading its iframe
  // (cross-origin TikTok embeds expose no pause API, so a reload is the only way in).
  function stopItem(item) {
    var frame = item.querySelector('iframe');
    if (!frame || !frame.src) return;
    var src = frame.src;
    frame.src = 'about:blank';
    setTimeout(function () { frame.src = src; }, 50);
  }

  var lastActive = currentIndex();
  var activeTimer = null;
  track.addEventListener('scroll', function () {
    clearTimeout(activeTimer);
    activeTimer = setTimeout(function () {
      var idx = currentIndex();
      if (idx !== lastActive) {
        Array.prototype.forEach.call(items, function (item, i) {
          if (i !== idx) stopItem(item);
        });
        lastActive = idx;
      }
    }, 300);
  });

  // Reaching the last video and pausing there loops back to the first, carousel-style.
  var dwellTimer = null;
  track.addEventListener('scroll', function () {
    clearTimeout(dwellTimer);
    dwellTimer = setTimeout(function () {
      if (currentIndex() === items.length - 1) goTo(0);
    }, 1800);
  });
})();

// ===== Accessibility widget =====
(function a11yWidget() {
  var toggle = document.getElementById('a11y-toggle');
  var panel = document.getElementById('a11y-panel');
  if (!toggle || !panel) return;

  var html = document.documentElement;
  var FS_CLASSES = ['a11y-fs-1', 'a11y-fs-2', 'a11y-fs-3'];

  function applyState(state) {
    FS_CLASSES.forEach(function (c) { html.classList.remove(c); });
    if (state.fs > 0) html.classList.add(FS_CLASSES[state.fs - 1]);
    html.classList.toggle('a11y-contrast', !!state.contrast);
    html.classList.toggle('a11y-underline', !!state.underline);
  }

  function getState() {
    try {
      return JSON.parse(localStorage.getItem('a11y-state')) || { fs: 0, contrast: false, underline: false };
    } catch (e) {
      return { fs: 0, contrast: false, underline: false };
    }
  }
  function saveState(state) {
    localStorage.setItem('a11y-state', JSON.stringify(state));
  }

  var state = getState();
  applyState(state);

  toggle.addEventListener('click', function () {
    var isOpen = panel.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.getElementById('a11y-fs-inc').addEventListener('click', function () {
    state.fs = Math.min(3, state.fs + 1);
    applyState(state); saveState(state);
  });
  document.getElementById('a11y-fs-dec').addEventListener('click', function () {
    state.fs = Math.max(0, state.fs - 1);
    applyState(state); saveState(state);
  });
  document.getElementById('a11y-contrast').addEventListener('click', function () {
    state.contrast = !state.contrast;
    applyState(state); saveState(state);
  });
  document.getElementById('a11y-underline').addEventListener('click', function () {
    state.underline = !state.underline;
    applyState(state); saveState(state);
  });
  document.getElementById('a11y-reset').addEventListener('click', function () {
    state = { fs: 0, contrast: false, underline: false };
    applyState(state); saveState(state);
  });

  document.addEventListener('click', function (e) {
    if (!panel.contains(e.target) && e.target !== toggle && panel.classList.contains('open')) {
      panel.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();

// ===== Lead form submission (Formspree) =====
(function leadForm() {
  var form = document.getElementById('lead-form');
  if (!form) return;
  var SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwt-mMdDo6fA___Mh57M8085t2bFPiiVpoKhq3j22hNyhqUybEKMp2t9X5RFm6PwlXa3g/exec';
  var status = document.getElementById('form-status');
  var submitBtn = form.querySelector('button[type="submit"]');
  var goalError = document.getElementById('goal-error');
  var goalChecks = form.querySelectorAll('input[name="מטרה"]');
  var goalMultiselect = document.getElementById('goal-multiselect');
  var goalToggle = document.getElementById('goal-toggle');
  var goalToggleLabel = document.getElementById('goal-toggle-label');

  function updateGoalLabel() {
    var checked = Array.prototype.filter.call(goalChecks, function (c) { return c.checked; });
    if (!checked.length) {
      goalToggleLabel.textContent = 'בחרו מטרה אחת או יותר';
    } else if (checked.length <= 2) {
      goalToggleLabel.textContent = checked.map(function (c) { return c.value; }).join(', ');
    } else {
      goalToggleLabel.textContent = checked.length + ' מטרות נבחרו';
    }
  }

  Array.prototype.forEach.call(goalChecks, function (c) {
    c.addEventListener('change', function () {
      if (goalError && Array.prototype.some.call(goalChecks, function (cb) { return cb.checked; })) {
        goalError.classList.remove('show');
      }
      updateGoalLabel();
    });
  });

  if (goalMultiselect && goalToggle) {
    goalToggle.addEventListener('click', function () {
      var isOpen = goalMultiselect.classList.toggle('open');
      goalToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!goalMultiselect.contains(e.target) && goalMultiselect.classList.contains('open')) {
        goalMultiselect.classList.remove('open');
        goalToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.className = 'form-status';
    status.textContent = '';

    var goalChecked = Array.prototype.some.call(goalChecks, function (c) { return c.checked; });
    if (goalError) goalError.classList.toggle('show', !goalChecked);
    if (!goalChecked) {
      if (goalMultiselect && goalToggle) {
        goalMultiselect.classList.add('open');
        goalToggle.setAttribute('aria-expanded', 'true');
      }
      goalChecks[0].focus();
      return;
    }

    var replyToField = document.getElementById('replyto-field');
    var emailField = document.getElementById('email');
    if (replyToField && emailField) replyToField.value = emailField.value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'שולח...';

    var data = new FormData(form);

    fetch(SHEETS_URL, { method: 'POST', mode: 'no-cors', body: data }).catch(function () {});

    fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json' }
    })
      .then(function (response) {
        if (response.ok) {
          form.reset();
          status.className = 'form-status success';
          status.textContent = 'הפרטים נשלחו בהצלחה! אחזור אליך בהקדם.';
        } else {
          status.className = 'form-status error';
          status.textContent = 'אירעה שגיאה בשליחה. אפשר גם ליצור קשר ישירות בטלפון 052-8089808.';
        }
      })
      .catch(function () {
        status.className = 'form-status error';
        status.textContent = 'אירעה שגיאה בשליחה. אפשר גם ליצור קשר ישירות בטלפון 052-8089808.';
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'לשליחת הפרטים';
      });
  });
})();

// ===== Back to top =====
(function backToTop() {
  var btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', function () {
    btn.classList.toggle('show', window.scrollY > 400);
  });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// ===== Current year in footer =====
(function year() {
  var el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
})();
