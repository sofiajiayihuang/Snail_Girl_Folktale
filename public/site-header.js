(() => {
  function alignHeader(){
    try{
      const saved=JSON.parse(sessionStorage.getItem('snail-header-left')||'null');
      if(saved&&Number.isFinite(saved.left)&&Number.isFinite(saved.width)&&saved.width>0){
        const left=Math.max(16,Math.min(innerWidth/2,saved.left*innerWidth/saved.width));
        document.documentElement.style.setProperty('--site-title-left',`${left}px`);
      }
    }catch{}
  }
  alignHeader();addEventListener('resize',alignHeader);
})();
