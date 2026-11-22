// Поиск постера фильма в Википедии: без ключей и аккаунтов.
// IMDb id → элемент Wikidata (свойство P345) → статья в английской или русской Википедии →
// картинка из её инфобокса. Постеры там несвободные (fair use), поэтому нужен pilicense=any,
// и хранятся они уменьшенными — для приложения этого хватает.
// origin=* разрешает анонимные запросы к API из браузера (CORS).

const WIKIS = ['en', 'ru'];

export interface PosterQuery {
  imdb: string;
  title: string;
  year: string;
}

export interface FoundPoster {
  blob: Blob;
  page: string;   // адрес статьи, из которой взят постер
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const api = (host: string, params: Record<string, string>) =>
  `https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', origin: '*', ...params }).toString();

// Статьи о фильме по языкам: { en: 'Licorice Pizza', ru: 'Лакричная пицца' }
async function articlesByImdb(imdbId: string): Promise<Record<string, string>> {
  const search = await getJson(api('www.wikidata.org', {
    action: 'query', list: 'search', srsearch: `haswbstatement:P345=${imdbId}`, srlimit: '1',
  }));
  const qid: string | undefined = search?.query?.search?.[0]?.title;
  if (!qid) return {};
  const entity = await getJson(api('www.wikidata.org', {
    action: 'wbgetentities', ids: qid, props: 'sitelinks', sitefilter: WIKIS.map(w => `${w}wiki`).join('|'),
  }));
  const links = entity?.entities?.[qid]?.sitelinks ?? {};
  const out: Record<string, string> = {};
  for (const w of WIKIS) if (links[`${w}wiki`]?.title) out[w] = links[`${w}wiki`].title;
  return out;
}

// Без IMDb: первая статья поиска «название год film» в английской Википедии
async function articleByTitle(title: string, year: string): Promise<Record<string, string>> {
  const search = await getJson(api('en.wikipedia.org', {
    action: 'query', list: 'search', srsearch: `${title} ${year} film`.trim(), srlimit: '1',
  }));
  const found: string | undefined = search?.query?.search?.[0]?.title;
  return found ? { en: found } : {};
}

async function pageImage(wiki: string, title: string): Promise<string | null> {
  const data = await getJson(api(`${wiki}.wikipedia.org`, {
    action: 'query', prop: 'pageimages', titles: title, redirects: '1',
    piprop: 'original|thumbnail', pithumbsize: '600', pilicense: 'any',
  }));
  const pages = Object.values(data?.query?.pages ?? {}) as any[];
  const page = pages[0];
  return page?.thumbnail?.source ?? page?.original?.source ?? null;
}

export async function findWikipediaPoster(q: PosterQuery): Promise<FoundPoster | null> {
  const imdbId = q.imdb.match(/\btt\d{5,}\b/)?.[0];
  let articles: Record<string, string> = {};
  if (imdbId) articles = await articlesByImdb(imdbId);
  else if (q.title.trim()) articles = await articleByTitle(q.title.trim(), q.year.trim());

  for (const wiki of WIKIS) {
    const title = articles[wiki];
    if (!title) continue;
    const src = await pageImage(wiki, title);
    if (!src || /\.svg(\.png)?$/i.test(src)) continue;
    const res = await fetch(src);
    if (!res.ok) continue;
    return {
      blob: await res.blob(),
      page: `https://${wiki}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    };
  }
  return null;
}
