/* eslint-disable */
(function cookies() {
  decodeURIComponent(document.cookie).split(';')
    .forEach(function (c) {
      if (c.trim() === 'cookieconsent=1') {
        document.body.className += ' has-cookie-consent';
      }
    });
  document.querySelector('.cookie-container').style.display = '';
  document.querySelector('.cookie-warning button')
    .addEventListener('click', function onClick() {
      document.querySelector('.cookie-container').style.display = 'none';
      var d = new Date();
      d.setTime(d.getTime() + 8e10);
      var expires = 'expires=' + d.toUTCString();
      document.cookie = 'cookieconsent=1;' + expires + ';path=/';
    });
}());
