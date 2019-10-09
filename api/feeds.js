import feedList from '../feedList';
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

const blacklist = new RegExp([
  'Read more...',
  'Continue reading&hellip;',
  'Â'
].join('|'));

function formatDescription(description) {
  return description
    // Strip HTML
    .replace(/(<([^>]+)>)/ig, '')
    // Avoid bad patterns
    .replace(blacklist, '')
    // Normalize whitespaces
    .replace(/(\s\s+)|&nbsp;/g, ' ')
    // Keep the first sentence
    .split('. ')[0].concat('.')
    // Trim ;)
    .trim();
}

function extractImage(item, description) {
  // 1. <enclosure>
  return item.enclosure && item.enclosure[0].$.type.includes('image') ?
    item.enclosure[0].$.url :
    // 2. <media:content>
    item['media:content'] && item['media:content'][0].$.type.includes('image') ?
      item['media:content'][0].$.url :
      // 3. <description>...<img src="...">
      /<img/i.test(description) ?
        /<img.+?src=[\"'](.+?)[\"']/i.exec(description)[1] :
        // 4. No image at all
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
        link: item.link[0].$ ? item.link[0].$.href : item.link[0],
        date: item.pubDate ? item.pubDate[0] : item.published[0] ? item.published[0] : item.published,
        description: formatDescription(description),
        image: extractImage(item, description),
        feed: feedIndex,
      }
    ];
  }, []);
}

function fetchOne(feedName) {
  const feedIndex = Object.keys(feedList).indexOf(feedName);
  return fetch(feedList[feedName].feed)
    .then(res => res.text())
    .then(body => parseStringPromise(body))
    .then(xml => extractContent(xml, feedIndex))
    .catch(() => {});
}

function fetchAll() {
  return Promise.all(
    Object.values(feedList).map(({ feed }, feedIndex) => {
      return fetch(feed)
        .then(res => res.text())
        .then(body => parseStringPromise(body))
        .then(xml => extractContent(xml, feedIndex))
        .catch(() => {});
    })
  );
}

module.exports = async (req, res) => {
  const {
    offset = 10,
    page = 1,
    feed,
  } = req.query;
  const fetchItems = feed ? fetchOne : fetchAll;
  let items = await fetchItems(feed);
  // Flat merge all the results
  items = [].concat.apply([], items);
  // Sort by date
  items = items.sort((a, b) => new Date(b.date) - new Date(a.date));
  // Paginate
  items = items.slice(offset * (page - 1), offset * page);
  res.send(items);
};
