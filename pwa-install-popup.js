/**
 * GPL Mods DNS & Sideloading Hub - PWA Install Popup Component
 * Appears dynamically after a brief delay.
 * Once installed or dismissed, it is permanently saved in localStorage and will NEVER appear again.
 */
(function () {
    // 1. Guard check: Already installed or permanently dismissed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true || 
                         window.location.search.includes('pwa=1');
                         
    const isDismissed = localStorage.getItem('gpl_dns_app_installed') === 'true' || 
                        localStorage.getItem('gpl_dns_install_never_show') === 'true';

    if (isStandalone || isDismissed) {
        localStorage.setItem('gpl_dns_app_installed', 'true');
        return; // Terminate early: Never display
    }

    // Capture standard PWA deferred prompt
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    // Listen for successful system install
    window.addEventListener('appinstalled', () => {
        localStorage.setItem('gpl_dns_app_installed', 'true');
        const popup = document.getElementById('gplInstallAppPopup');
        if (popup) popup.remove();
    });

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        #gplInstallAppPopup {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 380px;
            max-width: calc(100vw - 32px);
            background: rgba(14, 14, 18, 0.95);
            border: 1px solid rgba(255, 215, 0, 0.45);
            border-radius: 18px;
            padding: 20px;
            box-shadow: 0 20px 45px rgba(0, 0, 0, 0.85), 0 0 25px rgba(255, 215, 0, 0.2);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            z-index: 999999;
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #ffffff;
            box-sizing: border-box;
            opacity: 0;
            transform: translateY(30px) scale(0.96);
            transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: auto;
        }
        #gplInstallAppPopup.gpl-popup-visible {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        .gpl-popup-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }
        .gpl-popup-brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .gpl-popup-icon {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            border: 1.5px solid #FFD700;
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.35);
            object-fit: cover;
            pointer-events: none;
            -webkit-touch-callout: none;
            user-select: none;
        }
        .gpl-popup-title {
            font-size: 1.05rem;
            font-weight: 700;
            line-height: 1.2;
            color: #fff;
        }
        .gpl-popup-title span.gold {
            color: #FFD700;
            text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
        }
        .gpl-popup-title span.silver {
            color: #e2e8f0;
            text-shadow: 0 0 8px rgba(226, 232, 240, 0.4);
        }
        .gpl-popup-close {
            background: rgba(255, 255, 255, 0.08);
            border: none;
            color: #a0a0a0;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
            transition: all 0.2s ease;
        }
        .gpl-popup-close:hover {
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
        }
        .gpl-popup-desc {
            font-size: 0.85rem;
            color: #b0b5c0;
            line-height: 1.45;
            margin-bottom: 15px;
        }
        .gpl-popup-ios-instruction {
            background: rgba(255, 215, 0, 0.08);
            border: 1px dashed rgba(255, 215, 0, 0.35);
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 0.8rem;
            color: #e0e5f0;
            line-height: 1.5;
            margin-bottom: 14px;
            display: none;
        }
        .gpl-popup-ios-instruction strong {
            color: #FFD700;
        }
        .gpl-popup-actions {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .gpl-popup-btn-install {
            flex: 1;
            background: linear-gradient(135deg, #FFD700 0%, #FFB800 100%);
            color: #0b0b0f;
            border: none;
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 0 12px rgba(255, 215, 0, 0.35);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            transition: all 0.2s ease;
        }
        .gpl-popup-btn-install:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 18px rgba(255, 215, 0, 0.55);
        }
        .gpl-popup-btn-dismiss {
            background: transparent;
            color: #8c92a4;
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 9px 12px;
            border-radius: 10px;
            font-size: 0.82rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        .gpl-popup-btn-dismiss:hover {
            background: rgba(255, 255, 255, 0.08);
            color: #ffffff;
            border-color: rgba(255, 255, 255, 0.3);
        }
        @media (max-width: 600px) {
            #gplInstallAppPopup {
                bottom: 16px;
                right: 16px;
                left: 16px;
                width: auto;
                max-width: none;
            }
        }
    `;
    document.head.appendChild(style);

    // Create DOM element
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const popup = document.createElement('div');
    popup.id = 'gplInstallAppPopup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Install GPL Mods App');

    popup.innerHTML = `
        <div class="gpl-popup-header">
            <div class="gpl-popup-brand">
                <img src="./logo.png" onerror="this.onerror=null; this.src='./favicon.png';" alt="GPL Mods" class="gpl-popup-icon" draggable="false">
                <div class="gpl-popup-title">
                    Install <span class="gold">GPL</span> <span class="silver">Mods</span>
                </div>
            </div>
            <button type="button" class="gpl-popup-close" id="gplPopupCloseBtn" title="Close">&times;</button>
        </div>
        <div class="gpl-popup-desc">
            Install the app for instant 1-tap access to signed IPAs, anti-revoke DNS profiles, and offline sideloading tools.
        </div>
        <div class="gpl-popup-ios-instruction" id="gplIosInstruction">
            1. Tap the <strong>Share</strong> button <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; display: inline-block;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg> at bottom.<br>
            2. Choose <strong>Add to Home Screen ⊞</strong>.
        </div>
        <div class="gpl-popup-actions">
            <button type="button" class="gpl-popup-btn-install" id="gplPopupInstallBtn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>${isIOS ? 'Install Guide' : 'Install App'}</span>
            </button>
            <button type="button" class="gpl-popup-btn-dismiss" id="gplPopupDismissBtn">Never Show</button>
        </div>
    `;

    document.body.appendChild(popup);

    // Event handlers
    function dismissPermanently() {
        localStorage.setItem('gpl_dns_install_never_show', 'true');
        localStorage.setItem('gpl_dns_app_installed', 'true');
        popup.classList.remove('gpl-popup-visible');
        setTimeout(() => popup.remove(), 400);
    }

    document.getElementById('gplPopupCloseBtn').addEventListener('click', dismissPermanently);
    document.getElementById('gplPopupDismissBtn').addEventListener('click', dismissPermanently);

    const installBtn = document.getElementById('gplPopupInstallBtn');
    installBtn.addEventListener('click', () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    localStorage.setItem('gpl_dns_app_installed', 'true');
                    popup.classList.remove('gpl-popup-visible');
                    setTimeout(() => popup.remove(), 400);
                }
                deferredPrompt = null;
            });
        } else if (isIOS) {
            const instr = document.getElementById('gplIosInstruction');
            if (instr) instr.style.display = 'block';
            installBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Done! I Added It</span>
            `;
            installBtn.onclick = () => {
                dismissPermanently();
            };
        } else {
            // Direct launch / bookmark fallback
            window.location.href = 'store.html?pwa=1';
            dismissPermanently();
        }
    });

    // Display popup after 4.5 seconds
    setTimeout(() => {
        // Re-check in case user installed during delay
        const alreadyDone = localStorage.getItem('gpl_dns_app_installed') === 'true' || 
                           localStorage.getItem('gpl_dns_install_never_show') === 'true';
        if (!alreadyDone && popup.parentNode) {
            popup.classList.add('gpl-popup-visible');
        }
    }, 4500);
})();
