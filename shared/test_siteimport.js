/* BRING IN MY SITE, the pure part, and reading a zip the way GitHub makes them. Made-up site only.  node shared/test_siteimport.js */
const S=require('./siteimport.js'), fs=require('fs'), path=require('path'), {execSync}=require('child_process'), os=require('os');
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const DIR=path.join(__dirname,'fixtures','site_sample'), html=fs.readFileSync(path.join(DIR,'index.html'),'utf8');
const site=S.extract(html);
want('reads the data block as data', site&&site.name==='Riley Hart'&&site.work.length===3);
want('braces and quotes inside the words don\'t confuse it', S.extract('<script>const SITE={"a":"x { y } \\" z","b":[1,{"c":"}"}]};</script>').b[1].c==='}');
want('no data block, or one that isn\'t data: nothing', S.extract('<p>hi</p>')===null&&S.extract('const SITE={a:alert(1)}')===null);
const has=p=>fs.existsSync(path.join(DIR,p)), P=S.plan(site,has);
want('you: name, lane, union, management as rep, email, IMDb', JSON.stringify(P.profile)===JSON.stringify({name:'Riley Hart',lane:'Actor · Writer',union:'SAG-AFTRA',rep:'Northgate Talent',email:'riley@example.com',imdb:'https://www.imdb.com/name/nm0000000/'}), P.profile);
want('credits: title, character, role, network, poster, clips; a TV network makes it TV', P.credits[0].title==='Harbor Lights'&&P.credits[0].character==='DET. MARA KEYS'&&P.credits[0].role==='Guest Star'&&P.credits[0].net==='FX'&&P.credits[0].poster==='media/poster-harbor.jpg'&&P.credits[0].medium==='TV'&&P.credits[2].medium==='Film');
want('a clip the page says is in media/ but sits at the top: found, and said', P.credits[0].clips[0]==='clip-harbor.webm'&&P.moved.includes('media/clip-harbor.webm'));
want('the single "clip" field counts too; the note comes along', P.credits[1].clips[0]==='media/clip-night.webm'&&P.credits[1].note==='Her first day back.');
want('a file that isn\'t anywhere: left out, and said', P.missing.join()==='media/gone.mp4'&&P.credits[2].clips.length===0);
want('headshots (the main one first, no doubles), photos, reel', P.primary==='media/headshot1.jpg'&&P.headshots.join()==='media/headshot1.jpg,media/headshot2.jpg'&&P.stills.join()==='media/still-dock.jpg'&&P.reel==='media/reel.webm');
want('films with their watch link; writing with logline, genre, format, poster', P.films[0].links[0].label==='Watch on YouTube'&&P.films[0].poster==='media/film-tide.jpg'&&P.writing[0].logline.startsWith('A ferry captain')&&P.writing[0].kind==='Feature'&&P.writing[0].genre==='Thriller');
want('the counts', JSON.stringify(P.counts)===JSON.stringify({credits:3,clips:2,posters:3,headshots:2,stills:1,reel:1,films:1,writing:1,missing:1,moved:1}), P.counts);
want('a link that isn\'t https is never a watch link', S.plan({films:[{t:'X',u:'javascript:alert(1)'}]}).films[0].links.length===0);
/* the zip, as GitHub makes it: deflated, inside a folder */
(async()=>{
 const T=fs.mkdtempSync(path.join(os.tmpdir(),'si-')), Z=path.join(T,'site-main.zip');
 execSync(`cd "${path.dirname(DIR)}" && python3 -c "import zipfile,os,sys
z=zipfile.ZipFile('${Z}','w',zipfile.ZIP_DEFLATED)
for r,d,f in os.walk('site_sample'):
  for x in f: z.write(os.path.join(r,x),os.path.join('riley-site-main',os.path.relpath(os.path.join(r,x),'site_sample')))
z.close()"`);
 const file=new File([fs.readFileSync(Z)],'site-main.zip'), src=await S.fromZip(file);
 want('a deflated zip in a folder: finds the page and its files', S.extract(src.html).name==='Riley Hart'&&src.has('media/reel.webm')&&src.has('clip-harbor.webm')&&!src.has('media/gone.mp4'));
 const b=await src.get('media/poster-harbor.jpg'); want('a file comes out whole, with its type', b.size===fs.statSync(path.join(DIR,'media/poster-harbor.jpg')).size&&b.type==='image/jpeg');
 const v=await src.get('media/reel.webm'); want('a video too', v.size===fs.statSync(path.join(DIR,'media/reel.webm')).size&&v.type==='video/webm');
 let bad=''; try{ await S.fromZip(new File([new Uint8Array(100)],'x.zip')); }catch(e){ bad=e.message; } want('not a zip: says so', /isn't a zip/.test(bad));
 console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
})();
