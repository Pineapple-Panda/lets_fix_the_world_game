import type { LaunchedGame } from '../models/launched.model.ts';
import {
  dataCentersActive, greenDataCenters, inProtest, lawsuitCase, mediatorsTrained, product, productDefinition,
  programDefinition, robotsOnSite, tegridyActive, worldFixed
} from './launched.ts';

/** One line in the level 2 news ticker. */
export interface NewsLine {
  text: string;
  /** Breaking news (lawsuits, protests) is shown as an alert. */
  breaking: boolean;
}

/** A new headline every this many seconds. */
export const newsInterval = 12;

type Headline = [when: (state: LaunchedGame) => boolean, text: string];

const always = () => true;
const progress = (state: LaunchedGame) => state.worldProgress;
const running = (state: LaunchedGame, id: string) => state.programs.some(entry => entry.id === id);

/** Headlines and the moment they become news. The ticker picks from those that fit the current state. */
const headlines: Headline[] = [
  [always, 'Survey: 9 out of 10 bugs prefer being fixed by a platform that is already in production.'],
  [always, 'Stock markets nervous: someone is apparently fixing things on purpose.'],
  [always, 'Think tank publishes a 400-page report concluding that reports are rarely read.'],
  [always, 'Local man asks his smart fridge for life advice. Fridge recommends drinking more water.'],
  [state => progress(state).climate < 30, 'Heatwave declared "the new normal". Normal files a complaint.'],
  [state => progress(state).climate >= 30, 'Ski resorts cautiously optimistic: snow spotted in winter again.'],
  [state => progress(state).climate >= 70, 'Oil giant rebrands as "Sunshine & Breezes Ltd". Shareholders confused but delighted.'],
  [state => progress(state).climate >= 100, 'Climate summit cancelled: nothing left to discuss. Delegates take the train home anyway.'],
  [state => progress(state).war < 30, 'Defence ministers meet to discuss peace, agree to meet again with more tanks.'],
  [state => progress(state).war >= 50, 'Arms fair downsized to a single folding table.'],
  [state => progress(state).war >= 100, 'Last general on Earth retires to grow roses. They are reportedly very disciplined.'],
  [state => progress(state).hunger >= 50, 'Food banks report record-short queues. Volunteers start a book club instead.'],
  [state => progress(state).hunger >= 100, 'Dictionary considers dropping the word "famine" for lack of use.'],
  [state => progress(state).poverty >= 50, 'Landlord association warns that affordable rent "could become a habit".'],
  [state => progress(state).poverty >= 100, 'Billionaire forced to fly economy, calls the experience "humbling and cramped".'],
  [state => progress(state).corruption >= 50, 'Ministers report a sudden, unexplained urge to keep receipts.'],
  [state => progress(state).corruption >= 100, 'Brown envelopes discontinued due to falling demand.'],
  [state => state.integrity < 20, 'Poll: your platform is now trusted slightly less than a used-car salesman with a cold.'],
  [state => state.integrity > 80, 'Your platform voted "most trustworthy thing on the internet", narrowly beating cat videos.'],
  [state => state.rentals.includes('edisonx'), 'EdisonX founder posts "I invented integrity", deletes it 40 seconds later.'],
  [state => state.rentals.includes('nsa'), 'Totally unrelated: every webcam light on the planet blinked at the same time.'],
  [state => state.rentals.includes('green-left-union'), 'Green-Left Union celebrates the partnership with an organic, fair-trade cake.'],
  [tegridyActive, 'Colorado farm reports a record harvest of "Tegridy". Experts remain unsure what it is.'],
  [state => running(state, 'high-tech-weapons'), 'Your new attack drones win a design award. Nobody asks what they are designed for.'],
  [state => running(state, 'greenwashing-campaign'), 'Fact-checkers confirm: painting a coal plant green does not count.'],
  [state => running(state, 'tax-the-rich'), 'Yacht sales collapse. Harbours report a sudden surplus of parking space.'],
  [state => state.stats.lawsuits >= 3, 'Your legal department requests a bigger coffee machine and a smaller sense of irony.'],
  [state => state.stats.protestClicks >= 100, 'Protest movement thanks you for "genuinely listening, at least a hundred times".'],
  [dataCentersActive, 'Your data centre is so efficient it apologises for idling.'],
  [greenDataCenters, 'Data centres now run on sunshine. Servers report a noticeably better mood.'],
  [mediatorsTrained, 'Mediators resolve a protest and a 30-year family feud on the same afternoon.'],
  [robotsOnSite, 'Witnesses describe the riot-control robots as "polite, tireless and very large", from a safe distance.'],
  [state => !!product(state, 'green-world'), 'Green World tops the app charts, just ahead of an app that tells you it is raining.'],
  [state => !!product(state, 'fair-share'), 'Fair Share delivers its billionth meal. The courier still asks for directions.'],
  [state => !!product(state, 'peace-integrity'), 'Peace & Integrity accused of "ruining a perfectly good arms race".'],
  [worldFixed, 'Nothing bad happened today. Newspapers struggle to fill page one.']
];

/** Small integer hash so each time slot picks a stable, but varied headline. */
function hash(value: number): number {
  let x = (value + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

/** Breaking news about the current state: an open lawsuit and programs blocked by protests. */
export function breakingNews(state: LaunchedGame): NewsLine[] {
  const lines: NewsLine[] = [];
  const lawsuit = lawsuitCase(state);
  if (lawsuit) {
    const target = lawsuit.products ? 'all three of your applications' : productDefinition(lawsuit.product)?.name ?? lawsuit.product;
    lines.push({ text: `BREAKING: ${lawsuit.plaintiff} sues ${target}.`, breaking: true });
  }
  for (const entry of state.programs.filter(inProtest)) {
    lines.push({ text: `BREAKING: Protesters block "${programDefinition(entry.id)?.name ?? entry.id}".`, breaking: true });
  }
  return lines;
}

/** The ticker: breaking news first, then the latest headlines (newest on top), one new headline every 12 seconds. */
export function newsFeed(state: LaunchedGame, count = 3): NewsLine[] {
  const pool = headlines.filter(([when]) => when(state)).map(([, text]) => text);
  const slot = Math.floor(state.seconds / newsInterval);
  const recent: string[] = [];
  for (let back = 0; recent.length < count && back <= slot && back < count * 4; back++) {
    const text = pool[hash(slot - back) % pool.length]!;
    if (!recent.includes(text)) recent.push(text);
  }
  return [...breakingNews(state), ...recent.map(text => ({ text, breaking: false }))];
}
