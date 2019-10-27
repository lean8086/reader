import { feedList } from '../feeds';
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

function formatDescription(description) {
  const sanitized = description
    // Strip HTML
    .replace(/(<([^>]+)>)/ig, '')
    // Avoid bad patterns
    .replace(new RegExp([
      'Read more...',
      'Continue reading&hellip;', // Polygon
      'Â',
    ].join('|'), 'ig'), '')
    // Normalize whitespaces
    .replace(/(\s\s+)|&nbsp;/g, ' ')
    .trim()
    .substr(0, 480);

  const short = sanitized.substr(0, 160);

  // Cut the length based on the last dot of the short description
  return short.lastIndexOf('.') > 0 ?
    short.substr(0, short.lastIndexOf('.') + 1) :
    // or cut on the last dot of the long description
    sanitized.lastIndexOf('.') > 0 ?
      sanitized.substr(0, sanitized.lastIndexOf('.') + 1) :
      // or default
      sanitized;
}

function extractSrc(str) {
  const src = /<img.+?src=[\"'](.+?)[\"']/i.exec(str)[1];
  // Avoid to get not desired images from special tags
  return src && !new RegExp([
    'feedburner',
    '.svg',
    'images\/logo',
  ].join('|', 'ig')).test(src) ? src : undefined;
}

function extractVideo(item) {
  // 1. <enclosure>
  return item.enclosure && item.enclosure[0].$.type && item.enclosure[0].$.type.includes('video') ?
    { url: item.enclosure[0].$.url, type: item.enclosure[0].$.type } :
    undefined;
}

function extractImage(item, description) {
  // 1. <enclosure>
  return item.enclosure && item.enclosure[0].$.type && item.enclosure[0].$.type.includes('image') ?
    item.enclosure[0].$.url :
    // 2. <media:thumbnail>
    item['media:thumbnail'] ?
      item['media:thumbnail'][0].$.url :
      // 3. <media:content>
      item['media:content'] && item['media:content'][0].$.type && item['media:content'][0].$.type.includes('image') ?
        item['media:content'][0].$.url :
        // 4. <content:encoded>...<img src="...">
        item['content:encoded'] && /<img/i.test(item['content:encoded']) ?
          extractSrc(item['content:encoded']) :
          // 5. <description>...<img src="...">
          /<img/i.test(description) ?
            extractSrc(description) :
            // 6. No image at all
            undefined;
}

function extractAuthor(item) {
  // 1. <author>
  const a = item.author ?
    item.author.map(a => a.name || a).join(', ') :
    // 2. <dc:creator>
    item['dc:creator'] && item['dc:creator'][0]._ ?
      item['dc:creator'][0]._ :
      item['dc:creator'] ?
        item['dc:creator'].join(', ') :
        undefined;
  // Avoid empty string
  return a && a.length ? a : undefined;
}

function extractDate(item) {
  // 1. <pubdate>
  return item.pubDate ?
    item.pubDate[0] :
    // 2. <published>
    item.published ?
      item.published[0] || item.published :
      // 3. Not date at all?
      undefined;
}

function extractContent(xml, feedIndex) {
  // TODO: lastBuildDate = xml.rss ? xml.rss.channel[0].lastBuildDate[0] : xml.feed.updated[0];
  const items = xml.rss ? xml.rss.channel[0].item : xml.feed.entry;
  return items.reduce((acc, item) => {
    const description = item.description ? item.description[0] : item.content[0]._;
    return [
      ...acc,
      {
        title: item.title[0],
        author: extractAuthor(item),
        link: item.link[0].$ ? item.link[0].$.href : item.link[0],
        date: extractDate(item),
        description: formatDescription(description),
        image: extractImage(item, description),
        video: extractVideo(item),
        feed: feedIndex,
      }
    ];
  }, []);
}

function f(url, feedIndex) {
  return fetch(url)
    .then(res => res.text())
    .then(body => parseStringPromise(body))
    .then(xml => extractContent(xml, feedIndex))
    .catch(() => {});
}

function fetchAll() {
  return Promise.all(
    Object.values(feedList)
      .map(({ feed }, feedIndex) => f(feed, feedIndex))
  );
}

function fetchById(ids) {
  const indexes = ids.split(',');
  return Promise.all(
    Object.values(feedList)
      .filter((_, i) => indexes.includes(i.toString()))
      .map(({ feed }, feedIndex) => f(feed, indexes[feedIndex]))
  );
}

module.exports = async (req, res) => {
  const { limit = 10, page = 1, ids } = req.query;
  const t0 = new Date();
  // Get by ids / all
  let items = ids ? await fetchById(ids) : await fetchAll();
  // Flat merge all the results
  items = [].concat.apply([], items);
  // Sort by date
  items = items.sort((a, b) => new Date(b.date) - new Date(a.date));
  // Paginate
  const data = items.slice(limit * (page - 1), limit * page);

  res.send({
    total: items.length,
    data,
    ms: new Date() - t0,
  });
};
