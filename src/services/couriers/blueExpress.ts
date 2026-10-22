import type { CourierService, TrackingError, TrackingResult } from '@/types/tracking';

type MacroState = {
  isActive?: boolean;
  title?: string;
  message?: string;
};

type BlueExpressResponse = {
  status?: string;
  data?: {
    generalInfo?: { data?: Record<string, string> };
    macroState?: { data?: { traceMacrostates?: { macrostates?: MacroState[] } } };
  };
};

type TrackingMessage = {
  type?: string;
  payload?: BlueExpressResponse;
  scrapedText?: string;
  raw?: BlueExpressResponse | null;
  trackingNumber?: string;
  message?: string;
};

const escapeForJavaScript = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

const buildInjectedJavaScript = (trackingNumber: string) => `
  (function() {
    const send = (message) => {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
    };
    const originalFetch = window.fetch;
    let latestPayload = null;
    window.fetch = async function(...args) {
      const url = typeof args[0] === 'string' ? args[0] : args[0] && args[0].url;
      const response = await originalFetch.apply(this, args);
      if (url && url.includes('/api/tracking')) {
        response.clone().json()
          .then((payload) => { latestPayload = payload; send({ type: 'SUCCESS', payload }); })
          .catch(() => send({ type: 'ERROR', message: 'No se pudo leer la respuesta de Blue Express' }));
      }
      return response;
    };
    const XHR = window.XMLHttpRequest;
    const originalOpen = XHR.prototype.open;
    const originalSend = XHR.prototype.send;
    XHR.prototype.open = function(method, url) {
      this._trackingUrl = url;
      return originalOpen.apply(this, arguments);
    };
    XHR.prototype.send = function() {
      this.addEventListener('load', function() {
        if (this._trackingUrl && this._trackingUrl.includes('/api/tracking')) {
          try { latestPayload = JSON.parse(this.responseText); send({ type: 'SUCCESS', payload: latestPayload }); }
          catch (_) { send({ type: 'ERROR', message: 'No se pudo leer la respuesta de Blue Express' }); }
        }
      });
      return originalSend.apply(this, arguments);
    };
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]');
      if (!input) { send({ type: 'ERROR', message: 'No se encontró el formulario de seguimiento' }); return; }
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '${escapeForJavaScript(trackingNumber)}');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const button = document.querySelector('button[type="submit"]') ||
          buttons.find((item) => item.innerText && item.innerText.toLowerCase().includes('buscar')) || buttons[0];
        if (button) button.click();
        else send({ type: 'ERROR', message: 'No se encontró el botón de búsqueda' });
      }, 500);
    }, 3500);
    let scrapeAttempts = 0;
    const scrapeVisiblePage = () => {
      scrapeAttempts += 1;
      const text = document.body && document.body.innerText ? document.body.innerText.trim() : '';
      if (text.length > 40 || scrapeAttempts >= 15) {
        send({ type: 'SCRAPED', scrapedText: text, raw: latestPayload, trackingNumber: '${escapeForJavaScript(trackingNumber)}' });
        return;
      }
      setTimeout(scrapeVisiblePage, 1000);
    };
    setTimeout(scrapeVisiblePage, 5000);
    true;
  })();
`;

const statusFromVisibleText = (text: string) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const statusLine = lines.find((line) => /entregad|tr[aá]nsit|despach|recepcion|recibid|retiro|proces|disponible|enviad/i.test(line));
  return statusLine ?? lines.find((line) => line.length > 3) ?? 'Estado no disponible';
};

const parseMessage = (message: string): TrackingResult | TrackingError | null => {
  let parsed: TrackingMessage;
  try {
    parsed = JSON.parse(message) as TrackingMessage;
  } catch {
    return { message: 'La respuesta del courier no tiene un formato válido' };
  }

  if (parsed.type === 'ERROR') return { message: parsed.message ?? 'Error al consultar Blue Express' };
  if (parsed.type === 'SCRAPED') {
    const scrapedText = parsed.scrapedText?.trim() ?? '';
    return {
      courier: 'blue-express',
      trackingNumber: parsed.trackingNumber ?? '',
      status: statusFromVisibleText(scrapedText),
      detail: scrapedText || 'No se encontró texto visible en la página',
      raw: parsed.raw ?? { scrapedText },
    };
  }
  return null;
};

export const blueExpressService: CourierService = {
  id: 'blue-express',
  name: 'Blue Express',
  trackingUrl: 'https://www.blue.cl/enviar/seguimiento',
  buildInjectedJavaScript,
  parseMessage,
};