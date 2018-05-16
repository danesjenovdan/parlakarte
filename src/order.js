import 'core-js/modules/es6.promise';
import 'core-js/modules/es6.array.find';
import cookies from 'js-cookie';
import axios from 'axios';

/* globals gtag:false */
// eslint-disable-next-line no-console
const safeAsync = fn => (...args) => fn(...args).catch(err => console.error('Async Error', err));

const $ = selector => document.querySelector(selector);

// fix placeholder in IE
if (!('placeholder' in document.createElement('input'))) {
  const inputs = document.querySelectorAll('input[placeholder]');
  for (let i = 0; i < inputs.length; i += 1) {
    const newEl = document.createElement('div');
    newEl.textContent = inputs[i].getAttribute('placeholder');
    inputs[i].parentElement.insertBefore(newEl, inputs[i]);
  }
}

const SHOP_URL = 'https://shop.djnd.si';

const shop = axios.create({
  baseURL: `${SHOP_URL}/api`,
});

function sendConversion(price, callback) {
  gtag('event', 'conversion', {
    send_to: 'AW-809174714/xSraCMnfs4IBELqN7IED',
    value: price,
    currency: 'USD',
    transaction_id: '',
    event_callback: callback,
  });
}

function withTimeout(callback, timeout = 1000) {
  let called = false;
  function fn() {
    if (!called) {
      called = true;
      callback();
    }
  }
  setTimeout(fn, timeout);
  return fn;
}

const PRODUCT_ID = 8; // karte so id 8

async function getOrderKey() {
  const orderKey = cookies.get('order_key');
  if (!orderKey) {
    const res = await shop.get('/basket/');
    if (res.data && res.data.order_key) {
      cookies.set('order_key', res.data.order_key, { expires: 7 });
      return res.data.order_key;
    }
  }
  return orderKey;
}

async function addToBasket(id, orderKey) {
  const res = await shop.post('/add_to_basket/', {
    product_id: id,
    quantity: 1,
  }, {
    params: { order_key: orderKey },
  });
  if (res && res.data && res.data.items) {
    const item = res.data.items.find(i => i.article.id === id);
    if (item) {
      return [item.quantity, item.id, item.article.price];
    }
  }
  return [0, 0, 0];
}

async function getQuantityFromBasket(id, orderKey) {
  const res = await shop.get('/items/', {
    params: { order_key: orderKey },
  });
  if (res && res.data && res.data.length) {
    const item = res.data.find(i => i.article.id === id);
    if (item) {
      return [item.quantity, item.id, item.article.price];
    }
  }
  return [0, 0, 0];
}

async function updateBasket(basketId, quantity, orderKey) {
  const res = await shop.put(`/items/${basketId}/`, {
    quantity,
  }, {
    params: { order_key: orderKey },
  });
  if (res && res.data) {
    gtag('event', 'update_basket', {
      value: res.data.quantity,
    });
    return [res.data.quantity, basketId];
  }
  return [0, basketId];
}

function setButtonError() {
  const button = $('.js-submit-button');
  button.textContent = 'Napaka :(';
  button.className = button.className.replace('loading', '');
}

async function checkout(data, orderKey) {
  try {
    const price = Number($('.js-total-order').textContent);
    const res = await shop.post('/checkout/', data, {
      params: { order_key: orderKey },
    });
    if (res.data.upn_id) {
      const res2 = await axios.post(`${SHOP_URL}/poloznica/`, res.data);
      if (res2 && res2.status === 200) {
        cookies.remove('order_key');
        gtag('event', 'checkout_success_upn', {
          event_callback: withTimeout(() => {
            sendConversion(price, withTimeout(() => {
              window.location.href = `${data.success_url}?upn`;
            }));
          }),
        });
      } else {
        gtag('event', 'checkout_failed_poloznica');
        setButtonError();
      }
    } else if (res.data.redirect_url) {
      cookies.remove('order_key');
      gtag('event', 'checkout_success_paypal', {
        event_callback: withTimeout(() => {
          sendConversion(price, withTimeout(() => {
            window.location.href = `${res.data.redirect_url}`;
          }));
        }),
      });
    } else {
      gtag('event', 'checkout_failed');
      setButtonError();
    }
  } catch (error) {
    gtag('event', 'checkout_failed');
    gtag('event', 'exception', {
      description: error,
      fatal: true,
    });
    setButtonError();
  }
}

function showPrice(quantity, price) {
  $('.js-total-order').textContent = quantity * price;
}

safeAsync(async () => {
  let orderKey = await getOrderKey();
  let [quantity, basketId, price] = [0, 0, 0];
  try {
    [quantity, basketId, price] = await getQuantityFromBasket(PRODUCT_ID, orderKey);
  } catch (error) {
    cookies.remove('order_key');
    orderKey = await getOrderKey();
    [quantity, basketId, price] = await getQuantityFromBasket(PRODUCT_ID, orderKey);
  }

  if (!quantity || !basketId) {
    [quantity, basketId, price] = await addToBasket(PRODUCT_ID, orderKey);
  }

  const quantityInput = $('input[name="kolicina"]');
  quantityInput.value = quantity;

  showPrice(quantity, price);

  $('.js-button-minus').addEventListener('click', async () => {
    const val = Number(quantityInput.value);
    if (val > 1) {
      quantityInput.value = val - 1;
      [quantity, basketId] = await updateBasket(basketId, quantityInput.value, orderKey);
      showPrice(quantity, price);
    }
  });

  $('.js-button-plus').addEventListener('click', async () => {
    const val = Number(quantityInput.value);
    quantityInput.value = val + 1;
    [quantity, basketId] = await updateBasket(basketId, quantityInput.value, orderKey);
    showPrice(quantity, price);
  });

  $('.js-order-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const button = $('.js-submit-button');
    button.disabled = true;
    button.className += ' loading';

    const name = $('input[name="ime"]');
    const address = $('input[name="naslov"]');
    const address2 = $('input[name="naslov2"]');
    const email = $('input[name="email"]');
    const delivery = $('input[name="prevzem"]:checked');
    const payment = $('input[name="placilo"]:checked');
    const message = $('textarea[name="sporocilo"]');

    if (!name.trim() || !address.trim() || !address2.trim() || !email.trim()) {
      // eslint-disable-next-line no-alert
      return alert('Prosim izpolni polja za ime, naslov in e-pošto!');
    }

    const data = {
      payment_type: payment.value,
      name: name.value,
      address: `${address.value}, ${address2.value}`,
      phone: '',
      email: email.value,
      delivery_method: delivery.value,
      subscription: false,
      info: message.value,
      success_url: window.location.href.replace('/naroci/', '/hvala/'),
      fail_url: window.location.href,
    };

    checkout(data, orderKey);
  });
})();

