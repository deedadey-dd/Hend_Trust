/**
 * HendAxis Trust Escrow Drop-in JavaScript SDK v1.0.0
 * Lightweight modal checkout snippet for custom e-commerce stores & apps.
 */
(function (window) {
  'use strict';

  var HendAxis = {
    pay: function (options) {
      if (!options || !options.publicKey) {
        console.error("HendAxis SDK Error: 'publicKey' is required (e.g. pk_live_... or pk_test_...)");
        return;
      }

      var publicKey = options.publicKey;
      var title = encodeURIComponent(options.title || 'Purchase');
      var price = encodeURIComponent(options.amount || options.price || 0);
      var shipping = encodeURIComponent(options.shipping || 0);
      var email = encodeURIComponent(options.buyerEmail || '');
      var phone = encodeURIComponent(options.buyerPhone || '');
      var name = encodeURIComponent(options.buyerName || '');
      var address = encodeURIComponent(options.shippingAddress || '');
      var customRef = encodeURIComponent(options.customRef || '');

      // Base URL automatically detects environment or defaults to window origin
      var baseUrl = window.HENDAXIS_BASE_URL || window.location.origin;
      var checkoutUrl = baseUrl + '/l/embed?pk=' + publicKey +
        '&title=' + title +
        '&price=' + price +
        '&shipping=' + shipping +
        '&email=' + email +
        '&phone=' + phone +
        '&name=' + name +
        '&address=' + address +
        '&ref=' + customRef;

      // 1. Create Overlay Backdrop
      var overlay = document.createElement('div');
      overlay.id = 'hendaxis-sdk-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundColor = 'rgba(2, 6, 23, 0.75)';
      overlay.style.backdropFilter = 'blur(6px)';
      overlay.style.zIndex = '999999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '16px';
      overlay.style.boxSizing = 'border-box';

      // 2. Create Modal Container & Iframe
      var container = document.createElement('div');
      container.style.position = 'relative';
      container.style.width = '100%';
      container.style.maxWidth = '540px';
      container.style.height = '90vh';
      container.style.maxHeight = '720px';
      container.style.backgroundColor = '#ffffff';
      container.style.borderRadius = '24px';
      container.style.overflow = 'hidden';
      container.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';

      // Close X Button
      var closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&#215;';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '12px';
      closeBtn.style.right = '16px';
      closeBtn.style.zIndex = '10';
      closeBtn.style.background = 'rgba(0,0,0,0.1)';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '50%';
      closeBtn.style.width = '32px';
      closeBtn.style.height = '32px';
      closeBtn.style.fontSize = '22px';
      closeBtn.style.color = '#ffffff';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.lineHeight = '30px';
      closeBtn.onclick = function () {
        closeModal();
      };

      var iframe = document.createElement('iframe');
      iframe.src = checkoutUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';

      container.appendChild(closeBtn);
      container.appendChild(iframe);
      overlay.appendChild(container);
      document.body.appendChild(overlay);

      function closeModal() {
        var el = document.getElementById('hendaxis-sdk-overlay');
        if (el) document.body.removeChild(el);
        window.removeEventListener('message', handleMessage);
        if (typeof options.onClose === 'function') {
          options.onClose();
        }
      }

      function handleMessage(event) {
        if (event.data && event.data.type === 'HENDAXIS_PAYMENT_SUCCESS') {
          if (typeof options.onSuccess === 'function') {
            options.onSuccess(event.data.data);
          }
          closeModal();
        } else if (event.data && event.data.type === 'HENDAXIS_MODAL_CLOSE') {
          closeModal();
        }
      }

      window.addEventListener('message', handleMessage);

      // Close on escape key
      var handleKey = function (e) {
        if (e.key === 'Escape') {
          closeModal();
          window.removeEventListener('keydown', handleKey);
        }
      };
      window.addEventListener('keydown', handleKey);
    }
  };

  window.HendAxis = HendAxis;
})(window);
