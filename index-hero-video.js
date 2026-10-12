// فيديو الهيرو (مصنوع بـ Remotion): يبدّل نسخة الفيديو حسب لغة الصفحة،
// يوقف التشغيل خارج الشاشة لتوفير المعالج والبطارية، ويحترم "تقليل الحركة".
(function () {
  var video = document.getElementById('heroVideo');
  var root = document.getElementById('htmlRoot') || document.documentElement;
  if (!video) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var currentLang = null;

  function setLang(lang) {
    lang = lang === 'en' ? 'en' : 'ar';
    if (lang === currentLang) return;
    currentLang = lang;
    var src = video.getAttribute('data-src-' + lang);
    var poster = video.getAttribute('data-poster-' + lang);
    if (poster) video.setAttribute('poster', poster);
    if (reduceMotion) {
      // بدون حركة: نعرض صورة المحادثة الكاملة فقط
      video.removeAttribute('autoplay');
      video.pause();
      return;
    }
    var source = video.querySelector('source');
    if (source && src && source.getAttribute('src') !== src) {
      source.setAttribute('src', src);
      video.load();
    }
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  setLang(root.getAttribute('lang'));

  // متابعة تغيير اللغة من زر English/العربية
  if (window.MutationObserver) {
    new MutationObserver(function () {
      setLang(root.getAttribute('lang'));
    }).observe(root, { attributes: true, attributeFilter: ['lang'] });
  }

  // إيقاف الفيديو عندما لا يكون ظاهراً
  if (!reduceMotion && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.15 }).observe(video);
  }
})();
