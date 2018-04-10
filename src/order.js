import 'core-js/modules/es6.promise';
import 'core-js/modules/es6.array.find';
import cookies from 'js-cookie';
import axios from 'axios';

// eslint-disable-next-line no-console
const safeAsync = fn => (...args) => fn(...args).catch(err => console.error('Async Error', err));

const $ = selector => document.querySelector(selector);

const SHOP_URL = 'https://shop.knedl.si';

const shop = axios.create({
  baseURL: `${SHOP_URL}/api`,
});

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
    return [res.data.quantity, basketId];
  }
  return [0, basketId];
}

async function checkout(data, orderKey) {
  const res = await shop.post('/checkout/', data, {
    params: { order_key: orderKey },
  });
  if (res.data.upn_id) {
    const res2 = await axios.post(`${SHOP_URL}/poloznica/`, res.data);
    if (res2 && res2.status === 200) {
      cookies.remove('order_key');
      window.location.href = `${data.success_url}?upn`;
    }
  } else if (res.data.redirect_url) {
    window.location.href = `${res.data.redirect_url}`;
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

  $('.js-order-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    $('.js-submit-button').disabled = true;

    const name = $('input[name="ime"]');
    const address = $('input[name="naslov"]');
    const address2 = $('input[name="naslov2"]');
    const email = $('input[name="email"]');
    const delivery = $('input[name="prevzem"]:checked');
    const payment = $('input[name="placilo"]:checked');
    const message = $('textarea[name="sporocilo"]');

    const data = {
      payment_type: payment.value,
      name: name.value,
      address: `${address.value}, ${address2.value}`,
      phone: '',
      email: email.value,
      delivery_method: delivery.value,
      subscription: false,
      info: message.value,
      success_url: `${window.location.origin}${window.location.pathname}hvala/`,
      fail_url: window.location.href,
    };

    await checkout(data, orderKey);
  });
})();

