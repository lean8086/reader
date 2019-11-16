import { feedList } from './feeds.js';
import { Feed } from './feed.mjs';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dev'];
function formatDate(date) {
  const d = new Date(date);
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  const h = d.getHours() % 12 || 12;
  const m = `0${d.getMinutes()}`.slice(-2);
  const time = `${h}:${m} ${ampm}`;
  const isFromToday = d.getDay() === new Date().getDay();
  return isFromToday ? time : `${months[d.getMonth()]} ${d.getDate()}, ${time}`;
}

export function More({ feed, ids }) {
  return `
    <button
      class="btn btn--more"
      data-action="more"
      ${ids ? `data-ids="${ids}"` : ''}
    >Load next</button>`;
}

export function Card({ link, title, author, feed, date, image, video, description }) {
  return `
    <article class="card">
      <h3 class="card__source gutter--h">
        ${Feed({
          name: Object.keys(feedList)[feed],
          id: Object.keys(feedList).indexOf(feed),
          className: 'feed--card',
          ...Object.values(feedList)[feed]
        })}
      </h3>
      <h2 class="card__title gutter--h">
        <a class="card__link" href=${link} target="_blank">${title}</a>
      </h2>
      <p class="card__author gutter--h">
        by ${author || Object.keys(feedList)[feed]}
        <span>&middot;</span>
        ${date ? `<time>${formatDate(date)}</time>` : ''}
      </p>
      ${video && video.url ? `
        <video class="card__video" controls>
          <source src="${video.url}" type="${video.type}"/>
        </video>
        ` :
          image ? `
          <a href=${link} target="_blank">
            <img class="card__image" src="${image}" loading="lazy"/>
          </a>` : ''
      }
      <p class="card__description gutter--h">${description}</p>
      <!--
      <aside class="card__actions gutter--h">
        <a class="btn btn--goto" href="${link}" target="_blank">Read more</a>
        ${navigator.share ? `
          <span>&middot;</span>
          <a class="btn btn--share" href="${link}" data-action="share">Share</button>
        ` : ''}
      </aside>
      -->
    </article>
  `;
}