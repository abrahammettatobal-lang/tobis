import * as cheerio from 'cheerio';

const url =
  'https://www.livescore.com/en/football/international/world-cup-2026/mexico-vs-south-africa/1417909/';
const response = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
});
const html = await response.text();
const $ = cheerio.load(html);
const raw = $('#__NEXT_DATA__').html();
if (!raw) {
  console.log('no data');
  process.exit(0);
}
const data = JSON.parse(raw);
const pp = data.props.pageProps;
console.log('keys', Object.keys(pp));
const event = pp.initialEventData?.event;
console.log('event keys with data', Object.keys(event || {}).filter(k => event[k] && typeof event[k] === 'object' && Object.keys(event[k]).length));
if (event?.lineups) console.log('event.lineups', JSON.stringify(event.lineups).slice(0,5000));
if (event?.incidents) console.log('incidents sample', JSON.stringify(event.incidents).slice(0,4000));
