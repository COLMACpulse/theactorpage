"""THE WIRE: the JUICE fetcher. Runs on GitHub once a day (and when asked), never on anyone's phone.

It reads only the sources in sources.json, only over https, only what each site's robots rules allow for a plain
feed reader, and it says who it is. From the trades it keeps what a feed app shows: the headline, the link, the
date, the site's own tags and the first lines of the site's own summary. From the California Film Commission it
keeps the public tax-credit list: title, company, kind of job, filming days in California, cast hired, background
days, and the allocation date. No money columns, no full articles.

Out: one public file, wire.json. Every phone that turns JUICE on downloads the same file, so the fetcher never
knows who is asking. Matching to an actor happens on the phone. Standard library only.

  python3 wire/fetch.py OUT_DIR [PREVIOUS_wire.json]
"""
import json, re, sys, html, hashlib, time, datetime, urllib.request, urllib.robotparser, urllib.parse, os
from email.utils import parsedate_to_datetime

UA = 'theactorpage-wire/1.0 (feed reader for actors; +https://colmacpulse.github.io/theactorpage/privacy/)'
MAX_BYTES = 4 * 1024 * 1024
TIMEOUT = 30
KEEP_DAYS = 21                 # trade stories older than this drop off
CFC_YEARS = 2                  # the two latest fiscal years of the state list
SUMMARY = 280                  # characters of the site's own summary, at most
HERE = os.path.dirname(os.path.abspath(__file__))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """A redirect to another site is refused; same-site https only."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        a, b = urllib.parse.urlsplit(req.full_url), urllib.parse.urlsplit(newurl)
        if b.scheme != 'https' or b.hostname != a.hostname:
            raise urllib.error.HTTPError(newurl, code, 'redirect to another site refused', headers, fp)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def get(url, opener=None):
    if urllib.parse.urlsplit(url).scheme != 'https':
        raise ValueError('https only')
    opener = opener or urllib.request.build_opener(NoRedirect)
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    with opener.open(req, timeout=TIMEOUT) as r:
        body = r.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            raise ValueError('too big')
        return r.status, body.decode(r.headers.get_content_charset() or 'utf-8', 'replace')


def allowed(url, robots_text):
    """What the site's robots rules say for this reader. No rules file: allowed."""
    rp = urllib.robotparser.RobotFileParser()
    rp.parse((robots_text or '').splitlines())
    return rp.can_fetch(UA, url)


def text(s):
    s = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', s or '', flags=re.S)
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s))
    return re.sub(r'\s+', ' ', s).strip()


def iso(d):
    if not d:
        return ''
    try:
        return parsedate_to_datetime(d).astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    except Exception:
        pass
    m = re.match(r'(\d{4}-\d\d-\d\d)(?:[T ](\d\d:\d\d(?::\d\d)?))?', d.strip())
    return (m.group(1) + 'T' + ((m.group(2) or '00:00') + ':00')[:8] + 'Z') if m else ''


def cut(s, n=SUMMARY):
    t = re.sub(r'\s*\[(?:&#8230;|…|\.\.\.)\]\s*$', '', s).strip()
    more = t != s.strip()
    s = t
    if len(s) <= n:
        return s + ('…' if more else '')
    s = s[:n].rsplit(' ', 1)[0]
    return s.rstrip(',;:') + '…'


def parse_rss(body, src):
    """RSS 2.0 or Atom -> items. Tags are the site's own categories (Deadline tags the project's title)."""
    out = []
    for raw in re.findall(r'<item\b.*?</item>|<entry\b.*?</entry>', body, re.S | re.I):
        tag = lambda n: (re.search(r'<' + n + r'\b[^>]*>(.*?)</' + n + '>', raw, re.S | re.I) or [None, ''])[1]
        link = text(tag('link'))
        if not link:
            m = re.search(r'<link\b[^>]*href="([^"]+)"', raw, re.I)
            link = m.group(1) if m else ''
        title = text(tag('title'))
        if not title or not link.startswith('https://'):
            continue
        tags = [text(c) for c in re.findall(r'<category\b[^>]*>(.*?)</category>', raw, re.S | re.I)]
        tags += [html.unescape(t) for t in re.findall(r'<category\b[^>]*term="([^"]+)"', raw, re.I)]
        out.append({'id': hashlib.sha1(link.encode()).hexdigest()[:12], 'src': src['id'], 'kind': 'news',
                    'title': title, 'link': link, 'date': iso(text(tag('pubDate')) or text(tag('published')) or text(tag('updated'))),
                    'tags': [t for i, t in enumerate(tags) if t and t not in tags[:i]][:12],
                    'summary': cut(text(tag('description')) or text(tag('summary')))})
    return out


MARKS = {'*': 'latest', '**': 'relocating', '***': 'soundstage', '+': 'ongoing'}


def parse_cfc(body, src, years=CFC_YEARS):
    """The California Film Commission's approved projects table -> one item per row, latest fiscal years only."""
    t = re.search(r'<table\b.*?</table>', body, re.S | re.I)
    if not t:
        raise ValueError('no table on the page')
    t = t.group(0)
    head = [text(h).lower() for h in re.findall(r'<th\b[^>]*>(.*?)</th>', t, re.S | re.I)]
    need = {'fiscal year': 'fy', 'production title': 'title', 'company name': 'company', 'production type': 'type',
            'ca filming days': 'days', '# of cast hired': 'cast', 'background players in days worked': 'bg',
            'credit allocation date': 'allocated'}
    col = {}
    for k, v in need.items():
        if k not in head:
            raise ValueError('the table changed: no "' + k + '" column')
        col[v] = head.index(k)
    rows = []
    for r in re.findall(r'<tr\b[^>]*>(.*?)</tr>', t, re.S | re.I):
        c = [text(x) for x in re.findall(r'<td\b[^>]*>(.*?)</td>', r, re.S | re.I)]
        if len(c) < len(head):
            continue
        rows.append(c)
    fys = sorted({r[col['fy']] for r in rows if re.match(r'^\d{4}-\d{4}$', r[col['fy']])}, reverse=True)[:years]
    out = []
    for r in rows:
        if r[col['fy']] not in fys:
            continue
        m = re.search(r'\s*([*+#?/]+)\s*$', r[col['title']])
        title = r[col['title']][:m.start()].strip() if m else r[col['title']].strip()
        num = lambda v: int(re.sub(r'[^\d]', '', v)) if re.search(r'\d', v or '') else None
        mo = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', r[col['allocated']])
        allocated = '%s-%02d-%02d' % (mo.group(3), int(mo.group(1)), int(mo.group(2))) if mo else ''
        key = (title + '|' + r[col['company']] + '|' + allocated).lower()
        out.append({'id': 'cfc' + hashlib.sha1(key.encode()).hexdigest()[:10], 'src': src['id'], 'kind': 'taxcredit',
                    'title': title, 'company': r[col['company']], 'type': re.sub(r'\s+', ' ', r[col['type']]),
                    'fy': r[col['fy']], 'allocated': allocated, 'date': allocated + 'T00:00:00Z' if allocated else '',
                    'days': num(r[col['days']]), 'cast': num(r[col['cast']]), 'bg': num(r[col['bg']]),
                    'mark': MARKS.get(m.group(1)) if m else '', 'link': src['url']})
    return out


def run(sources, prev=None, now=None, get_=get):
    now = now or time.time()
    health, items = [], []
    robots = {}
    for s in sources:
        h = {'id': s['id'], 'label': s['label'], 'home': s.get('home', ''), 'ok': False, 'count': 0, 'err': ''}
        try:
            host = urllib.parse.urlsplit(s['url'])
            rurl = host.scheme + '://' + host.netloc + '/robots.txt'
            if rurl not in robots:
                try:
                    robots[rurl] = get_(rurl)[1]
                except urllib.error.HTTPError as e:
                    robots[rurl] = '' if e.code in (404, 410) else None
            if robots[rurl] is None:
                raise ValueError('could not read its robots rules, so it was left alone')
            if not allowed(s['url'], robots[rurl]):
                raise ValueError('its robots rules say no to a feed reader, so it was left alone')
            status, body = get_(s['url'])
            got = parse_cfc(body, s) if s['kind'] == 'cfc' else parse_rss(body, s)
            items += got
            h.update(ok=True, count=len(got))
        except Exception as e:
            h['err'] = str(e)[:160] or e.__class__.__name__
        health.append(h)
    # trade stories from the last runs stay for KEEP_DAYS; a source that failed today keeps yesterday's
    cutoff = now - KEEP_DAYS * 86400
    have = {i['id'] for i in items}
    failed = {h['id'] for h in health if not h['ok']}
    for i in (prev or {}).get('items', []):
        if i['id'] in have:
            continue
        if i.get('kind') == 'news' or i.get('src') in failed:
            items.append(i); have.add(i['id'])

    def ts(i):
        try:
            return datetime.datetime.strptime(i.get('date', '')[:19], '%Y-%m-%dT%H:%M:%S').replace(tzinfo=datetime.timezone.utc).timestamp()
        except Exception:
            return now
    items = [i for i in items if i.get('kind') != 'news' or ts(i) >= cutoff]
    items.sort(key=lambda i: (i.get('date', ''), i['id']), reverse=True)
    return {'v': 1, 'at': datetime.datetime.fromtimestamp(now, datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'sources': health, 'items': items,
            'note': 'Public headlines, links, tags and short summaries from each site, plus the California Film Commission tax-credit list. Every phone downloads this same file.'}


if __name__ == '__main__':
    out = sys.argv[1]
    prev = None
    if len(sys.argv) > 2 and os.path.exists(sys.argv[2]):
        try:
            prev = json.load(open(sys.argv[2]))
        except Exception:
            prev = None
    sources = json.load(open(os.path.join(HERE, 'sources.json')))
    w = run(sources, prev)
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, 'wire.json'), 'w') as f:
        json.dump(w, f, ensure_ascii=False, separators=(',', ':'))
    for h in w['sources']:
        print(('OK   ' if h['ok'] else 'FAIL ') + h['id'] + ' ' + str(h['count']) + ' ' + h['err'])
    print('items', len(w['items']))
