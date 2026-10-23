/* MEMORIZER, the case on Col's computer (made-up words, same shapes): sides that are already one of your scripts
   aren't on the shelf twice; a whole script you dropped on home isn't on the shelf; file names read like titles;
   a long shelf shows three and a MORE; on a computer the header lines up with the page. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:1500,height:680},colorScheme:'light'})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/memorizer/'); await p.evaluate(()=>{ localStorage.clear();
 const sides='INT. KITCHEN - NIGHT\n\nANGUS\nYou took the truck.\n\nMAE\nI brought it back.\n';
 const play=Array.from({length:12},(_,i)=>'INT. ROOM '+i+' - DAY\n\nJOE\nLine '+i+'.\n\nSAL\nReply '+i+'.\n').join('\n');
 Shelf.put({text:sides,file:'THE_LAW_OF_THE_LAND12_6_2017.pdf',from:'home'});
 Shelf.put({text:play,file:'A Made Up Screenplay.fdx',from:'home'});
 ['NOT ANOTHER DAY10 21 17.pdf','Bus_stop.txt','Diner.txt','Pier.txt'].forEach((f,i)=>Shelf.put({text:'INT. BAR - NIGHT\n\nKIT'+i+'\nOne more.\n\nLOU\nNo.\n',file:f,from:'home'}));
 localStorage.setItem('memorizer_v1',JSON.stringify({scripts:{a1:{id:'a1',file:'THE_LAW_OF_THE_LAND12_6_2017.pdf',text:sides,me:'ANGUS',from:'Actor OS',states:{},verbs:{},added:Date.now()}},cur:'a1',tab:'drill'})); });
await p.reload(); await p.waitForTimeout(900);
const t=await p.innerText('#main');
want('your script, once, its name read like a title', /ANGUS · THE LAW OF THE LAND · 12\/6\/2017/.test(t)&&(t.match(/THE LAW OF THE LAND/g)||[]).length===1, t.slice(0,500));
want('a whole script you dropped on home: not on the shelf', !/Screenplay/.test(t));
want('a long shelf: three, and a MORE', (await p.$$('.quick button.qrow[onclick*="fromShelf"]')).length===3&&/1 MORE/.test(t));
await p.click('text=1 MORE'); await p.waitForTimeout(200);
want('MORE: all of them', (await p.$$('.quick button.qrow[onclick*="fromShelf"]')).length===4);
const al=await p.evaluate(()=>{ const ic=document.querySelector('.hico').getBoundingClientRect(), sg=document.querySelector('.hsig').getBoundingClientRect(), m=document.querySelector('main .kit, main .qhead, main .quick').getBoundingClientRect(); return {icon:Math.round(ic.left), main:Math.round(m.left), sigR:Math.round(sg.right), mainR:Math.round(m.right), w:Math.round(ic.width)}; });
want('on a computer: the icon and the sigil line up with the page, the icon big enough to read', Math.abs(al.icon-al.main)<20&&Math.abs(al.sigR-al.mainR)<20&&al.w>=60, al);
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
