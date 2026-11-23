// Moke Gardens shared site script: mobile menu + scroll reveal
(function () {
    document.documentElement.classList.add('js');

    // Lazy images: the real source sits in data-lazy-src / data-lazy-srcset and is
    // swapped in shortly before the image scrolls into view.
    var lazyImgs = document.querySelectorAll('img[data-lazy-src]');
    var showImg = function (img) {
        if (img.dataset.lazySrcset) { img.srcset = img.dataset.lazySrcset; delete img.dataset.lazySrcset; }
        img.src = img.dataset.lazySrc;
        delete img.dataset.lazySrc;
    };
    if ('IntersectionObserver' in window) {
        var imgIo = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    imgIo.unobserve(entry.target);
                    showImg(entry.target);
                }
            });
        }, { rootMargin: '400px 0px' });
        Array.prototype.forEach.call(lazyImgs, function (img) { imgIo.observe(img); });
    } else {
        Array.prototype.forEach.call(lazyImgs, showImg);
    }

    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');

    if (toggle && nav) {
        var setOpen = function (open) {
            nav.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.querySelector('.nav-toggle-text').textContent = open ? 'Close' : 'Menu';
        };

        nav.addEventListener('click', function (e) {
            if (e.target.closest('a')) setOpen(false);
        });

        toggle.addEventListener('click', function () {
            setOpen(!nav.classList.contains('is-open'));
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('is-open')) {
                setOpen(false);
                toggle.focus();
            }
        });

        document.addEventListener('click', function (e) {
            if (nav.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) {
                setOpen(false);
            }
        });
    }

    // Close other dropdowns when one opens
    var dropdowns = document.querySelectorAll('.site-nav details');
    dropdowns.forEach(function (d) {
        d.addEventListener('toggle', function () {
            if (d.open) {
                dropdowns.forEach(function (o) { if (o !== d) o.open = false; });
            }
        });
    });

    // Slide frames in as they scroll into view. Each frame comes from the left,
    // right, top or bottom in turn; inside it, headings and pictures come from
    // that side and the body text from the opposite side.
    var main = document.querySelector('main');
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
    if (main && !calm && 'IntersectionObserver' in window) {
        var FRAME = '.content-card, .listing-card, .section-head, .fact, .feature-card, .value-card, .tour-aside, .tour-booking';
        var HEAD = 'h1, h2, h3, h4, .section-head > p, .fact > strong';
        var PIC = 'img, picture, figure, video, iframe, .render-figure, .media-frame, .video-lite, .room-tour, .gallery-grid > a';
        var TEXT = 'p, ul, ol, dl, table, form, blockquote, .btn-row, .price-grid, .jump-links, .fact > span';
        var OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };
        var SIDES = ['left', 'right', 'up', 'down'];
        var inHero = function (el) { return el.closest('.hero'); };

        var frames = Array.prototype.filter.call(main.querySelectorAll(FRAME), function (f) { return !inHero(f); });
        // Older .reveal blocks that hold no frame of their own count as frames too
        main.querySelectorAll('.reveal').forEach(function (r) {
            if (!r.querySelector(FRAME) && frames.indexOf(r) < 0) frames.push(r);
        });
        frames.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });

        var slide = [];
        frames.forEach(function (frame, i) {
            var from = SIDES[i % 4];
            frame.classList.add('slide-in');
            frame.dataset.from = from;
            slide.push(frame);
            frame.querySelectorAll(HEAD + ',' + PIC + ',' + TEXT).forEach(function (el) {
                // Only the outermost piece, and only pieces of this frame (not a frame inside it)
                var up = el.parentElement;
                while (up && up !== frame) {
                    if (up.matches(HEAD + ',' + PIC + ',' + TEXT) || up.matches(FRAME)) return;
                    up = up.parentElement;
                }
                var kind = el.matches(HEAD) ? 'head' : el.matches(PIC) ? 'pic' : 'text';
                el.classList.add('slide-in', 'slide-piece');
                el.dataset.from = kind === 'text' ? OPPOSITE[from] : from;
                el.style.setProperty('--slide-delay', kind === 'head' ? '120ms' : kind === 'pic' ? '200ms' : '280ms');
                slide.push(el);
            });
        });

        var slideIo = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var el = entry.target;
                    el.classList.add('is-in');
                    slideIo.unobserve(el);
                    // Once home, hand the element back to its normal styles (hover effects etc.)
                    setTimeout(function () { el.classList.remove('slide-in', 'slide-piece', 'is-in'); }, 1400);
                }
            });
        }, { rootMargin: '0px 0px -6% 0px' });
        document.documentElement.classList.add('slides-ready');
        slide.forEach(function (el) { slideIo.observe(el); });
    }

    // Photo lightbox: links with data-lightbox open in a full-screen viewer
    var links = Array.prototype.slice.call(document.querySelectorAll('a[data-lightbox]'));
    if (links.length && typeof HTMLDialogElement === 'function') {
        var dlg = document.createElement('dialog');
        dlg.className = 'lightbox';
        dlg.setAttribute('aria-label', 'Photo viewer');
        dlg.innerHTML =
            '<figure><img alt=""></figure>' +
            '<p class="lightbox-caption" aria-live="polite"></p>' +
            '<button type="button" class="lightbox-close" aria-label="Close">×</button>' +
            '<button type="button" class="lightbox-prev" aria-label="Previous photo">‹</button>' +
            '<button type="button" class="lightbox-next" aria-label="Next photo">›</button>';
        document.body.appendChild(dlg);
        var img = dlg.querySelector('img');
        var cap = dlg.querySelector('.lightbox-caption');
        var set = [], idx = 0;

        var show = function (i) {
            idx = (i + set.length) % set.length;
            var a = set[idx];
            var thumb = a.querySelector('img');
            img.src = a.getAttribute('href');
            img.alt = thumb ? thumb.alt : '';
            cap.textContent = a.getAttribute('data-caption') || '';
            var n = document.createElement('span');
            n.textContent = (idx + 1) + ' / ' + set.length;
            cap.appendChild(n);
            var multi = set.length > 1;
            dlg.querySelector('.lightbox-prev').hidden = !multi;
            dlg.querySelector('.lightbox-next').hidden = !multi;
        };

        links.forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                var g = a.getAttribute('data-lightbox');
                set = links.filter(function (l) { return l.getAttribute('data-lightbox') === g; });
                show(set.indexOf(a));
                dlg.showModal();
            });
        });

        dlg.querySelector('.lightbox-close').addEventListener('click', function () { dlg.close(); });
        dlg.querySelector('.lightbox-prev').addEventListener('click', function () { show(idx - 1); });
        dlg.querySelector('.lightbox-next').addEventListener('click', function () { show(idx + 1); });
        dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.tagName === 'FIGURE') dlg.close(); });
        dlg.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') show(idx - 1);
            if (e.key === 'ArrowRight') show(idx + 1);
        });
        dlg.addEventListener('close', function () { img.removeAttribute('src'); });

        var startX = null;
        dlg.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
        dlg.addEventListener('touchend', function (e) {
            if (startX === null) return;
            var dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
            startX = null;
        });
    }

    // Click-to-play YouTube: swap the poster for the real player on demand
    document.querySelectorAll('.video-lite[data-youtube]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var f = document.createElement('iframe');
            f.src = 'https://www.youtube-nocookie.com/embed/' + btn.getAttribute('data-youtube') + '?autoplay=1&rel=0&playsinline=1';
            f.title = (btn.getAttribute('aria-label') || 'Video').replace('Play video: ', '');
            f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
            f.allowFullscreen = true;
            btn.replaceWith(f);
            f.focus();
        });
    });


    // Top-of-page slideshow (home, apartments, maisonettes): each photo rolls up to the next in 3D (the theme CSS draws it),
    // the picture tilts towards the mouse, later slides lazy-load, and it pauses when hidden
    var heroShow = document.querySelector('[data-hero-slideshow]');
    if (heroShow) {
        var slides = Array.prototype.slice.call(heroShow.querySelectorAll('.hero-slide'));
        var dots = Array.prototype.slice.call(document.querySelectorAll('.hero-dots button'));
        var cur = 0, timer = null;
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var heroBox = heroShow.closest('.hero') || heroShow;
        function load(el) {
            if (el.dataset.srcset) { el.srcset = el.dataset.srcset; delete el.dataset.srcset; }
        }
        // The cube turns around its centre, half the slideshow's height behind the photo
        function setDepth() { heroShow.style.setProperty('--cube-d', Math.round(heroShow.offsetHeight / 2) + 'px'); }
        setDepth();
        window.addEventListener('resize', setDepth);
        slides.forEach(function (s) {
            s.addEventListener('animationend', function () { s.classList.remove('is-leaving', 'is-entering'); });
        });
        function go(n) {
            n = (n + slides.length) % slides.length;
            if (n === cur) return;
            load(slides[n]); load(slides[(n + 1) % slides.length]);
            slides.forEach(function (s) { s.classList.remove('is-leaving', 'is-entering'); });
            slides[cur].classList.remove('is-active');
            if (!reduce) slides[cur].classList.add('is-leaving');
            if (dots[cur]) dots[cur].removeAttribute('aria-current');
            cur = n;
            slides[cur].classList.add('is-active');
            if (!reduce) slides[cur].classList.add('is-entering');
            if (dots[cur]) dots[cur].setAttribute('aria-current', 'true');
        }
        // Tilt towards the mouse (computers only)
        if (!reduce && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            heroBox.addEventListener('pointermove', function (e) {
                var r = heroBox.getBoundingClientRect();
                var x = (e.clientX - r.left) / r.width - 0.5;
                var y = (e.clientY - r.top) / r.height - 0.5;
                heroShow.style.setProperty('--tilt-y', (x * 10).toFixed(2) + 'deg');
                heroShow.style.setProperty('--tilt-x', (y * -7).toFixed(2) + 'deg');
            });
            heroBox.addEventListener('pointerleave', function () {
                heroShow.style.setProperty('--tilt-y', '0deg');
                heroShow.style.setProperty('--tilt-x', '0deg');
            });
        }
        function start() { stop(); if (!reduce) timer = setInterval(function () { go(cur + 1); }, 6000); }
        function stop() { if (timer) clearInterval(timer); timer = null; }
        dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); start(); }); });
        window.addEventListener('load', function () { load(slides[1]); start(); });
        document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    }

    // Why Moke showcase: crossfading slideshow with arrows, dots, pause, swipe and keyboard.
    // Autoplay pauses on hover/focus, when the tab is hidden, and never starts with reduced motion.
    Array.prototype.forEach.call(document.querySelectorAll('[data-showcase]'), function (show) {
        var DELAY = 6000;
        var stage = show.querySelector('.showcase-stage');
        var slides = Array.prototype.slice.call(show.querySelectorAll('.showcase-slide'));
        var dotsWrap = show.querySelector('.showcase-dots');
        var toggle = show.querySelector('.showcase-toggle');
        var bar = show.querySelector('.showcase-progress span');
        var status = show.querySelector('.showcase-status');
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var cur = 0, timer = null, paused = reduce, hold = false;
        if (slides.length < 2) return;

        var dots = slides.map(function (s, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('aria-label', 'Show slide ' + (i + 1) + ': ' + s.querySelector('figcaption').textContent);
            b.addEventListener('click', function () { go(i, true); });
            dotsWrap.appendChild(b);
            return b;
        });

        function load(s) {
            var img = s.querySelector('img');
            if (img && img.dataset.srcset) {
                img.srcset = img.dataset.srcset;
                img.src = img.dataset.srcset.split(', ').pop().split(' ')[0];
                delete img.dataset.srcset;
            }
        }
        function runBar() {
            if (!bar) return;
            bar.style.transition = 'none';
            bar.style.width = '0';
            if (paused || hold) return;
            void bar.offsetWidth;
            bar.style.transition = 'width ' + DELAY + 'ms linear';
            bar.style.width = '100%';
        }
        function schedule() {
            clearTimeout(timer); timer = null;
            if (!paused && !hold && !document.hidden) timer = setTimeout(function () { go(cur + 1); }, DELAY);
            runBar();
        }
        function go(n, user) {
            n = (n + slides.length) % slides.length;
            load(slides[n]); load(slides[(n + 1) % slides.length]);
            slides[cur].classList.remove('is-active');
            slides[cur].setAttribute('aria-hidden', 'true');
            dots[cur].removeAttribute('aria-current');
            cur = n;
            slides[cur].classList.add('is-active');
            slides[cur].removeAttribute('aria-hidden');
            dots[cur].setAttribute('aria-current', 'true');
            stage.classList.toggle('is-illustrative', slides[cur].hasAttribute('data-illustrative'));
            if (user && status) status.textContent = 'Slide ' + (cur + 1) + ' of ' + slides.length + ': ' + slides[cur].querySelector('figcaption').textContent;
            schedule();
        }
        function setPaused(p) {
            paused = p;
            toggle.classList.toggle('is-paused', p);
            toggle.setAttribute('aria-label', p ? 'Play slideshow' : 'Pause slideshow');
            schedule();
        }

        show.querySelector('.showcase-arrow.is-prev').addEventListener('click', function () { go(cur - 1, true); });
        show.querySelector('.showcase-arrow.is-next').addEventListener('click', function () { go(cur + 1, true); });
        toggle.addEventListener('click', function () { setPaused(!paused); });

        // Hold (not pause) while the visitor is pointing at or focused inside the slideshow
        stage.addEventListener('mouseenter', function () { hold = true; schedule(); });
        stage.addEventListener('mouseleave', function () { hold = false; schedule(); });
        show.addEventListener('focusin', function () { hold = true; schedule(); });
        show.addEventListener('focusout', function (e) { if (!show.contains(e.relatedTarget)) { hold = false; schedule(); } });

        show.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1, true); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1, true); }
        });

        var sx = null, sy = 0;
        stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
        stage.addEventListener('touchend', function (e) {
            if (sx === null) return;
            var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
            sx = null;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1), true);
        });

        document.addEventListener('visibilitychange', schedule);
        dots[0].setAttribute('aria-current', 'true');
        stage.classList.toggle('is-illustrative', slides[0].hasAttribute('data-illustrative'));
        load(slides[1]);
        setPaused(paused);
    });

    // Contact page: contact-us.html?unit=3-bedroom pre-fills the WhatsApp message with that unit.
    // Only the known unit types below are accepted, so nothing from the URL is shown as-is.
    var bookingNote = document.querySelector('[data-booking-note]');
    if (bookingNote) {
        var UNITS = {
            'studio': 'studio apartment (24 sq.m, Kshs 2,040,000)',
            'compact-1-bedroom': 'compact 1 bedroom apartment (30 sq.m, Kshs 2,400,000)',
            '1-bedroom': 'standard 1 bedroom apartment (40 sq.m, Kshs 3,200,000)',
            '2-bedroom': '2 bedroom apartment (65 sq.m, Kshs 5,200,000)',
            '3-bedroom': '3 bedroom apartment (86 sq.m, Kshs 6,880,000)'
        };
        var unitKey = (location.search.match(/[?&]unit=([a-z0-9-]+)/) || [])[1];
        var unit = unitKey && Object.prototype.hasOwnProperty.call(UNITS, unitKey) ? UNITS[unitKey] : null;
        if (unit) {
            var msg = "Hello Moke Gardens, I'd like to inquire about the " + unit + '. Please share more details.';
            Array.prototype.forEach.call(document.querySelectorAll('a[href^="https://wa.me/"]'), function (a) {
                a.href = a.href.split('?')[0] + '?text=' + encodeURIComponent(msg);
            });
            bookingNote.textContent = 'Asking about the ' + unit + '. Tap WhatsApp and your message is ready to send.';
            bookingNote.hidden = false;
        }
    }

    var year = document.querySelector('[data-year]');
    if (year) year.textContent = new Date().getFullYear();
})();
