/* MADE BY ME: what goes on your page from Film Hub and Paper Trail, and which video links play. Made-up data. */
const M=require('./madeby.js'); let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x?'':' '+JSON.stringify(y))); if(!x) ok=false; };
const studio={a:{text:'Title: Salt Road\n\nINT. DINER - NIGHT\n',file:'salt_road.fountain'},b:{text:'INT. BARN - DAY\n',file:'barn_test.fountain'},c:{text:'Title: Kept Off\n',file:'k.fountain'}};
const fh={studio:{a:{mark:'done',logline:'A cook keeps a secret.',year:'2026',links:[{url:'https://vimeo.com/123456789',label:'Watch'},{url:'nope'}]},b:{mark:''},c:{mark:'done',show:false}},
 films:[{id:'f1',title:'Dry Creek',year:'2024',kind:'Short',logline:'Two brothers, one well.',links:[]},{id:'f2',title:'Hidden One',show:false},{id:'f3',title:''}]};
const F=M.films(fh,studio);
want('films: the Story Studio one you marked done, and the ones you added', F.map(f=>f.title).join()==='Salt Road,Dry Creek', F.map(f=>f.title));
want('not the ones still in progress, kept off, or with no title', !F.some(f=>/barn|Kept|Hidden/i.test(f.title)));
want('only real links come along', F[0].links.length===1&&F[0].links[0].url==='https://vimeo.com/123456789');
const W=M.writing({projects:{p1:{title:'Low Water',package:{kind:'feature',genre:'Western',logline:'A town runs dry.'}},p2:{title:'No Logline Yet',package:{kind:'short'}},p3:{title:'Ash',package:{kind:'tv60',logline:'A fire chief.'}}}});
want('writing: a script goes up once it has a logline', W.map(w=>w.title).join()==='Ash,Low Water'&&W[1].kind==='Feature'&&W[0].kind==='TV hour', W);
const y=M.video('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'), yb=M.video('https://youtu.be/dQw4w9WgXcQ'), v=M.video('https://vimeo.com/76979871'), o=M.video('https://example.com/reel'), bad=M.video('reel.mp4');
want('YouTube plays in place, without tracking cookies', y.kind==='youtube'&&y.embed==='https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'&&yb.id==='dQw4w9WgXcQ');
want('Vimeo plays in place', v.kind==='vimeo'&&v.embed==='https://player.vimeo.com/video/76979871');
want('anything else is a plain link; not a link, nothing', o.kind==='link'&&bad===null);
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
