/* ==========================================================================
   Anghelo Rengifo — interacciones del sitio
   Vanilla JS, sin dependencias.
   ========================================================================== */

(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (canHover && !reduceMotion) {
    document.documentElement.classList.add('can-spotlight');
  }

  /* ----------------------------------------------------------------------
     Tema claro / oscuro
     ---------------------------------------------------------------------- */
  (function theme() {
    var toggle = $('.theme-toggle');
    if (!toggle) return;

    var apply = function (value) {
      document.documentElement.setAttribute('data-theme', value);
      toggle.setAttribute('aria-label', value === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro');
      var meta = $('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', value === 'dark' ? '#0c0e12' : '#f4f5f7');
    };

    toggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });

    apply(document.documentElement.getAttribute('data-theme') || 'light');
  })();

  /* ----------------------------------------------------------------------
     Header: estado al hacer scroll + barra de progreso
     ---------------------------------------------------------------------- */
  (function headerState() {
    var header = $('.header');
    var fill = $('.progress-rail__fill');
    var toTop = $('.to-top');
    var ticking = false;
    var lastY = window.scrollY;
    var headerH = header ? header.offsetHeight : 0;

    var update = function () {
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;

      if (header) {
        header.classList.toggle('is-stuck', y > 12);

        var goingDown = y > lastY;
        if (goingDown && y > headerH * 1.5) {
          header.classList.add('is-hidden');
        } else if (!goingDown) {
          header.classList.remove('is-hidden');
        }
        lastY = y;
      }

      if (toTop) toTop.classList.toggle('is-visible', y > 500);
      if (fill) fill.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';

      ticking = false;
    };

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });

    update();
  })();

  /* ----------------------------------------------------------------------
     Menú móvil
     ---------------------------------------------------------------------- */
  (function mobileNav() {
    var toggles = $$('.nav-toggle');
    var nav = $('#nav');
    if (!toggles.length || !nav) return;

    var close = function () {
      document.body.classList.remove('nav-open');
      toggles.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    };

    toggles.forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        toggles.forEach(function (t) { t.setAttribute('aria-expanded', String(open)); });
      });
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 960) close();
    });
  })();

  /* ----------------------------------------------------------------------
     Navegación activa según la sección visible
     ---------------------------------------------------------------------- */
  (function scrollSpy() {
    var nav = $('#nav');
    var links = $$('#nav a[href^="#"], .bottom-nav a[href^="#"]');
    var pill = $('.nav__pill');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    var sections = [];
    var seen = {};

    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (!section) return;
      if (!map[id]) map[id] = [];
      map[id].push(link);
      if (!seen[id]) {
        seen[id] = true;
        sections.push(section);
      }
    });

    var movePill = function (link) {
      if (!pill || !nav || window.innerWidth <= 960) return;
      var navBox = nav.getBoundingClientRect();
      var linkBox = link.getBoundingClientRect();
      pill.style.left = (linkBox.left - navBox.left) + 'px';
      pill.style.width = linkBox.width + 'px';
      pill.classList.add('is-ready');
    };

    var visible = new Set();

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });

      var current = sections.filter(function (s) { return visible.has(s.id); })[0];
      links.forEach(function (l) { l.classList.remove('is-active'); });
      if (current && map[current.id]) {
        map[current.id].forEach(function (l) { l.classList.add('is-active'); });
        var navLink = map[current.id].filter(function (l) { return l.closest('#nav'); })[0];
        if (navLink) movePill(navLink);
      }
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (s) { observer.observe(s); });

    window.addEventListener('resize', function () {
      var active = $('#nav a.is-active');
      if (active) movePill(active);
    });
  })();

  /* ----------------------------------------------------------------------
     Aparición progresiva de bloques
     ---------------------------------------------------------------------- */
  (function reveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach(function (el) { observer.observe(el); });
  })();

  /* ----------------------------------------------------------------------
     Brillo que sigue al cursor en tarjetas
     ---------------------------------------------------------------------- */
  (function spotlight() {
    if (!canHover || reduceMotion) return;

    var selector = '.skill-card, .work, .service, .contact-card, .form-card';

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var card = e.target.closest ? e.target.closest(selector) : null;
      if (!card) return;
      var box = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - box.left) + 'px');
      card.style.setProperty('--my', (e.clientY - box.top) + 'px');
    }, { passive: true });
  })();

  /* ----------------------------------------------------------------------
     Botones magnéticos
     ---------------------------------------------------------------------- */
  (function magnetic() {
    if (!canHover || reduceMotion) return;

    var strength = 0.28;

    $$('.magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var box = btn.getBoundingClientRect();
        var dx = (e.clientX - box.left - box.width / 2) * strength;
        var dy = (e.clientY - box.top - box.height / 2) * strength;
        btn.style.transform = 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px)';
      });

      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
      });
    });
  })();

  /* ----------------------------------------------------------------------
     Tilt 3D del retrato del hero
     ---------------------------------------------------------------------- */
  (function portraitTilt() {
    var el = $('.hero__portrait');
    if (!el || !canHover || reduceMotion) return;

    var max = 8;

    el.addEventListener('mousemove', function (e) {
      var box = el.getBoundingClientRect();
      var px = (e.clientX - box.left) / box.width - 0.5;
      var py = (e.clientY - box.top) / box.height - 0.5;
      el.style.transform =
        'perspective(900px) rotateY(' + (px * max).toFixed(2) + 'deg) rotateX(' + (-py * max).toFixed(2) + 'deg)';
    });

    el.addEventListener('mouseleave', function () {
      el.style.transform = '';
    });
  })();

  /* ----------------------------------------------------------------------
     Tilt del retrato por giroscopio (celular)
     ---------------------------------------------------------------------- */
  (function portraitTiltMobile() {
    var el = $('.hero__portrait');
    var hint = $('.tilt-hint');
    if (!el || !hint || canHover || reduceMotion) return;
    if (typeof DeviceOrientationEvent === 'undefined') return;

    var max = 14;
    var baseBeta = null;
    var baseGamma = null;

    var clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };

    var onOrientation = function (e) {
      if (e.beta === null || e.gamma === null) return;
      if (baseBeta === null) {
        baseBeta = e.beta;
        baseGamma = e.gamma;
      }
      var db = clamp(e.beta - baseBeta, -30, 30);
      var dg = clamp(e.gamma - baseGamma, -30, 30);
      el.style.transform =
        'perspective(900px) rotateX(' + (-(db / 30) * max).toFixed(2) + 'deg) rotateY(' + ((dg / 30) * max).toFixed(2) + 'deg)';
    };

    var dismissHint = function () {
      hint.classList.add('is-done');
      setTimeout(function () {
        if (hint.parentNode) hint.parentNode.removeChild(hint);
      }, 500);
    };

    var needsPermission = typeof DeviceOrientationEvent.requestPermission === 'function';

    if (needsPermission) {
      hint.hidden = false;
      hint.addEventListener('click', function () {
        DeviceOrientationEvent.requestPermission().then(function (state) {
          if (state === 'granted') window.addEventListener('deviceorientation', onOrientation);
          dismissHint();
        }).catch(dismissHint);
      });
      setTimeout(dismissHint, 8000);
    } else {
      window.addEventListener('deviceorientation', onOrientation);
      hint.hidden = false;
      hint.addEventListener('click', dismissHint);
      setTimeout(dismissHint, 6000);
    }
  })();

  /* ----------------------------------------------------------------------
     Máquina de escribir del hero
     ---------------------------------------------------------------------- */
  (function typewriter() {
    var el = $('.typed-text');
    if (!el) return;

    var phrases;
    try { phrases = JSON.parse(el.dataset.phrases); } catch (e) { return; }
    if (!phrases || !phrases.length) return;

    if (reduceMotion) {
      el.textContent = phrases[0];
      var caret = $('.caret');
      if (caret) caret.style.display = 'none';
      return;
    }

    var i = 0, j = 0, deleting = false;

    var tick = function () {
      var word = phrases[i];
      j = deleting ? j - 1 : j + 1;
      el.textContent = word.slice(0, j);

      var delay = deleting ? 40 : 75;

      if (!deleting && j === word.length) {
        deleting = true;
        delay = 1900;
      } else if (deleting && j === 0) {
        deleting = false;
        i = (i + 1) % phrases.length;
        delay = 320;
      }

      setTimeout(tick, delay);
    };

    setTimeout(tick, 500);
  })();

  /* ----------------------------------------------------------------------
     Contadores animados
     ---------------------------------------------------------------------- */
  (function counters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    var run = function (el) {
      var target = parseFloat(el.dataset.count) || 0;

      if (reduceMotion) {
        el.textContent = target;
        return;
      }

      var duration = 1400;
      var start = null;

      var step = function (ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) window.requestAnimationFrame(step);
      };

      window.requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window)) {
      nums.forEach(run);
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    nums.forEach(function (el) { observer.observe(el); });
  })();

  /* ----------------------------------------------------------------------
     Filtros del portafolio
     ---------------------------------------------------------------------- */
  (function portfolioFilters() {
    var buttons = $$('.filters button');
    var items = $$('.work');
    var empty = $('.work__empty');
    if (!buttons.length || !items.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.dataset.filter;

        buttons.forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });

        var shown = 0;

        items.forEach(function (item) {
          var match = filter === '*' || (item.dataset.category || '').split(' ').indexOf(filter) > -1;
          item.classList.toggle('is-hidden', !match);
          item.classList.remove('is-entering');

          if (match) {
            shown++;
            if (!reduceMotion) {
              // reinicia la animación de entrada
              void item.offsetWidth;
              item.classList.add('is-entering');
            }
          }
        });

        if (empty) empty.hidden = shown > 0;
      });
    });
  })();

  /* ----------------------------------------------------------------------
     Lightbox del portafolio
     ---------------------------------------------------------------------- */
  (function lightbox() {
    var box = $('.lightbox');
    if (!box) return;

    var img = $('.lightbox__img', box);
    var title = $('.lightbox__title', box);
    var desc = $('.lightbox__desc', box);
    var triggers = $$('[data-lightbox]');
    if (!triggers.length) return;

    var index = 0;
    var lastFocus = null;

    var show = function (i) {
      var list = triggers.filter(function (t) {
        var card = t.closest('.work');
        return !card || !card.classList.contains('is-hidden');
      });

      if (!list.length) return;
      index = (i + list.length) % list.length;

      var trigger = list[index];
      img.src = trigger.dataset.lightbox;
      img.alt = trigger.dataset.title || '';
      title.textContent = trigger.dataset.title || '';
      desc.textContent = trigger.dataset.desc || '';
    };

    var currentList = function () {
      return triggers.filter(function (t) {
        var card = t.closest('.work');
        return !card || !card.classList.contains('is-hidden');
      });
    };

    var open = function (trigger) {
      lastFocus = document.activeElement;
      var list = currentList();
      show(list.indexOf(trigger));
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      $('.lightbox__close', box).focus();
    };

    var close = function () {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        open(trigger);
      });
    });

    $('.lightbox__close', box).addEventListener('click', close);
    $('.lightbox__btn--prev', box).addEventListener('click', function () { show(index - 1); });
    $('.lightbox__btn--next', box).addEventListener('click', function () { show(index + 1); });

    box.addEventListener('click', function (e) {
      if (e.target === box) close();
    });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });

    // Deslizar en móvil
    var startX = null;
    box.addEventListener('touchstart', function (e) {
      startX = e.changedTouches[0].clientX;
    }, { passive: true });

    box.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 60) show(dx > 0 ? index - 1 : index + 1);
      startX = null;
    }, { passive: true });
  })();

  /* ----------------------------------------------------------------------
     Carrusel de testimonios
     ---------------------------------------------------------------------- */
  (function slider() {
    var root = $('.slider');
    if (!root) return;

    var viewport = $('.slider__viewport', root);
    var slides = $$('.quote', viewport);
    var dotsWrap = $('.slider__dots', root);
    var prev = $('.slider__prev', root);
    var next = $('.slider__next', root);
    if (!slides.length) return;

    var perView = function () {
      return Math.max(1, Math.round(viewport.clientWidth / slides[0].offsetWidth));
    };

    var pages = function () {
      return Math.max(1, slides.length - perView() + 1);
    };

    var current = 0;
    var timer = null;

    var buildDots = function () {
      dotsWrap.innerHTML = '';
      for (var i = 0; i < pages(); i++) {
        (function (i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', 'Ir al testimonio ' + (i + 1));
          b.addEventListener('click', function () { goTo(i); restart(); });
          dotsWrap.appendChild(b);
        })(i);
      }
      syncDots();
    };

    var syncDots = function () {
      $$('button', dotsWrap).forEach(function (b, i) {
        b.setAttribute('aria-current', String(i === current));
      });
    };

    var goTo = function (i) {
      var total = pages();
      current = ((i % total) + total) % total;
      var slide = slides[current];
      if (slide) {
        viewport.scrollTo({
          left: slide.offsetLeft,
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
      }
      syncDots();
    };

    var restart = function () {
      if (timer) clearInterval(timer);
      if (reduceMotion) return;
      timer = setInterval(function () { goTo(current + 1); }, 6000);
    };

    if (prev) prev.addEventListener('click', function () { goTo(current - 1); restart(); });
    if (next) next.addEventListener('click', function () { goTo(current + 1); restart(); });

    // Sincroniza al arrastrar con el dedo
    var scrollTimer = null;
    viewport.addEventListener('scroll', function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var closest = 0;
        var min = Infinity;
        slides.forEach(function (s, i) {
          var d = Math.abs(s.offsetLeft - viewport.scrollLeft);
          if (d < min) { min = d; closest = i; }
        });
        current = Math.min(closest, pages() - 1);
        syncDots();
      }, 90);
    }, { passive: true });

    root.addEventListener('mouseenter', function () { if (timer) clearInterval(timer); });
    root.addEventListener('mouseleave', restart);

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildDots, 200);
    });

    buildDots();
    restart();
  })();

  /* ----------------------------------------------------------------------
     Copiar al portapapeles
     ---------------------------------------------------------------------- */
  (function copyToClipboard() {
    $$('.copy-btn').forEach(function (btn) {
      var label = $('.copy-btn__label', btn);
      var original = label ? label.textContent : '';

      btn.addEventListener('click', function () {
        var text = btn.dataset.copy || '';
        var done = function () {
          if (!label) return;
          label.textContent = 'Copiado';
          setTimeout(function () { label.textContent = original; }, 1800);
        };

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done).catch(function () {});
        } else {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); done(); } catch (e) {}
          document.body.removeChild(ta);
        }
      });
    });
  })();

  /* ----------------------------------------------------------------------
     Formulario de contacto
     ---------------------------------------------------------------------- */
  (function contactForm() {
    var form = $('#contact-form');
    if (!form) return;

    var status = $('.form-status', form);
    var button = $('button[type="submit"]', form);

    var NAME_RE = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\- ]*$/;
    var EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    var TEL_RE = /^[0-9]{9}$/;

    // Filtra caracteres mientras se escribe: el nombre no admite números,
    // el celular solo admite dígitos y no pasa de 9.
    var nombreField = $('#f-nombre', form);
    if (nombreField) {
      nombreField.addEventListener('input', function () {
        var cleaned = nombreField.value.replace(/[^A-Za-zÀ-ÿ'\- ]/g, '');
        if (cleaned !== nombreField.value) nombreField.value = cleaned;
      });
    }

    var telField = $('#f-tel', form);
    if (telField) {
      telField.addEventListener('input', function () {
        var cleaned = telField.value.replace(/[^0-9]/g, '').slice(0, 9);
        if (cleaned !== telField.value) telField.value = cleaned;
      });
    }

    var setError = function (field, message) {
      var wrap = field.closest('.field');
      if (!wrap) return;
      wrap.classList.toggle('has-error', Boolean(message));
      var slot = $('.field__error', wrap);
      if (slot) slot.textContent = message || '';
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
    };

    var validate = function (field) {
      var value = field.value.trim();

      if (field.required && !value) {
        setError(field, 'Este campo es obligatorio');
        return false;
      }

      if (field === nombreField && value && !NAME_RE.test(value)) {
        setError(field, 'Solo letras, sin números');
        return false;
      }

      if (field === nombreField && value && value.length < 3) {
        setError(field, 'Escribe tu nombre completo');
        return false;
      }

      if (field.type === 'email' && value && !EMAIL_RE.test(value)) {
        setError(field, 'Escribe un correo válido');
        return false;
      }

      if (field === telField && value && !TEL_RE.test(value)) {
        setError(field, 'Debe tener 9 dígitos');
        return false;
      }

      if (field.name === 'mensaje' && value && value.length < 10) {
        setError(field, 'Cuéntame un poco más (mínimo 10 caracteres)');
        return false;
      }

      setError(field, '');
      return true;
    };

    var fields = $$('input, textarea, select', form).filter(function (f) {
      return f.type !== 'submit' && !f.closest('.hp');
    });

    fields.forEach(function (field) {
      field.addEventListener('blur', function () { validate(field); });
      field.addEventListener('input', function () {
        if (field.closest('.field').classList.contains('has-error')) validate(field);
      });
      if (field.tagName === 'SELECT') {
        field.addEventListener('change', function () { validate(field); });
      }
    });

    var showStatus = function (type, message) {
      if (!status) return;
      status.className = 'form-status is-visible form-status--' + type;
      status.textContent = message;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Trampa antispam: si está llena, es un bot.
      var honeypot = $('.hp input', form);
      if (honeypot && honeypot.value) return;

      var ok = fields.map(validate).every(Boolean);

      if (!ok) {
        showStatus('error', 'Revisa los campos marcados antes de enviar.');
        var firstError = $('.field.has-error input, .field.has-error textarea, .field.has-error select', form);
        if (firstError) firstError.focus();
        return;
      }

      if (status) status.className = 'form-status';
      button.dataset.loading = 'true';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (!res.ok) throw new Error('bad response');
          form.reset();
          showStatus('ok', '¡Listo! Tu mensaje llegó. Te respondo dentro de las próximas 24 horas.');
        })
        .catch(function () {
          showStatus('error', 'No se pudo enviar. Escríbeme directo a anghelo.rengifor@gmail.com o por WhatsApp.');
        })
        .then(function () {
          delete button.dataset.loading;
        });
    });
  })();

  /* ----------------------------------------------------------------------
     Datos que se calculan solos (edad, año)
     ---------------------------------------------------------------------- */
  (function autoData() {
    var now = new Date();

    var ageEl = $('[data-birth]');
    if (ageEl) {
      var birth = new Date(ageEl.dataset.birth);
      var age = now.getFullYear() - birth.getFullYear();
      var m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      ageEl.textContent = age + ' años';
    }

    var yearEl = $('[data-year]');
    if (yearEl) yearEl.textContent = now.getFullYear();
  })();

  /* ----------------------------------------------------------------------
     Botón "volver arriba"
     ---------------------------------------------------------------------- */
  (function toTop() {
    var btn = $('.to-top');
    if (!btn) return;
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  })();
})();
