/* PDF reading: a name in the character column kept in lowercase by the PDF ("Ross") is still a name, when that
   name is a cue in capitals elsewhere; the same word in the dialogue column stays dialogue. Made-up lines.
   node shared/test_pdfcue.js */
global.window=global; require('../actor-os/sides.js'); require('../actor-os/pdf.js'); const A=window.ActorPDF, S=window.ActorSides;
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y))); if(!x) ok=false; };
const page=rows=>{ let y=700; return rows.map(([x,t])=>({text:t,x,y:(y-=12),page:1,size:12})); };
const L=page([[108,'INT. DINER - NIGHT'],[108,'Rain on the glass. Dana wipes the counter down, slowly, again.'],[108,'She does not look up when the door opens behind her now.'],[108,'Ross stands there dripping on the mat, holding a paper bag.'],
 [252,'DANA'],[180,"We're closed."],[252,'ROSS'],[180,'Door was open.'],[252,'DANA'],[180,'Since when?'],[252,'Ross'],[180,'I mean the door was open.'],[252,'DANA'],[180,'Milo'],[180,'never locks it.']]);
const sp=S.parse(A.toSides(L)).filter(b=>b.who).map(b=>b.who+': '+b.text);
want('"Ross" in the name column is ROSS, a new speech', sp[3]==='ROSS: I mean the door was open.', sp);
want('"Milo" in the dialogue column stays dialogue', sp[4]==='DANA: Milo never locks it.', sp);
want('a lowercase word in the name column that is nobody\'s cue stays as it was', !S.parse(A.toSides(page([[108,'INT. A - DAY'],[108,'Somebody is standing in the doorway of the old place.'],[108,'Another long line of action that goes on for a while.'],[108,'And a third one so the action margin is clear enough.'],[252,'DANA'],[180,'Hi.'],[252,'Later'],[180,'Bye.']]))).some(b=>b.who==='LATER'));
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
