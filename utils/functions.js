function htmlToWhatsApp(text) {
  if (!text) return '';

  return String(text)
    .replace(/<b>(.*?)<\/b>/gis, '*$1*')
    .replace(/<strong>(.*?)<\/strong>/gis, '*$1*')
    .replace(/<code>(.*?)<\/code>/gis, '`$1`')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '');
}

module.exports = {
  htmlToWhatsApp,
};
