import { setPage, getPage } from './store.mjs';
import { fetchAndRender } from './fetch.mjs';

document.body.addEventListener('click', (ev) => {
  const { dataset } = ev.target;
  if (!dataset.action) { return; }
  switch (dataset.action) {
    case 'feed':
      ev.preventDefault();
      setPage(1);
      fetchAndRender({ ids: dataset.ids });
      break;
    case 'categ':
      ev.preventDefault();
      setPage(1);
      fetchAndRender({ ids: feedCategs[dataset.categ].feeds });
      break;
    case 'more':
      ev.stopPropagation();
      setPage(getPage() + 1);
      fetchAndRender({ ids: dataset.ids });
      break;
    case 'all':
      setPage(1);
      fetchAndRender();
      break;
    case 'share':
      ev.preventDefault();
      navigator.share({ url: ev.target.href });
      break;
    default:
      return;
      break;
  }
});

export function Feed({ domain, icon, name, id, className }) {
  return `
    <a
      href=${domain}
      class="feed${className ? ` ${className}` : ''}"
      target="_blank"
      data-action="feed"
      data-ids="${id}"
    >
      <img
        src="${!icon ? `${domain}/favicon.ico` : icon}"
        class="feed__icon"
      />
      <span class="feed__name">${name}</span>
    </a>
  `;
};