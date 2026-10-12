/**
 * HendAxis Trust Escrow Drop-in JavaScript SDK v1.2.0
 * Ultra-lightweight modal checkout snippet for e-commerce stores, custom web apps & mobile webviews.
 * https://trust.hendaxis.com/developers
 */
(function (window, document) {
  'use strict';

  if (window.HendAxis) return;

  var HendAxis = {
    version: '1.2.0',

    /**
     * Initializes modal checkout overlay
     * @param {Object} options Configuration parameters
     */
    pay: function (options) {
      if (!options || !options.publicKey) {
        var errMsg = "HendAxis SDK Error: 'publicKey' is required (e.g. pk_live_... or pk_test_...).";
        console.error(errMsg);
        if (typeof options?.onError === 'function') {
          options.onError(new Error(errMsg));
        }
        return;
      }

      var publicKey = options.publicKey;
      var title = encodeURIComponent(options.title || 'Purchase');
      var price = encodeURIComponent(options.amount || options.price || 0);
      var shipping = encodeURIComponent(options.shipping || 0);
      var feeHandling = encodeURIComponent(options.feeHandling || 'PASS_TO_BUYER');
      var email = encodeURIComponent(options.buyerEmail || options.email || '');
      var phone = encodeURIComponent(options.buyerPhone || options.phone || '');
      var name = encodeURIComponent(options.buyerName || options.name || '');
      var address = encodeURIComponent(options.shippingAddress || options.address || '');
      var customRef = encodeURIComponent(options.customRef || options.reference || '');
      var theme = encodeURIComponent(options.theme || 'auto');

      // Detect base URL or fallback to standard HendAxis Trust platform
      var baseUrl = window.HENDAXIS_BASE_URL || (window.location.hostname.includes('hendaxis.com') ? window.location.origin : 'https://trust.hendaxis.com');
      var checkoutUrl = baseUrl + '/l/embed?pk=' + publicKey +
        '&title=' + title +
        '&price=' + price +
        '&shipping=' + shipping +
        '&fee_handling=' + feeHandling +
        '&email=' + email +
        '&phone=' + phone +
        '&name=' + name +
        '&address=' + address +
        '&ref=' + customRef +
        '&theme=' + theme;

      // Close existing overlay if open
      var existing = document.getElementById('hendaxis-sdk-overlay');
      if (existing) {
        document.body.removeChild(existing);
      }

      // 1. Create Overlay Backdrop
      var overlay = document.createElement('div');
      overlay.id = 'hendaxis-sdk-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundColor = 'rgba(2, 6, 23, 0.75)';
      overlay.style.backdropFilter = 'blur(8px)';
      overlay.style.webkitBackdropFilter = 'blur(8px)';
      overlay.style.zIndex = '2147483647';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '16px';
      overlay.style.boxSizing = 'border-box';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

      // 2. Create Modal Container
      var container = document.createElement('div');
      container.style.position = 'relative';
      container.style.width = '100%';
      container.style.maxWidth = '520px';
      container.style.height = '90vh';
      container.style.maxHeight = '740px';
      container.style.backgroundColor = '#0f172a';
      container.style.borderRadius = '24px';
      container.style.overflow = 'hidden';
      container.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)';
      container.style.transform = 'scale(0.95)';
      container.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

      // Close Button
      var closeBtn = document.createElement('button');
      closeBtn.setAttribute('aria-label', 'Close Checkout Modal');
      closeBtn.innerHTML = '&#215;';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '12px';
      closeBtn.style.right = '16px';
      closeBtn.style.zIndex = '100';
      closeBtn.style.background = 'rgba(15, 23, 42, 0.6)';
      closeBtn.style.backdropFilter = 'blur(4px)';
      closeBtn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
      closeBtn.style.borderRadius = '50%';
      closeBtn.style.width = '36px';
      closeBtn.style.height = '36px';
      closeBtn.style.fontSize = '22px';
      closeBtn.style.color = '#ffffff';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.lineHeight = '32px';
      closeBtn.style.display = 'flex';
      closeBtn.style.alignItems = 'center';
      closeBtn.style.justifyContent = 'center';
      closeBtn.onclick = function (e) {
        e.stopPropagation();
        closeModal();
      };

      // Iframe
      var iframe = document.createElement('iframe');
      iframe.src = checkoutUrl;
      iframe.setAttribute('allow', 'payment');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.backgroundColor = 'transparent';

      container.appendChild(closeBtn);
      container.appendChild(iframe);
      overlay.appendChild(container);
      document.body.appendChild(overlay);

      // Animate In
      requestAnimationFrame(function () {
        overlay.style.opacity = '1';
        container.style.transform = 'scale(1)';
      });

      function closeModal() {
        overlay.style.opacity = '0';
        container.style.transform = 'scale(0.95)';
        setTimeout(function () {
          var el = document.getElementById('hendaxis-sdk-overlay');
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }, 250);

        window.removeEventListener('message', handleMessage);
        window.removeEventListener('keydown', handleKey);

        if (typeof options.onClose === 'function') {
          options.onClose();
        }
      }

      function handleMessage(event) {
        if (!event.data) return;

        if (event.data.type === 'HENDAXIS_PAYMENT_SUCCESS') {
          if (typeof options.onSuccess === 'function') {
            options.onSuccess(event.data.data);
          }
          closeModal();
        } else if (event.data.type === 'HENDAXIS_MODAL_CLOSE') {
          closeModal();
        } else if (event.data.type === 'HENDAXIS_PAYMENT_ERROR') {
          if (typeof options.onError === 'function') {
            options.onError(event.data.error || new Error('Payment processing failed'));
          }
        }
      }

      function handleKey(e) {
        if (e.key === 'Escape') {
          closeModal();
        }
      }

      window.addEventListener('message', handleMessage);
      window.addEventListener('keydown', handleKey);
    }
  };

  window.HendAxis = HendAxis;
})(window, document);
