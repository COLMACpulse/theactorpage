/* THE POSTCARD, pure parts: addresses, handles, the page link that opens at the credit, what an email says,
   who says no. Made-up names only. node shared/test_postcard.js */
const P = require('./postcard.js'); global.qrcode = require('./vendor/qrcode.min.js');
let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y))); if (!x) ok = false; };
want('an address as typed becomes a link', P.url('rileyhart.example') === 'https://rileyhart.example' && P.url('https://a.example/x') === 'https://a.example/x' && P.url('not a site') === '' && P.url('javascript:alert(1)') === '');
want('printed without https:// or the slash', P.bare('https://www.rileyhart.example/') === 'rileyhart.example');
want('handles read the way people write them', P.handle('instagram', 'rileyhart.acts') === '@rileyhart.acts' && P.handle('x', '@riley') === '@riley' && P.handle('instagram', 'https://www.instagram.com/rileyhart.acts/') === '@rileyhart.acts' && P.handle('facebook', 'rileyhart') === 'facebook.com/rileyhart', [P.handle('instagram', 'https://www.instagram.com/rileyhart.acts/')]);
want('the profile links, to post it yourself', P.profileUrl('instagram', '@rileyhart.acts') === 'https://www.instagram.com/rileyhart.acts/' && P.profileUrl('tiktok', 'riley') === 'https://www.tiktok.com/@riley' && P.profileUrl('youtube', 'rileyhart') === 'https://www.youtube.com/@rileyhart');
const you = { name: 'Riley Hart', instagram: 'rileyhart.acts', x: '', page: 'rileyhart.example', rep: 'Jordan Reyes', repPhone: '555-0100', onPage: { instagram: true } };
want('only the socials you filled in; on your page only the ones you ticked', P.socials(you).map(s => s.k).join() === 'instagram' && P.onPage(you).length === 1 && P.onPage({ instagram: 'a' }).length === 0);
want('the slug matches the page: "Harbor Lights & Co." -> harbor-lights-and-co', P.slug('Harbor Lights & Co.') === 'harbor-lights-and-co' && P.slug('Café Noir') === 'cafe-noir');
const air = { kind: 'airing', title: 'Harbor Lights' }, head = { kind: 'headshot', title: '' };
want('your page opens right at the credit for an airing; the top for a headshot', P.pageLink('https://rileyhart.example', air) === 'https://rileyhart.example#c-harbor-lights' && P.pageLink('https://rileyhart.example', head) === 'https://rileyhart.example');
want('no page in YOU: the one the Hub put online, and only if it is live', P.pageBase({}, { live: true, url: 'https://riley.theactorpage.com/' }) === 'https://riley.theactorpage.com/' && P.pageBase({}, { live: false, url: 'https://x.example' }) === '');
const words = 'Guest starring on Harbor Lights, Episode 1.4.';
let c = P.card(air, you, words, {});
want('the card: your words, your name, your handle; your page as the link; no rep unless ticked', c.words === words && c.name === 'Riley Hart' && c.lines.join() === '@rileyhart.acts' && c.page === 'https://rileyhart.example#c-harbor-lights' && c.rep === '' && c.qr === true, c);
c = P.card(Object.assign({}, air, { card: { rep: true, watch: 'northstar.example/harbor-lights', show: { instagram: false }, page: true, qr: false } }), you, words, {});
want('your picks on one card: rep as plain text, where to watch, instagram off, page address on, no QR', c.rep === 'Rep: Jordan Reyes · 555-0100' && c.watch === 'https://northstar.example/harbor-lights' && c.lines.join() === 'rileyhart.example' && c.qr === false, c);
const body = P.emailBody(c);
want('the email: your words, then the links, your name, your rep', body === words + '\n\nMy page: https://rileyhart.example#c-harbor-lights\nWhere to watch: https://northstar.example/harbor-lights\n\nRiley Hart\nRep: Jordan Reyes · 555-0100', body);
want('your words for a post end with your page link', P.postWords('instagram', c) === words + '\n\nhttps://rileyhart.example#c-harbor-lights');
want('mailto: to, subject, body, all encoded', P.mailto('ellis@example.com', 'News', 'a & b') === 'mailto:ellis@example.com?subject=News&body=a%20%26%20b');
want('who says no: their word, a closed rep, do-not-contact', P.noEmail({ plug: 'noemail' }) && !P.noMail({ plug: 'noemail' }) && P.noMail({ plug: 'nomail' }) && P.noEmail({ dnc: true }) && P.noEmail({ rep: { how: 'closed' } }) && !P.noEmail({}));
const q = P.qr('https://rileyhart.example#c-harbor-lights');
want('the QR is a square of modules', q && q.length >= 21 && q.every(r => r.length === q.length) && q[0][0] === true);
want('the sizes: 4 x 6 at 300 dpi with 1/8 in bleed', P.size('print')[2] === 1800 + 2 * 37.5 + 0 || P.size('print')[2] === 1875);
console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
