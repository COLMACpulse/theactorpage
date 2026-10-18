/* PRACTICE FROM YOUR MATERIAL: cuts are word for word, two people only, never AI text. Made-up scripts only.
   node shared/test_yourscenes.js */
global.window=global; require('../actor-os/sides.js'); const Y=require('./yourscenes.js');
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const words=t=>t.split('\n').map(l=>l.trim()).filter(Boolean);
const inSource=(cut,src)=>{ const S=new Set(words(src)); return words(cut).every(l=>S.has(l)); };

const FOUNTAIN=`Title: Salt Road
Author: Nobody Real

INT. DINER - NIGHT

Rain on the glass. DANA PELL (40s) wipes the counter.

DANA PELL
We're closed.

ROSS OKAFOR
Door was open.

DANA PELL
(not looking up)
Door's always open. Sign says closed.

ROSS OKAFOR
I'm not here to eat.

[[a note to myself]]

DANA PELL
Then you're here to talk. Worse.

12.

ROSS OKAFOR
Your brother called me.

COOK (O.S.)
Dana, you want the fryer off?

DANA PELL
Leave it.

EXT. LOT - CONTINUOUS

MILO
You good?

ROSS OKAFOR
No.
`;
let c=Y.cuts(FOUNTAIN,{title:'Salt Road.fountain',from:'the shelf'});
want('one cut from the diner', c.length===1, c.map(x=>x.title));
c=c[0];
want('the two who talk', c.parts.slice().sort().join()==='DANA PELL,ROSS OKAFOR', c.parts);
want('word for word: every line is in the script', inSource(c.text,FOUNTAIN), c.text);
want('parentheticals and action kept', /\(not looking up\)/.test(c.text)&&/Rain on the glass/.test(c.text));
want('stops before the third person (COOK)', !/COOK|fryer|Leave it/.test(c.text), c.text);
want('page numbers, title page and notes left out', !/^12\.$/m.test(c.text)&&!/Title:|a note to myself/.test(c.text));
want('says where: scene heading, scene number, page', c.head==='INT. DINER - NIGHT'&&c.scene===1&&c.page===11&&c.title==='Salt Road, scene 1'&&Y.where(c)==='INT. DINER - NIGHT, page 11', [c.head,c.scene,c.page,c.title]);
want('the reader agrees: two speakers', ActorSides.speakers(ActorSides.parse(c.text)).length===2);

const SIDES=`SALT ROAD    Sides by Breakdown Services - Actors Access    E417-E417-E417-
                                                       4.
    INT. KITCHEN - DAY
              JUNE
          You kept the key.
              WES
          You never asked for it back.
              JUNE
          I'm asking.
                    (MORE)
              JUNE (CONT'D)
          Now.
              WES
          Fine. Here.
              JUNE
          That's it?
              WES
          That's it.
                         CONTINUED:
`;
c=Y.cuts(SIDES,{title:'Salt Road sides.pdf',me:'WES'});
want('audition sides: a cut', c.length===1, c);
want('sides: watermark, (MORE), CONTINUED, page number left out', c[0]&&!/E417|MORE|CONTINUED|^4\.$/m.test(c[0].text), c[0]&&c[0].text);
want('sides: CONT\'D is the same person', c[0]&&c[0].parts.length===2&&c[0].parts.indexOf('JUNE')>=0);
want('sides: you play the part you picked on the shelf', c[0]&&c[0].you==='WES');

const COLON=`BO: You hear that?\nKIT: Hear what?\nBO: Exactly.\nKIT: Go to sleep.\nBO: Can't.\n`;
c=Y.cuts(COLON,{title:'Night Shift'});
want('NAME: line form', c.length===1&&c[0].parts.sort().join()==='BO,KIT', c);

let LONG='INT. CAR - NIGHT\n\n'; for(let i=0;i<40;i++) LONG+=(i%2?'ADA':'BEN')+'\nLine number '+i+'.\n\n';
c=Y.cuts(LONG,{title:'Long Drive'});
want('a long run splits, no cut over 16 speeches', c.length===3&&c.every(x=>x.speeches<=16&&x.speeches>=4), c.map(x=>x.speeches));
want('split cuts cover the run in order, no line twice', c.map(x=>x.text.match(/Line number \d+/g)).flat().join()===Array.from({length:40},(_,i)=>'Line number '+i).join());

want('AI practice text is never cut', !Y.cuts('[[Practice scene: Spare Key. Written by AI as a practice prompt, not from anything real.]]\n\n'+LONG,{}).length);
want('a speech that is just a number stays a speech', Y.cuts('INT. A - DAY\n\nADA\nHow many?\n\nBEN\n12.\n\nADA\nTwelve?\n\nBEN\nTwelve.\n',{}).length===1&&/BEN\n12\./.test(Y.cuts('INT. A - DAY\n\nADA\nHow many?\n\nBEN\n12.\n\nADA\nTwelve?\n\nBEN\nTwelve.\n',{})[0].text));
want('under four speeches: nothing', !Y.cuts('INT. A - DAY\n\nADA\nHi.\n\nBEN\nHi.\n\nADA\nBye.\n',{}).length);
want('three-way talk throughout: nothing', !Y.cuts('INT. A - DAY\n\nADA\nOne.\n\nBEN\nTwo.\n\nCAL\nThree.\n\nADA\nFour.\n\nBEN\nFive.\n\nCAL\nSix.\n',{}).length);
want('a third person in the middle: two stretches on either side', Y.cuts('INT. A - DAY\n\nADA\nOne.\n\nBEN\nTwo.\n\nADA\nThree.\n\nBEN\nFour.\n\nCAL\nHey.\n\nBEN\nFive.\n\nCAL\nSix.\n\nBEN\nSeven.\n\nCAL\nEight.\n',{}).map(x=>x.parts.sort().join()).join('|')==='ADA,BEN|BEN,CAL');

console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
