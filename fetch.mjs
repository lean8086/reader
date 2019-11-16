import { getPage } from './store.mjs';
import { More, Card } from './container.mjs';

const menuCollapse = document.querySelector('#menu-collapse');
const container = document.querySelector('.main__container');
const limit = 20;

export function fetchAndRender(config = {}) {
  menuCollapse.checked = false;
  container.innerHTML = '<h2 class="card__title gutter--h">Loading...</h2>';
  fetch(`/api/feeds?limit=${limit}&page=${getPage()}${config.ids ? `&ids=${config.ids}` : ''}`)
    .then(res => res.json())
    .then(res => ({ ...res, items: res.data.map(Card) }))
    .then(res => container.innerHTML = `
      ${res.items.join('')}
      ${res.total > limit ? More({ ids: config.ids }) : ''}
    `);
};