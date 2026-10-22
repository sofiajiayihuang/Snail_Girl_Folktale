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
    main.innerHTML='<section class="theme-home" data-region="临时主题入口"><h1>'+esc(data.title)+'</h1><nav class="theme-buttons" aria-label="Choose a period">'+sections.map((s,i)=>
      '<a class="theme-button" data-region="主页按钮 '+esc(s.title)+'" href="'+sectionUrl(s)+'"><span class="theme-number">0'+(i+1)+'</span><span class="theme-label">'+esc(s.title)+'<span lang="zh-CN">'+esc(s.zh)+'</span></span><span aria-hidden="true" class="theme-arrow">⤶</span></a>').join('')+'</nav></section>';
  }
  function reading(s,params){
    const index=sections.indexOf(s),next=sections[(index+1)%sections.length],q=params.get('highlight')||'';
    center.innerHTML='';
    main.innerHTML='<article class="reading-page" data-region="'+esc(s.title)+'"><header class="reading-heading"><h1>'+esc(s.title)+'</h1><p lang="zh-CN">'+esc(s.zh)+'</p></header><div class="reading-body">'+s.paragraphs.map((t,i)=>
      '<p id="paragraph-'+(i+1)+'" data-region="'+esc(s.title)+' · 段落 '+(i+1)+'">'+paragraphHtml(t,s,i,q)+'</p>').join('')+'</div>'+
      '<section class="reading-footnotes" aria-labelledby="references-title"><h2 id="references-title">Notes</h2><ol>'+s.footnotes.map(note=>{
        const paragraph=s.paragraphs.findIndex(p=>p.includes('{{ref:'+note.id+'}}'))+1;
        return '<li id="note-'+note.id+'" value="'+note.id+'" data-region="'+esc(s.title)+' · 脚注 '+note.id+'"><p>'+esc(note.text)+'</p>'+link(sectionUrl(s)+'?paragraph='+paragraph,'Back to text','class="note-return" aria-label="Return to reference '+note.id+'"')+'</li>';
      }).join('')+'</ol></section><nav class="reading-navigation" aria-label="Reading navigation">'+link(homeHref(),'Back to Home')+link(sectionUrl(next),next.title+' ⤶')+'</nav></article>';
  }
  function search(q){
    center.innerHTML=searchForm(q);const hits=[];
    if(q)sections.forEach(s=>{
      const titleHit=(s.title+' '+s.zh).toLowerCase().includes(q.toLowerCase());
      s.paragraphs.forEach((p,i)=>{if(plain(p).toLowerCase().includes(q.toLowerCase())||(titleHit&&i===0))hits.push({section:s,index:i,text:plain(p)});});
    });
    main.innerHTML='<section class="search-page" data-region="文本搜索"><h1>'+(q?'Your search for ‘'+esc(q)+'’':'Search the text')+'</h1><p class="search-count">'+(q?hits.length+' matching paragraphs':'Search across the three periods.')+'</p>'+
      (q&&!hits.length?'<p>No results. Try another word or period.</p>':'')+'<ol class="text-results">'+hits.map(hit=>{
        const at=Math.max(0,hit.text.toLowerCase().indexOf(q.toLowerCase())),from=Math.max(0,at-90),snippet=(from?'… ':'')+hit.text.slice(from,from+320)+(from+320<hit.text.length?' …':'');
        return '<li><h2>'+link(sectionUrl(hit.section)+'?paragraph='+(hit.index+1)+'&highlight='+encodeURIComponent(q),hit.section.title)+'</h2><p class="result-location">'+esc(hit.section.zh)+' · Paragraph '+(hit.index+1)+'</p><p>'+marked(snippet,q)+'</p></li>';
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
    if(path==='/'||path==='/artworks'||path==='/news')home();
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
    $('#note-list').innerHTML=notes.length ? notes.map((n,i)=>'<article><div class="note-location">'+(i+1)+' · '+esc(n.path)+' · '+esc(n.region)+'</div><p>'+esc(n.body)+'</p></article>').join('') : '<p class="local-note">还没有批注。在页面任意区域右键即可开始。</p>';
  }
  function openNote(target,x,y) {
    const region=target.closest('[data-region]')?.dataset.region || target.closest('a,button')?.textContent.trim().slice(0,80) || '页面留白';
    noteTarget={path:location.hash||'#/',region,viewport:{width:innerWidth,height:innerHeight},position:{x:Math.round(x),y:Math.round(y+scrollY)}};
    $('#note-context').textContent='位置：'+region+' · '+noteTarget.path;
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
    if(!body){$('#note-body').focus();return;}
    const note={...noteTarget,body,createdAt:new Date().toISOString()};
    notes.push(note);
    let persisted=true;
    try{localStorage.setItem(storageKey,JSON.stringify(notes));}catch{persisted=false;}
    updateNotes();$('#note-body').value='';
    $('#note-status').textContent=persisted ? '已保存。可继续添加，或导出全部批注。' : '浏览器存储不可用，批注暂存在本页；请立即导出。';
    $('#saved-notes').open=true;
  });
  $('#note-export').addEventListener('click',()=>{
    if(!notes.length){$('#note-status').textContent='还没有批注，请先填写并保存。';return;}
    const lines=['# 网站批注','','参考网站：https://olafureliasson.net/','格式：位置＋触发动作＋期待结果','以下是用户保存的批注，按时间排列。',''];
    notes.forEach((n,i)=>lines.push('## '+(i+1)+'. '+n.region,'','- 页面：'+n.path,'- 视口：'+n.viewport.width+' × '+n.viewport.height,'- 记录时间：'+n.createdAt,'',n.body,''));
    const blob=new Blob([lines.join('\n')],{type:'text/markdown;charset=utf-8'});
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url;a.download='website-annotations.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('#note-status').textContent='已导出 Markdown。下一轮可将文件发给 AI。';
  });
  updateNotes();render();
})();
