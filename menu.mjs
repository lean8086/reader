import { feedList, feedCategs } from './feeds.js';
import { Feed } from './feed.mjs';

const menu = document.querySelector('.menu');
const feedListKeys = Object.keys(feedList);
const feedListValues = Object.values(feedList);

menu.insertAdjacentHTML('beforeEnd', Object.keys(feedCategs).map(name => Categ({ name })).join(''));

export function Categ({ name }) {
  return `
    <section class="categ">
      <input class="categ__collapse" type="checkbox" id="${name}" hidden/>
      <label class="categ-header" for="${name}">
        <span class="categ-header__button">&#9654;</span>
        <h3 class="categ-header__name menu__text">
          <span class="categ-header__icon">${feedCategs[name].icon}</span>
          ${name}
        </h3>
      </label>
      <div class="categ-content">
        <!-- <a class="feed feed--menu menu__text" href="#" data-action="categ" data-categ="${name}">
          All updates
        </a> -->
        ${feedCategs[name].feeds
          .split(',')
          .sort((a, b) => feedListKeys[a] < feedListKeys[b] ? -1 : feedListKeys[a] > feedListKeys[b])
          .map(feedIndex => Feed({
            className: 'feed--menu menu__text',
            name: feedListKeys[feedIndex],
            id: feedIndex,
            ...feedListValues[feedIndex],
          }))
          .join('')
        }
      </div>
    </section>
  `;
};