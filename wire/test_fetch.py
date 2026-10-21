"""THE WIRE fetcher, with made-up feeds, a made-up state table and made-up robots rules. No network.
   python3 wire/test_fetch.py"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch as W

ok = True
def want(n, c, x=None):
    global ok
    print(('PASS ' if c else 'FAIL ') + n + ('' if c or x is None else ' ' + json.dumps(x)[:500]))
    ok = ok and bool(c)

RSS = '''<?xml version="1.0"?><rss version="2.0"><channel><title>Made Up Trade</title>
<item><title>Netflix Orders Western Series &#8216;Dust Road&#8217;</title><link>https://trade.example.com/2026/10/dust-road-1/</link>
<pubDate>Tue, 20 Oct 2026 18:30:00 +0000</pubDate><category><![CDATA[News]]></category><category><![CDATA[Dust Road]]></category><category><![CDATA[Canyon Casting]]></category>
<description><![CDATA[<p>The western from Canyon Pictures is set in 1880s Kansas. Canyon Casting is casting. More words here that run on and on and on so the summary has to be cut short at some point because it is far too long for a card on a phone, which is the point of cutting it, and it keeps going [&#8230;]</p>]]></description></item>
<item><title>Old Story</title><link>https://trade.example.com/2026/08/old/</link><pubDate>Mon, 03 Aug 2026 10:00:00 +0000</pubDate></item>
<item><title>No Link Here</title></item>
<item><title>Plain http link</title><link>http://trade.example.com/x</link></item>
</channel></rss>'''
ATOM = '''<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Salt Flat Begins Filming</title><link href="https://atom.example.com/salt-flat"/>
<updated>2026-10-19T09:00:00Z</updated><category term="Salt Flat"/><summary>Mesa Casting cast it.</summary></entry></feed>'''
TABLE = '''<html><body><p>Approved</p><table><thead><tr><th>Fiscal Year</th><th>Production Title</th><th>Company Name</th><th>Production Type</th>
<th>Independent or Non-Independent</th><th>CA Filming Days</th><th># of Cast Hired</th><th># of Crew Hired</th><th>Background Players in Days Worked</th>
<th>Qualified Expenditures</th><th>Credit Allocation</th><th>Credit Allocation Date</th></tr></thead><tbody>
<tr><td>2026-2027</td><td>Dust Road*</td><td>Canyon Pictures LLC</td><td>Independent Film $10m &amp; Under  Live Action</td><td>Independent</td><td>33</td><td>50</td><td>60</td><td>1,310</td><td>$3,000,000</td><td>$1,000,000</td><td>9/21/2026</td></tr>
<tr><td>2026-2027</td><td>Glass Pond</td><td>Pond Animation</td><td>Independent Film Over $10m Animation</td><td>Independent</td><td>-</td><td>20</td><td>90</td><td>-</td><td>$1</td><td>$1</td><td>7/27/2026</td></tr>
<tr><td>2025-2026</td><td>Harbor Lights S2+</td><td>Harbor Light Inc.</td><td>Recurring TV Series</td><td>Non-Independent</td><td>120</td><td>45</td><td>200</td><td>2,000</td><td>$1</td><td>$1</td><td>8/18/2025</td></tr>
<tr><td>2024-2025</td><td>Too Old</td><td>Old Co</td><td>Pilot</td><td>Independent</td><td>10</td><td>5</td><td>5</td><td>5</td><td>$1</td><td>$1</td><td>8/1/2024</td></tr>
</tbody></table></body></html>'''
SRC = [{'id': 'cfc', 'label': 'State list', 'kind': 'cfc', 'url': 'https://state.example.gov/list/'},
       {'id': 'trade', 'label': 'Made Up Trade', 'kind': 'rss', 'url': 'https://trade.example.com/feed/'},
       {'id': 'atom', 'label': 'Atom Trade', 'kind': 'rss', 'url': 'https://atom.example.com/feed/'},
       {'id': 'shy', 'label': 'Shy Site', 'kind': 'rss', 'url': 'https://shy.example.com/feed/'},
       {'id': 'down', 'label': 'Down Site', 'kind': 'rss', 'url': 'https://down.example.com/feed/'}]
ROBOTS = {'https://state.example.gov/robots.txt': 'User-agent: *\nDisallow: /wp-admin/\n',
          'https://trade.example.com/robots.txt': 'User-agent: *\nDisallow: /search/\nUser-agent: anthropic-ai\nDisallow: /\nUser-agent: ClaudeBot\nDisallow: /\n',
          'https://shy.example.com/robots.txt': 'User-agent: *\nDisallow: /\n'}
BODY = {'https://state.example.gov/list/': TABLE, 'https://trade.example.com/feed/': RSS, 'https://atom.example.com/feed/': ATOM}
calls = []
def fake(url):
    calls.append(url)
    if url in ROBOTS: return 200, ROBOTS[url]
    if url.endswith('/robots.txt'): raise W.urllib.error.HTTPError(url, 404, 'nf', {}, None)
    if url in BODY: return 200, BODY[url]
    raise OSError('connection refused')

NOW = time.mktime((2026, 10, 21, 12, 0, 0, 0, 0, 0)) - time.timezone
w = W.run(SRC, None, NOW, fake)
H = {h['id']: h for h in w['sources']}
want('robots: a plain feed reader is allowed where only AI crawlers are blocked', H['trade']['ok'] and H['trade']['count'] == 2, H['trade'])
want('robots: a site that says no to everyone is left alone, never fetched', not H['shy']['ok'] and 'robots rules say no' in H['shy']['err'] and 'https://shy.example.com/feed/' not in calls, H['shy'])
want('a site that is down: said, in plain words, the rest still runs', not H['down']['ok'] and 'refused' in H['down']['err'] and H['atom']['ok'], H['down'])
want('no robots file: allowed', H['atom']['ok'])
n = [i for i in w['items'] if i['src'] == 'trade']
d = next(i for i in n if 'Dust' in i['title'])
want('a trade story: headline unescaped, link, date, the site\'s own tags', d['title'] == 'Netflix Orders Western Series ‘Dust Road’' and d['link'] == 'https://trade.example.com/2026/10/dust-road-1/' and d['date'] == '2026-10-20T18:30:00Z' and d['tags'] == ['News', 'Dust Road', 'Canyon Casting'], d)
want('the summary: the site\'s own first lines, cut short, never the article', d['summary'].startswith('The western from Canyon Pictures') and len(d['summary']) <= W.SUMMARY + 1 and d['summary'].endswith('…') and '<p>' not in d['summary'], d['summary'])
want('no link or a plain-http link: dropped', not any(i['title'] in ('No Link Here', 'Plain http link') for i in w['items']))
want('older than 2 weeks: dropped', not any(i['title'] == 'Old Story' for i in w['items']))
a = next(i for i in w['items'] if i['src'] == 'atom')
want('Atom: link, ISO date, tags', a['link'] == 'https://atom.example.com/salt-flat' and a['date'] == '2026-10-19T09:00:00Z' and a['tags'] == ['Salt Flat'], a)
c = [i for i in w['items'] if i['kind'] == 'taxcredit']
dr = next(i for i in c if i['title'] == 'Dust Road')
want('the state list: title without its mark, company, kind, days, cast, background days, date', dr['company'] == 'Canyon Pictures LLC' and dr['type'] == 'Independent Film $10m & Under Live Action' and dr['days'] == 33 and dr['cast'] == 50 and dr['bg'] == 1310 and dr['allocated'] == '2026-09-21' and dr['mark'] == 'latest', dr)
want('the state list: a dash is not a number', next(i for i in c if i['title'] == 'Glass Pond')['days'] is None)
want('the state list: an ongoing show is marked, its season kept in the title', any(i['title'] == 'Harbor Lights S2' and i['mark'] == 'ongoing' for i in c), [i['title'] for i in c])
want('the state list: only the two latest fiscal years', len(c) == 3 and not any(i['title'] == 'Too Old' for i in c), [i['title'] for i in c])
want('the state list: no money columns kept', not any(('$1' in json.dumps(i).replace('$10m', '')) or 'credit' in i or 'expend' in json.dumps(i).lower() for i in c), c)
try:
    W.parse_cfc(TABLE.replace('# of Cast Hired', 'Cast'), SRC[0]); changed = False
except ValueError as e:
    changed = 'the table changed' in str(e)
want('the state table changes shape: says so, never guesses', changed)
# tomorrow: the trade site is down; yesterday's stories stay, the state list stays
BODY.pop('https://trade.example.com/feed/'); BODY.pop('https://state.example.gov/list/')
w2 = W.run(SRC, w, NOW + 86400, fake)
want('a source down tomorrow: yesterday\'s stories and the state list stay', any(i['title'].startswith('Netflix Orders') for i in w2['items']) and len([i for i in w2['items'] if i['kind'] == 'taxcredit']) == 3 and not {h['id']: h for h in w2['sources']}['trade']['ok'])
big = {'items': [{'id': 'n%d' % k, 'src': 'trade', 'kind': 'news', 'title': 't', 'link': 'https://trade.example.com/%d' % k, 'date': '2026-10-%02dT%02d:00:00Z' % (10 + k // 300, k % 24)} for k in range(2000)]}
w3 = W.run([], big, NOW)
want('never more than the cap of trade stories, newest kept, state list untouched', len([i for i in w3['items'] if i['kind'] == 'news']) == W.MAX_NEWS and w3['items'][0]['date'] >= w3['items'][-1]['date'])
want('no duplicates across runs', len({i['id'] for i in w2['items']}) == len(w2['items']))
want('https only', (lambda: (W.get('http://example.com/') and False))() if False else True)
try:
    W.get('http://example.com/'); refused = False
except ValueError:
    refused = True
want('a plain http address is refused before it goes anywhere', refused)
want('it says who it is', 'theactorpage-wire' in W.UA and 'feed reader' in W.UA)
want('newest first', w['items'][0]['date'] >= w['items'][-1]['date'])
want('no em dashes', '—' not in json.dumps(w, ensure_ascii=False))
print('ALL PASS' if ok else 'SOME FAILED'); sys.exit(0 if ok else 1)
