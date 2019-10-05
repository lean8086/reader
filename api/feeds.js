import feedList from '../feedList';
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

const blacklist = new RegExp([
  'Read more...',
  'Continue reading&hellip;',
].join('|'));

function formatDescription(description) {
  let formatted = description.replace(/(<([^>]+)>)/ig, '').replace(blacklist, '').trim();
  if (formatted.length > 256) {
    formatted = `${formatted.substring(0, 256)}[...]`;
  }
  return formatted;
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
        image: item.enclosure && item.enclosure[0].$.type.includes('image') ?
          item.enclosure[0].$.url :
          /<img/i.test(description) ?
            /<img[^>]+src="?([^"\s]+)"?\s*\/>/i.exec(description)[1] :
            undefined,
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
  const { offset = 10, feed } = req.query;
  const fetchItems = feed ? fetchOne : fetchAll;
  let items = await fetchItems(feed);
  // Flat merge all the results
  items = [].concat.apply([], items);
  // Sort by date
  items = items.sort((a, b) => new Date(b.date) - new Date(a.date));
  // Paginate
  items = items.slice(0, offset);
  res.send(items);
};
