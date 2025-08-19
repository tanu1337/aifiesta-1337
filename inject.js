// inject.js - Aifiesta-1337 Security Assessment Tool
'use strict';

// Store original functions
const originalFetch = window.fetch;
const originalSetItem = localStorage.setItem;

// Enhanced logging with multiple colors
function logMessage(emoji, type, message, data = '') {
    console.log(
        `%c${emoji} %c[${type}] %c${message}`,
        'font-size: 14px;',
        'color: #ff6b00; font-weight: bold;',
        'color: #029f60ff;',
        data
    );
}

// UUID v4 generator
function generateRandomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const randomValue = Math.random() * 16 | 0;
        const hexValue = c === 'x' ? randomValue : (randomValue & 0x3 | 0x8);
        return hexValue.toString(16);
    });
}

// Patch localStorage auth token to prevent email loops
async function patchSupabaseAuthToken() {
    try {
        const authTokenKey = 'sb-ubipcxqbjqyzcisxiugn-auth-token';
        const authTokenData = localStorage.getItem(authTokenKey);

        if (authTokenData) {
            const parsedAuthData = JSON.parse(authTokenData);

            if (parsedAuthData.user && parsedAuthData.user.user_metadata && !parsedAuthData.user.user_metadata.payment_email_sent_at) {
                const currentTimestamp = new Date().toISOString();
                parsedAuthData.user.user_metadata.payment_email_sent_at = currentTimestamp;

                localStorage.setItem(authTokenKey, JSON.stringify(parsedAuthData));
                logMessage('🔑', 'PATCH', 'Auth token patched with payment_email_sent_at');
            }
        }
    } catch (error) {
        logMessage('💀', 'ERROR', 'Failed to patch auth token:', error.message);
    }
}

// Hook localStorage to re-patch when token updates
function hookLocalStorageUpdates() {
    localStorage.setItem = function (storageKey, storageValue) {
        const setItemResult = originalSetItem.apply(this, arguments);

        if (storageKey === 'sb-ubipcxqbjqyzcisxiugn-auth-token') {
            setTimeout(patchSupabaseAuthToken, 100);
        }

        return setItemResult;
    };
    logMessage('🪝', 'HOOK', 'localStorage.setItem hooked successfully');
}

// Blur email input
async function blurEmailInput() {
    const emailInput = document.querySelector('input[type="email"]#email');

    if (emailInput && !emailInput.dataset.blurred) {
        emailInput.dataset.blurred = 'true';
        emailInput.style.cssText = 'filter: blur(4px) !important';

        logMessage('👁️', 'BLUR', 'Email input blurred and anonymized');
    }
}

// Transform subscription button to premium success state
async function transformSubscriptionButton() {
    const allButtons = Array.from(document.querySelectorAll('button'));
    const manageSubscriptionButton = allButtons.find(button =>
        button.textContent.includes('Manage Subscription')
    );

    if (manageSubscriptionButton && !manageSubscriptionButton.dataset.hooked) {
        manageSubscriptionButton.dataset.hooked = 'true';

        manageSubscriptionButton.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();

            manageSubscriptionButton.style.cssText = `
                background: linear-gradient(135deg, #2AA3B3, #4CB779) !important;
                border-color: #059669 !important;
                color: white !important;
                cursor: default !important;
                transition: all 0.5s ease !important;
            `;

            const checkmarkIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-badge-check-icon lucide-badge-check w-4 h-4 mr-2"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>
            `;

            manageSubscriptionButton.innerHTML = `${checkmarkIcon}You are already premium`;

            manageSubscriptionButton.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            };

            logMessage('✅', 'CLICK', 'Subscription button clicked and transformed to premium state');

            return false;
        };

        logMessage('🎯', 'HOOK', 'Manage Subscription button click handler attached');
    }
}

// Watch for DOM changes to catch dynamically loaded buttons
function watchForSubscriptionButton() {
    const startObserver = () => {
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    setTimeout(transformSubscriptionButton, 100);
                    setTimeout(blurEmailInput, 100);
                }
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        logMessage('👀', 'WATCH', 'DOM observer started for subscription button');
    };

    startObserver();
}

// Monkey patch fetch function for API interception
async function setupFetchInterceptor() {
    window.fetch = async function (requestUrl, requestOptions) {
        // Check for subscription API call
        if (requestUrl.includes('user_subscriptions')) {
            logMessage('🎯', 'INTERCEPT', 'Subscription API call detected.');

            try {
                const originalResponse = await originalFetch.apply(this, arguments);
                const originalData = await originalResponse.clone().json();

                logMessage('📸', 'CAPTURE', 'Original response captured.', originalData);

                const modifiedData = {
                    user_id: generateRandomUUID(),
                    id: generateRandomUUID(),
                    plan_type: "premium", // paid would trigger refresh_token loop due to payment_email_sent_at missing
                    tokens_limit: 999999999,

                    messages_used: 0,
                    messages_limit: null,
                    provider_subscription_id: generateRandomUUID(),
                    provider: "stripe",
                    subscription_status: "active"
                };

                logMessage('🛡️', 'MODIFY', 'Response modified successfully.', modifiedData);

                return new Response(JSON.stringify(modifiedData), {
                    status: originalResponse.status,
                    statusText: originalResponse.statusText,
                    headers: originalResponse.headers
                });

            } catch (error) {
                logMessage('💀', 'ERROR', 'Modification failed, returning original.', error.message);
                return originalFetch.apply(this, arguments);
            }
        }

        // Check for users API call
        if (requestUrl.includes('/v1/users')) {
            logMessage('🎯', 'INTERCEPT', 'Users API call detected.');

            try {
                const originalResponse = await originalFetch.apply(this, arguments);
                const originalData = await originalResponse.clone().json();

                logMessage('📸', 'CAPTURE', 'Original users response captured.', originalData);

                // Modify user data
                const modifiedData = {
                    ...originalData,
                    email: "admin@aifiesta.ai",
                    name: "Dhruv Rathee",
                    display_name: "Dhruv Rathee",
                    full_name: "Dhruv Rathee"
                };

                logMessage('🛡️', 'MODIFY', 'Users response modified successfully.', modifiedData);

                return new Response(JSON.stringify(modifiedData), {
                    status: originalResponse.status,
                    statusText: originalResponse.statusText,
                    headers: originalResponse.headers
                });

            } catch (error) {
                logMessage('💀', 'ERROR', 'Users modification failed, returning original.', error.message);
                return originalFetch.apply(this, arguments);
            }
        }

        // Check for message-count API call
        if (requestUrl.includes('message-count')) {
            logMessage('🚫', 'BLOCK', 'Message-count API call blocked.');

            return new Response(JSON.stringify({
                message: "ok"
            }), {
                status: 200,
                statusText: "OK",
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // Check for customer portal API call
        if (requestUrl.includes('functions/v1/customer-portal')) {
            logMessage('💳', 'BLOCK', 'Customer portal API call blocked.');

            const portalResponse = {
                url: "https://chat.aifiesta.ai/",
                success: true,
                data: {
                    portal_url: "https://chat.aifiesta.ai/",
                    session_id: `portal_session_${generateRandomUUID()}`,
                    provider: "stripe",
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    customer_id: `cus_${generateRandomUUID().substring(0, 14)}`
                }
            };

            return new Response(JSON.stringify(portalResponse), {
                status: 200,
                statusText: "OK",
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // Check for payment-email API call
        if (requestUrl.includes('functions/v1/payment-email')) {
            logMessage('📧', 'BLOCK', 'Payment email API call blocked.');

            return new Response(JSON.stringify({
                message: "ok"
            }), {
                status: 400,
                statusText: "OK",
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // Pass through all other requests unchanged
        return originalFetch.apply(this, arguments);
    };

    logMessage('🔌', 'SETUP', 'Fetch interceptor installed successfully');
}

// Initialize the extension
async function initializeAifiesta1337() {
    logMessage('👻', 'INIT', 'Aifiesta-1337 starting initialization...');

    // Patch auth token immediately
    await patchSupabaseAuthToken();

    // Hook localStorage for future token updates
    hookLocalStorageUpdates();

    // Setup fetch interceptor for API calls
    await setupFetchInterceptor();

    // Start watching for DOM changes immediately
    watchForSubscriptionButton();

    // Wait for DOM to be ready for button transformation
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            await transformSubscriptionButton();
            await blurEmailInput();
            logMessage('🚀', 'READY', 'Aifiesta-1337 fully loaded and operational!');
        });
    } else {
        await transformSubscriptionButton();
        await blurEmailInput();
        logMessage('🚀', 'READY', 'Aifiesta-1337 fully loaded and operational!');
    }
}

// Start the extension
initializeAifiesta1337();
