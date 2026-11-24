/* Silent case-study videos play only while visible and respect reduced motion. */
(() => {
    const videos = [...document.querySelectorAll("[data-case-video]")];
    if (!videos.length) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const visible = new Set();

    function sync(video) {
        if (motion.matches || document.hidden || !visible.has(video)) {
            video.pause();
        } else {
            // Native controls remain available if a browser blocks autoplay.
            video.play().catch(() => {});
        }
    }

    const observer =
        "IntersectionObserver" in window
            ? new IntersectionObserver(
                  (entries) => {
                      for (const entry of entries) {
                          if (entry.isIntersecting) visible.add(entry.target);
                          else visible.delete(entry.target);
                          sync(entry.target);
                      }
                  },
                  { threshold: 0.15 },
              )
            : null;

    for (const video of videos) {
        video.muted = true;
        video.autoplay = false;
        video.pause();
        if (observer) observer.observe(video);
        else {
            visible.add(video);
            sync(video);
        }
    }
    document.addEventListener("visibilitychange", () => videos.forEach(sync));
    motion.addEventListener("change", () => videos.forEach(sync));
})();
