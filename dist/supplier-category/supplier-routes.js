/* Compatibility loader for already-generated supplier route pages. */
(function () {
  const request = new XMLHttpRequest();
  const source = new URL('../wedding-suppliers/supplier-routes.js', document.currentScript.src);
  request.open('GET', source.href, false);
  request.send();
  if (request.status >= 200 && request.status < 300) (0, eval)(request.responseText);
}());
