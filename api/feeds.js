import feedList from '../feedList';
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

function formatDescription(description) {
  let formatted = description.replace(/(<([^>]+)>)/ig, '').trim();
  if (formatted.length > 1000) {
    formatted = `${formatted.substring(0, 1000)}[...]`;
  }
  return formatted;
}

function extractContent(xml, feedIndex) {
  // TODO: lastBuildDate = xml.rss ? xml.rss.channel[0].lastBuildDate[0] : xml.feed.updated[0];
  const items = xml.rss ? xml.rss.channel[0].item : xml.feed.entry;
  return items.reduce((acc, item) => ([
    ...acc,
    {
      title: item.title[0],
      link: item.link[0].$ ? item.link[0].$.href : item.link[0],
      date: item.pubDate ? item.pubDate[0] : item.published[0] ? item.published[0] : item.published,
      description: formatDescription(item.description ? item.description[0] : item.content[0]._),
      image: item.enclosure ? item.enclosure[0].$.url : undefined,
      feed: feedIndex,
    }
  ]), []);
}

async function fetchFeeds(config) {
  return await Promise.all(
    Object.values(feedList).map(({ feed }, feedIndex) => (
      fetch(feed)
        .then(res => res.text())
        .then(body => parseStringPromise(body))
        .then(xml => extractContent(xml, feedIndex))
    ))
  )
    // Flat merge all the results
    .then(items => [].concat.apply([], items))
    // Sort by date
    .then(items => items.sort((a, b) => new Date(b.date) - new Date(a.date)))
    // Paginate
    .then(items => items.slice(0, config.offset))
}

module.exports = async (req, res) => {
  const { offset } = req.query;
  const items = await fetchFeeds({ offset });
  res.send(items);
}