/* SAVE THE BACKUP CODE IN YOUR PASSWORDS (Col, Oct 31: "backup code might be challenging for some"). Where the code is
   shown, a real sign-in form (your address as the user name, the code as the password) so the browser offers to save it,
   and then fills it in on SIGN IN: on this browser, and wherever your passwords sync (Chrome, iPhone). Chrome and Edge
   are asked straight out; Safari and Firefox offer when the form is sent.
   SaveCode.html(name, code) -> markup; one listener handles every such form     */
(function (g) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const S = {};
  S.html = (name, code) => '<form class="savecode" method="post" action="about:blank" target="savecode_sink" autocomplete="on" data-name="' + esc(name) + '">'
    + '<input type="text" name="username" autocomplete="username" value="' + esc(name) + '" aria-label="Your address" tabindex="-1" class="sc-f">'
    + '<input type="password" name="password" autocomplete="new-password" value="' + esc(code) + '" aria-label="Your backup code" tabindex="-1" class="sc-f">'
    + '<button type="submit" class="sc-go">SAVE IT IN MY PASSWORDS</button>'
    + '<span class="sc-say">Your browser offers to save it, then fills it in when you sign in on another computer.</span></form>'
    + (document.getElementById('savecode_sink') ? '' : '<iframe name="savecode_sink" id="savecode_sink" title="" aria-hidden="true" tabindex="-1" style="display:none"></iframe>');
  const CSS = '.savecode{display:flex;flex-direction:column;gap:6px;margin-top:10px;position:relative}.savecode .sc-f{position:absolute;left:0;top:0;width:1px;height:1px;opacity:.01;border:0;padding:0;overflow:hidden}'
    + '.savecode .sc-go{min-height:44px;padding:0 16px;border-radius:10px;border:1px solid currentColor;background:transparent;color:inherit;font:inherit;font-weight:600;font-size:13px;letter-spacing:.08em;cursor:pointer;align-self:flex-start}.savecode .sc-say{font-size:13px;opacity:.8}';
  function style() { if (document.getElementById('savecode_css')) return; const st = document.createElement('style'); st.id = 'savecode_css'; st.textContent = CSS; document.head.appendChild(st); }
  /* one listener for every such form on the page, however it was drawn */
  document.addEventListener('submit', async e => {
    const f = e.target; if (!(f && f.classList && f.classList.contains('savecode'))) return;
    const name = f.username.value, code = f.password.value; let asked = false;
    if (g.PasswordCredential && navigator.credentials && navigator.credentials.store) {
      e.preventDefault();
      try { await navigator.credentials.store(new g.PasswordCredential({ id: name, password: code, name: name + '.theactorpage.com' })); asked = true; } catch (err) { }
      if (!asked) HTMLFormElement.prototype.submit.call(f);   /* the form way, into the hidden frame */
    }
    S.last = { name, asked: asked || 'form' };
    setTimeout(() => { const say = f.querySelector('.sc-say'); if (say) say.textContent = 'If your browser asked, it\u2019s saved. Keep it written down too.'; }, 300);
  }, true);
  if (document.head) style(); else document.addEventListener('DOMContentLoaded', style);
  g.SaveCode = S;
})(window);
