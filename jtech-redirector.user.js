// ==UserScript==
// @name         JTech Forums to SK Website Redirector
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Redirects from JTech Forums to the new SK website, preserving the path. Handles direct visits and Techloq block pages with persistent polling.
// @author       Shalom Karr / YH Studios
// @match        *://forums.jtechforums.org/*
// @match        *://filter.techloq.com/*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/Shalom-Karr/jtech-redirector/main/jtech-redirector.user.js
// @downloadURL  https://raw.githubusercontent.com/Shalom-Karr/jtech-redirector/main/jtech-redirector.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURATION ---
    const SOURCE_DOMAIN = 'forums.jtechforums.org';
    const TARGET_DOMAIN = 'https://jtechwebsite.shalomkarr.workers.dev';

    // Polling Settings for Techloq
    const MAX_TECHLOQ_RETRIES = 1200; // 5 minutes (1200 * 250ms)
    const TECHLOQ_RETRY_INTERVAL_MS = 250;
    // --- END CONFIGURATION ---

    // Don't run in iframes
    if (window.top !== window.self) return;

    let techloqAttemptCount = 0;

    /**
     * Constructs the new URL and performs an immediate redirect.
     * @param {string} path - The path part of the URL (e.g., /topic/123-abc/).
     * @param {string} search - The query string part of the URL (e.g., ?page=2).
     */
    function redirectToNewSite(path, search) {
        const newUrl = `${TARGET_DOMAIN}${path}${search}`;
        window.location.replace(newUrl);
    }

    // --- TECHLOQ SPECIFIC LOGIC ---

    /**
     * Attempts to find the original JTech Forums URL from the Techloq block page.
     * It primarily looks for the `redirectUrl` query parameter.
     */
    function attemptTechloqRedirect() {
        let originalUrlStr = '';

        try {
            // The most reliable source is the 'redirectUrl' query parameter
            const params = new URLSearchParams(window.location.search);
            const encodedRedirectUrl = params.get('redirectUrl');
            if (encodedRedirectUrl) {
                originalUrlStr = decodeURIComponent(encodedRedirectUrl);
            }
        } catch (e) {
            // In case of URL parsing errors, we can fall back to checking the DOM if needed,
            // but the query param is generally available at document-start.
            console.error("Error parsing Techloq URL:", e);
        }

        // Check if the extracted URL is the one we want to redirect
        if (originalUrlStr && originalUrlStr.includes(SOURCE_DOMAIN)) {
            try {
                const urlObject = new URL(originalUrlStr);
                redirectToNewSite(urlObject.pathname, urlObject.search);
                return; // Success, stop polling.
            } catch (e) {
                console.error("Error creating URL object from decoded string:", e);
            }
        }

        // If not found, continue polling
        techloqAttemptCount++;
        if (techloqAttemptCount < MAX_TECHLOQ_RETRIES) {
            setTimeout(attemptTechloqRedirect, TECHLOQ_RETRY_INTERVAL_MS);
        }
    }


    // --- SCRIPT EXECUTION LOGIC ---

    const currentHostname = window.location.hostname;

    // Case 1: Direct visit to the original JTech Forums website
    if (currentHostname === SOURCE_DOMAIN) {
        const path = window.location.pathname;
        const search = window.location.search;
        redirectToNewSite(path, search);
        return;
    }

    // Case 2: Landed on a Techloq page. Start polling to find the original URL.
    if (currentHostname.includes('filter.techloq.com')) {
        // We start the polling process. This is necessary because even though the URL
        // parameter should be present, this robust approach handles any edge cases
        // where the page content might be relevant or scripts might alter the URL.
        attemptTechloqRedirect();
    }

})();
