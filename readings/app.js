(() => {
  'use strict';
  const data=window.ARCHIVE, sections=data.sections;
  const $=s=>document.querySelector(s);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const main=$('#main'),center=$('#header-center');
  const dialog=$('#annotation');
  const positions=new Map();
  let currentRoute='',notes=[],noteTarget=null;
  const storageKey='spatial-archive-annotations-v1';
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))notes=saved.filter(n=>n&&typeof n.body==='string'&&typeof n.path==='string');}catch{}
  const homeHref=()=>data.homeHref||'#/';
  const sectionUrl=s=>'#/read/'+s.id;
  const link=(href,label,attrs='')=>'<a href="'+esc(href)+'" '+attrs+'>'+esc(label)+'</a>';
  const searchForm=(value='')=>'<form class="center-search search-form" role="search"><input name="q" type="search" aria-label="Search text" placeholder="Search" value="'+esc(value)+'" autocomplete="off"></form>';
  $('.skip').addEventListener('click',e=>{e.preventDefault();main.focus({preventScroll:true});});
  $('.wordmark').textContent=data.name;$('.wordmark').href=homeHref();
  document.addEventListener('submit',e=>{
    if(!e.target.matches('.search-form'))return;e.preventDefault();
    const q=new FormData(e.target).get('q').trim();
    location.hash='#/search'+(q?'?q='+encodeURIComponent(q):'');
  });
  const plain=text=>text.replace(/\{\{ref:\d+\}\}/g,'');
  function marked(text,q){
    if(!q)return esc(text);const query=q.toLowerCase(),lower=text.toLowerCase();let out='',from=0,at;
    while((at=lower.indexOf(query,from))!==-1){out+=esc(text.slice(from,at))+'<mark>'+esc(text.slice(at,at+q.length))+'</mark>';from=at+q.length;}
    return out+esc(text.slice(from));
  }
  function paragraphHtml(text,s,index,q=''){
    let refIndex=0;
    return text.split(/(\{\{ref:\d+\}\})/g).map(part=>{
      const ref=/^\{\{ref:(\d+)\}\}$/.exec(part);if(!ref)return marked(part,q);
      const id=ref[1],anchor='ref-'+s.id+'-'+id+'-'+index+'-'+refIndex++;
      return '<sup><a id="'+anchor+'" href="'+sectionUrl(s)+'?note='+id+'" aria-label="Footnote '+id+'">'+id+'</a></sup>';
    }).join('');
  }
  function home(){
    center.innerHTML=searchForm();
    main.innerHTML='<section class="theme-home" data-region="Period directory"><h1>'+esc(data.title)+'</h1><nav class="theme-buttons" aria-label="Choose a period">'+sections.map((s,i)=>
      '<a class="theme-button" data-region="Period: '+esc(s.title)+'" href="'+sectionUrl(s)+'"><span class="theme-number">0'+(i+1)+'</span><span class="theme-label">'+esc(s.title)+'</span><span aria-hidden="true" class="theme-arrow">⤶</span></a>').join('')+'</nav></section>';
  }
  function reading(s,params){
    const index=sections.indexOf(s),next=sections[(index+1)%sections.length],q=params.get('highlight')||'';
    center.innerHTML='';
    main.innerHTML='<article class="reading-page" data-region="'+esc(s.title)+'"><header class="reading-heading"><h1>'+esc(s.title)+'</h1></header><div class="reading-body">'+s.paragraphs.map((t,i)=>
      '<p id="paragraph-'+(i+1)+'" data-region="'+esc(s.title)+' · Paragraph '+(i+1)+'">'+paragraphHtml(t,s,i,q)+'</p>').join('')+'</div>'+
      '<section class="reading-footnotes" aria-labelledby="references-title"><h2 id="references-title">Notes</h2><ol>'+s.footnotes.map(note=>{
        const paragraph=s.paragraphs.findIndex(p=>p.includes('{{ref:'+note.id+'}}'))+1;
        return '<li id="note-'+note.id+'" value="'+note.id+'" data-region="'+esc(s.title)+' · Note '+note.id+'"><p>'+esc(note.text)+'</p>'+link(sectionUrl(s)+'?paragraph='+paragraph,'Back to text','class="note-return" aria-label="Return to reference '+note.id+'"')+'</li>';
      }).join('')+'</ol></section><nav class="reading-navigation" aria-label="Reading navigation">'+link(homeHref(),'Back to Home')+link(sectionUrl(next),next.title+' ⤶')+'</nav></article>';
  }
  function search(q){
    center.innerHTML=searchForm(q);const hits=[];
    if(q)sections.forEach(s=>{
      const titleHit=(s.title+' '+s.zh).toLowerCase().includes(q.toLowerCase());
      s.paragraphs.forEach((p,i)=>{if(plain(p).toLowerCase().includes(q.toLowerCase())||(titleHit&&i===0))hits.push({section:s,index:i,text:plain(p)});});
    });
    main.innerHTML='<section class="search-page" data-region="Text search"><h1>'+(q?'Your search for ‘'+esc(q)+'’':'Search the text')+'</h1><p class="search-count">'+(q?hits.length+' matching paragraphs':'Search across the three periods.')+'</p>'+
      (q&&!hits.length?'<p>No results. Try another word or period.</p>':'')+'<ol class="text-results">'+hits.map(hit=>{
        const at=Math.max(0,hit.text.toLowerCase().indexOf(q.toLowerCase())),from=Math.max(0,at-90),snippet=(from?'… ':'')+hit.text.slice(from,from+320)+(from+320<hit.text.length?' …':'');
        return '<li><h2>'+link(sectionUrl(hit.section)+'?paragraph='+(hit.index+1)+'&highlight='+encodeURIComponent(q),hit.section.title)+'</h2><p class="result-location">Paragraph '+(hit.index+1)+'</p><p>'+marked(snippet,q)+'</p></li>';
      }).join('')+'</ol><nav class="reading-navigation">'+link(homeHref(),'Back to Home')+'</nav></section>';
  }
  function textPage(key){
    const title=key==='about'?'About this text':'Privacy';center.innerHTML='';
    main.innerHTML='<section class="reading-page text-page"><h1>'+title+'</h1>'+(key==='about'?'<p>'+esc(data.source.title)+'</p><p>The three readings retain the main sections and footnotes from the supplied manuscript. The introduction and conclusion are not included here.</p>':'<p>Annotations are stored only in this browser. They are not uploaded or shared. Export your notes before changing devices, browsers or website addresses.</p>')+'<nav class="reading-navigation">'+link(homeHref(),'Back to Home')+'</nav></section>';
  }
  function render(){
    currentRoute=location.hash||'#/';
    const raw=currentRoute.slice(1),split=raw.indexOf('?');
    const path=(split<0?raw:raw.slice(0,split)).replace(/\/$/,'')||'/';
    const params=new URLSearchParams(split<0?'':raw.slice(split+1)),s=sections.find(s=>path==='/read/'+s.id);
    if(path==='/'||path==='/artworks'||path==='/news'){location.replace(homeHref());return;}
    else if(s)reading(s,params);
    else if(path==='/search')search(params.get('q')||'');
    else if(path==='/about'||path==='/privacy')textPage(path.slice(1));
    else{center.innerHTML='';main.innerHTML='<section class="reading-page"><h1>Page not found</h1><p>'+link(homeHref(),'Back to Home')+'</p></section>';}
    document.title=(s?s.title:path==='/search'?'Search':data.title)+' — The Snail Girl';
    requestAnimationFrame(()=>{
      const note=params.get('note'),paragraph=params.get('paragraph'),target=note?document.getElementById('note-'+note):paragraph?document.getElementById('paragraph-'+paragraph):null;
      if(target){target.scrollIntoView({behavior:'instant',block:'start'});target.classList.add('reading-target');}
      else window.scrollTo({top:positions.get(currentRoute)||0,behavior:'instant'});
    });
  }
  function updateScroll(){positions.set(currentRoute,window.scrollY);}
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href^="#/"]');
    if(a){positions.set(currentRoute,window.scrollY);positions.delete(a.getAttribute('href'));}
  });
  history.scrollRestoration='manual';window.addEventListener('hashchange',render);window.addEventListener('scroll',updateScroll,{passive:true});

  function updateNotes() {
    $('#saved-count').textContent=notes.length;
    $('#note-list').innerHTML=notes.length ? notes.map((n,i)=>'<article><div class="note-location">'+(i+1)+' · '+esc(n.path)+' · '+esc(n.region)+'</div><p>'+esc(n.body)+'</p></article>').join('') : '<p class="local-note">No notes yet. Right-click anywhere on the page to add one.</p>';
  }
  function openNote(target,x,y) {
    const region=target.closest('[data-region]')?.dataset.region || target.closest('a,button')?.textContent.trim().slice(0,80) || 'Page background';
    noteTarget={path:location.hash||'#/',region,viewport:{width:innerWidth,height:innerHeight},position:{x:Math.round(x),y:Math.round(y+scrollY)}};
    $('#note-context').textContent='Location: '+region+' · '+noteTarget.path;
    $('#note-status').textContent='';
    $('#note-body').value='';
    updateNotes();
    dialog.style.left=Math.max(16,Math.min(x,innerWidth-456))+'px';
    dialog.style.top=Math.max(16,Math.min(y,innerHeight-700))+'px';
    if(!dialog.open)dialog.showModal();
    dialog.scrollTop=0;
    // Keep the guide visible when opening, especially on touch devices.
    $('#note-close').focus({preventScroll:true});
  }
  document.addEventListener('contextmenu',e=>{
    if(e.shiftKey || dialog.contains(e.target) || e.target.closest('input,textarea'))return;
    e.preventDefault();openNote(e.target,e.clientX,e.clientY);
  });
  $('#note-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  $('#note-form').addEventListener('submit',e=>{
    e.preventDefault();const body=$('#note-body').value.trim();
    if(!body){$('#note-status').textContent='Please write a note before saving.';$('#note-body').focus();return;}
    const note={...noteTarget,body,createdAt:new Date().toISOString()};
    notes.push(note);
    let persisted=true;
    try{localStorage.setItem(storageKey,JSON.stringify(notes));}catch{persisted=false;}
    updateNotes();$('#note-body').value='';
    $('#note-status').textContent=persisted ? 'Saved. Add another note or export all notes.' : 'Browser storage is unavailable. Please export your notes before leaving this page.';
    $('#saved-notes').open=true;
  });
  $('#note-export').addEventListener('click',()=>{
    if(!notes.length){$('#note-status').textContent='No notes to export. Write and save a note first.';return;}
    const lines=['# Website notes','','Reference website: https://olafureliasson.net/','Format: location + action + expected result','Notes saved by the user, in chronological order.',''];
    notes.forEach((n,i)=>lines.push('## '+(i+1)+'. '+n.region,'','- Page: '+n.path,'- Viewport: '+n.viewport.width+' × '+n.viewport.height,'- Saved at: '+n.createdAt,'',n.body,''));
    const blob=new Blob([lines.join('\n')],{type:'text/markdown;charset=utf-8'});
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url;a.download='website-annotations.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('#note-status').textContent='Notes exported as Markdown.';
  });
  updateNotes();render();
})();
