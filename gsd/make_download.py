"""GSD: build the free download, one self-contained HTML file, from the site copy.
   python3 gsd/make_download.py   (run after changing gsd/index.html, app.js or styles.css)"""
import re, os
D=os.path.dirname(os.path.abspath(__file__))
html=open(os.path.join(D,'index.html'),encoding='utf-8').read()
css=open(os.path.join(D,'styles.css'),encoding='utf-8').read()
js=open(os.path.join(D,'app.js'),encoding='utf-8').read()
html=re.sub(r'\s*<!--site-->.*?<!--/site-->','',html,flags=re.S)
html=html.replace('<script src="../shared/hot.js"></script>\n','')
html=html.replace('<link rel="stylesheet" href="styles.css" />','<style>\n'+css+'\n</style>')
html=html.replace('<script src="app.js"></script>','<script>\n'+js.replace('</script','<\\/script')+'\n</script>')
html=html.replace('</div>\n  <script>','  <p class="gsdfoot">Free from <a href="https://colmacpulse.github.io/theactorpage/">THEACTORPAGE</a>. Yours to keep. Everything stays in this browser.</p>\n  </div>\n  <script>',1)
assert 'styles.css' not in html and 'src="app.js"' not in html and '../shared' not in html
open(os.path.join(D,'GSD-Get-Shit-Done.html'),'w',encoding='utf-8').write(html)
print('wrote GSD-Get-Shit-Done.html', len(html), 'bytes')
