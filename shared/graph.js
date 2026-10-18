/* THEACTORPAGE GRAPH: where each dot sits on a map of your work. Pulled by its links, pushed off the others.
   Same input, same picture (no randomness). Pure; runs in Node for the tests.
   Graph.layout({nodes:[{id}],edges:[{a,b,kind}]}, w, h, iters) -> [{x,y}]   Graph.fit(L, w, h, padX, padTop, padBottom) stretches it to the frame. */
(function(g){
const G={};
G.layout=function(U,w,h,iters){ const N=U.nodes, n=N.length, P=N.map((x,i)=>{ const a=i*2.399963, r=Math.sqrt(i+1)*Math.min(w,h)/(2.2*Math.sqrt(n+1)); return {x:w/2+r*Math.cos(a),y:h/2+r*Math.sin(a)}; }), ix={}; N.forEach((x,i)=>ix[x.id]=i);
 const E=U.edges.map(e=>[ix[e.a],ix[e.b],e.kind]), k=Math.sqrt(w*h/Math.max(1,n))*0.55; let t=Math.min(w,h)/8;
 for(let it=0;it<(iters||260);it++){ const D=P.map(()=>({x:0,y:0}));
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ let dx=P[i].x-P[j].x, dy=P[i].y-P[j].y, d=Math.sqrt(dx*dx+dy*dy)||0.01; const f=k*k/d; dx/=d; dy/=d; D[i].x+=dx*f; D[i].y+=dy*f; D[j].x-=dx*f; D[j].y-=dy*f; }
  E.forEach(([a,b,kind])=>{ let dx=P[a].x-P[b].x, dy=P[a].y-P[b].y, d=Math.sqrt(dx*dx+dy*dy)||0.01; const f=d*d/k*(kind==='samename'?0.15:kind==='scenes'?0.6:1); dx/=d; dy/=d; D[a].x-=dx*f; D[a].y-=dy*f; D[b].x+=dx*f; D[b].y+=dy*f; });
  for(let i=0;i<n;i++){ D[i].x+=(w/2-P[i].x)*0.02*k; D[i].y+=(h/2-P[i].y)*0.02*k; const d=Math.sqrt(D[i].x*D[i].x+D[i].y*D[i].y)||1, m=Math.min(d,t); P[i].x=Math.max(60,Math.min(w-60,P[i].x+D[i].x/d*m)); P[i].y=Math.max(40,Math.min(h-50,P[i].y+D[i].y/d*m)); }
  t*=0.985; }
 return P.map(p=>({x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10})); };
G.fit=function(L,w,h,px,pt,pb){ px=px==null?70:px; pt=pt==null?40:pt; pb=pb==null?50:pb; if(L.length<2) return L.map(()=>({x:Math.round(w/2),y:Math.round(h/2)}));
 const xs=L.map(q=>q.x), ys=L.map(q=>q.y), x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
 return L.map(q=>({x:Math.round(px+(x1>x0?(q.x-x0)/(x1-x0):.5)*(w-2*px)),y:Math.round(pt+(y1>y0?(q.y-y0)/(y1-y0):.5)*(h-pt-pb))})); };
g.Graph=G;
if(typeof module!=='undefined') module.exports=G;
})(typeof window!=='undefined'?window:globalThis);
