// i18n
const I18N = {
  es: { signin:"Acceso", signin_sub:"Usar cualquier email/clave para simular inicio de sesión.", enter:"Entrar",
        hero_sub:"Revisa avances, da feedback y crea nuevas campañas fácilmente.",
        new_request:"+ Nueva solicitud", kpi_active:"Solicitudes activas", kpi_review:"En revisión", kpi_approved:"Entregables aprobados",
        activity:"Actividad reciente", shortcuts:"Atajos", downloads:"Descargar ZIP finales", upgrade:"Actualizar plan",
        active_requests:"Solicitudes activas", title_id:"Título / ID", status:"Estado", updated:"Última actualización", actions:"Acciones",
        requests:"Solicitudes", title:"Título", req_initial:"Requerimientos iniciales", attachments:"Adjuntos de referencia",
        deliverables:"Entregables de LUMICA", feedback_iter:"Feedback e iteraciones", send_feedback:"Enviar feedback", approve:"Aprobar versión",
        current_plan:"Plan actual", active_count:"Solicitudes activas"
  },
  en: { signin:"Sign in", signin_sub:"Use any email/password to simulate sign-in.", enter:"Enter",
        hero_sub:"Review progress, give feedback and create new campaigns easily.",
        new_request:"+ New request", kpi_active:"Active requests", kpi_review:"In review", kpi_approved:"Approved deliverables",
        activity:"Recent activity", shortcuts:"Shortcuts", downloads:"Download final ZIPs", upgrade:"Upgrade plan",
        active_requests:"Active requests", title_id:"Title / ID", status:"Status", updated:"Last update", actions:"Actions",
        requests:"Requests", title:"Title", req_initial:"Initial requirements", attachments:"Reference attachments",
        deliverables:"LUMICA deliverables", feedback_iter:"Feedback & iterations", send_feedback:"Send feedback", approve:"Approve version",
        current_plan:"Current plan", active_count:"Active requests"
  }
};

// State
const state = {
  token: localStorage.getItem('mockToken'),
  profile: JSON.parse(localStorage.getItem('profile') || 'null'),
  lang: localStorage.getItem('lang') || ((navigator.language || "").toLowerCase().startsWith('es') ? 'es' : 'en'),
  country: document.querySelector('meta[name="country"]')?.content || 'US'
};

// Region & pricing
const SETS = {
  latam: ['AR','BO','CL','CO','CR','DO','EC','SV','GT','HN','MX','NI','PA','PY','PE','UY','VE'],
  eu_except_es: ['AL','AT','BE','BG','CY','CZ','DE','DK','EE','FI','FR','GR','HR','HU','IE','IS','IT','LI','LT','LU','LV','MT','NL','NO','PL','PT','RO','SE','SI','SK']
};
const PRICING = {
  latam_es: { currency:'USD', plans: [{name:'Base',price:79},{name:'Pro',price:149}] },
  us_eu_br: { currency:'USD', plans: [{name:'Standard',price:199},{name:'Premium',price:399}] }
};

function computeLanguage(country, userLang) {
  const cc = (country || '').toUpperCase();
  const isLatam = SETS.latam.includes(cc);
  const isES = cc === 'ES';
  const isUS = cc === 'US';
  const isBR = cc === 'BR';
  const isEUxES = SETS.eu_except_es.includes(cc);
  let lang = (isLatam || isES) ? 'es' : (isUS || isBR || isEUxES) ? 'en' : 'en';
  if ((userLang || '').toLowerCase().startsWith('es')) lang = 'es';
  return lang;
}
function t(key){ return (I18N[state.lang] && I18N[state.lang][key]) || key; }
function applyI18N() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.getAttribute('data-i18n')));
}

// Session helpers
function saveSession(token, profile) {
  state.token = token;
  state.profile = profile;
  localStorage.setItem('mockToken', token);
  localStorage.setItem('profile', JSON.stringify(profile));
}
function logout() {
  state.token = null;
  state.profile = null;
  localStorage.removeItem('mockToken');
  localStorage.removeItem('profile');
  location.hash = '#/login';
}

// Data stores (localStorage)
function getReqs(){ return JSON.parse(localStorage.getItem('reqs') || '[]'); }
function setReqs(rs){ localStorage.setItem('reqs', JSON.stringify(rs)); }
function getTimeline(){ return JSON.parse(localStorage.getItem('timeline') || '[]'); }
function setTimeline(tl){ localStorage.setItem('timeline', JSON.stringify(tl.slice(0,80))); }
function addEvent(msg){
  const tl = getTimeline();
  tl.unshift({ ts: new Date().toISOString(), msg });
  setTimeline(tl);
  updateNotif();
}

function updateNotif(){
  const el = document.getElementById('notif');
  if (!el) return;
  const count = Math.min(getTimeline().length, 9);
  el.textContent = (state.lang==='es' ? 'Notificaciones' : 'Notifications') + ` (${count})`;
}

// Router
function render(route) {
  state.lang = localStorage.getItem('lang') || computeLanguage(state.country, navigator.language || "");
  const main = document.getElementById('app');
  const tpl = (id) => document.getElementById(id).content.cloneNode(true);
  const name = state.profile?.email?.split('@')[0] || '';

  if (!state.token && route !== '#/login') { location.hash = '#/login'; return; }

  if (route === '#/login') {
    main.innerHTML = ''; main.appendChild(tpl('tpl-login')); applyI18N();
    document.getElementById('loginForm').onsubmit = (e)=>{
      e.preventDefault();
      const email = e.target.email.value;
      saveSession('demo-token', { email });
      addEvent(`Login as ${email}`);
      location.hash = '#/dashboard';
    };
    return;
  }

  if (route === '#/requests') {
    main.innerHTML = ''; main.appendChild(tpl('tpl-requests')); applyI18N();
    document.getElementById('newReqTop').onclick = newReq;
    const tb = document.getElementById('reqList');
    const reqs = getReqs();
    tb.innerHTML = reqs.map(r => `
      <tr>
        <td>#${r.id}</td>
        <td><a href="#/request/${r.id}">${r.title}</a></td>
        <td>${r.status}</td>
        <td>
          <button class="btn small" onclick="location.hash='#/request/${r.id}'">${state.lang==='es'?'Ver detalle':'View detail'}</button>
          <button class="btn small ghost" onclick="openQuickFeedback(${r.id})">${state.lang==='es'?'Feedback rápido':'Quick feedback'}</button>
        </td>
      </tr>`).join('');
    return;
  }

  if (route.startsWith('#/request/')) {
    const id = Number(route.split('/')[2]);
    const reqs = getReqs();
    const r = reqs.find(x=>x.id===id);
    main.innerHTML = ''; main.appendChild(tpl('tpl-request-detail')); applyI18N();

    document.getElementById('helloTitle')?.remove();

    // Requerimientos
    const kv = document.getElementById('kvReq');
    const meta = r?.meta || { type:'Imagen', goal:'Aumentar awareness', audience:'18–30', platforms:'Instagram, TikTok', tone:'Cercano', due:'2025-10-01' };
    kv.innerHTML = `
      <div>${state.lang==='es'?'Tipo:':'Type:'}</div><div>${meta.type}</div>
      <div>${state.lang==='es'?'Objetivo:':'Goal:'}</div><div>${meta.goal}</div>
      <div>${state.lang==='es'?'Público:':'Audience:'}</div><div>${meta.audience}</div>
      <div>${state.lang==='es'?'Plataformas:':'Platforms:'}</div><div>${meta.platforms}</div>
      <div>${state.lang==='es'?'Tono:':'Tone:'}</div><div>${meta.tone}</div>
      <div>${state.lang==='es'?'Fecha objetivo:':'Target date:'}</div><div>${meta.due}</div>`;

    // Adjuntos
    const gal = document.getElementById('gallery');
    const refs = r?.refs || ['logo.png','moodboard.jpg','brief.pdf'];
    gal.innerHTML = refs.map(x=>`<div class="thumb">${x}</div>`).join('');

    // Versiones
    const versions = r?.versions || [
      { no:2, status:'review', at:'2025-09-03 15:22', frames:['v2_frame1.jpg','v2_frame2.jpg','v2_frame3.jpg'] },
      { no:1, status:'changes', at:'2025-08-30 10:04', frames:['v1_frame1.jpg','v1_frame2.jpg'] }
    ];
    const vEl = document.getElementById('versions');
    vEl.innerHTML = versions.map(v=>`
      <article class="card" style="padding:14px">
        <div class="grid cols-2" style="align-items:center">
          <div><strong>v${v.no}</strong> · <span class="status ${v.status}">${v.status==='review'?(state.lang==='es'?'En revisión':'In review'): v.status==='changes'?(state.lang==='es'?'Cambios solicitados':'Changes requested'):(state.lang==='es'?'Aprobada':'Approved')}</span>
            <div class="muted" style="margin-top:6px">${v.at}</div></div>
          <div style="text-align:right">
            <button class="btn small">${state.lang==='es'?'Aprobar versión':'Approve version'}</button>
            <button class="btn small ghost">${state.lang==='es'?'Solicitar cambios':'Request changes'}</button>
            <button class="btn small ghost">Descargar</button>
          </div>
        </div>
        <div class="gallery" style="margin-top:10px">${v.frames.map(f=>`<div class="thumb">${f}</div>`).join('')}</div>
      </article>`).join('');

    // Comentarios
    const comments = r?.comments || [
      { by:'Cliente', at:'2025-09-03 16:05', text: state.lang==='es' ? 'El primer segundo necesita un texto más claro.' : 'The first second needs a clearer message.'},
      { by:'LUMICA', at:'2025-09-03 16:20', text: state.lang==='es' ? 'Ajustaremos tipografía y contraste.' : 'We will adjust type and contrast.'}
    ];
    const cEl = document.getElementById('comments');
    cEl.innerHTML = comments.map(c=>`
      <div class="card" style="padding:12px"><div class="muted">${c.by} · ${c.at}</div><div>${c.text}</div></div>`).join('');

    // Quick feedback actions
    document.getElementById('sendFeedback').onclick = ()=>{
      const txt = document.getElementById('quickComment').value.trim();
      if (!txt) return openModal(state.lang==='es'?'Comentario vacío':'Empty comment');
      addEvent((state.lang==='es'?'Feedback en ':'Feedback on ') + `#${id}: ` + txt);
      document.getElementById('quickComment').value='';
      openModal(state.lang==='es'?'Feedback enviado':'Feedback sent');
    };
    document.getElementById('approveBtn').onclick = ()=>openModal(state.lang==='es'?'Versión aprobada':'Version approved');

    return;
  }

  // dashboard default
  main.innerHTML = ''; main.appendChild(tpl('tpl-dashboard')); applyI18N();
  document.getElementById('helloTitle').textContent = (state.lang==='es'?'Hola':'Hello') + (name?`, ${name}`:'') + (state.lang==='es'?', este es el estado de tus solicitudes':', here is the status of your requests');
  document.getElementById('newReqBtn').onclick = newReq;
  renderKPIs();
  renderTimeline();
  renderReqTable();
}

function renderKPIs(){
  const reqs = getReqs();
  const active = reqs.length;
  const inReview = reqs.filter(r=>r.status==='review' || r.versions?.some(v=>v.status==='review')).length;
  const approved = reqs.filter(r=>r.status==='approved').length;
  document.getElementById('kpiActive').textContent = active;
  document.getElementById('kpiReview').textContent = inReview;
  document.getElementById('kpiApproved').textContent = approved;
  document.getElementById('planName').textContent = 'Pro';
  document.getElementById('activeCount').textContent = `${active} / 10`;
}

function renderTimeline(){
  const ul = document.getElementById('timeline');
  if (!ul) return;
  const tl = getTimeline();
  ul.innerHTML = tl.slice(0,8).map(e => `<li><span class="muted">${new Date(e.ts).toLocaleString()}</span> • ${e.msg}</li>`).join('');
}

function renderReqTable(){
  const tb = document.getElementById('reqTable');
  if (!tb) return;
  const reqs = getReqs();
  tb.innerHTML = reqs.slice(0,5).map(r => `
    <tr>
      <td>${r.title} (#${r.id})</td>
      <td><span class="status ${r.status==='review'?'review': r.status==='approved'?'approved':'changes'}">${r.status}</span></td>
      <td>${new Date(r.updated || r.id).toLocaleString()}</td>
      <td>
        <button class="btn small" onclick="location.hash='#/request/${r.id}'">${state.lang==='es'?'Ver detalle':'View detail'}</button>
        <button class="btn small ghost" onclick="openQuickFeedback(${r.id})">${state.lang==='es'?'Feedback rápido':'Quick feedback'}</button>
      </td>
    </tr>`).join('');
}

// New request
function newReq(){
  const rs = getReqs();
  const id = Date.now();
  rs.push({
    id, updated: id, title:`Campaña ${id}`, status:'review', version:1,
    meta:{ type:'Imagen', goal:'Tráfico al sitio', audience:'25–40', platforms:'Instagram, TikTok', tone:'Moderno', due:'2025-10-10' },
    refs:['logo.png','moodboard.jpg'],
    versions:[{no:1,status:'review',at:new Date().toISOString().slice(0,16).replace('T',' ') ,frames:['v1_a.jpg','v1_b.jpg']}],
    comments:[]
  });
  setReqs(rs);
  addEvent(`Nueva solicitud #${id}`);
  location.hash = `#/request/${id}`;
}

// Quick feedback modal
function openQuickFeedback(id){
  const msg = state.lang==='es' ? `¿Enviar un feedback rápido para #${id}?` : `Send quick feedback for #${id}?`;
  openModal(msg, ()=>{
    addEvent((state.lang==='es'?'Feedback rápido en ':'Quick feedback on ') + `#${id}`);
  });
}
function openModal(text, onConfirm){
  const m = document.getElementById('modal');
  document.getElementById('modalText').textContent = text || '';
  m.classList.remove('hidden');
  document.getElementById('confirmModal').onclick = ()=>{ m.classList.add('hidden'); onConfirm && onConfirm(); };
  document.getElementById('cancelModal').onclick = ()=> m.classList.add('hidden');
}

// Wiring
window.addEventListener('hashchange', ()=>render(location.hash || '#/dashboard'));
document.getElementById('logoutBtn').onclick = (e)=>{ e.preventDefault(); logout(); };
const langSwitch = document.getElementById('langSwitch');
langSwitch.value = state.lang;
langSwitch.onchange = ()=>{ state.lang = langSwitch.value; localStorage.setItem('lang', state.lang); render(location.hash || '#/dashboard'); };

// Boot
state.lang = computeLanguage(state.country, navigator.language || "");
render(location.hash || (state.token ? '#/dashboard' : '#/login'));
