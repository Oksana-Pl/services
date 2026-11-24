/* Google Analytics is loaded only after an explicit, unexpired choice to allow it. */
(() => {
    "use strict";

    const measurementId = "G-N81RL4CCH2";
    const storageKey = "services-analytics-consent-v1";
    const consentDuration = 180 * 24 * 60 * 60 * 1000;
    const disableFlag = "ga-disable-" + measurementId;
    const privacyUrl = new URL("../privacy.html", document.currentScript.src);
    const isPrivacyPage = Boolean(document.querySelector(".privacy-policy"));
    const dialog = document.createElement("dialog");
    let inMemoryChoice = null;
    let storageAvailable = true;
    let expiryTimer;
    let tagRequested = false;

    window[disableFlag] = true;
    dialog.className = "analytics-dialog";
    dialog.setAttribute("aria-labelledby", "analytics-title");
    dialog.setAttribute("aria-describedby", "analytics-description");
    dialog.innerHTML = `
        <h2 id="analytics-title" tabindex="-1" autofocus>Analytics cookies</h2>
        <p id="analytics-description">With your permission, I use Google Analytics cookies to see which pages people visit, their approximate location and the type of device they use. This helps me improve the website. You can change your choice any time in Analytics settings.</p>
        <form method="dialog" id="analytics-choices" class="analytics-actions">
            <button class="button button-outline" value="rejected">Reject analytics</button>
            <button class="button button-outline" value="allowed">Allow analytics</button>
        </form>
        <div class="analytics-dialog-links">
            <a class="analytics-policy-link">Read the Privacy &amp; Cookie Policy</a>
            <button class="analytics-close" type="submit" form="analytics-choices" value="close">Close</button>
        </div>
    `;
    const policyLink = dialog.querySelector(".analytics-policy-link");
    policyLink.hidden = isPrivacyPage;
    policyLink.href = privacyUrl.href;
    document.body.append(dialog);

    function readChoice() {
        let value = inMemoryChoice;
        if (storageAvailable) {
            try {
                value = JSON.parse(localStorage.getItem(storageKey));
            } catch {
                // Keep the visitor's current-page choice if storage is unavailable.
                storageAvailable = false;
            }
        }

        const now = Date.now();
        if (["allowed", "rejected"].includes(value?.choice)
            && value.expires > now && value.expires <= now + consentDuration) {
            return value;
        }
        return null;
    }

    function clearAnalyticsCookies() {
        const names = document.cookie.split(";").map(cookie => cookie.trim().split("=")[0]);
        const host = location.hostname;
        const domains = host.startsWith("www.") ? [host, host.slice(4)] : [host];

        for (const name of names.filter(name => /^(_ga(?:_|$)|_gid$|_gat(?:_|$))/.test(name))) {
            const cookie = name + "=; Max-Age=0; Path=/";
            document.cookie = cookie;
            for (const domain of domains) {
                if (domain) document.cookie = cookie + "; Domain=" + domain;
            }
        }
    }

    function enableAnalytics(expires) {
        if (!window[disableFlag]) return;
        window[disableFlag] = false;
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () {
            window.dataLayer.push(arguments);
        };
        window.gtag("consent", "default", {
            analytics_storage: "granted",
            ad_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied"
        });
        window.gtag("js", new Date());
        window.gtag("config", measurementId, {
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
            cookie_expires: Math.max(1, Math.floor((expires - Date.now()) / 1000)),
            cookie_update: false
        });

        if (!tagRequested) {
            const tag = document.createElement("script");
            tag.async = true;
            tag.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
            document.head.append(tag);
            tagRequested = true;
        }
    }

    function showSettings() {
        if (!dialog.open) dialog.showModal();
    }

    function updateAnalytics({ prompt = false } = {}) {
        clearTimeout(expiryTimer);
        const value = readChoice();

        if (value?.choice === "allowed") {
            enableAnalytics(value.expires);
        } else {
            window[disableFlag] = true;
            clearAnalyticsCookies();
        }

        if (value) {
            const delay = Math.min(value.expires - Date.now() + 10, 2147483647);
            expiryTimer = setTimeout(() => updateAnalytics({ prompt: true }), delay);
        } else if (prompt && !isPrivacyPage) {
            showSettings();
        }
    }

    dialog.querySelector("form").addEventListener("submit", event => {
        const choice = event.submitter?.value;
        if (!["allowed", "rejected"].includes(choice)) return;
        const value = { choice, expires: Date.now() + consentDuration };

        inMemoryChoice = value;
        try {
            localStorage.setItem(storageKey, JSON.stringify(value));
        } catch {
            storageAvailable = false;
        }
        updateAnalytics();
    });

    for (const button of document.querySelectorAll("[data-analytics-settings]")) {
        button.hidden = false;
        button.addEventListener("click", showSettings);
    }

    window.addEventListener("storage", event => {
        if (event.key === storageKey || event.key === null) updateAnalytics();
    });
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) updateAnalytics();
    });

    updateAnalytics({ prompt: true });
})();
