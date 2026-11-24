/* Silent decorative preview; suspend playback off screen and for reduced motion. */
(() => {
    const video = document.querySelector("[data-preview-video]");
    if (!video) return;

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    video.muted = true;
    video.autoplay = false;
    video.pause();

    function syncPlayback() {
        if (motion.matches || !inView || document.hidden) {
            video.pause();
        } else {
            // Autoplay restrictions can leave the decorative poster visible.
            video.play().catch(() => {});
        }
    }

    document.addEventListener("visibilitychange", syncPlayback);
    motion.addEventListener("change", syncPlayback);

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            ([entry]) => {
                inView = entry.isIntersecting;
                syncPlayback();
            },
            { threshold: 0.15 },
        );
        observer.observe(video);
    } else {
        inView = true;
        syncPlayback();
    }
})();
