// ═══════════════════ STATE ═══════════════════
let S = {
  config:{nombre:'',fecha:'',sede:'',sets:2,formato:'clasico',inscripcion:false,monto:'','monto-dobles':'','monto-equipo':''},
  categories:[
    {id:'cat1',nombre:'Open',color:'tag-blue'},
    {id:'cat2',nombre:'Sub-18',color:'tag-teal'},
    {id:'cat3',nombre:'Sub-14',color:'tag-amber'},
    {id:'cat4',nombre:'Veteranos',color:'tag-purple'},
    {id:'cat5',nombre:'Femenino',color:'tag-coral'}
  ],
  mode:'singles',players:[],equipos:[],zones:[],
  matches:{},equipoMatches:{},bracket:{},rlBracket:{},bracketScores:{},
  rankConfig:{
    modo:'fijo',
    zonaPts:5,
    rondas:{campeon:100,finalista:70,semifinal:50,cuartos:35,octavos:20,ronda16:10,ronda32:5},
    eloCats:[{id:'cat-elo-1',nombre:'Primera',umbral:1200},{id:'cat-elo-2',nombre:'Segunda',umbral:800},{id:'cat-elo-3',nombre:'Tercera',umbral:0}]
  },
  rankingHistorico:[]
};
const ZCOLS=['tag-blue','tag-teal','tag-amber','tag-coral','tag-purple','tag-green','tag-orange','tag-pink','tag-sky'];
const ACOLS=['tag-blue','tag-teal','tag-amber','tag-coral','tag-purple','tag-green','tag-orange','tag-pink','tag-sky','tag-gray'];
const FDESC={
  clasico:'Los participantes se dividen en <strong>zonas</strong> (round-robin). Los mejores clasifican a la <strong>llave eliminatoria final</strong>.',
  relampago:'Todos entran directamente a una <strong>gran llave de eliminacion directa</strong>. Sin zonas ni ranking previo.'
};
const EQ_PARTIDOS=[
  {label:'Partido 1',tipo:'Singles',icon:'&#x1F3C3;'},
  {label:'Partido 2',tipo:'Dobles',icon:'&#x1F46F;'},
  {label:'Partido 3 &mdash; Desempate',tipo:'Singles',icon:'&#x26A1;'}
];

// ═══════════════════ UTILS ═══════════════════
function uid(){return Math.random().toString(36).slice(2,9);}
function catBy(id){return S.categories.find(function(c){return c.id===id;});}
function catCol(id){var c=catBy(id);return c?c.color:'tag-gray';}
function catNm(id){var c=catBy(id);return c?c.nombre:id;}
function dn(e){
  if(!e)return'&mdash;';
  if(e.type==='dobles')return e.displayName||e.j1+' / '+e.j2;
  if(e.type==='equipo')return e.nombre;
  return(e.nombre+' '+(e.apellido||'')).trim();
}
function isRL(){return S.config.formato==='relampago';}
function salert(id,msg,type,ms){
  var el=document.getElementById(id);if(!el)return;
  el.innerHTML='<div class="alert alert-'+type+'">'+msg+'</div>';
  if(ms)setTimeout(function(){el.innerHTML='';},ms);
}
function fmtMoney(n){return n?'$'+parseFloat(n).toLocaleString('es-AR'):'';}

// ═══════════════════ RANK CONFIG ═══════════════════
function setRankMode(m){
  S.rankConfig.modo=m;
  document.getElementById('rank-mode-fijo').classList.toggle('active',m==='fijo');
  document.getElementById('rank-mode-elo').classList.toggle('active',m==='elo');
  document.getElementById('rank-mode-none').classList.toggle('active',m==='none');
  document.getElementById('rank-config-fijo').style.display=m==='fijo'?'':'none';
  document.getElementById('rank-config-elo').style.display=m==='elo'?'':'none';
  document.getElementById('rank-config-none').style.display=m==='none'?'':'none';
}
function renderRankConfig(){
  var rc=S.rankConfig;
  document.getElementById('rank-mode-fijo').classList.toggle('active',rc.modo==='fijo');
  document.getElementById('rank-mode-elo').classList.toggle('active',rc.modo==='elo');
  document.getElementById('rank-mode-none').classList.toggle('active',rc.modo==='none');
  document.getElementById('rank-config-fijo').style.display=rc.modo==='fijo'?'':'none';
  document.getElementById('rank-config-elo').style.display=rc.modo==='elo'?'':'none';
  document.getElementById('rank-config-none').style.display=rc.modo==='none'?'':'none';
  // Rondas fijo
  var rondas=[
    {key:'campeon',label:'Campeon'},
    {key:'finalista',label:'Finalista'},
    {key:'semifinal',label:'Semifinalista'},
    {key:'cuartos',label:'Cuartos de final'},
    {key:'octavos',label:'Octavos de final'},
    {key:'ronda16',label:'16avos de final'},
    {key:'ronda32',label:'32avos de final'}
  ];
  var wrap=document.getElementById('rank-rondas-wrap');
  if(wrap){
    wrap.innerHTML=rondas.map(function(r){
      return '<div class="form-row" style="margin-bottom:0;">'
        +'<div class="form-group" style="max-width:200px;"><label>'+r.label+'</label>'
        +'<input type="number" min="0" id="cfg-rank-'+r.key+'" value="'+(rc.rondas[r.key]||0)+'"/></div>'
        +'</div>';
    }).join('');
  }
  var zp=document.getElementById('cfg-rank-zona-pts');
  if(zp)zp.value=rc.zonaPts||5;
  renderEloCats();
}
function renderEloCats(){
  var wrap=document.getElementById('rank-elo-cats-wrap');if(!wrap)return;
  if(!S.categories.length){
    wrap.innerHTML='<div style="color:var(--text-muted);font-size:13px;">No hay categorias definidas. Agrega categorias en la seccion de arriba.</div>';
    return;
  }
  wrap.innerHTML=S.categories.map(function(c,i){
    var umbral=getEloUmbral(i);
    var umbralSig=i>0?getEloUmbral(i-1)-1:null;
    var rango=umbralSig!==null?umbral+' — '+umbralSig+' pts':'desde '+umbral+' pts';
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg);border-radius:var(--radius);border:1px solid var(--border);">'
      +'<span class="tag '+c.color+'">'+c.nombre+'</span>'
      +'<span style="font-size:12px;color:var(--text-muted);">'+rango+'</span>'
      +(i===S.categories.length-1?'<span style="font-size:11px;color:var(--text-muted);">(categoria mas baja &mdash; jugadores nuevos entran aqui)</span>':'')
      +'</div>';
  }).join('');
}
function addEloCategory(){
  S.rankConfig.eloCats=S.rankConfig.eloCats||[];
  S.rankConfig.eloCats.push({id:uid(),nombre:'Nueva categoria',umbral:0});
  renderEloCats();
}
function removeEloCategory(id){
  S.rankConfig.eloCats=S.rankConfig.eloCats.filter(function(c){return c.id!==id;});
  renderEloCats();
}
function saveAllConfig() {
  saveConfig();
  saveRankConfig();
}
function saveRankConfig(){
  var rc=S.rankConfig;
  var rondas=[{key:'campeon'},{key:'finalista'},{key:'semifinal'},{key:'cuartos'},{key:'octavos'},{key:'ronda16'},{key:'ronda32'}];
  rondas.forEach(function(r){
    var el=document.getElementById('cfg-rank-'+r.key);
    if(el)rc.rondas[r.key]=parseInt(el.value)||0;
  });
  var zp=document.getElementById('cfg-rank-zona-pts');
  if(zp)rc.zonaPts=parseInt(zp.value)||0;
  if(rc.modo==='elo'){
    (rc.eloCats||[]).forEach(function(c){
      var en=document.getElementById('elo-cat-nombre-'+c.id);
      var eu=document.getElementById('elo-cat-umbral-'+c.id);
      if(en)c.nombre=en.value.trim()||c.nombre;
      if(eu)c.umbral=parseInt(eu.value)||0;
    });
    rc.eloCats.sort(function(a,b){return b.umbral-a.umbral;});
  }
  salert('alert-rank-config','&#x2705; Configuracion de ranking guardada','success',2000);
}
// ═══════════════════ FORMAT ═══════════════════
function setFormat(f){
  S.config.formato=f;
  document.getElementById('fmt-clasico').classList.toggle('active',f==='clasico');
  document.getElementById('fmt-relampago').classList.toggle('active',f==='relampago');
  document.getElementById('fmt-desc').innerHTML=FDESC[f];
  document.querySelectorAll('.nav-clasico').forEach(function(b){b.style.display=f==='clasico'?'':'none';});
  document.getElementById('header-fmt-badge').innerHTML=f==='relampago'
    ?'<span class="tag tag-rl">&#x26A1; Relampago</span>'
    :'<span class="tag tag-blue">&#x1F3C6; Clasico</span>';
  document.getElementById('panel-clasico').style.display=f==='clasico'?'':'none';
  document.getElementById('panel-relampago').style.display=f==='relampago'?'':'none';
  var mzl=document.getElementById('m-zonas-lbl');if(mzl)mzl.textContent=f==='relampago'?'En llave':'Zonas';
}

// ═══════════════════ TABS ═══════════════════
function showTab(t,btn){
  document.querySelectorAll('.section').forEach(function(s){s.classList.remove('active');});
  document.querySelectorAll('nav button').forEach(function(b){b.classList.remove('active');});
  document.getElementById('tab-'+t).classList.add('active');
  if(btn)btn.classList.add('active');
  if(t==='resultados')renderResults();
  if(t==='ranking')renderRanking();
  if(t==='zonas')renderZones();
  if(t==='equipos'){renderEquipos();renderCajaEquipos();}
  if(t==='config'){renderCats();setFormat(S.config.formato);renderRankConfig();}
  updateMetrics();updateSelects();
}

// ═══════════════════ MODE ═══════════════════
function setMode(m){
  S.mode=m;
  ['singles','dobles'].forEach(function(x){document.getElementById('mode-'+x).classList.toggle('active',m===x);});
  document.getElementById('form-singles').style.display=m==='singles'?'':'none';
  document.getElementById('form-dobles').style.display=m==='dobles'?'':'none';
  document.getElementById('mode-hint').textContent=m==='singles'
    ?'En singles cada jugador compite individualmente.'
    :'En dobles cada pareja compite como unidad.';
}

// ═══════════════════ CATEGORIES ═══════════════════
function addCategory(){
  var n=document.getElementById('new-cat-name').value.trim();if(!n)return;
  if(S.categories.find(function(c){return c.nombre.toLowerCase()===n.toLowerCase();})){salert('alert-cats','Ya existe esa categoria','warn',3000);return;}
  S.categories.push({id:uid(),nombre:n,color:ACOLS[S.categories.length%ACOLS.length]});
  document.getElementById('new-cat-name').value='';
  renderCats();updateSelects();updCatSels();renderEloCats();
}
function removeCategory(id){
  if(S.players.some(function(p){return p.cat===id;})||S.equipos.some(function(e){return e.cat===id;})){salert('alert-cats','Hay participantes en esa categoria','warn',3000);return;}
  S.categories=S.categories.filter(function(c){return c.id!==id;});
  renderCats();updateSelects();updCatSels();renderEloCats();
}
function renCat(id,v){var c=catBy(id);if(c)c.nombre=v;updateSelects();updCatSels();renderPlayers();renderEquipos();renderZones();renderEloCats();}
function chgCatCol(id,col){var c=catBy(id);if(c)c.color=col;renderCats();renderPlayers();renderEquipos();renderEloCats();}
function renderCats(){
  var w=document.getElementById('cats-list');if(!w)return;
  if(!S.categories.length){w.innerHTML='<p style="color:var(--text-muted)">Sin categorias.</p>';return;}
  w.innerHTML=S.categories.map(function(c){
    return '<div class="cat-row">'
      +'<span class="tag '+c.color+'" style="min-width:80px;justify-content:center;">'+c.nombre+'</span>'
      +'<input type="text" value="'+c.nombre+'" style="flex:1;" onchange="renCat(\''+c.id+'\',this.value)" placeholder="Nombre"/>'
      +'<select onchange="chgCatCol(\''+c.id+'\',this.value)" style="width:130px;">'
      +ACOLS.map(function(col){return'<option value="'+col+'"'+(col===c.color?' selected':'')+'>'+col.replace('tag-','')+'</option>';}).join('')
      +'</select>'
      +'<button class="btn btn-sm btn-danger" onclick="removeCategory(\''+c.id+'\')">&#x2715;</button>'
      +'</div>';
  }).join('');
}
function updCatSels(){
  var o=S.categories.map(function(c){return'<option value="'+c.id+'">'+c.nombre+'</option>';}).join('');
  ['inp-cat','dbl-cat','eq-cat'].forEach(function(id){var el=document.getElementById(id);if(el)el.innerHTML=o;});
}

// ═══════════════════ PLAYERS ═══════════════════
function addPlayer(){
  var n=document.getElementById('inp-nombre').value.trim();
  if(!n){salert('alert-player','Ingresa al menos el nombre','warn',3000);return;}
  var pago=S.config.inscripcion?document.getElementById('inp-pago').checked:null;
  S.players.push({id:uid(),type:'singles',nombre:n,
    apellido:document.getElementById('inp-apellido').value.trim(),
    club:document.getElementById('inp-club').value.trim(),
    cat:document.getElementById('inp-cat').value,zona:false,pago:pago});
  ['inp-nombre','inp-apellido','inp-club'].forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('inp-pago').checked=false;
  document.getElementById('inp-nombre').focus();
  renderPlayers();renderCajaSingles();updateSelects();updateMetrics();
}
function addDobles(){
  var j1=document.getElementById('dbl-j1').value.trim();
  var j2=document.getElementById('dbl-j2').value.trim();
  if(!j1||!j2){salert('alert-dobles','Ingresa ambos jugadores','warn',3000);return;}
  var dn2=document.getElementById('dbl-name').value.trim();
  var pago=S.config.inscripcion?document.getElementById('dbl-pago').checked:null;
  S.players.push({id:uid(),type:'dobles',j1:j1,j2:j2,displayName:dn2||j1+' / '+j2,
    club:document.getElementById('dbl-club').value.trim(),
    cat:document.getElementById('dbl-cat').value,zona:false,pago:pago});
  ['dbl-j1','dbl-j2','dbl-name','dbl-club'].forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('dbl-pago').checked=false;
  document.getElementById('dbl-j1').focus();
  renderPlayers();renderCajaSingles();updateSelects();updateMetrics();
}
function removePlayer(id){
  if(!confirm('Eliminar?'))return;
  S.players=S.players.filter(function(p){return p.id!==id;});
  S.zones.forEach(function(z){z.players=z.players.filter(function(pid){return pid!==id;});});
  renderPlayers();renderCajaSingles();renderZones();updateMetrics();
}
function togglePago(pid){
  var p=S.players.find(function(x){return x.id===pid;});
  if(p){p.pago=!p.pago;renderPlayers();renderCajaSingles();}
}
function editPlayer(id){
  var p=S.players.find(function(x){return x.id===id;});if(!p)return;
  var catOpts=S.categories.map(function(c){return'<option value="'+c.id+'"'+(c.id===p.cat?' selected':'')+'>'+c.nombre+'</option>';}).join('');
  var fields=p.type==='dobles'
    ?'<div class="form-group"><label>Jugador 1</label><input id="edit-j1" type="text" value="'+p.j1+'"/></div>'
     +'<div class="form-group"><label>Jugador 2</label><input id="edit-j2" type="text" value="'+p.j2+'"/></div>'
     +'<div class="form-group"><label>Nombre pareja</label><input id="edit-dn" type="text" value="'+(p.displayName||'')+'"/></div>'
    :'<div class="form-group"><label>Nombre</label><input id="edit-nombre" type="text" value="'+(p.nombre||'')+'"/></div>'
     +'<div class="form-group"><label>Apellido</label><input id="edit-apellido" type="text" value="'+(p.apellido||'')+'"/></div>';
  var modal='<div id="edit-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.4);z-index:1000;display:flex;align-items:center;justify-content:center;">'
    +'<div style="background:var(--surface);border-radius:var(--radius-lg);padding:24px;width:90%;max-width:480px;box-shadow:0 8px 32px rgba(0,0,0,.2);">'
    +'<h3 style="margin-bottom:16px;">Editar '+(p.type==='dobles'?'pareja':'jugador')+'</h3>'
    +'<div style="display:flex;flex-direction:column;gap:12px;">'
    +fields
    +'<div class="form-group"><label>Club</label><input id="edit-club" type="text" value="'+(p.club||'')+'"/></div>'
    +'<div class="form-group"><label>Categoria</label><select id="edit-cat">'+catOpts+'</select></div>'
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end;">'
    +'<button class="btn" onclick="closeEditModal()">Cancelar</button>'
    +'<button class="btn btn-primary" onclick="saveEditPlayer(\''+id+'\')">Guardar</button>'
    +'</div></div></div>';
  document.body.insertAdjacentHTML('beforeend',modal);
}
function saveEditPlayer(id){
  var p=S.players.find(function(x){return x.id===id;});if(!p)return;
  if(p.type==='dobles'){
    p.j1=document.getElementById('edit-j1').value.trim()||p.j1;
    p.j2=document.getElementById('edit-j2').value.trim()||p.j2;
    p.displayName=document.getElementById('edit-dn').value.trim()||p.j1+' / '+p.j2;
  }else{
    p.nombre=document.getElementById('edit-nombre').value.trim()||p.nombre;
    p.apellido=document.getElementById('edit-apellido').value.trim();
  }
  p.club=document.getElementById('edit-club').value.trim();
  p.cat=document.getElementById('edit-cat').value;
  closeEditModal();
  renderPlayers();updateSelects();
}
function closeEditModal(){
  var m=document.getElementById('edit-modal');if(m)m.remove();
}
function renderPlayers(){
  var w=document.getElementById('players-wrap');
  document.getElementById('player-count').textContent=S.players.length;
  if(!S.players.length){
    w.innerHTML='<div class="empty"><div class="empty-icon">&#x1F464;</div><p>Agrega jugadores para comenzar</p></div>';return;
  }
  var pagoHdr=S.config.inscripcion?'<th>Inscripcion</th>':'';
  var rows=S.players.map(function(p,i){
    var z=S.zones.find(function(z){return z.players&&z.players.includes(p.id)&&z.mode!=='equipos';});
    var zl=z?'<span class="tag '+ZCOLS[z.num%ZCOLS.length]+'">Zona '+(z.num+1)+'</span>':'<span style="color:var(--text-muted)">-</span>';
    var tb=p.type==='dobles'?'<span class="tag tag-orange">Dobles</span>':'<span class="tag tag-gray">Singles</span>';
    var nm=p.type==='dobles'
      ?'<div><strong>'+p.displayName+'</strong><div style="font-size:11px;color:var(--text-muted)">'+p.j1+' &amp; '+p.j2+'</div></div>'
      :'<strong>'+p.nombre+' '+(p.apellido||'')+'</strong>';
    var montoP=p.type==='dobles'?S.config['monto-dobles']:S.config.monto;
    var montoStr=montoP&&parseFloat(montoP)?' &middot; '+fmtMoney(montoP):'';
    var pagoCell=S.config.inscripcion
      ?'<td><button onclick="togglePago(\''+p.id+'\')" class="tag '+(p.pago?'tag-green':'tag-coral')+'" style="border:none;cursor:pointer;font-size:11px;">'+(p.pago?'&#x2713; Pago':'&#x2717; Debe')+montoStr+'</button></td>'
      :'';
    return '<tr>'
      +'<td style="color:var(--text-muted)">'+(i+1)+'</td>'
      +'<td>'+nm+'</td><td>'+tb+'</td>'
      +'<td style="color:var(--text-muted)">'+(p.club||'&mdash;')+'</td>'
      +'<td><span class="tag '+catCol(p.cat)+'">'+catNm(p.cat)+'</span></td>'
      +'<td>'+zl+'</td>'+pagoCell
      +'<td style="display:flex;gap:4px;">'
      +'<button class="btn btn-sm" onclick="editPlayer(\''+p.id+'\')">Edit</button>'
      +'<button class="btn btn-sm btn-danger" onclick="removePlayer(\''+p.id+'\')">&#x2715;</button>'
      +'</td></tr>';
      
  }).join('');
  w.innerHTML='<table><thead><tr><th>#</th><th>Jugador/Pareja</th><th>Tipo</th><th>Club</th><th>Categoria</th><th>Zona</th>'+pagoHdr+'<th></th></tr></thead><tbody>'+rows+'</tbody></table>';
}

// ═══════════════════ EQUIPOS ═══════════════════
function addEquipo(){
  var n=document.getElementById('eq-nombre').value.trim();
  if(!n){salert('alert-equipo','Ingresa el nombre del equipo','warn',3000);return;}
  var pago=S.config.inscripcion?document.getElementById('eq-pago').checked:null;
  var eq={id:uid(),type:'equipo',nombre:n,cat:document.getElementById('eq-cat').value,jugadores:[],zona:false,pago:pago};
  S.equipos.push(eq);
  document.getElementById('eq-nombre').value='';
  document.getElementById('eq-pago').checked=false;
  renderEquipos();renderCajaEquipos();updateSelects();updateMetrics();
  // Abrir automaticamente el panel de ese equipo para agregar jugadores
  setTimeout(function(){
    var inp=document.getElementById('mbr-'+eq.id);
    if(inp){
      inp.scrollIntoView({behavior:'smooth',block:'center'});
      inp.focus();
      inp.placeholder='Jugador 1 (minimo 2 para usar el equipo)';
    }
  },100);
}
function removeEquipo(id){
  if(!confirm('Eliminar equipo?'))return;
  S.equipos=S.equipos.filter(function(e){return e.id!==id;});
  S.zones.forEach(function(z){if(z.mode==='equipos')z.players=z.players.filter(function(p){return p!==id;});});
  renderEquipos();renderCajaEquipos();updateMetrics();
}
function addMember(eqId){
  var inp=document.getElementById('mbr-'+eqId);
  var n=inp.value.trim();if(!n)return;
  var eq=S.equipos.find(function(e){return e.id===eqId;});if(!eq)return;
  eq.jugadores.push({id:uid(),nombre:n});
  inp.value='';
  inp.placeholder=eq.jugadores.length<2?'Jugador '+(eq.jugadores.length+1)+' (minimo 2)':'Agregar otro jugador...';
  renderEquipos();renderCajaEquipos();
}
function removeMember(eqId,mId){
  var eq=S.equipos.find(function(e){return e.id===eqId;});if(!eq)return;
  eq.jugadores=eq.jugadores.filter(function(j){return j.id!==mId;});renderEquipos();
}
function toggleEqPago(eqId){
  var eq=S.equipos.find(function(e){return e.id===eqId;});
  if(eq){eq.pago=!eq.pago;renderEquipos();renderCajaEquipos();}
}
function editEquipo(id){
  var eq=S.equipos.find(function(e){return e.id===id;});if(!eq)return;
  var catOpts=S.categories.map(function(c){return'<option value="'+c.id+'"'+(c.id===eq.cat?' selected':'')+'>'+c.nombre+'</option>';}).join('');
  var modal='<div id="edit-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.4);z-index:1000;display:flex;align-items:center;justify-content:center;">'
    +'<div style="background:var(--surface);border-radius:var(--radius-lg);padding:24px;width:90%;max-width:480px;box-shadow:0 8px 32px rgba(0,0,0,.2);">'
    +'<h3 style="margin-bottom:16px;">Editar equipo</h3>'
    +'<div style="display:flex;flex-direction:column;gap:12px;">'
    +'<div class="form-group"><label>Nombre del equipo</label><input id="edit-eq-nombre" type="text" value="'+eq.nombre+'"/></div>'
    +'<div class="form-group"><label>Categoria</label><select id="edit-eq-cat">'+catOpts+'</select></div>'
    +'<div>'
    +'<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">Jugadores</div>'
    +'<div id="edit-eq-members" style="display:flex;flex-direction:column;gap:6px;">'
    +eq.jugadores.map(function(j){
      return '<div style="display:flex;gap:6px;align-items:center;">'
        +'<input type="text" value="'+j.nombre+'" id="edit-mbr-'+j.id+'" style="flex:1;"/>'
        +'<button class="btn btn-sm btn-danger" onclick="removeEditMember(\''+id+'\',\''+j.id+'\')">&#x2715;</button>'
        +'</div>';
    }).join('')
    +'</div>'
    +'<div style="display:flex;gap:6px;margin-top:8px;">'
    +'<input id="edit-new-member" type="text" placeholder="Agregar jugador..." style="flex:1;"/>'
    +'<button class="btn btn-sm btn-primary" onclick="addEditMember(\''+id+'\')">+</button>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end;">'
    +'<button class="btn" onclick="closeEditModal()">Cancelar</button>'
    +'<button class="btn btn-primary" onclick="saveEditEquipo(\''+id+'\')">Guardar</button>'
    +'</div></div></div>';
  document.body.insertAdjacentHTML('beforeend',modal);
}
function saveEditEquipo(id){
  var eq=S.equipos.find(function(e){return e.id===id;});if(!eq)return;
  eq.nombre=document.getElementById('edit-eq-nombre').value.trim()||eq.nombre;
  eq.cat=document.getElementById('edit-eq-cat').value;
  eq.jugadores.forEach(function(j){
    var inp=document.getElementById('edit-mbr-'+j.id);
    if(inp&&inp.value.trim())j.nombre=inp.value.trim();
  });
  closeEditModal();
  renderEquipos();updateSelects();
}
function addEditMember(eqId){
  var eq=S.equipos.find(function(e){return e.id===eqId;});if(!eq)return;
  var inp=document.getElementById('edit-new-member');
  var n=inp.value.trim();if(!n)return;
  eq.jugadores.push({id:uid(),nombre:n});
  inp.value='';
  var wrap=document.getElementById('edit-eq-members');
  if(wrap){
    var j=eq.jugadores[eq.jugadores.length-1];
    var row=document.createElement('div');
    row.style.cssText='display:flex;gap:6px;align-items:center;';
    row.innerHTML='<input type="text" value="'+j.nombre+'" id="edit-mbr-'+j.id+'" style="flex:1;"/>'
      +'<button class="btn btn-sm btn-danger" onclick="removeEditMember(\''+eqId+'\',\''+j.id+'\')">&#x2715;</button>';
    wrap.appendChild(row);
  }
}
function removeEditMember(eqId,mId){
  var eq=S.equipos.find(function(e){return e.id===eqId;});if(!eq)return;
  eq.jugadores=eq.jugadores.filter(function(j){return j.id!==mId;});
  var row=document.getElementById('edit-mbr-'+mId);
  if(row&&row.parentNode)row.parentNode.remove();
}
function eqPagoBtn(eq){
  if(!S.config.inscripcion)return'';
  var me=S.config['monto-equipo']&&parseFloat(S.config['monto-equipo']);
  var ms=me?' &middot; $'+parseFloat(S.config['monto-equipo']).toLocaleString('es-AR'):'';
  var lbl=(eq.pago?'&#x2713; Pago':'&#x2717; Debe')+ms;
  return '<button onclick="toggleEqPago(\''+eq.id+'\')" class="tag '+(eq.pago?'tag-green':'tag-coral')+'" style="border:none;cursor:pointer;font-size:11px;margin-left:6px;">'+lbl+'</button>';
}
function renderEquipos(){
  var w=document.getElementById('equipos-list-wrap');
  if(!S.equipos.length){
    w.innerHTML='<div class="empty"><div class="empty-icon">&#x1F91D;</div><p>No hay equipos</p></div>';return;
  }
  var cats=[...new Set(S.equipos.map(function(e){return e.cat;}))];
  w.innerHTML=cats.map(function(cat){
    var ces=S.equipos.filter(function(e){return e.cat===cat;});
    var cards=ces.map(function(eq){
      var members=eq.jugadores.map(function(j,i){
        return '<tr><td style="color:var(--text-muted);width:24px;">'+(i+1)+'</td><td>'+j.nombre+'</td>'
          +'<td><button class="btn btn-sm btn-danger" style="height:22px;padding:0 6px;" onclick="removeMember(\''+eq.id+'\',\''+j.id+'\')">&#x2715;</button></td></tr>';
      }).join('');
      return '<div class="card" style="margin:0;background:var(--surface);">'
        +'<div class="team-header">'
        +'<div><strong>'+eq.nombre+'</strong> <span class="tag tag-orange" style="font-size:10px;">Equipo</span>'+eqPagoBtn(eq)+'</div>'
        +'<div style="display:flex;gap:4px;align-items:center;">'
        +'<button class="btn btn-sm btn-ghost" onclick="editEquipo(\''+eq.id+'\')" style="color:var(--text-muted);font-size:11px;" title="Editar equipo">Edit</button>'
        +'<button class="btn btn-sm btn-danger" onclick="removeEquipo(\''+eq.id+'\')">&#x2715;</button>'
        +'</div></div>'
        +'<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">'+eq.jugadores.length+' integrantes</div>'
        +'<table style="font-size:12px;margin-bottom:10px;"><tbody>'+members+'</tbody></table>'
        +'<div style="display:flex;gap:6px;">'
        +'<input id="mbr-'+eq.id+'" type="text" placeholder="Agregar integrante..." style="flex:1;" onkeydown="if(event.key===\'Enter\')addMember(\''+eq.id+'\')"/>'
        +'<button class="btn btn-sm btn-primary" onclick="addMember(\''+eq.id+'\')">+</button>'
        +'</div></div>';
    }).join('');
    return '<div class="zone-section">'
      +'<div class="zone-section-title"><span class="tag '+catCol(cat)+'">'+catNm(cat)+'</span></div>'
      +'<div class="grid2">'+cards+'</div></div>';
  }).join('');
}

// ═══════════════════ CAJA ═══════════════════
function calcCaja(){
  if(!S.config.inscripcion)return null;
  var ms=parseFloat(S.config.monto||0);
  var md=parseFloat(S.config['monto-dobles']||0);
  var me=parseFloat(S.config['monto-equipo']||0);
  var pagado=0,pendiente=0,total=0,pagaron=0,sinPagar=0;
  S.players.forEach(function(p){
    var m=p.type==='dobles'?md:ms;total+=m;
    if(p.pago){pagado+=m;pagaron++;}else{pendiente+=m;sinPagar++;}
  });
  S.equipos.forEach(function(eq){
    total+=me;
    if(eq.pago){pagado+=me;pagaron++;}else{pendiente+=me;sinPagar++;}
  });
  return{pagado:pagado,pendiente:pendiente,total:total,pagaron:pagaron,sinPagar:sinPagar};
}
function cajaHTML(caja){
  if(!caja||!S.config.inscripcion)return'';
  function fmt(n){return'$'+n.toLocaleString('es-AR');}
  return '<div class="card" style="border-color:#bbf7d0;background:var(--success-bg);margin-bottom:12px;">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">'
    +'<div style="font-size:13px;font-weight:600;color:var(--success);">&#x1F4B0; Caja de inscripciones</div>'
    +'<div style="display:flex;gap:16px;flex-wrap:wrap;">'
    +'<div style="text-align:center;"><div style="font-size:10px;text-transform:uppercase;color:var(--text-muted);">Total esperado</div><div style="font-size:18px;font-weight:700;">'+fmt(caja.total)+'</div></div>'
    +'<div style="text-align:center;"><div style="font-size:10px;text-transform:uppercase;color:var(--success);">Cobrado</div><div style="font-size:18px;font-weight:700;color:var(--success);">'+fmt(caja.pagado)+'</div></div>'
    +'<div style="text-align:center;"><div style="font-size:10px;text-transform:uppercase;color:var(--danger);">Pendiente</div><div style="font-size:18px;font-weight:700;color:var(--danger);">'+fmt(caja.pendiente)+'</div></div>'
    +'<div style="text-align:center;"><div style="font-size:10px;text-transform:uppercase;color:var(--text-muted);">Pagaron</div><div style="font-size:18px;font-weight:700;">'+caja.pagaron+' / '+(caja.pagaron+caja.sinPagar)+'</div></div>'
    +'</div></div>'
    +(caja.pendiente>0
      ?'<div style="font-size:11px;color:var(--danger);margin-top:8px;">&#x26A0; '+caja.sinPagar+' participante'+(caja.sinPagar!==1?'s':'')+' sin pagar</div>'
      :'<div style="font-size:11px;color:var(--success);margin-top:8px;">&#x2705; Todos pagaron</div>')
    +'</div>';
}
function renderCajaSingles(){var el=document.getElementById('caja-singles-display');if(el)el.innerHTML=cajaHTML(calcCaja());}
function renderCajaEquipos(){var el=document.getElementById('caja-equipos-display');if(el)el.innerHTML=cajaHTML(calcCaja());}

// ═══════════════════ INSCRIPCION TOGGLE ═══════════════════
function toggleInscripcion(){
  var on=document.getElementById('cfg-inscripcion').checked;
  document.getElementById('cfg-monto-wrap').style.display=on?'':'none';
  ['inp-pago-wrap','dbl-pago-wrap','eq-pago-wrap'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.style.display=on?'':'none';
  });
  renderCajaSingles();renderCajaEquipos();
}

// ═══════════════════ ZONES ═══════════════════
function generateZones(){
  var zm=document.getElementById('zone-mode-filter').value;
  var cat=document.getElementById('zone-cat-filter').value;
  var n=Math.max(1,parseInt(document.getElementById('zone-count').value)||2);
  var pool=zm==='equipos'
    ?(cat?S.equipos.filter(function(e){return e.cat===cat;}):S.equipos)
    :(cat?S.players.filter(function(p){return p.cat===cat;}):S.players);
  if(!pool.length){salert('alert-zonas','No hay participantes','warn',3000);return;}
    if(S.zones.length&&!confirm('Regenerar zonas borrara todos los partidos y reiniciara el ranking de este torneo. Continuar?'))return;
  S.matches={};S.equipoMatches={};S.bracket={};S.rlBracket={};S.bracketScores={};
  var cats=cat?[cat]:[...new Set(pool.map(function(p){return p.cat;}))];
  S.zones=S.zones.filter(function(z){return!(z.mode===zm&&(cat?z.cat===cat:true));});
  cats.forEach(function(c){
    var cp=[...(zm==='equipos'?S.equipos.filter(function(e){return e.cat===c;}):S.players.filter(function(p){return p.cat===c;}))].sort(function(){return Math.random()-.5;});
    var nz=Math.min(n,cp.length);
    var nzones=[];
    for(var i=0;i<nz;i++)nzones.push({id:uid(),num:i,cat:c,mode:zm,players:[]});
    cp.forEach(function(p,i){nzones[i%nz].players.push(p.id);p.zona=true;});
    S.zones.push.apply(S.zones,nzones);
  });
  salert('alert-zonas','&#x2705; Zonas generadas','success',3000);
  renderZones();renderPlayers();renderEquipos();updateSelects();updateMetrics();
}
function renderZones(){
  var w=document.getElementById('zones-display');
  if(!S.zones.length){w.innerHTML='<div class="card"><div class="empty"><div class="empty-icon">&#x1F532;</div><p>Genera las zonas</p></div></div>';return;}
  var cats=[...new Set(S.zones.map(function(z){return z.cat;}))];
  w.innerHTML=cats.map(function(cat){
    var cz=S.zones.filter(function(z){return z.cat===cat;});
    return '<div class="zone-section">'
      +'<div class="zone-section-title"><span class="tag '+catCol(cat)+'">'+catNm(cat)+'</span></div>'
      +'<div class="grid2">'+cz.map(function(z){
        var items=z.players.map(function(pid){return S.players.find(function(p){return p.id===pid;})||S.equipos.find(function(e){return e.id===pid;});}).filter(Boolean);
        var mt=z.mode==='equipos'?'<span class="tag tag-orange" style="font-size:10px;">Equipos</span>':'';
        return '<div class="card" style="margin:0;">'
          +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">'
          +'<span class="tag '+ZCOLS[z.num%ZCOLS.length]+'">Zona '+(z.num+1)+'</span>'+mt
          +'<span style="font-size:12px;color:var(--text-muted);">'+items.length+' participantes</span></div>'
          +'<table><thead><tr><th>#</th><th>Participante</th><th>Club</th></tr></thead><tbody>'
          +items.map(function(p,i){return'<tr><td>'+(i+1)+'</td><td>'+dn(p)+'</td><td style="color:var(--text-muted)">'+(p.club||'&mdash;')+'</td></tr>';}).join('')
          +'</tbody></table></div>';
      }).join('')+'</div></div>';
  }).join('');
}

// ═══════════════════ ITTF SCORING ═══════════════════
function calcSetWinner(a,b){
  var ia=parseInt(a),ib=parseInt(b);
  if(isNaN(ia)||isNaN(ib))return 0;
  if(ia===11&&ib<=9)return 1;
  if(ib===11&&ia<=9)return 2;
  if(ia>=10&&ib>=10&&ia-ib===2)return 1;
  if(ia>=10&&ib>=10&&ib-ia===2)return 2;
  return 0;
}
function validateSet(a,b){
  var aE=a===''||a===undefined||a===null;
  var bE=b===''||b===undefined||b===null;
  if(aE||bE)return null;
  var ia=parseInt(a),ib=parseInt(b);
  if(isNaN(ia)||isNaN(ib))return null;
  if(ia<0||ib<0)return'Puntos no pueden ser negativos';
  if(ia<10&&ib<10)return null;
  if(ia>=10&&ib>=10){var d=Math.abs(ia-ib);if(d<=2)return null;return'En deuce la diferencia debe ser exactamente 2';}
  if(ia>=10&&ib<10){if(ia<=11)return null;return'Sin deuce el set se gana con exactamente 11 (no '+ia+')';}
  if(ib>=10&&ia<10){if(ib<=11)return null;return'Sin deuce el set se gana con exactamente 11 (no '+ib+')';}
  return null;
}
function setIsComplete(a,b){
  var aE=a===''||a===undefined||a===null;
  var bE=b===''||b===undefined||b===null;
  if(aE||bE)return false;
  if(validateSet(a,b)!==null)return false;
  return calcSetWinner(a,b)!==0;
}
function matchResult(sets,setsToWin){
  var w1=0,w2=0;
  sets.forEach(function(s){
    if(!setIsComplete(s.a,s.b))return;
    var sw=calcSetWinner(s.a,s.b);
    if(sw===1)w1++;else if(sw===2)w2++;
  });
  return{w1:w1,w2:w2,done:w1>=setsToWin||w2>=setsToWin};
}
function setsToDisplay(sets,setsToWin,totalSets){
  if(!sets||!sets.length)return 1;
  var lastComplete=0;
  for(var i=0;i<sets.length;i++){
    if(setIsComplete(sets[i].a,sets[i].b))lastComplete=i+1;else break;
  }
  var res=matchResult(sets,setsToWin);
  if(res.done)return lastComplete;
  return Math.min(totalSets,lastComplete+1);
}

// ═══════════════════ FOCUS HELPERS ═══════════════════
function clearSetRowErrors(inputEl){
  if(!inputEl)return;
  var row=inputEl.closest('.set-row');if(!row)return;
  row.querySelectorAll('input').forEach(function(inp){inp.style.borderColor='';});
  var tip=row.querySelector('.score-err');if(tip)tip.remove();
}
function applyScoreValidation(inputEl,a,b){
  var aE=a===''||a===undefined||a===null;
  var bE=b===''||b===undefined||b===null;
  var err=(aE||bE)?null:validateSet(a,b);
  var row=inputEl?inputEl.closest('.set-row'):null;
  if(row){row.querySelectorAll('input').forEach(function(inp){inp.style.borderColor=err?'var(--danger)':'';});}
  else if(inputEl){inputEl.style.borderColor=err?'var(--danger)':'';}
  var tip=row?row.querySelector('.score-err'):null;
  if(err){
    if(!tip&&row){tip=document.createElement('div');tip.className='score-err';tip.style.cssText='color:var(--danger);font-size:10px;margin-top:2px;padding-left:50px;';row.appendChild(tip);}
    if(tip)tip.textContent=err;
  }else{if(tip)tip.remove();}
}
function focusNextEmpty(inputEl, matchId){
  if(!inputEl||!matchId)return;
  var all=Array.from(document.querySelectorAll('input[data-mid="'+matchId+'"]'));
  var cur=all.indexOf(inputEl);
  for(var i=cur+1;i<all.length;i++){
    if(all[i].value===''){all[i].focus();all[i].select();return;}
  }
}

function handleScoreTab(e, inputEl, matchId){
  if(e.key!=='Tab')return;
  var all=Array.from(document.querySelectorAll('input[data-mid="'+matchId+'"]'));
  var cur=all.indexOf(inputEl);
  var next=null;
  if(e.shiftKey){
    // Tab hacia atras: ir al anterior
    for(var i=cur-1;i>=0;i--){next=all[i];break;}
  } else {
    // Tab hacia adelante: ir al siguiente
    for(var i=cur+1;i<all.length;i++){next=all[i];break;}
  }
  if(next){e.preventDefault();next.focus();next.select();}
}
function autoFocusSibling(inputEl){
  if(!inputEl)return;
  var val=parseInt(inputEl.value);if(isNaN(val))return;
  if(val!==11&&val<12)return;
  var matchId=inputEl.dataset.mid;
  var si=inputEl.dataset.si;
  var field=inputEl.dataset.field;
  var otherField=field==='a'?'b':'a';
  var sibling=document.querySelector('input[data-mid="'+matchId+'"][data-si="'+si+'"][data-field="'+otherField+'"]');
  if(sibling&&sibling.value===''){sibling.focus();sibling.select();return;}
  focusNextEmpty(inputEl,matchId);
}
function focusNextInput(matchId,setIdx){
  var all=Array.from(document.querySelectorAll('input[data-mid="'+matchId+'"]'));
  var startInp=all.find(function(el){return el.dataset.si==setIdx;});
  if(!startInp){var first=all.find(function(el){return el.value==='';});if(first){first.focus();first.select();}return;}
  var startI=all.indexOf(startInp);
  for(var i=startI;i<all.length;i++){if(all[i].value===''){all[i].focus();all[i].select();return;}}
}

// ═══════════════════ ZONE MATCH RESULTS ═══════════════════
function midKey(zid,a,b){return zid+'_'+[a,b].sort().join('_');}
function saveSetScore(mid,si,field,val,inputEl){
  if(!S.matches[mid])S.matches[mid]={sets:[]};
  if(!S.matches[mid].sets)S.matches[mid].sets=[];
  while(S.matches[mid].sets.length<=si)S.matches[mid].sets.push({a:'',b:''});
  S.matches[mid].sets[si][field]=val;
  var s=S.matches[mid].sets[si];
  var bothFilled=s.a!==''&&s.a!==undefined&&s.b!==''&&s.b!==undefined;
  if(!bothFilled){clearSetRowErrors(inputEl);autoFocusSibling(inputEl);updateMetrics();return;}
  applyScoreValidation(inputEl,s.a,s.b);
  updateMetrics();
  var statusEl=document.getElementById('mstatus-'+mid);
  if(statusEl)statusEl.innerHTML=matchStatusHTML(mid);
}
function commitSetScore(mid,si,inputEl){
  var mv=S.matches[mid];if(!mv||!mv.sets||!mv.sets[si])return;
  var s=mv.sets[si];
  var bothFilled=s.a!==''&&s.a!==undefined&&s.b!==''&&s.b!==undefined;
  if(!bothFilled)return;
  if(!setIsComplete(s.a,s.b))return;
  var setsToWin=parseInt(S.config.sets||2);
  var totalSets=setsToWin*2-1;
  var res2=matchResult(mv.sets,setsToWin);
  if(res2.done){
  renderResults();
  // Actualizar llave si existe para esa categoria
  var zDone=S.zones.find(function(z){
    return z.players&&z.players.some(function(pid){
      return mid.indexOf(z.id)===0;
    });
  });
  if(zDone&&S.bracket[zDone.cat])autoUpdateBracket(zDone.cat);
  return;
}
  var nextSi=setsToDisplay(mv.sets,setsToWin,totalSets)-1;
  renderResults();
  setTimeout(function(){
    var panelId='panel-'+mid;
    var panel=document.getElementById(panelId);
    if(panel)panel.style.display='block';
    focusNextInput(mid,nextSi);
  },30);
}
function resetZoneMatch(mid){
  if(!confirm('Anular este resultado?'))return;
  S.matches[mid]={sets:[]};
  renderResults();
  updateMetrics();
  var zDone=S.zones.find(function(z){
    return z.players&&z.players.some(function(p1){
      return z.players.some(function(p2){
        return p1!==p2&&midKey(z.id,p1,p2)===mid;
      });
    });
  });
  if(!zDone)return;
  var cat=zDone.cat;
  var b=S.bracket[cat];
  if(!b||!b.slotMap)return;
  // Encontrar los slots de esta zona en el bracket y limpiarlos en cascada
  var cz=S.zones.filter(function(z){return z.cat===cat;});
  var bracketSize=b.bracketSize;
  var slots=new Array(bracketSize).fill(null);
  b.slotMap.forEach(function(sm){
    var z=cz.find(function(z){return z.id===sm.zonaId;});
    if(z&&zonaCompleta(z)){
      var st=getStandings(z);
      if(st.length>=sm.rank)slots[sm.pos-1]={player:st[sm.rank-1].player,zona:z.num+1,rank:sm.rank};
      else slots[sm.pos-1]={pending:true};
    }else{
      slots[sm.pos-1]={pending:true};
    }
  });
  // Reconstruir rounds
  var newRounds=buildRounds(slots);
  // Para cada slot que quedó pending, limpiar en cascada todas las rondas siguientes
  b.slotMap.forEach(function(sm){
    var z=cz.find(function(z){return z.id===sm.zonaId;});
    if(!z||zonaCompleta(z))return;
    // Este slot es pending — buscar en qué partido de ronda 0 está y limpiar cascada
    var slotIdx=sm.pos-1;
    var mi0=Math.floor(slotIdx/2);
    // Limpiar scores y winners en cascada desde ronda 0
    var curMi=mi0;
    for(var rr=0;rr<b.rounds.length;rr++){
      var match=newRounds[rr]&&newRounds[rr][curMi];
      if(!match)break;
      var kk=bScoreKey(cat,rr,curMi);
      S.bracketScores[kk]={sets:[]};
      match.winner=null;match.auto=false;
      if(rr<b.rounds.length-1)curMi=Math.floor(curMi/2);
    }
  });
  b.rounds=newRounds;
  b.pendientes=cz.filter(function(z){return!zonaCompleta(z);}).length;
  renderBracket(cat);
}
function matchStatusHTML(mid){
  var mv=S.matches[mid]||{};
  var setsToWin=parseInt(S.config.sets||2);
  var sets=mv.sets||[];
  var res=matchResult(sets,setsToWin);
  if(!res.done)return'<span style="color:var(--text-muted);font-size:12px;">'+res.w1+'&ndash;'+res.w2+' sets</span>';
  return'<span class="tag tag-green" style="font-size:12px;">'+res.w1+'&ndash;'+res.w2+' &#x2713;</span>';
}
function toggleMatchPanel(panelId){
  var el=document.getElementById(panelId);if(!el)return;
  el.style.display=el.style.display==='none'?'block':'none';
}
function renderResults(){
  var zf=document.getElementById('res-zone-filter').value;
  var cf=document.getElementById('res-cat-filter').value;
  var w=document.getElementById('results-display');
  var zones=S.zones;
  if(zf)zones=zones.filter(function(z){return z.id===zf;});
  if(cf)zones=zones.filter(function(z){return z.cat===cf;});
  if(!zones.length){w.innerHTML='<div class="card"><div class="empty"><p>Sin zonas generadas.</p></div></div>';return;}
  var setsToWin=parseInt(S.config.sets||2);
  var totalSets=setsToWin*2-1;
  w.innerHTML=zones.map(function(z){
    if(z.mode==='equipos')return renderEqZone(z);
    var ps=z.players.map(function(pid){return S.players.find(function(p){return p.id===pid;});}).filter(Boolean);
    if(ps.length<2)return'';
    var matchCards='';
    var __tab=1;
    for(var i=0;i<ps.length;i++){for(var j=i+1;j<ps.length;j++){
      var m=midKey(z.id,ps[i].id,ps[j].id);
      var mv=S.matches[m]||{sets:[]};
      var sets=mv.sets||[];
      var res=matchResult(sets,setsToWin);
      var stsShow=setsToDisplay(sets,setsToWin,totalSets);
      var scoreSummary=sets.filter(function(s){return setIsComplete(s.a,s.b);}).map(function(s){return s.a+'-'+s.b;}).join(', ');
      var nameA=dn(ps[i]),nameB=dn(ps[j]);
      var winnerName=res.done?(res.w1>=setsToWin?nameA:nameB):'';
      var hCols='<div></div>';
      var rA='<div style="font-size:12px;font-weight:500;padding-right:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;" title="'+nameA+'">'+nameA+'</div>';
      var rB='<div style="font-size:12px;font-weight:500;padding-right:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;" title="'+nameB+'">'+nameB+'</div>';
      var errMsg='';
      for(var si=0;si<stsShow;si++){
        var s=sets[si]||{a:'',b:''};
        var sw=calcSetWinner(s.a,s.b);
        var err=validateSet(s.a,s.b);
        var aWin=sw===1&&!err,bWin=sw===2&&!err;
        var hasErr=!!err&&s.a!==''&&s.b!=='';
        if(hasErr&&!errMsg)errMsg=err;
        hCols+='<div style="font-size:10px;color:var(--text-muted);text-align:center;font-weight:600;">S'+(si+1)+'</div>';
        var bcA=hasErr?'var(--danger)':aWin?'var(--success)':bWin?'#fca5a5':'var(--border)';
        var bcB=hasErr?'var(--danger)':bWin?'var(--success)':aWin?'#fca5a5':'var(--border)';
        var doneSet=setIsComplete(s.a,s.b);
        var tiA=doneSet?-1:__tab++;
        var tiB=doneSet?-1:__tab++;
        var bgSet=doneSet?'var(--bg)':'var(--surface)';
          rA+='<div style="padding:1px 2px;"><input type="number" min="0" value="'+(s.a||'')+'" placeholder="0"'
          +' data-mid="'+m+'" data-si="'+si+'" data-field="a" tabindex="'+tiA+'"'
          +' style="width:46px;height:28px;padding:0 4px;border:1px solid '+bcA+';border-radius:var(--radius);font-size:12px;text-align:center;background:'+bgSet+';color:var(--text);"'
          +' oninput="saveSetScore(\''+m+'\','+si+',\'a\',this.value,this)"'
          +' onblur="commitSetScore(\''+m+'\','+si+',this)"'
          +' onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}else if(event.key===\'Tab\'){event.preventDefault();commitSetScore(\''+m+'\','+si+',this);focusNextEmpty(this,\''+m+'\');}"/></div>';    
        rB+='<div style="padding:1px 2px;"><input type="number" min="0" value="'+(s.b||'')+'" placeholder="0"'
          +' data-mid="'+m+'" data-si="'+si+'" data-field="b" tabindex="'+tiB+'"'
          +' style="width:46px;height:28px;padding:0 4px;border:1px solid '+bcB+';border-radius:var(--radius);font-size:12px;text-align:center;background:'+bgSet+';color:var(--text);"'
          +' oninput="saveSetScore(\''+m+'\','+si+',\'b\',this.value,this)"'
          +' onblur="commitSetScore(\''+m+'\','+si+',this)"'
          +' onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}else if(event.key===\'Tab\'){event.preventDefault();commitSetScore(\''+m+'\','+si+',this);focusNextEmpty(this,\''+m+'\');}"/></div>';
      }
      var gridCols='minmax(90px,140px) repeat('+stsShow+',52px)';
      var panelId='panel-'+m;
      var entryPanel='<div id="'+panelId+'" style="display:none;padding:12px 14px 10px;border-top:1px solid var(--border);background:var(--bg);">'
        +'<div style="display:grid;grid-template-columns:'+gridCols+';gap:2px;align-items:center;margin-bottom:2px;">'+hCols+'</div>'
        +'<div style="display:grid;grid-template-columns:'+gridCols+';gap:2px;align-items:center;margin-bottom:4px;">'+rA+'</div>'
        +'<div style="display:grid;grid-template-columns:'+gridCols+';gap:2px;align-items:center;">'+rB+'</div>'
        +(errMsg?'<div style="color:var(--danger);font-size:11px;margin-top:6px;">&#x2717; '+errMsg+'</div>':'')
        +(res.done
          ?'<div style="margin-top:8px;padding:5px 10px;background:var(--success-bg);border:1px solid #bbf7d0;border-radius:var(--radius);font-size:12px;color:var(--success);font-weight:500;">&#x1F3C6; '+winnerName+'</div>'
         +'<div style="margin-top:6px;text-align:right;"><button class="btn btn-sm btn-danger" onclick="resetZoneMatch(\''+m+'\')">Anular</button></div>'
          :'')
        +'</div>';
      var collapsedScore=scoreSummary?'<span style="font-size:11px;color:var(--text-muted);margin-left:8px;">'+scoreSummary+'</span>':'';
      var winBadge='';
      matchCards+='<div id="match-'+m+'" style="border:1px solid '+(res.done?'#bbf7d0':'var(--border)')+';border-radius:var(--radius);margin-bottom:8px;background:'+(res.done?'var(--success-bg)':'var(--surface)')+';">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;gap:8px;" onclick="toggleMatchPanel(\''+panelId+'\')">'
        +'<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;">'
        +'<span style="font-size:13px;font-weight:500;">'+nameA+'</span>'
        +'<span style="color:var(--text-muted);font-size:12px;">vs</span>'
        +'<span style="font-size:13px;font-weight:500;">'+nameB+'</span>'
        +collapsedScore+winBadge+'</div>'
        +'<span id="mstatus-'+m+'">'+matchStatusHTML(m)+'</span></div>'
        +entryPanel+'</div>';
    }}
      var standingsHTML=zoneStandingsTableHTML(getStandings(z));
    return '<div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;">'
      +'<span class="tag '+ZCOLS[z.num%ZCOLS.length]+'">Zona '+(z.num+1)+'</span>'
      +'<span style="font-size:12px;color:var(--text-muted);">'+catNm(z.cat)+' &middot; mejor de '+totalSets+' sets &middot; a 11 puntos</span>'
      +'<button class="btn btn-sm btn-ghost" style="margin-left:auto;" onclick="printZoneSheet(\''+z.id+'\')">&#x1F5A8; Imprimir fichas</button>'
      +'</div>'
      +standingsHTML
      +matchCards+'</div>';
  }).join('')||'<div class="card"><div class="empty"><p>Sin partidos</p></div></div>';
}

// ═══════════════════ EQUIPO ZONE RESULTS ═══════════════════
function eqMatchResult(em){
  var setsToWin=parseInt(S.config.sets||2);
  var w1=0,w2=0;
  for(var pi=0;pi<3;pi++){
    if(pi===2&&!(w1===1&&w2===1))continue;
    var pd=em.partidos&&em.partidos[pi];if(!pd||!pd.sets||!pd.sets.length)break;
    var res=matchResult(pd.sets,setsToWin);if(!res.done)break;
    if(res.w1>=setsToWin)w1++;else w2++;
  }
  return{w1:w1,w2:w2,done:w1===2||w2===2};
}
function saveEqSetScore(mid,pi,si,field,val,inputEl){
  if(!S.equipoMatches[mid])S.equipoMatches[mid]={partidos:[]};
  var em=S.equipoMatches[mid];
  while(em.partidos.length<=pi)em.partidos.push({sets:[]});
  if(!em.partidos[pi].sets)em.partidos[pi].sets=[];
  while(em.partidos[pi].sets.length<=si)em.partidos[pi].sets.push({a:'',b:''});
  em.partidos[pi].sets[si][field]=val;
  var s=em.partidos[pi].sets[si];
  var bothFilled=s.a!==''&&s.a!==undefined&&s.b!==''&&s.b!==undefined;
  if(!bothFilled){clearSetRowErrors(inputEl);autoFocusEqSibling(inputEl);return;}
  applyScoreValidation(inputEl,s.a,s.b);
}
function commitEqSetScore(mid,pi,si){
  var em=S.equipoMatches[mid];
  if(!em||!em.partidos[pi]||!em.partidos[pi].sets||!em.partidos[pi].sets[si])return;
  var s=em.partidos[pi].sets[si];
  var bothFilled=s.a!==''&&s.a!==undefined&&s.b!==''&&s.b!==undefined;
  if(!bothFilled)return;
  if(!setIsComplete(s.a,s.b))return;
  updateMetrics();
  var setsToWin=parseInt(S.config.sets||2);
  var totalSets=setsToWin*2-1;
  var psets=em.partidos[pi].sets;
  var partidoRes=matchResult(psets,setsToWin);
  var pmid=mid+'::'+pi;
  renderResults();
  if(partidoRes.done)return;
  var nextSi=setsToDisplay(psets,setsToWin,totalSets)-1;
  setTimeout(function(){
    focusNextInput(pmid,nextSi);
  },30);
}
function renderEqZone(z){
  var eqs=z.players.map(function(pid){return S.equipos.find(function(e){return e.id===pid;});}).filter(Boolean);
  if(eqs.length<2)return'';
  var setsToWin=parseInt(S.config.sets||2);
  var totalSets=setsToWin*2-1;
  var __eqTab=1;
  var html='<div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;">'
    +'<span class="tag '+ZCOLS[z.num%ZCOLS.length]+'">Zona '+(z.num+1)+'</span>'
    +'<span class="tag tag-orange">Equipos</span>'
    +'<span style="font-size:12px;color:var(--text-muted);">'+catNm(z.cat)+' &middot; Singles/Dobles/Desempate</span>'
    +'<button class="btn btn-sm btn-ghost" style="margin-left:auto;" onclick="printZoneSheet(\''+z.id+'\')">&#x1F5A8; Imprimir fichas</button>'
    +'</div>'
    +zoneStandingsTableHTML(getEqStandings(z));
  for(var i=0;i<eqs.length;i++){for(var j=i+1;j<eqs.length;j++){
    var m=midKey(z.id,eqs[i].id,eqs[j].id);
    var em=S.equipoMatches[m]||{partidos:[]};
    var overallRes=eqMatchResult(em);
    var partidoBlocks='';
    for(var pi=0;pi<3;pi++){
      if(pi===2){
        var r0=em.partidos[0]&&em.partidos[0].sets&&em.partidos[0].sets.length?matchResult(em.partidos[0].sets,setsToWin):{done:false};
        var r1=em.partidos[1]&&em.partidos[1].sets&&em.partidos[1].sets.length?matchResult(em.partidos[1].sets,setsToWin):{done:false};
        if(!r0.done||!r1.done)continue;
        var pw1=(r0.w1>=setsToWin?1:0)+(r1.w1>=setsToWin?1:0);
        var pw2=(r0.w2>=setsToWin?1:0)+(r1.w2>=setsToWin?1:0);
        if(pw1!==1||pw2!==1)continue;
      }
      var def=EQ_PARTIDOS[pi];
      var pd=em.partidos[pi]||{sets:[]};
      var psets=pd.sets||[];
      var pres=psets.length?matchResult(psets,setsToWin):{done:false,w1:0,w2:0};
      var stsShow=setsToDisplay(psets,setsToWin,totalSets);
      var pWinner=pres.done?(pres.w1>=setsToWin?eqs[i].nombre:eqs[j].nombre):'';
            var isDecider=pi===2;
      var pmid=m+'::'+pi;
      var hCols='<div></div>';
      var rA='<div style="font-size:11px;font-weight:500;padding-right:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;">'+eqs[i].nombre+'</div>';
      var rB='<div style="font-size:11px;font-weight:500;padding-right:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;">'+eqs[j].nombre+'</div>';
      for(var si=0;si<stsShow;si++){
        var s=psets[si]||{a:'',b:''};
        var sw=calcSetWinner(s.a,s.b);
        var err=validateSet(s.a,s.b);
        var aWin=sw===1&&!err,bWin2=sw===2&&!err;
        var hasErr=!!err&&s.a!==''&&s.b!=='';
        hCols+='<div style="font-size:9px;color:var(--text-muted);text-align:center;font-weight:600;">S'+(si+1)+'</div>';
        var bcA=hasErr?'var(--danger)':aWin?'var(--success)':bWin2?'#fca5a5':'var(--border)';
        var bcB=hasErr?'var(--danger)':bWin2?'var(--success)':aWin?'#fca5a5':'var(--border)';
        var doneSetEq=setIsComplete(s.a,s.b);
        var tiEqA=doneSetEq?-1:__eqTab++;
        var tiEqB=doneSetEq?-1:__eqTab++;
        rA+='<div style="padding:1px 2px;"><input type="number" min="0" value="'+(s.a||'')+'" placeholder="0"'
          +' data-mid="'+pmid+'" data-si="'+si+'" data-field="a" tabindex="'+tiEqA+'"'
          +' style="width:40px;height:26px;padding:0 3px;border:1px solid '+bcA+';border-radius:var(--radius);font-size:12px;text-align:center;background:var(--surface);color:var(--text);"'
          +' oninput="saveEqSetScore(\''+m+'\','+pi+','+si+',\'a\',this.value,this)"'
          +' onblur="commitEqSetScore(\''+m+'\','+pi+','+si+')"'
          +' onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}"/></div>';
        rB+='<div style="padding:1px 2px;"><input type="number" min="0" value="'+(s.b||'')+'" placeholder="0"'
          +' data-mid="'+pmid+'" data-si="'+si+'" data-field="b" tabindex="'+tiEqB+'"'
          +' style="width:40px;height:26px;padding:0 3px;border:1px solid '+bcB+';border-radius:var(--radius);font-size:12px;text-align:center;background:var(--surface);color:var(--text);"'
          +' oninput="saveEqSetScore(\''+m+'\','+pi+','+si+',\'b\',this.value,this)"'
          +' onblur="commitEqSetScore(\''+m+'\','+pi+','+si+')"'
          +' onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}"/></div>';
      }
      var gCols='minmax(80px,110px) repeat('+stsShow+',44px)';
      partidoBlocks+='<div style="border:1px solid '+(isDecider?'var(--lightning-border)':'var(--border)')+';border-radius:var(--radius);padding:12px;margin-bottom:10px;background:'+(pres.done?(isDecider?'var(--lightning-bg)':'var(--success-bg)'):'var(--surface)')+';">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">'
        +'<div><span style="font-size:12px;font-weight:600;">'+def.icon+' '+def.label+'</span>'
        +'<span class="tag '+(def.tipo==='Dobles'?'tag-orange':'tag-gray')+'" style="margin-left:6px;font-size:10px;">'+def.tipo+'</span></div>'
        +(pres.done?'<span class="tag '+(isDecider?'tag-rl':'tag-green')+'" style="font-size:11px;">'+(isDecider?'&#x26A1; ':'')+pWinner+' ('+pres.w1+'&ndash;'+pres.w2+')</span>':'<span style="color:var(--text-muted);font-size:12px;">'+pres.w1+'&ndash;'+pres.w2+' sets</span>')
        +'</div>'
        +'<div style="display:grid;grid-template-columns:'+gCols+';gap:2px;align-items:center;margin-bottom:2px;">'+hCols+'</div>'
        +'<div style="display:grid;grid-template-columns:'+gCols+';gap:2px;align-items:center;margin-bottom:3px;">'+rA+'</div>'
        +'<div style="display:grid;grid-template-columns:'+gCols+';gap:2px;align-items:center;">'+rB+'</div>'
        +'</div>';
    }
    var overallBanner=overallRes.done
      ?'<div style="padding:8px 12px;background:var(--success-bg);border:1px solid #bbf7d0;border-radius:var(--radius);font-size:13px;color:var(--success);font-weight:600;margin-top:4px;">&#x1F3C6; '+(overallRes.w1>overallRes.w2?eqs[i].nombre:eqs[j].nombre)+' gana el encuentro ('+overallRes.w1+'&ndash;'+overallRes.w2+')</div>'
      :'<div style="padding:6px 12px;background:var(--bg);border-radius:var(--radius);font-size:12px;color:var(--text-muted);">Encuentro: '+overallRes.w1+'&ndash;'+overallRes.w2+'</div>';
    html+='<div class="eq-match" style="margin-bottom:16px;">'
      +'<div class="eq-match-header"><span><strong>'+eqs[i].nombre+'</strong> <span style="color:var(--text-muted);font-weight:400;">vs</span> <strong>'+eqs[j].nombre+'</strong></span>'
      +(overallRes.done?'<span class="tag tag-green">&#x2713; Finalizado</span>':'<span style="color:var(--text-muted);font-size:12px;">En curso</span>')+'</div>'
      +'<div style="padding:14px;">'+partidoBlocks+overallBanner+'</div></div>';
  }}
  html+='</div>';return html;
}

// ═══════════════════ STANDINGS ═══════════════════
function getStandings(zone){
  if(zone.mode==='equipos')return getEqStandings(zone);
  var ps=zone.players.map(function(pid){return S.players.find(function(p){return p.id===pid;});}).filter(Boolean);
  var stats={};var setsToWin=parseInt(S.config.sets||2);
  ps.forEach(function(p){stats[p.id]={player:p,pts:0,pg:0,pf:0,pc:0,ppf:0,ppc:0};});
  for(var i=0;i<ps.length;i++){for(var j=i+1;j<ps.length;j++){
    var mv=S.matches[midKey(zone.id,ps[i].id,ps[j].id)];
    if(!mv||!mv.sets||!mv.sets.length)continue;
    var res=matchResult(mv.sets,setsToWin);if(!res.done)continue;
    stats[ps[i].id].pf+=res.w1;stats[ps[i].id].pc+=res.w2;
    stats[ps[j].id].pf+=res.w2;stats[ps[j].id].pc+=res.w1;
    mv.sets.forEach(function(s){
      stats[ps[i].id].ppf+=parseInt(s.a||0);stats[ps[i].id].ppc+=parseInt(s.b||0);
      stats[ps[j].id].ppf+=parseInt(s.b||0);stats[ps[j].id].ppc+=parseInt(s.a||0);
    });
    if(res.w1>=setsToWin){stats[ps[i].id].pg++;stats[ps[i].id].pts+=3;}
    else{stats[ps[j].id].pg++;stats[ps[j].id].pts+=3;}
  }}
  return Object.values(stats).sort(function(a,b){return b.pts-a.pts||b.pg-a.pg||(b.pf-b.pc)-(a.pf-a.pc)||(b.ppf-b.ppc)-(a.ppf-a.ppc);});
}
function getEqStandings(zone){
  var eqs=zone.players.map(function(pid){return S.equipos.find(function(e){return e.id===pid;});}).filter(Boolean);
  var stats={};var setsToWin=parseInt(S.config.sets||2);
  eqs.forEach(function(e){stats[e.id]={player:e,pts:0,pg:0,pf:0,pc:0,ppf:0,ppc:0};});
  for(var i=0;i<eqs.length;i++){for(var j=i+1;j<eqs.length;j++){
    var em=S.equipoMatches[midKey(zone.id,eqs[i].id,eqs[j].id)]||{partidos:[]};
    var res=eqMatchResult(em);if(!res.done)continue;
    var sf1=0,sf2=0;
    em.partidos.forEach(function(pd){
      if(!pd||!pd.sets)return;
      var pr=matchResult(pd.sets,setsToWin);sf1+=pr.w1;sf2+=pr.w2;
      pd.sets.forEach(function(s){
        stats[eqs[i].id].ppf+=parseInt(s.a||0);stats[eqs[i].id].ppc+=parseInt(s.b||0);
        stats[eqs[j].id].ppf+=parseInt(s.b||0);stats[eqs[j].id].ppc+=parseInt(s.a||0);
      });
    });
    stats[eqs[i].id].pf+=sf1;stats[eqs[i].id].pc+=sf2;
    stats[eqs[j].id].pf+=sf2;stats[eqs[j].id].pc+=sf1;
    if(res.w1>res.w2){stats[eqs[i].id].pg++;stats[eqs[i].id].pts+=3;}
    else{stats[eqs[j].id].pg++;stats[eqs[j].id].pts+=3;}
  }}
  return Object.values(stats).sort(function(a,b){return b.pts-a.pts||b.pg-a.pg||(b.pf-b.pc)-(a.pf-a.pc)||(b.ppf-b.ppc)-(a.ppf-a.ppc);});
}
function zoneStandingsTableHTML(st){
  if(!st||!st.length)return'';
  var rows=st.map(function(s,i){
    var medal=i===0?'&#x1F947;':i===1?'&#x1F948;':i===2?'&#x1F949;':'';
    var pc=['pos-1','pos-2','pos-3'][i]||'';
    var diff=s.pf-s.pc;
    var pdiff=(s.ppf||0)-(s.ppc||0);
    return '<tr>'
      +'<td><span class="pos-circle '+pc+'">'+(i+1)+'</span></td>'
      +'<td>'+medal+' <strong>'+dn(s.player)+'</strong></td>'
      +'<td style="text-align:center;">'+s.pf+'</td>'
      +'<td style="text-align:center;">'+s.pc+'</td>'
      +'<td style="text-align:center;color:'+(diff>=0?'var(--success)':'var(--danger)')+';">'+(diff>=0?'+':'')+diff+'</td>'
      +'<td style="text-align:center;">'+s.ppf+'</td>'
      +'<td style="text-align:center;">'+s.ppc+'</td>'
      +'<td style="text-align:center;font-size:11px;color:var(--text-muted);">'+(pdiff>=0?'+':'')+pdiff+'</td>'
      +'</tr>';
  }).join('');
  return '<div style="overflow-x:auto;margin-bottom:14px;">'
    +'<table><thead><tr>'
    +'<th style="text-align:left;">#</th>'
    +'<th style="text-align:left;">Participante</th>'
    +'<th style="text-align:center;">SF</th>'
    +'<th style="text-align:center;">SC</th>'
    +'<th style="text-align:center;">Dif S.</th>'
    +'<th style="text-align:center;">PF</th>'
    +'<th style="text-align:center;">PC</th>'
    +'<th style="text-align:center;">Dif P.</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table>'
    +'</div>';
}
// ═══════════════════ FICHAS DE PARTIDO (IMPRESION) ═══════════════════
function jsEsc(str){return String(str).replace(/'/g,"\\'");}
function openPrintWindow(title,bodyHTML){
  var w=window.open('','_blank');
  if(!w){alert('El navegador bloqueo la ventana de impresion. Habilita las ventanas emergentes para este sitio.');return;}
  var css=''
    +'body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:0;}'
    +'.ficha{padding:24px 28px;page-break-after:always;}'
    +'.ficha:last-child{page-break-after:auto;}'
    +'.fp-header{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px;}'
    +'.fp-torneo{font-size:16px;font-weight:700;}'
    +'.fp-meta{font-size:12px;color:#444;margin-top:2px;}'
    +'.fp-equipos{font-size:14px;font-weight:600;margin-bottom:10px;}'
    +'.fp-table{width:100%;border-collapse:collapse;margin-bottom:14px;}'
    +'.fp-table th{border:1px solid #111;padding:6px 8px;font-size:12px;text-align:center;background:#f0f0f0;}'
    +'.fp-table td{border:1px solid #111;padding:0;height:34px;text-align:center;vertical-align:top;}'    +'.fp-table-sm td{height:26px;}'
    +'.fp-setlbl{font-size:11px;color:#444;width:70px;background:#fafafa;padding-left:8px !important;text-align:left !important;}'
    +'.fp-subpartido{margin-bottom:16px;}'
    +'.fp-sublabel{font-size:12px;font-weight:600;margin-bottom:4px;}'
    +'.fp-footer{display:flex;justify-content:space-between;margin-top:16px;font-size:12px;}'
    +'.fp-line{display:inline-block;border-bottom:1px solid #111;min-width:160px;height:14px;margin-left:6px;}'
    +'.fp-line{display:inline-block;border-bottom:1px solid #111;min-width:160px;height:14px;margin-left:6px;}'
    +'.fp-section-title{font-size:12px;font-weight:700;margin:14px 0 6px;border-bottom:1px solid #111;padding-bottom:3px;}'
    +'.fp-compact{table-layout:fixed;}'
    +'.fp-compact th{font-size:11px;padding:5px;text-align:center;}'
    +'.fp-compact td{padding:0;height:26px;font-size:13px;text-align:center;}'
    +'.fp-compact td.fp-name{text-align:center;padding-left:0 !important;font-size:12px;width:130px;}'
    +'.fp-compact tr.fp-match-end td{border-bottom:2px solid #111;}'
    +'.fp-compact tr.fp-spacer td{height:8px;border:none;}'
    +'.fp-compact tr.fp-encuentro-hdr td{background:#eee;font-weight:700;font-size:12px;padding:5px 6px;text-align:center;}'
    +'.fp-compact tr.fp-encuentro-hdr td{background:#eee;font-weight:700;font-size:12px;padding:5px 6px;text-align:center;}'
    +'.fp-compact tr.fp-integrantes td{border:none;height:auto;padding:2px 6px !important;font-size:10px;color:#444;text-align:left;}'
        +'.fp-compact tr.fp-integrantes td{border:none;height:auto;padding:2px 6px !important;font-size:10px;color:#444;text-align:left;}'
    +'.fp-compact tr.fp-subhdr th{font-size:10px;padding:4px 5px;background:#f7f7f7;border:1px solid #111;}'
    +'@media print{.ficha{padding:14px 18px;}}';
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+title+'</title><style>'+css+'</style></head><body>'+bodyHTML+'</body></html>');
  w.document.close();
  w.focus();
  setTimeout(function(){w.print();},300);
}
function buildFichaSingle(nameA,nameB,catLabel,roundLabel){
  var setsToWin=parseInt(S.config.sets||2);
  var totalSets=setsToWin*2-1;
  var rows='';
  for(var i=0;i<totalSets;i++){
    rows+='<tr><td class="fp-setlbl">Set '+(i+1)+'</td><td></td><td></td></tr>';
  }
  return '<div class="ficha">'
    +'<div class="fp-header">'
    +'<div class="fp-torneo">'+(S.config.nombre||'Torneo de Tenis de Mesa')+'</div>'
    +'<div class="fp-meta">'+catLabel+(roundLabel?' &middot; '+roundLabel:'')+' &middot; Mejor de '+totalSets+' sets &middot; a 11 puntos</div>'
    +'</div>'
    +'<table class="fp-table">'
    +'<thead><tr><th></th><th>'+nameA+'</th><th>'+nameB+'</th></tr></thead>'
    +'<tbody>'+rows+'</tbody>'
    +'</table>'
    +'<table class="fp-table" style="margin-bottom:14px;">'
    +'<thead><tr><th></th><th>'+nameA+'</th><th>'+nameB+'</th></tr></thead>'
    +'<tbody><tr><td class="fp-setlbl">Result. final</td><td></td><td></td></tr></tbody>'
    +'</table>'
    +'<div class="fp-footer">'
    +'<div class="fp-winner">Ganador: <span class="fp-line"></span></div>'
    +'<div class="fp-arbitro">Arbitro: <span class="fp-line"></span></div>'
    +'</div>'
    +'</div>';
}
function buildFichaEquipo(nameA,nameB,catLabel,roundLabel){
  var setsToWin=parseInt(S.config.sets||2);
  var totalSets=setsToWin*2-1;
  var blocks=EQ_PARTIDOS.map(function(def){
    var rows='';
    for(var i=0;i<totalSets;i++){
      rows+='<tr><td class="fp-setlbl">Set '+(i+1)+'</td><td></td><td></td></tr>';
    }
    return '<div class="fp-subpartido">'
      +'<div class="fp-sublabel">'+def.label.replace('&mdash;','-')+' ('+def.tipo+')</div>'
      +'<table class="fp-table fp-table-sm"><thead><tr><th></th><th>Jugador/es A</th><th>Jugador/es B</th></tr></thead>'
      +'<tbody>'+rows+'</tbody></table>'
      +'</div>';
  }).join('');
  return '<div class="ficha">'
    +'<div class="fp-header">'
    +'<div class="fp-torneo">'+(S.config.nombre||'Torneo de Tenis de Mesa')+'</div>'
    +'<div class="fp-meta">'+catLabel+(roundLabel?' &middot; '+roundLabel:'')+' &middot; Encuentro por equipos</div>'
    +'</div>'
    +'<div class="fp-equipos">'+nameA+' vs '+nameB+'</div>'
    +blocks
    +'<div class="fp-footer">'
    +'<div class="fp-winner">Equipo ganador: <span class="fp-line"></span></div>'
    +'<div class="fp-arbitro">Arbitro / Mesa: <span class="fp-line"></span></div>'
    +'</div>'
    +'</div>';
}
function buildParticipantsTableHTML(items){
  var rows=items.map(function(p,i){
    return '<tr><td style="width:24px;">'+(i+1)+'</td><td style="text-align:left;padding-left:6px;">'+dn(p)+'</td><td style="text-align:left;padding-left:6px;color:#444;">'+(p.club||'')+'</td></tr>';
  }).join('');
  return '<div class="fp-section-title">Participantes</div>'
    +'<table class="fp-table fp-table-sm"><thead><tr><th style="width:24px;">#</th><th>Nombre</th><th>Club</th></tr></thead>'
    +'<tbody>'+rows+'</tbody></table>';
}
function buildParticipantsTableEquiposHTML(eqs){
  function cellFor(eq){
    var integrantes=(eq.jugadores||[]).map(function(m){return '<div>'+m.nombre+'</div>';}).join('');
    return '<td style="text-align:center;padding:6px;"><strong>'+eq.nombre+'</strong>'+integrantes+'</td>';
  }
  var rows='';
  var k=1;
  for(var i=0;i<eqs.length;i++){for(var j=i+1;j<eqs.length;j++){
    rows+='<tr><td>'+k+'</td>'+cellFor(eqs[i])+cellFor(eqs[j])+'</tr>';
    k++;
  }}
  return '<div class="fp-section-title">Participantes</div>'
    +'<table class="fp-table fp-table-sm"><thead><tr><th style="width:24px;">#</th><th>Equipo A</th><th>Equipo B</th></tr></thead>'
    +'<tbody>'+rows+'</tbody></table>';
}
function buildZoneMatchesTableSingles(ps,totalSets){
  var hCols='';
  for(var s=0;s<totalSets;s++)hCols+='<th>Set '+(s+1)+'</th>';
  var rows='';
  var k=1;
  for(var i=0;i<ps.length;i++){for(var j=i+1;j<ps.length;j++){
    if(k>1){var spCols='';for(var s=0;s<totalSets;s++)spCols+='<td></td>';rows+='<tr class="fp-spacer"><td></td><td></td>'+spCols+'<td></td></tr>';}
    var cellsA='',cellsB='';
    for(var s=0;s<totalSets;s++){cellsA+='<td></td>';cellsB+='<td></td>';}
    rows+='<tr><td rowspan="2">'+k+'</td><td class="fp-name">'+dn(ps[i])+'</td>'+cellsA+'<td></td></tr>';
    rows+='<tr class="fp-match-end"><td class="fp-name">'+dn(ps[j])+'</td>'+cellsB+'<td></td></tr>';
    k++;
  }}
  return '<div class="fp-section-title">Partidos</div>'
    +'<table class="fp-table fp-compact"><thead><tr><th style="width:22px;">#</th><th>Jugador/Pareja</th>'+hCols+'<th style="width:50px;">Result.</th></tr></thead>'
    +'<tbody>'+rows+'</tbody></table>';
}
function buildZoneMatchesTableEquipos(eqs,totalSets){
  var hCols='';
  for(var s=0;s<totalSets;s++)hCols+='<th>Set '+(s+1)+'</th>';
  var colspan=3+totalSets;
  var headerRow='<tr class="fp-subhdr"><th style="width:70px;">Serie</th><th>Equipo</th>'+hCols+'<th style="width:50px;">Result.</th></tr>';
  var rows='';
  var k=1;
  for(var i=0;i<eqs.length;i++){for(var j=i+1;j<eqs.length;j++){
    if(k>1){rows+='<tr class="fp-spacer"><td colspan="'+colspan+'"></td></tr>';}
    rows+='<tr class="fp-encuentro-hdr"><td colspan="'+colspan+'">Encuentro '+k+': '+eqs[i].nombre+' vs '+eqs[j].nombre+'</td></tr>';
    rows+=headerRow;
    EQ_PARTIDOS.forEach(function(def){
      var cellsA='',cellsB='';
      for(var s=0;s<totalSets;s++){cellsA+='<td></td>';cellsB+='<td></td>';}
      rows+='<tr><td rowspan="2" style="font-size:11px;">'+def.label.replace('&mdash;','-')+'</td><td class="fp-name">'+eqs[i].nombre+'</td>'+cellsA+'<td></td></tr>';
      rows+='<tr class="fp-match-end"><td class="fp-name">'+eqs[j].nombre+'</td>'+cellsB+'<td></td></tr>';
    });
    k++;
  }}
  return '<div class="fp-section-title">Partidos</div>'
    +'<table class="fp-table fp-compact"><tbody>'+rows+'</tbody></table>';
}
function printZoneSheet(zoneId){
  var z=S.zones.find(function(zz){return zz.id===zoneId;});
  if(!z){alert('Zona no encontrada');return;}
  var catLabel=catNm(z.cat);
  var roundLabel='Zona '+(z.num+1);
  var setsToWin=parseInt(S.config.sets||2);
  var totalSets=setsToWin*2-1;
  var participantsHTML,matchesHTML;
   if(z.mode==='equipos'){
    var eqs=z.players.map(function(pid){return S.equipos.find(function(e){return e.id===pid;});}).filter(Boolean);
    if(eqs.length<2){alert('No hay equipos suficientes en esta zona');return;}
    participantsHTML=buildParticipantsTableEquiposHTML(eqs);
    matchesHTML=buildZoneMatchesTableEquipos(eqs,totalSets);
  }else{
    var ps=z.players.map(function(pid){return S.players.find(function(p){return p.id===pid;});}).filter(Boolean);
    if(ps.length<2){alert('No hay jugadores suficientes en esta zona');return;}
    participantsHTML=buildParticipantsTableHTML(ps);
    matchesHTML=buildZoneMatchesTableSingles(ps,totalSets);
  }
  var ficha='<div class="ficha">'
    +'<div class="fp-header">'
    +'<div class="fp-torneo">'+(S.config.nombre||'Torneo de Tenis de Mesa')+'</div>'
    +'<div class="fp-meta">'+catLabel+' &middot; '+roundLabel+' &middot; Mejor de '+totalSets+' sets &middot; a 11 puntos</div>'
    +'</div>'
    +participantsHTML
    +matchesHTML
    +'<div class="fp-footer">'
    +'<div class="fp-arbitro">Arbitro / Mesa: <span class="fp-line"></span></div>'
    +'</div>'
    +'</div>';
  var modoLabel=z.mode==='equipos'?'Equipos':'Singles-Dobles';
  var fileTitle='Zona'+(z.num+1)+'_'+modoLabel+'_'+(S.config.nombre||'Torneo').replace(/\s+/g,'');
  openPrintWindow(fileTitle,ficha);
}
function printBracketMatch(nameA,nameB,catLabel,roundLabel){
  var fileTitle=roundLabel.replace(/\s+/g,'')+'_'+catLabel.replace(/\s+/g,'')+'_'+(S.config.nombre||'Torneo').replace(/\s+/g,'');
  openPrintWindow(fileTitle,buildFichaSingle(nameA,nameB,catLabel,roundLabel));
}
// ═══════════════════ RANKING ═══════════════════
function renderRanking(){
  var cf=document.getElementById('rank-cat-filter').value;
  var w=document.getElementById('ranking-display');
  var pts=calcRankingPts();
  var todos=Object.values(pts);
  if(cf)todos=todos.filter(function(x){return x.cat===cf;});
  if(!todos.length){w.innerHTML='<div class="card"><div class="empty"><p>Sin datos de ranking. Completa partidos para ver el ranking.</p></div></div>';return;}
  todos.sort(function(a,b){return b.pts-a.pts;});
  // Agrupar por puesto compartido
  var pos=1,rows='';
  for(var i=0;i<todos.length;i++){
    if(i>0&&todos[i].pts<todos[i-1].pts)pos=i+1;
    var p=todos[i];
    var medal=pos===1?'&#x1F947;':pos===2?'&#x1F948;':pos===3?'&#x1F949;':'';
    var pc=['','pos-1','pos-2','pos-3'][pos]||'';
    var origenTag=p.origen==='llave'
      ?'<span class="tag tag-blue" style="font-size:10px;">Llave</span>'
      :p.origen==='zona'
        ?'<span class="tag tag-gray" style="font-size:10px;">Zona</span>'
        :'';
    rows+='<tr>'
      +'<td><span class="pos-circle '+pc+'">'+(pc?pos:'')+'</span> '+medal+'</td>'
      +'<td><strong>'+dn(p.player)+'</strong></td>'
      +'<td><span class="tag '+catCol(p.cat)+'">'+catNm(p.cat)+'</span></td>'
      +'<td>'+origenTag+'</td>'
      +'<td style="text-align:right;font-weight:700;color:var(--accent);">'+p.pts+'</td>'
      +'</tr>';
  }
  var modoTag=S.rankConfig.modo==='elo'
    ?'<span class="tag tag-purple">ELO Dinamico</span>'
    :'<span class="tag tag-blue">Fijo / Configurable</span>';
  w.innerHTML='<div class="card">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">'
    +modoTag
    +'<button class="btn btn-sm" onclick="cerrarRanking()">&#x1F4BE; Cerrar torneo y exportar ranking</button>'
    +'</div>'
    +'<table><thead><tr><th>#</th><th>Jugador</th><th>Categoria</th><th>Via</th><th style="text-align:right;">Puntos</th></tr></thead>'
    +'<tbody>'+rows+'</tbody></table>'
    +'</div>';
}
// ═══════════════════ ELO UMBRALES ═══════════════════
var ELO_UMBRALES=[1350,1200,1050,900,750,600,450,300,150,0];
var ELO_INICIO=150;

function getEloUmbral(posicion){
  // posicion es 0-based, 0 = categoria mas alta
  return ELO_UMBRALES[Math.min(posicion,ELO_UMBRALES.length-1)];
}
function getCatEloByPts(pts){
  // Devuelve la categoria que corresponde segun puntaje
  // S.categories[0] es la mas alta
  for(var i=0;i<S.categories.length;i++){
    if(pts>=getEloUmbral(i))return S.categories[i];
  }
  // Si cae por debajo de todas, devuelve la ultima (mas baja)
  return S.categories[S.categories.length-1];
}
function getEloInicio(){
  // Puntaje inicial: 150 pts, pero si la categoria que corresponde
  // no existe en S.categories, usar el umbral de la categoria mas baja activa
  if(!S.categories.length)return ELO_INICIO;
  var catInicio=getCatEloByPts(ELO_INICIO);
  if(catInicio)return ELO_INICIO;
  // Categoria mas baja activa
  var umbral=getEloUmbral(S.categories.length-1);
  return umbral+10; // margen sobre el piso
}
function aplicarAscensoDescenso(){
  // Actualiza la categoria de cada jugador segun su eloScore
  if(S.rankConfig.modo!=='elo')return;
  S.players.forEach(function(p){
    var pts=p.eloScore||ELO_INICIO;
    var cat=getCatEloByPts(pts);
    if(cat)p.cat=cat.id;
  });
}
function calcRankingPts(){
  var rc=S.rankConfig;
  var resultado={};
  function getOrCreate(player,cat){
    var k=player.id;
    if(!resultado[k])resultado[k]={player:player,cat:cat,pts:0,origen:'zona'};
    return resultado[k];
  }
  if(rc.modo==='fijo'){
    var rondaKeys=['ronda32','ronda16','octavos','cuartos','semifinal','finalista','campeon'];
    // Puntos de llave
    S.categories.forEach(function(cat){
      var b=S.bracket[cat.id];if(!b||!b.rounds||!b.rounds.length)return;
      var nr=b.rounds.length;
      b.rounds.forEach(function(round,ri){
        round.forEach(function(match){
          // El perdedor en esta ronda queda en esa ronda
          var loser=null,loserPlayer=null;
          if(match.winner===1&&match.p2.player){loserPlayer=match.p2.player;}
          else if(match.winner===2&&match.p1.player){loserPlayer=match.p1.player;}
          if(loserPlayer){
            // ri=0 es primera ronda; ri=nr-1 es final
            var rondaDesdeFinKey=nr-1-ri; // 0=final,1=semi,2=cuartos...
            var key=rondaKeys[Math.min(rondaDesdeFinKey,rondaKeys.length-1)];
            var puntos=rc.rondas[key]||0;
            var entry=getOrCreate(loserPlayer,cat.id);
            entry.pts=Math.max(entry.pts,puntos);
            entry.origen='llave';
          }
          // Campeon
          if(ri===nr-1){
            var champ=match.winner===1?match.p1.player:match.winner===2?match.p2.player:null;
            if(champ){
              var entry=getOrCreate(champ,cat.id);
              entry.pts=rc.rondas.campeon||100;
              entry.origen='llave';
            }
          }
        });
      });
    });
    // Puntos de zona para quienes NO están en llave
    var enLlave={};
    Object.keys(resultado).forEach(function(k){if(resultado[k].origen==='llave')enLlave[k]=true;});
    S.zones.forEach(function(z){
      var setsToWin=parseInt(S.config.sets||2);
      var ps=z.players.map(function(pid){return S.players.find(function(p){return p.id===pid;});}).filter(Boolean);
      ps.forEach(function(p){
        if(enLlave[p.id])return;
        // Ver si ganó al menos un partido
        var gano=ps.some(function(opp){
          if(opp.id===p.id)return false;
          var mv=S.matches[midKey(z.id,p.id,opp.id)];
          if(!mv||!mv.sets)return false;
          var res=matchResult(mv.sets,setsToWin);
          return res.done&&((res.w1>=setsToWin&&[p.id].includes(p.id))||res.w2>=setsToWin);
        });
        if(gano){
          var catId=typeof z.cat==='object'?z.cat.id:z.cat;var entry=getOrCreate(p,catId);
          entry.pts=Math.max(entry.pts,rc.zonaPts||5);
        }
      });
    });
  } else {
    // Modo ELO
    var eloScores={};
    S.players.forEach(function(p){
      eloScores[p.id]=p.eloScore||getEloInicio();
    });
    var K=32;
    function esperado(ra,rb){return 1/(1+Math.pow(10,(rb-ra)/400));}
    // Partidos de zona
    S.zones.forEach(function(z){
      var setsToWin=parseInt(S.config.sets||2);
      var ps=z.players.map(function(pid){return S.players.find(function(p){return p.id===pid;});}).filter(Boolean);
      for(var i=0;i<ps.length;i++){for(var j=i+1;j<ps.length;j++){
        var mv=S.matches[midKey(z.id,ps[i].id,ps[j].id)];
        if(!mv||!mv.sets)continue;
        var res=matchResult(mv.sets,setsToWin);if(!res.done)continue;
        var ra=eloScores[ps[i].id],rb=eloScores[ps[j].id];
        var ea=esperado(ra,rb),eb=esperado(rb,ra);
        var sa=res.w1>=setsToWin?1:0,sb=1-sa;
        eloScores[ps[i].id]=Math.round(ra+K*(sa-ea));
        eloScores[ps[j].id]=Math.round(rb+K*(sb-eb));
      }}
    });
    // Partidos de llave
    S.categories.forEach(function(cat){
      var b=S.bracket[cat.id];if(!b||!b.rounds)return;
      var setsToWin=parseInt(S.config.sets||2);
      b.rounds.forEach(function(round){
        round.forEach(function(match){
          if(!match.winner||match.auto)return;
          var pa=match.p1.player,pb=match.p2.player;
          if(!pa||!pb)return;
          var ra=eloScores[pa.id]||getEloInicio(),rb=eloScores[pb.id]||getEloInicio();
          var ea=esperado(ra,rb),eb=esperado(rb,ra);
          var sa=match.winner===1?1:0,sb=1-sa;
          eloScores[pa.id]=Math.round(ra+K*(sa-ea));
          eloScores[pb.id]=Math.round(rb+K*(sb-eb));
        });
      });
    });
    // Construir resultado con categoria segun puntaje ELO
    S.players.forEach(function(p){
      var ptsElo=eloScores[p.id]||getEloInicio();
      var catElo=getCatEloByPts(ptsElo);
      var catId=catElo?catElo.id:(typeof p.cat==='object'?p.cat.id:p.cat);
      var entry=getOrCreate(p,catId);
      entry.pts=ptsElo;
      entry.origen='elo';
      entry.catElo=catElo?catElo.nombre:'';
        });
  }
  return resultado;
}
function cerrarRanking(){
  if(!confirm('Cerrar el torneo y exportar el ranking? Esto actualizara el puntaje de todos los jugadores.'))return;
  var pts=calcRankingPts();
  // Actualizar eloScore en players
  S.players.forEach(function(p){
    if(pts[p.id])p.eloScore=pts[p.id].pts;
    else if(!p.eloScore)p.eloScore=getEloInicio();
  });
  if(S.rankConfig.modo==='elo')aplicarAscensoDescenso();
  // Agregar al historial
  var entrada={
    torneo:S.config.nombre||'Torneo sin nombre',
    fecha:S.config.fecha||'',
    modo:S.rankConfig.modo,
    resultados:Object.values(pts).map(function(x){return{pid:x.player.id,nombre:dn(x.player),pts:x.pts,cat:x.cat};})
  };
  S.rankingHistorico=S.rankingHistorico||[];
  S.rankingHistorico.push(entrada);
  exportData();
  salert('alert-rank-config','&#x2705; Ranking exportado','success',3000);
}
// ═══════════════════ BRACKET ═══════════════════
function bScoreKey(storeKey,ri,mi){return storeKey+'|'+ri+'|'+mi;}
function getBracketSets(storeKey,ri,mi){return(S.bracketScores[bScoreKey(storeKey,ri,mi)]||{sets:[]}).sets;}
function toggleBracketEntry(id){
  var el=document.getElementById(id);if(!el)return;
  if(el.style.display==='none'||el.style.display===''){
    el.style.display='block';
    var yaResuelto=el.querySelector('button[onclick^="resetBracketMatch"]');
    if(!yaResuelto){
      var first=el.querySelector('input[type=number]');
      if(first){setTimeout(function(){first.focus();first.select();},50);}
    }
  }else{
    el.style.display='none';
  }
}
function focusBracketField(inputEl, field){
  var grid=inputEl.closest('.bkt-grid');
  if(!grid)return;
  var si=inputEl.dataset.si;
  var target=grid.querySelector('input[data-si="'+si+'"][data-field="'+field+'"]');
  if(target){target.focus();target.select();}
}
function saveBracketSetScore(storeKey,ri,mi,si,field,val,inputEl){
  var k=bScoreKey(storeKey,ri,mi);
  if(!S.bracketScores[k])S.bracketScores[k]={sets:[]};
  while(S.bracketScores[k].sets.length<=si)S.bracketScores[k].sets.push({a:'',b:''});
  S.bracketScores[k].sets[si][field]=val;
  var s=S.bracketScores[k].sets[si];
  var bothFilled=s.a!==''&&s.a!==undefined&&s.b!==''&&s.b!==undefined;
  if(!bothFilled){clearSetRowErrors(inputEl);return;}
  applyScoreValidation(inputEl,s.a,s.b);
}
function commitBracketSetScore(storeKey,ri,mi,si){
  var k=bScoreKey(storeKey,ri,mi);
  var mv=S.bracketScores[k];if(!mv||!mv.sets||!mv.sets[si])return;
  var s=mv.sets[si];
  if(!s.a&&!s.b)return;
  if(!setIsComplete(s.a,s.b))return;
  var setsToWin=parseInt(S.config.sets||2);
    var res=matchResult(mv.sets,setsToWin);
  var panelId='be-'+storeKey.replace(/[^a-z0-9]/gi,'_')+'-'+ri+'-'+mi;
  if(res.done){
    var winner=res.w1>=setsToWin?1:2;
    var isRlC=storeKey.startsWith('rl:');
    var keyC=isRlC?storeKey.slice(3):storeKey;
    var storeC=isRlC?S.rlBracket:S.bracket;
    var bC=storeC[keyC];
    var matchC=bC&&bC.rounds[ri]&&bC.rounds[ri][mi];
    if(matchC&&matchC.winner===winner)return;
    var panel=document.getElementById(panelId);
    if(panel)panel.style.display='none';
    advanceBracket(storeKey,ri,mi,winner);
    return;
  }
  var panel=document.getElementById(panelId);
  if(!panel)return;
  var grid=panel.querySelector('.bkt-grid');
  if(!grid)return;
  var nextSi=si+1;
  if(grid.querySelector('input[data-si="'+nextSi+'"]'))return;
  var cellsHTML='<div style="font-size:10px;color:var(--text-muted);font-weight:600;">SET '+(nextSi+1)+'</div>'
    +'<div style="display:flex;align-items:center;justify-content:center;gap:4px;">'
    +'<input type="number" min="0" placeholder="0" data-mid="'+k+'" data-si="'+nextSi+'" data-field="a"'
    +' style="width:44px;height:28px;padding:0 3px;border:1px solid var(--border);border-radius:var(--radius);font-size:13px;text-align:center;background:var(--surface);color:var(--text);"'
    +' oninput="saveBracketSetScore(\''+storeKey+'\','+ri+','+mi+','+nextSi+',\'a\',this.value,this)"'
    +' onblur="commitBracketSetScore(\''+storeKey+'\','+ri+','+mi+','+nextSi+')"'
    +' onkeydown="if((event.key===\'Tab\'||event.key===\'Enter\')&&this.value!==\'\'){event.preventDefault();focusBracketField(this,\'b\');}"/>'
    +'</div>'
    +'<div style="text-align:center;color:var(--text-muted);font-size:12px;">&ndash;</div>'
    +'<div style="display:flex;align-items:center;justify-content:center;gap:4px;">'
    +'<input type="number" min="0" placeholder="0" data-mid="'+k+'" data-si="'+nextSi+'" data-field="b"'
    +' style="width:44px;height:28px;padding:0 3px;border:1px solid var(--border);border-radius:var(--radius);font-size:13px;text-align:center;background:var(--surface);color:var(--text);"'
    +' oninput="saveBracketSetScore(\''+storeKey+'\','+ri+','+mi+','+nextSi+',\'b\',this.value,this)"'
    +' onblur="commitBracketSetScore(\''+storeKey+'\','+ri+','+mi+','+nextSi+')"'
    +' onkeydown="if(event.key===\'Tab\'||event.key===\'Enter\'){event.preventDefault();this.blur();}"/>'   
    +'</div>';
  var tmp=document.createElement('div');
  tmp.innerHTML=cellsHTML;
  while(tmp.firstChild){grid.appendChild(tmp.firstChild);}
  var newInp=grid.querySelector('input[data-si="'+nextSi+'"][data-field="a"]');
  if(newInp){newInp.focus();newInp.select();}
}
  
function buildRounds(seeds){
  var size=Math.pow(2,Math.ceil(Math.log2(Math.max(seeds.length,2))));
  while(seeds.length<size)seeds.push(null);
  var rounds=[];
  var cur=seeds.map(function(c){
    if(!c)return{player:null,zona:null,isBye:true};
    if(c.pending)return{player:null,zona:null,isBye:false,pending:true};
    return{player:c.player,zona:c.zona,isBye:false};
  });
  while(cur.length>1){
    var round=[];
    for(var i=0;i<cur.length;i+=2){
      var p1=cur[i],p2=cur[i+1]||{player:null,zona:null,isBye:true};
      var auto=(p1.isBye||p2.isBye)&&!p1.pending&&!p2.pending;
      round.push({p1:p1,p2:p2,winner:auto?(p1.isBye?2:1):null,auto:auto});
    }
    rounds.push(round);
    cur=round.map(function(m){
      if(m.auto&&m.winner){
        var ww=m.winner===1?m.p1:m.p2;
        return{player:ww.player,zona:ww.zona,isBye:false};
      }
      if(m.p1.pending||m.p2.pending)return{player:null,zona:null,isBye:false,pending:true};
      return{player:null,zona:null,isBye:false};
    });
  }
  for(var ri=0;ri<rounds.length-1;ri++){
    rounds[ri].forEach(function(match,mi){
      if(match.auto&&match.winner!=null){
        var ww=match.winner===1?match.p1:match.p2;
        var nm=Math.floor(mi/2),isF=mi%2===0;
        var next=rounds[ri+1][nm];
        if(isF)next.p1={player:ww.player,zona:ww.zona,isBye:false};
        else next.p2={player:ww.player,zona:ww.zona,isBye:false};
      }
    });
  }
  return rounds;
}
function resetBracketMatch(storeKey,ri,mi){
  if(!confirm('Anular este resultado? Se anularan tambien los partidos siguientes que dependan de este.'))return;
  var isRl=storeKey.startsWith('rl:');
  var key=isRl?storeKey.slice(3):storeKey;
  var store=isRl?S.rlBracket:S.bracket;
  var b=store[key];if(!b)return;
  // Borrar scores del partido actual
  var k=bScoreKey(storeKey,ri,mi);
  S.bracketScores[k]={sets:[]};
  b.rounds[ri][mi].winner=null;
  // Propagar en cascada
  var curMi=mi;
  for(var rr=ri+1;rr<b.rounds.length;rr++){
    var nextMi=Math.floor(curMi/2);
    var isFirst=curMi%2===0;
    var next=b.rounds[rr]&&b.rounds[rr][nextMi];
    if(!next)break;
    if(isFirst){next.p1={player:null,zona:null,isBye:false,pending:true};}
    else{next.p2={player:null,zona:null,isBye:false,pending:true};}
    var kk=bScoreKey(storeKey,rr,nextMi);
    S.bracketScores[kk]={sets:[]};
    next.winner=null;next.auto=false;
    curMi=nextMi;
  }
  if(isRl)renderRLBracket(key);else renderBracket(key);
}
function advanceBracket(storeKey,ri,mi,w){
  var isRl=storeKey.startsWith('rl:');
  var key=isRl?storeKey.slice(3):storeKey;
  var store=isRl?S.rlBracket:S.bracket;
  var b=store[key];if(!b)return;
  var match=b.rounds[ri][mi];if(match.auto)return;
  // Solo togglear si el mismo ganador ya estaba; si es diferente, pisar directo
  if(match.winner===w){match.winner=null;}else{match.winner=w;}
  if(ri+1<b.rounds.length){
    var nm=Math.floor(mi/2),isF=mi%2===0;
    var next=b.rounds[ri+1][nm];
    var src=match.winner?(match.winner===1?match.p1:match.p2):null;
    // Preservar el jugador que llegó por BYE en el slot opuesto
    if(isF){
      next.p1=src?{player:src.player,zona:src.zona,isBye:false}:(next.p1&&next.p1.player?next.p1:{player:null,zona:null,isBye:false});
    }else{
      next.p2=src?{player:src.player,zona:src.zona,isBye:false}:(next.p2&&next.p2.player?next.p2:{player:null,zona:null,isBye:false});
    }
    next.winner=null;next.auto=false;
    // Limpiar rondas posteriores solo en la rama afectada
    for(var rr=ri+2;rr<b.rounds.length;rr++){
      var nmi=Math.floor(nm/Math.pow(2,rr-ri-1));
      if(b.rounds[rr]&&b.rounds[rr][nmi]){
        b.rounds[rr][nmi].winner=null;b.rounds[rr][nmi].auto=false;
        // No borrar jugadores que llegaron por otra rama
      }
    }
  }
  if(isRl)renderRLBracket(key);else renderBracket(key);
}

function getChamp(rounds){
  var last=rounds[rounds.length-1]&&rounds[rounds.length-1][0];if(!last)return null;
  if(last.winner===1)return last.p1&&last.p1.player;
  if(last.winner===2)return last.p2&&last.p2.player;
  return null;
}
function champBox(champ,isRl){
  if(!champ)return'';
  var icon=isRl?'&#x26A1;':'&#x1F3C6;';
  var bg=isRl?'linear-gradient(135deg,#fffbeb,#fde68a)':'linear-gradient(135deg,#fef3c7,#fde68a)';
  return '<div class="champion-box" style="background:'+bg+';border:1px solid #f59e0b;">'
    +'<div style="font-size:36px;">'+icon+'</div>'
    +'<div style="font-size:13px;color:#92400e;margin-bottom:4px;">'+(isRl?'Campeon Relampago!':'Campeon/a')+'</div>'
    +'<div style="font-size:20px;font-weight:700;">'+dn(champ)+'</div></div>';
}
function makeBracketHTML(rounds,storeKey,isRl){
  var nr=rounds.length;
  function rn(i){return i===nr-1?'Final':i===nr-2?'Semifinal':i===nr-3?'Cuartos':'Ronda '+(i+1);}
  var wClass=isRl?' rl-winner':'';
  var catIdForPrint=isRl?storeKey.slice(3):storeKey;
  var catLabelForPrint=catNm(catIdForPrint);
  var setsToWin=parseInt(S.config.sets||2);
  var totalSets=setsToWin*2-1;
  var MATCH_H=108;
  var baseSlots=rounds[0]?rounds[0].length:1;
  var totalH=baseSlots*MATCH_H+(baseSlots-1)*8;
  var h='<div class="bracket-scroll"><div class="rounds-wrap" style="align-items:stretch;">';
  var panels='';
  rounds.forEach(function(round,ri){
    var slotH=totalH/round.length;
    h+='<div class="round-col"><div class="round-title">'+rn(ri)+'</div>'
      +'<div style="display:flex;flex-direction:column;height:'+totalH+'px;">';
    round.forEach(function(match,mi){
      var n1=match.p1.player?dn(match.p1.player):match.p1.isBye?'BYE':match.p1.pending?'En espera...':'&mdash;';
      var n2=match.p2.player?dn(match.p2.player):match.p2.isBye?'BYE':match.p2.pending?'En espera...':'&mdash;';
      var z1=match.p1.zona?' <span class="tag tag-blue" style="font-size:10px;">Z'+match.p1.zona+'</span>':'';
      var z2=match.p2.zona?' <span class="tag tag-teal" style="font-size:10px;">Z'+match.p2.zona+'</span>':'';
      var w=match.winner;
      var b1=match.p1.isBye,b2=match.p2.isBye;
      var canPlay=match.p1.player&&match.p2.player&&!b1&&!b2&&!match.p1.pending&&!match.p2.pending;
      var roundName=rn(ri);
      var entryId='be-'+storeKey.replace(/[^a-z0-9]/gi,'_')+'-'+ri+'-'+mi;
      var bKey=bScoreKey(storeKey,ri,mi);
      var sets=getBracketSets(storeKey,ri,mi);
      var res=sets.length?matchResult(sets,setsToWin):{done:false,w1:0,w2:0};
      var bSummary=sets.filter(function(s){return setIsComplete(s.a,s.b);}).map(function(s){return s.a+'-'+s.b;}).join(', ');
      var bShow=canPlay?setsToDisplay(sets,setsToWin,totalSets):0;
      var setRowsHTML='';
      for(var si=0;si<bShow;si++){
        var s=sets[si]||{a:'',b:''};
        var sw=calcSetWinner(s.a,s.b);var err=validateSet(s.a,s.b);
        var aWin=sw===1&&!err,bWin2=sw===2&&!err,hasErr=!!err&&s.a!==''&&s.b!=='';
        var labelCell='<div style="font-size:10px;color:var(--text-muted);font-weight:600;">SET '+(si+1)+'</div>';
        var dashCell='<div style="text-align:center;color:var(--text-muted);font-size:12px;">&ndash;</div>';
        var cellA='<div style="display:flex;align-items:center;justify-content:center;gap:4px;">'
          +'<input type="number" min="0" value="'+(s.a||'')+'" placeholder="0" data-mid="'+bKey+'" data-si="'+si+'" data-field="a"'
          +' style="width:44px;height:28px;padding:0 3px;border:1px solid '+(hasErr?'var(--danger)':aWin?'var(--success)':bWin2?'#fca5a5':'var(--border)')+';border-radius:var(--radius);font-size:13px;text-align:center;background:var(--surface);color:var(--text);"'
          +' oninput="saveBracketSetScore(\''+storeKey+'\','+ri+','+mi+','+si+',\'a\',this.value,this)"'
          +' onblur="commitBracketSetScore(\''+storeKey+'\','+ri+','+mi+','+si+')"'
          +' onkeydown="if((event.key===\'Tab\'||event.key===\'Enter\')&&this.value!==\'\'){event.preventDefault();focusBracketField(this,\'b\');}"/>'
          +(aWin?'<span style="color:var(--success);font-size:10px;">&#x2713;</span>':'')
          +'</div>';
        var cellB='<div style="display:flex;align-items:center;justify-content:center;gap:4px;">'
          +'<input type="number" min="0" value="'+(s.b||'')+'" placeholder="0" data-mid="'+bKey+'" data-si="'+si+'" data-field="b"'
          +' style="width:44px;height:28px;padding:0 3px;border:1px solid '+(hasErr?'var(--danger)':bWin2?'var(--success)':aWin?'#fca5a5':'var(--border)')+';border-radius:var(--radius);font-size:13px;text-align:center;background:var(--surface);color:var(--text);"'
          +' oninput="saveBracketSetScore(\''+storeKey+'\','+ri+','+mi+','+si+',\'b\',this.value,this)"'
          +' onblur="commitBracketSetScore(\''+storeKey+'\','+ri+','+mi+','+si+')"'
          +' onkeydown="if(event.key===\'Tab\'||event.key===\'Enter\'){event.preventDefault();this.blur();}"/>'          
          +(bWin2?'<span style="color:var(--success);font-size:10px;">&#x2713;</span>':hasErr?'<span style="color:var(--danger);font-size:9px;">&#x2717;</span>':'')
          +'</div>';
        setRowsHTML+=labelCell+cellA+dashCell+cellB;
      }
      var winnerHTML=res.done
        ?'<div style="grid-column:1/5;text-align:center;color:var(--success);font-size:12px;font-weight:500;margin-top:4px;padding:6px 10px;background:var(--success-bg);border-radius:var(--radius);">&#x1F3C6; '+(w===1?n1:n2)+' ('+res.w1+'&ndash;'+res.w2+')</div>'
         +'<div style="grid-column:1/5;text-align:center;margin-top:6px;">'
         +'<button class="btn btn-sm btn-danger" onclick="resetBracketMatch(\''+storeKey+'\','+ri+','+mi+')">&#x1F5D1; Anular resultado</button>'
         +'</div>'
        :'';
      if(canPlay){
        var roundName=rn(ri);
        var roundColor=isRl?'var(--lightning)':'var(--accent)';
        var roundBg=isRl?'var(--lightning-bg)':'var(--accent-bg)';
           panels+='<div id="'+entryId+'" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
          +'z-index:200;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);'
          +'min-width:360px;max-width:440px;box-shadow:0 8px 32px rgba(0,0,0,.18);">'
          +'<div style="background:'+roundBg+';border-bottom:1px solid var(--border);padding:10px 16px;">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
          +'<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:'+roundColor+';">'+roundName+'</div>'
          +'<button class="btn btn-sm btn-ghost" tabindex="-1" onclick="toggleBracketEntry(\''+entryId+'\')" style="margin:-4px -4px 0 0;">&#x2715;</button>'
          +'</div>'
          +'<div style="display:grid;grid-template-columns:44px 1fr 28px 1fr;column-gap:6px;align-items:center;">'
          +'<div></div>'
          +'<div style="text-align:center;font-size:13px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+n1+'</div>'
          +'<div style="text-align:center;font-size:11px;color:var(--text-muted);font-weight:400;">vs</div>'
          +'<div style="text-align:center;font-size:13px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+n2+'</div>'
          +'</div>'
          +'</div>'
          +'<div class="bkt-grid" style="display:grid;grid-template-columns:44px 1fr 28px 1fr;row-gap:8px;column-gap:6px;align-items:center;padding:14px 16px 16px;">'
          +setRowsHTML
          +winnerHTML
          +'</div>'
          +'</div>';
      }
              var headerRowHTML='';
      if(canPlay){
        if(w){
          headerRowHTML='<div style="padding:3px 10px;font-size:10px;font-weight:600;color:var(--success);background:var(--success-bg);border-bottom:1px solid var(--border);">&#x2713; '+res.w1+'&ndash;'+res.w2+'</div>';
        }else if(bSummary){
          headerRowHTML='<div style="padding:3px 10px;font-size:10px;color:var(--text-muted);background:var(--bg);border-bottom:1px solid var(--border);">'+bSummary+'</div>';
        }else{
          headerRowHTML='<div style="padding:3px 10px;font-size:10px;color:var(--text-muted);background:var(--bg);border-bottom:1px solid var(--border);">Sin resultado</div>';
        }
      }
      var printRowHTML=canPlay?'<button class="btn btn-sm btn-ghost" tabindex="-1" onclick="event.stopPropagation();printBracketMatch(\''+jsEsc(n1)+'\',\''+jsEsc(n2)+'\',\''+jsEsc(catLabelForPrint)+'\',\''+jsEsc(roundName)+'\')" style="width:100%;display:block;border:none;border-top:1px solid var(--border);border-radius:0;height:24px;font-size:10px;color:var(--text-muted);background:var(--surface);">&#x1F5A8; Imprimir ficha</button>':'';
      h+='<div style="height:'+slotH+'px;display:flex;align-items:center;justify-content:center;">'
        +'<div class="match-box" style="width:100%;margin:0 8px;overflow:hidden;">'
        +headerRowHTML
        +'<div class="match-player'+(w===1?' winner'+wClass:'')+(b1?' bye':'')+'"'
        +' onclick="'+(canPlay?'toggleBracketEntry(\''+entryId+'\')':'')+'"'
        +' style="cursor:'+(canPlay?'pointer':'default')+';border-bottom:1px solid var(--border);">'
        +'<span>'+n1+z1+'</span>'
        +(w===1?'<span style="color:var(--accent);font-size:11px;">&#x2713;</span>':'')
        +'</div>'
        +'<div class="match-player'+(w===2?' winner'+wClass:'')+(b2?' bye':'')+'"'
        +' onclick="'+(canPlay?'toggleBracketEntry(\''+entryId+'\')':'')+'"'
        +' style="cursor:'+(canPlay?'pointer':'default')+';">'
        +'<span>'+n2+z2+'</span>'+(w===2?'<span style="color:var(--accent);font-size:11px;">&#x2713;</span>':'')
        +'</div>'
        +printRowHTML
        +'</div></div>';
    });
    h+='</div></div>';
  });
  h+='</div></div>'+panels;
  return h;
}

// ═══════════════════ SIEMBRA: TABLA DE PRIORIDAD ═══════════════════
// Genera recursivamente la tabla de prioridad de posiciones para una llave
// de tamano n (potencia de 2). El ORDEN del array es el orden de prioridad:
// el rankeado k va a la posicion priority[k-1]. Es una permutacion auto-
// inversa, por eso la misma tabla, leida desde el principio, tambien sirve
// para repartir los byes de forma pareja por todo el cuadro cuando no hay
// cabezas de serie. Verificado contra las tablas de 8, 16 y 32 posiciones.
function seedPriorityTable(n){
  if(n<=1)return[1];
  var half=seedPriorityTable(n/2);
  var res=[];
  half.forEach(function(t,i){
    if(i%2===0){res.push(t);res.push(n+1-t);}
    else{res.push(n+1-t);res.push(t);}
  });
  return res;
}
function shuffleArray(arr){
  var a=arr.slice();
  for(var i=a.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var tmp=a[i];a[i]=a[j];a[j]=tmp;
  }
  return a;
}

// ═══════════════════ GENERATE BRACKETS ═══════════════════
function zonaCompleta(z){
  var setsToWin=parseInt(S.config.sets||2);
  if(z.mode==='equipos'){
    var eqs=z.players.map(function(pid){return S.equipos.find(function(e){return e.id===pid;});}).filter(Boolean);
    for(var i=0;i<eqs.length;i++){for(var j=i+1;j<eqs.length;j++){
      var em=S.equipoMatches[midKey(z.id,eqs[i].id,eqs[j].id)]||{partidos:[]};
      if(!eqMatchResult(em).done)return false;
    }}
    return eqs.length>0;
  }
  var ps=z.players.map(function(pid){return S.players.find(function(p){return p.id===pid;});}).filter(Boolean);
  if(ps.length<2)return false;
  for(var i=0;i<ps.length;i++){for(var j=i+1;j<ps.length;j++){
    var mv=S.matches[midKey(z.id,ps[i].id,ps[j].id)];
    if(!mv||!matchResult(mv.sets||[],setsToWin).done)return false;
  }}
  return true;
}
function showBracketForm(){
  document.getElementById('bracket-form-card').style.display='';
}
function hideBracketForm(){
  document.getElementById('bracket-form-card').style.display='none';
}
function refreshBracketTabs(activeCat){
  var wrap=document.getElementById('bracket-tabs');if(!wrap)return;
  var cats=Object.keys(S.bracket);
  if(!cats.length){wrap.innerHTML='<span style="font-size:12px;color:var(--text-muted);">Sin llaves generadas aun.</span>';return;}
  wrap.innerHTML=cats.map(function(cid){
    var c=catBy(cid);
    var col=c?c.color:'tag-gray';
    var isActive=cid===activeCat;
    return '<div onclick="selectBracketTab(\''+cid+'\')" style="display:flex;align-items:center;gap:5px;padding:5px 14px;border-radius:20px;cursor:pointer;'
      +(isActive?'border:2px solid currentColor;':'border:2px solid transparent;opacity:0.6;')
      +'" class="'+col+'">'
      +'<span style="font-size:12px;font-weight:'+(isActive?'600':'500')+';">'+catNm(cid)+'</span>'
      +'</div>';
  }).join('');
}
function selectBracketTab(cat){
  refreshBracketTabs(cat);
  renderBracket(cat);
}
function generateBracket(){
  var cat=document.getElementById('final-cat').value;
  if(!cat){alert('Selecciona una categoria');return;}
  var cn=parseInt(document.getElementById('clasif-count').value)||2;
  var seedEl=document.getElementById('final-seeded');
  var useSeeds=seedEl?!!seedEl.checked:false;
  var cz=S.zones.filter(function(z){return z.cat===cat;});
  if(!cz.length){document.getElementById('bracket-display').innerHTML='<div class="card"><div class="empty"><p>No hay zonas para esa categoria</p></div></div>';return;}
  if(S.bracket[cat]&&!confirm('Regenerar la llave borrara los resultados de llave y reiniciara el ranking. Continuar?'))return;
  // Borrar solo scores de llave, no de zona
  var newBracketScores={};
  Object.keys(S.bracketScores).forEach(function(k){
    // Los keys de zona no contienen '|', los de llave sí
    if(k.indexOf('|')===-1)newBracketScores[k]=S.bracketScores[k];
  });
  S.bracketScores=newBracketScores;
  delete S.bracket[cat];
  var totalEsperado=cz.length*cn;
  var bracketSize=Math.pow(2,Math.ceil(Math.log2(Math.max(totalEsperado,2))));
  var numByes=bracketSize-totalEsperado;
  var priority=seedPriorityTable(bracketSize);

  var slotAssignments=[];
  for(var r=1;r<=cn;r++){
    cz.forEach(function(z){slotAssignments.push({zonaId:z.id,rank:r});});
  }
  var byeSet={};
  priority.slice(0,numByes).forEach(function(p){byeSet[p]=true;});
  var fillPositions=priority.filter(function(p){return!byeSet[p];});

  var slotMap=[];
  fillPositions.forEach(function(pos,idx){
    slotMap.push({pos:pos,zonaId:slotAssignments[idx].zonaId,rank:slotAssignments[idx].rank});
  });

  var slots=new Array(bracketSize).fill(null);
  slotMap.forEach(function(sm){
    var z=cz.find(function(z){return z.id===sm.zonaId;});
    if(z&&zonaCompleta(z)){
      var st=getStandings(z);
      if(st.length>=sm.rank)slots[sm.pos-1]={player:st[sm.rank-1].player,zona:z.num+1,rank:sm.rank};
      else slots[sm.pos-1]={pending:true};
    }else{
      slots[sm.pos-1]={pending:true};
    }
  });

  var pendientes=cz.filter(function(z){return!zonaCompleta(z);}).length;

   S.bracket[cat]={
    rounds:buildRounds(slots),
    seeded:useSeeds,
    totalClasificados:totalEsperado,
    byes:numByes,
    bracketSize:bracketSize,
    slotMap:slotMap,
    cn:cn,
    pendientes:pendientes
  };
  hideBracketForm();
  refreshBracketTabs(cat);
  renderBracket(cat);updateMetrics();
}

function autoUpdateBracket(cat){
  var b=S.bracket[cat];if(!b||!b.slotMap)return;
  var cz=S.zones.filter(function(z){return z.cat===cat;});
  var bracketSize=b.bracketSize;

  var slots=new Array(bracketSize).fill(null);
  b.slotMap.forEach(function(sm){
    var z=cz.find(function(z){return z.id===sm.zonaId;});
    if(z&&zonaCompleta(z)){
      var st=getStandings(z);
      if(st.length>=sm.rank)slots[sm.pos-1]={player:st[sm.rank-1].player,zona:z.num+1,rank:sm.rank};
      else slots[sm.pos-1]={pending:true};
    }else{
      slots[sm.pos-1]={pending:true};
    }
  });

  var newRounds=buildRounds(slots);

  newRounds.forEach(function(round,ri){
    round.forEach(function(match,mi){
      var old=b.rounds[ri]&&b.rounds[ri][mi];
      if(old&&old.winner!=null&&!match.auto&&!match.p1.pending&&!match.p2.pending){
        match.winner=old.winner;
      }
    });
  });

  b.rounds=newRounds;
  b.pendientes=cz.filter(function(z){return!zonaCompleta(z);}).length;
  renderBracket(cat);
}
function renderBracket(cat){
  var w=document.getElementById('bracket-display');
  if(!cat){if(w)w.innerHTML='';return;}
  var b=S.bracket[cat];if(!b){if(w)w.innerHTML='';return;}
  var champ=getChamp(b.rounds);
  var infoTag=b.seeded?'<span class="tag tag-amber">&#x1F3C5; Con cabezas de serie</span>':'<span class="tag tag-blue">Sorteo libre</span>';
  var catObj=catBy(cat);
  var catBadge=catObj?'<span class="tag '+catObj.color+'" style="font-size:14px;font-weight:600;padding:5px 14px;">'+catObj.nombre+'</span>':'';
  var meta='<span style="font-size:12px;color:var(--text-muted);">'+b.totalClasificados+' clasificados &middot; '+b.cn+' por zona'+(b.byes?' &middot; '+b.byes+' bye'+(b.byes>1?'s':''):'')+'</span>';
  var editBtn='<button class="btn btn-sm" style="margin-left:auto;" onclick="showBracketForm()">Edit</button>';
  var warnHTML=b.pendientes?'<div class="alert alert-warn" style="margin-bottom:12px;">&#x26A0; '+b.pendientes+' zona'+(b.pendientes>1?'s':'')+' pendiente'+(b.pendientes>1?'s':'')+' de completar. Los slots se llenan automaticamente al terminar cada zona.</div>':'';
  if(w)w.innerHTML='<div class="card">'+warnHTML
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">'
    +catBadge+infoTag+meta+editBtn+'</div>'
    +makeBracketHTML(b.rounds,cat,false)+champBox(champ,false)+'</div>';
}
function showRLForm(){
  document.getElementById('rl-form-card').style.display='';
}
function hideRLForm(){
  document.getElementById('rl-form-card').style.display='none';
}
function refreshRLTabs(activeCat){
  var wrap=document.getElementById('rl-bracket-tabs');if(!wrap)return;
  var cats=Object.keys(S.rlBracket);
  if(!cats.length){wrap.innerHTML='<span style="font-size:12px;color:var(--text-muted);">Sin llaves generadas aun.</span>';return;}
  wrap.innerHTML=cats.map(function(cid){
    var c=catBy(cid);
    var col=c?c.color:'tag-gray';
    var isActive=cid===activeCat;
    return '<div onclick="selectRLTab(\''+cid+'\')" style="display:flex;align-items:center;gap:5px;padding:5px 14px;border-radius:20px;cursor:pointer;'
      +(isActive?'border:2px solid currentColor;':'border:2px solid transparent;opacity:0.6;')
      +'" class="'+col+'">'
      +'<span style="font-size:12px;font-weight:'+(isActive?'600':'500')+';">'+catNm(cid)+'</span>'
      +'</div>';
  }).join('');
}
function selectRLTab(cat){
  refreshRLTabs(cat);
  renderRLBracket(cat);
}
function generateRelampago(){
  var cat=document.getElementById('rl-cat').value;
  if(!cat){alert('Selecciona una categoria');return;}
  var src=document.getElementById('rl-source').value;
  var seed=document.getElementById('rl-seed').value;
  var pool=src==='equipos'?S.equipos.filter(function(e){return e.cat===cat;}):S.players.filter(function(p){return p.cat===cat;});
  if(!pool.length){alert('No hay participantes para esa categoria y tipo');return;}
  if(seed==='random')pool=[...pool].sort(function(){return Math.random()-.5;});
  var participants=pool.map(function(p){return{player:p,zona:null};});
  var total=participants.length;
  var bracketSize=Math.pow(2,Math.ceil(Math.log2(Math.max(total,2))));
  var numByes=bracketSize-total;
  var priority=seedPriorityTable(bracketSize);
  var slots=new Array(bracketSize).fill(null);
  // BYEs en las primeras numByes posiciones de la tabla de prioridad,
  // el resto se llena con los participantes (ya sorteados si random)
  var byeSet={};
  priority.slice(0,numByes).forEach(function(p){byeSet[p]=true;});
  var fillPositions=priority.filter(function(p){return !byeSet[p];});
  fillPositions.forEach(function(p,idx){slots[p-1]=participants[idx];});
  S.rlBracket[cat]={rounds:buildRounds(slots),source:src};
  hideRLForm();
  refreshRLTabs(cat);
  renderRLBracket(cat);updateMetrics();
}
function renderRLBracket(cat){
  var w=document.getElementById('rl-bracket-display');
  var b=S.rlBracket[cat];if(!b){if(w)w.innerHTML='';return;}
  var champ=getChamp(b.rounds);
  var total=b.rounds[0]?b.rounds[0].reduce(function(a,m){return a+(!m.p1.isBye&&m.p1.player?1:0)+(!m.p2.isBye&&m.p2.player?1:0);},0):0;
  if(w)w.innerHTML='<div class="card">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">'
    +'<span class="tag tag-rl">&#x26A1; Relampago</span>'
    +'<span class="tag '+catCol(cat)+'">'+catNm(cat)+'</span>'
    +'<span style="font-size:12px;color:var(--text-muted);">'+total+' participantes &middot; '+b.rounds.length+' rondas</span></div>'
    +makeBracketHTML(b.rounds,'rl:'+cat,true)+champBox(champ,true)+'</div>';
}

// ═══════════════════ SELECTS & METRICS ═══════════════════
function updateSelects(){
  var catO=S.categories.map(function(c){return'<option value="'+c.id+'">'+c.nombre+'</option>';}).join('');
  ['zone-cat-filter','res-cat-filter','rank-cat-filter'].forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    var prev=el.value;el.innerHTML='<option value="">Todas</option>'+catO;if(prev)el.value=prev;
  });
  ['final-cat','rl-cat'].forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    var prev=el.value;el.innerHTML='<option value="">Seleccionar...</option>'+catO;if(prev)el.value=prev;
  });
  ['res-zone-filter','rank-zone-filter'].forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    var prev=el.value;
    el.innerHTML='<option value="">Todas las zonas</option>'
      +S.zones.map(function(z){return'<option value="'+z.id+'">Zona '+(z.num+1)+' &mdash; '+catNm(z.cat)+(z.mode==='equipos'?' (Eq.)':'')+'</option>';}).join('');
    if(prev)el.value=prev;
  });
}
function updCatSels(){
  var o=S.categories.map(function(c){return'<option value="'+c.id+'">'+c.nombre+'</option>';}).join('');
  ['inp-cat','dbl-cat','eq-cat'].forEach(function(id){var el=document.getElementById(id);if(el)el.innerHTML=o;});
}
function updateMetrics(){
  var el;
  el=document.getElementById('m-total');if(el)el.textContent=S.players.length+S.equipos.length;
  if(isRL()){
    var inl=Object.values(S.rlBracket).reduce(function(a,b){
      return a+(b.rounds[0]?b.rounds[0].reduce(function(s,m){return s+(!m.p1.isBye&&m.p1.player?1:0)+(!m.p2.isBye&&m.p2.player?1:0);},0):0);
    },0);
    el=document.getElementById('m-zonas');if(el)el.textContent=inl;
  }else{el=document.getElementById('m-zonas');if(el)el.textContent=S.zones.length;}
  var played=Object.values(S.matches).filter(function(m){return m.sets&&m.sets.some(function(s){return s.a!==''&&s.a!==undefined;});}).length
    +Object.values(S.equipoMatches).reduce(function(a,em){
      return a+(em.partidos||[]).reduce(function(b,pd){return b+(pd&&pd.sets&&pd.sets.some(function(s){return s.a!==''&&s.a!==undefined;})?1:0);},0);
    },0);
  el=document.getElementById('m-partidos');if(el)el.textContent=played;
  var champs=Object.keys(S.bracket).filter(function(cat){return getChamp(S.bracket[cat].rounds);}).length
    +Object.keys(S.rlBracket).filter(function(cat){return getChamp(S.rlBracket[cat].rounds);}).length;
  el=document.getElementById('m-champs');if(el)el.textContent=champs;
}

// ═══════════════════ CONFIG ═══════════════════
function saveConfig(){
  S.config={
    nombre:document.getElementById('cfg-nombre').value.trim(),
    fecha:document.getElementById('cfg-fecha').value,
    sede:document.getElementById('cfg-sede').value.trim(),
    sets:parseInt(document.getElementById('cfg-sets').value),
    formato:S.config.formato,
    inscripcion:document.getElementById('cfg-inscripcion').checked,
    monto:document.getElementById('cfg-monto').value,
    'monto-dobles':document.getElementById('cfg-monto-dobles').value,
    'monto-equipo':document.getElementById('cfg-monto-equipo').value
  };
  document.getElementById('header-torneo-name').textContent=S.config.nombre||'';
  toggleInscripcion();
  renderPlayers();renderEquipos();renderCajaSingles();renderCajaEquipos();
  salert('alert-cats','&#x2705; Configuracion guardada','success',2000);
}

// ═══════════════════ EXPORT/IMPORT ═══════════════════
function exportData(){
  var blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=(S.config.nombre||'torneo').replace(/\s+/g,'_')+'.json';a.click();
}
function importData(e){
  var f=e.target.files[0];if(!f)return;
  var r=new FileReader();
  r.onload=function(ev){
    try{
      S=JSON.parse(ev.target.result);
      S.bracketScores=S.bracketScores||{};S.bracket=S.bracket||{};S.rlBracket=S.rlBracket||{};
      S.rankConfig=S.rankConfig||{modo:'fijo',zonaPts:5,rondas:{campeon:100,finalista:70,semifinal:50,cuartos:35,octavos:20,ronda16:10,ronda32:5},eloCats:[]};
      S.rankingHistorico=S.rankingHistorico||[];
      S.matches=S.matches||{};S.equipoMatches=S.equipoMatches||{};
      S.zones=S.zones||[];S.players=S.players||[];S.equipos=S.equipos||[];S.categories=S.categories||[];
      document.getElementById('header-torneo-name').textContent=S.config&&S.config.nombre?S.config.nombre:'';
      if(S.config){
        document.getElementById('cfg-nombre').value=S.config.nombre||'';
        document.getElementById('cfg-fecha').value=S.config.fecha||'';
        document.getElementById('cfg-sede').value=S.config.sede||'';
        document.getElementById('cfg-sets').value=S.config.sets||2;
        document.getElementById('cfg-inscripcion').checked=!!S.config.inscripcion;
        document.getElementById('cfg-monto').value=S.config.monto||'';
        document.getElementById('cfg-monto-dobles').value=S.config['monto-dobles']||'';
        document.getElementById('cfg-monto-equipo').value=S.config['monto-equipo']||'';
        toggleInscripcion();
      }
      updCatSels();renderPlayers();renderEquipos();renderZones();renderCats();
      renderResults();renderRanking();
      renderCajaSingles();renderCajaEquipos();
      setFormat(S.config&&S.config.formato?S.config.formato:'clasico');
      updateSelects();updateMetrics();
      var firstBracketCat=Object.keys(S.bracket)[0];
         if(firstBracketCat){
        refreshBracketTabs(firstBracketCat);
        renderBracket(firstBracketCat);
      }
      var firstRLCat=Object.keys(S.rlBracket)[0];
      if(firstRLCat){refreshRLTabs(firstRLCat);renderRLBracket(firstRLCat);}
      alert('Datos importados correctamente');
    }catch(err){console.error(err);alert('Error al importar');}
  };r.readAsText(f);
}
function resetAll(){
  S={config:{nombre:'',fecha:'',sede:'',sets:2,formato:'clasico',inscripcion:false,monto:'','monto-dobles':'','monto-equipo':''},
    categories:[
      {id:'cat1',nombre:'Open',color:'tag-blue'},{id:'cat2',nombre:'Sub-18',color:'tag-teal'},
      {id:'cat3',nombre:'Sub-14',color:'tag-amber'},{id:'cat4',nombre:'Veteranos',color:'tag-purple'},
      {id:'cat5',nombre:'Femenino',color:'tag-coral'}
    ],
    mode:'singles',players:[],equipos:[],zones:[],matches:{},equipoMatches:{},bracket:{},rlBracket:{},bracketScores:{}};
  document.getElementById('header-torneo-name').textContent='';
  document.getElementById('cfg-inscripcion').checked=false;toggleInscripcion();
  renderPlayers();renderEquipos();renderCats();
  ['zones-display','results-display','ranking-display','bracket-display','rl-bracket-display','caja-singles-display','caja-equipos-display'].forEach(function(id){var el=document.getElementById(id);if(el)el.innerHTML='';});
  setFormat('clasico');updCatSels();updateSelects();updateMetrics();
}

// ═══════════════════ DEMO ═══════════════════
function importDemo(){
  var c1=S.categories[0]&&S.categories[0].id;
  var c2=S.categories[1]&&S.categories[1].id;
  var c5=S.categories[4]&&S.categories[4].id||c1;
  var demos=[
    {type:'singles',nombre:'Lucas',apellido:'Perez',club:'Club Atletico',cat:c1},
    {type:'singles',nombre:'Sofia',apellido:'Gomez',club:'RC Palermo',cat:c1},
    {type:'singles',nombre:'Mateo',apellido:'Rodriguez',club:'Union TM',cat:c1},
    {type:'singles',nombre:'Valentina',apellido:'Lopez',club:'Club Atletico',cat:c1},
    {type:'singles',nombre:'Nicolas',apellido:'Fernandez',club:'RC Palermo',cat:c1},
    {type:'singles',nombre:'Camila',apellido:'Martinez',club:'Union TM',cat:c1},
    {type:'singles',nombre:'Tomas',apellido:'Garcia',club:'Club Norte',cat:c2},
    {type:'singles',nombre:'Santiago',apellido:'Diaz',club:'Club Sur',cat:c2},
    {type:'singles',nombre:'Joaquin',apellido:'Mendez',club:'RC Palermo',cat:c2},
    {type:'singles',nombre:'Leandro',apellido:'Blanco',club:'Independiente',cat:c2},
    {type:'dobles',j1:'Sofia Gomez',j2:'Valentina Lopez',displayName:'Gomez / Lopez',club:'Club Atletico',cat:c5},
    {type:'dobles',j1:'Camila Martinez',j2:'Isabella Torres',displayName:'Martinez / Torres',club:'RC Palermo',cat:c5}
  ];
  demos.forEach(function(d){var obj=Object.assign({id:uid(),zona:false,pago:false},d);S.players.push(obj);});
  var eqs=[
    {nombre:'Club Atletico A',cat:c1,j:['Lucas Perez','Mateo Rodriguez','Nicolas Fernandez']},
    {nombre:'RC Palermo A',cat:c1,j:['Diego Flores','Julian Mora','Emanuel Ruiz']},
    {nombre:'Union TM A',cat:c1,j:['Ezequiel Ramos','Leandro Bueno','Gaston Rios']},
    {nombre:'Independiente A',cat:c1,j:['Marcos Ponce','Sergio Luna','Damian Sosa']},
    {nombre:'Club Atletico B',cat:c2,j:['Tomas Garcia','Santiago Diaz']},
    {nombre:'RC Palermo B',cat:c2,j:['Joaquin Mendez','Leandro Blanco']},
    {nombre:'Union TM B',cat:c2,j:['Bruno Acosta','Ignacio Vera']},
    {nombre:'Club Norte B',cat:c2,j:['Martin Suarez','Franco Ibarra']},
    {nombre:'Club Atletico V',cat:c5,j:['Roberto Paz','Carlos Medina','Alberto Ruiz']},
    {nombre:'RC Palermo V',cat:c5,j:['Hector Molina','Oscar Benitez','Jorge Diaz']},
    {nombre:'Union TM V',cat:c5,j:['Eduardo Gimenez','Ricardo Flores']},
    {nombre:'Independiente V',cat:c5,j:['Miguel Torres','Raul Pereyra']}
  ];
  eqs.forEach(function(eq){
    S.equipos.push({id:uid(),type:'equipo',nombre:eq.nombre,cat:eq.cat,zona:false,pago:false,
      jugadores:eq.j.map(function(n){return{id:uid(),nombre:n};})});
  });
  renderPlayers();renderEquipos();renderCajaSingles();renderCajaEquipos();updateSelects();updateMetrics();
  alert('Demo cargado: 12 jugadores/parejas y 12 equipos');
}

// ═══════════════════ INIT ═══════════════════
updCatSels();
renderPlayers();
renderEquipos();
renderCats();
setFormat('clasico');
updateSelects();
updateMetrics();