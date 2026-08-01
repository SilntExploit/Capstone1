
(function(){
 const saved=localStorage.getItem('irsp-theme') || 'light'; document.documentElement.setAttribute('data-theme', saved);
 const page=(location.pathname.split('/').pop()||'dashboard.html').replace('.html',''); document.querySelectorAll('.nav-item').forEach(a=>{ if(a.dataset.page===page) a.classList.add('active'); });

 window.IRSP = window.IRSP || {};
 window.IRSP.applyTheme = function(theme){
   const value = theme === 'dark' ? 'dark' : 'light';
   localStorage.setItem('irsp-theme', value);
   document.documentElement.setAttribute('data-theme', value);
 };

 const logoutBtn = document.getElementById('logout-nav-btn');
 if (logoutBtn) {
   logoutBtn.addEventListener('click', function(event){
     event.preventDefault();
     ['irsp-access-token','irsp-refresh-token','irsp-current-user','irsp-session'].forEach(function(key){
       localStorage.removeItem(key);
     });
     window.location.href = '../index.html';
   });
 }

 if(window.lucide) lucide.createIcons();
})();
