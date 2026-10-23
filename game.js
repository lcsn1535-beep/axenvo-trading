(() => {
const $ = id => document.getElementById(id);
const canvas = $('gameCanvas'), ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
let state = 'home', score = 0, timeLeft = 60, ammo = 6, maxAmmo = 6, shots = 0, hits = 0;
let targets = [], particles = [], lastTime = 0, spawnClock = 0, raf = 0, mouse = {x:W/2,y:H/2}, soundOn = true, audioCtx = null, shotFlash = 0;
let best = Number(localStorage.getItem('huehnerjagd-best') || 0);
let playerName = localStorage.getItem('huehnerjagd-player') || '';
const config = window.HUEHNERJAGD_CONFIG || {};
const hasSupabaseConfig = () => Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY &&
  !config.SUPABASE_URL.includes('DEIN-PROJEKT') && !config.SUPABASE_ANON_KEY.includes('DEIN_SUPABASE'));
function safeText(value){return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function updateNameUI(){
  const input=$('playerName'), status=$('nameStatus');
  if(input && document.activeElement!==input) input.value=playerName;
  if(status) status.textContent=playerName ? `Aktiver Spieler: ${playerName}` : 'Wähle einen Namen für die Rangliste.';
}
function savePlayerName(){
  const value=$('playerName').value.trim().replace(/\s+/g,' ');
  if(!value){$('nameStatus').textContent='Bitte gib einen Namen ein.';$('playerName').focus();return false;}
  if(value.length>18){$('nameStatus').textContent='Der Name darf höchstens 18 Zeichen lang sein.';return false;}
  playerName=value;localStorage.setItem('huehnerjagd-player',playerName);updateNameUI();refreshLeaderboard();audio(480,.05,'sine');return true;
}
async function supabaseRequest(path, options={}){
  if(!hasSupabaseConfig()) throw new Error('not_configured');
  const url=config.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+path;
  const response=await fetch(url,{...options,headers:{
    apikey:config.SUPABASE_ANON_KEY,
    Authorization:'Bearer '+config.SUPABASE_ANON_KEY,
    'Content-Type':'application/json',
    ...options.headers
  }});
  if(!response.ok) throw new Error('Supabase antwortete mit '+response.status);
  if(response.status===204)return null;
  return response.json();
}
async function refreshLeaderboard(){
  const rows=$('leaderboardRows'), status=$('leaderboardStatus');
  if(!rows||!status)return;
  if(!hasSupabaseConfig()){
    const localScores=JSON.parse(localStorage.getItem('huehnerjagd-scores')||'[]')
      .sort((a,b)=>b.score-a.score || new Date(a.created_at)-new Date(b.created_at)).slice(0,10);
    if(!localScores.length){
      rows.innerHTML='<div class="leaderboard-message">Noch keine Ergebnisse auf diesem Gerät. Speichere deinen Namen und spiele eine Runde!</div>';
    } else {
      rows.innerHTML=localScores.map((item,i)=>{
        const date=new Date(item.created_at);
        const dateLabel=Number.isNaN(date.getTime())?'—':date.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});
        const name=safeText(item.player_name);
        const isYou=playerName && item.player_name.toLowerCase()===playerName.toLowerCase();
        return `<div class="leaderboard-row rank-${i+1}"><div class="leaderboard-player"><span class="rank-number">${i===0?'♛':String(i+1).padStart(2,'0')}</span><span class="player-avatar">${safeText((item.player_name||'?').slice(0,1).toUpperCase())}</span><span class="leaderboard-name">${name}${isYou?'<span class="leaderboard-you">DU</span>':''}</span></div><div class="leaderboard-score">${Number(item.score).toLocaleString('de-DE')}</div><div class="leaderboard-date">${dateLabel}</div></div>`;
      }).join('');
    }
    status.textContent='LOKAL · NUR AUF DIESEM GERÄT · ONLINE-RANGLISTE NICHT VERBUNDEN';
    return;
  }
  rows.innerHTML='<div class="leaderboard-message">Lade die besten Spieler …</div>';
  status.textContent='VERBINDE MIT DER ONLINE-RANGLISTE';
  try{
    const data=await supabaseRequest('huehnerjagd_scores?select=player_name,score,created_at&order=score.desc,created_at.asc&limit=10');
    if(!data.length){rows.innerHTML='<div class="leaderboard-message">Noch keine Highscores. Sei der Erste im Revier!</div>';status.textContent='ONLINE · NOCH KEINE ERGEBNISSE';return;}
    rows.innerHTML=data.map((item,i)=>{
      const date=new Date(item.created_at);
      const dateLabel=Number.isNaN(date.getTime())?'—':date.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});
      const name=safeText(item.player_name);
      const isYou=playerName && item.player_name.toLowerCase()===playerName.toLowerCase();
      return `<div class="leaderboard-row rank-${i+1}"><div class="leaderboard-player"><span class="rank-number">${i===0?'♛':String(i+1).padStart(2,'0')}</span><span class="player-avatar">${safeText((item.player_name||'?').slice(0,1).toUpperCase())}</span><span class="leaderboard-name">${name}${isYou?'<span class="leaderboard-you">DU</span>':''}</span></div><div class="leaderboard-score">${Number(item.score).toLocaleString('de-DE')}</div><div class="leaderboard-date">${dateLabel}</div></div>`;
    }).join('');
    status.textContent=`ONLINE · TOP ${data.length} · AKTUALISIERT ${new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}`;
  }catch(err){
    rows.innerHTML='<div class="leaderboard-message">Verbindung fehlgeschlagen. Prüfe Supabase-URL, API-Key und Tabellen-Policies.</div>';
    status.textContent='VERBINDUNGSFEHLER';
  }
}
async function submitScore(){
  if(!playerName){$('resultText').textContent='Highscore nicht gespeichert: Bitte vor der nächsten Runde einen Spielernamen speichern.';return;}
  const localScores=JSON.parse(localStorage.getItem('huehnerjagd-scores')||'[]');
  localScores.push({player_name:playerName,score:score,created_at:new Date().toISOString()});
  localStorage.setItem('huehnerjagd-scores',JSON.stringify(localScores.slice(-100)));
  if(!hasSupabaseConfig()){
    $('resultText').textContent=`${hits} Treffer aus ${shots} Schüssen · Ergebnis lokal gespeichert. Für eine gemeinsame Online-Rangliste muss der Online-Dienst verbunden werden.`;
    refreshLeaderboard();
    return;
  }
  try{
    await supabaseRequest('huehnerjagd_scores',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({player_name:playerName,score:score})});
    $('resultText').textContent=`${hits} Treffer aus ${shots} Schüssen · Highscore online gespeichert!`;
    refreshLeaderboard();
  }catch(err){
    $('resultText').textContent=`${hits} Treffer aus ${shots} Schüssen · Online-Speichern fehlgeschlagen.`;
  }
}

$('bestHome').textContent = best.toLocaleString('de-DE');
function audio(freq=180,duration=.07,type='square',vol=.025){ if(!soundOn)return; try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)(); const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.stop(audioCtx.currentTime+duration)}catch(e){}}
function showScreen(which){$('homeScreen').classList.toggle('hidden',which!=='home');$('gameScreen').classList.toggle('hidden',which!=='game');}
function startGame(){cancelAnimationFrame(raf);state='ready';score=0;timeLeft=60;ammo=maxAmmo;shots=0;hits=0;targets=[];particles=[];spawnClock=0;shotFlash=0;updateHud();showScreen('game');$('startOverlay').classList.remove('hidden');$('pauseOverlay').classList.add('hidden');$('gameOverOverlay').classList.add('hidden');drawScene(0);$('fieldStartBtn').focus();}
function beginRun(){if(state==='running')return;state='running';$('startOverlay').classList.add('hidden');$('pauseOverlay').classList.add('hidden');lastTime=performance.now();spawnClock=0;for(let i=0;i<5;i++)spawnTarget(true);raf=requestAnimationFrame(loop);}
function pauseGame(){if(state==='running'){state='paused';cancelAnimationFrame(raf);$('pauseOverlay').classList.remove('hidden');}else if(state==='paused'){state='running';$('pauseOverlay').classList.add('hidden');lastTime=performance.now();raf=requestAnimationFrame(loop);}}
function endGame(){state='over';cancelAnimationFrame(raf);$('gameOverOverlay').classList.remove('hidden');$('finalScore').textContent=String(score).padStart(5,'0');$('resultTitle').textContent=score>=best&&score>0?'NEUER HIGHSCORE!':'GUT GEZIELT!';$('resultText').textContent=`${hits} Treffer aus ${shots} Schüssen · Trefferquote ${shots?Math.round(hits/shots*100):0}%.`;if(score>best){best=score;localStorage.setItem('huehnerjagd-best',best);$('bestHome').textContent=best.toLocaleString('de-DE')}audio(330,.15,'triangle',.04);submitScore();}
function spawnTarget(initial=false){const size=25+Math.random()*17;targets.push({x:initial?Math.random()*W:Math.random()*(W+120)-60,y:75+Math.random()*(H*.53),r:size,vx:(Math.random()<.5?-1:1)*(75+Math.random()*100),vy:(Math.random()-.5)*22,phase:Math.random()*6.28,kind:Math.random()<.22?'gold':'normal',alive:1});}
function updateHud(){$('score').textContent=String(score).padStart(5,'0');$('time').innerHTML=`${Math.ceil(timeLeft)}<span>s</span>`;$('accuracy').textContent=shots?Math.round(hits/shots*100)+'%':'—';$('ammo').textContent=Array.from({length:maxAmmo},(_,i)=>i<ammo?'●':'○').join(' ');$('shotsInfo').textContent=`SCHÜSSE: ${shots}`;}
function drawBackground(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#b8d9aa');g.addColorStop(.68,'#e8dda5');g.addColorStop(1,'#e8c88d');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
ctx.fillStyle='#fff0ad';ctx.beginPath();ctx.arc(980,105,49,0,Math.PI*2);ctx.fill();
function cloud(x,y,s){ctx.fillStyle='#fff7d7';ctx.globalAlpha=.68;ctx.beginPath();ctx.ellipse(x,y,60*s,14*s,0,0,Math.PI*2);ctx.ellipse(x-22*s,y-8*s,22*s,21*s,0,0,Math.PI*2);ctx.ellipse(x+7*s,y-13*s,28*s,26*s,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
cloud(170,120,.8);cloud(760,205,.65);cloud(1080,280,.45);
ctx.fillStyle='#8cb778';ctx.beginPath();ctx.moveTo(0,420);ctx.quadraticCurveTo(220,320,440,405);ctx.quadraticCurveTo(760,490,990,370);ctx.quadraticCurveTo(1100,330,1200,390);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
ctx.fillStyle='#5b8b57';ctx.beginPath();ctx.moveTo(0,505);ctx.quadraticCurveTo(220,420,460,500);ctx.quadraticCurveTo(800,590,1000,465);ctx.quadraticCurveTo(1100,430,1200,485);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
ctx.fillStyle='#376a46';ctx.beginPath();ctx.moveTo(0,590);ctx.quadraticCurveTo(300,520,550,600);ctx.quadraticCurveTo(900,680,1200,560);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
ctx.fillStyle='#284f37';for(let i=0;i<24;i++){let x=(i*79+21)%W,y=H-10-(i%4)*7;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-8,y-24-(i%3)*5);ctx.lineTo(x+3,y-16);ctx.lineTo(x+10,y-30);ctx.lineTo(x+8,y);ctx.fill();}}
const targetPhoto = new Image();
targetPhoto.src = 'spieler-ziel.jpg';
function drawBird(t){
 const {x,y,r,kind,phase}=t;
 const size=r*2.25;
 ctx.save();
 ctx.translate(x,y+Math.sin(phase)*3);
 // Gold targets get a gold ring; normal targets get a dark green ring.
 ctx.beginPath(); ctx.arc(0,0,size/2+4,0,Math.PI*2);
 ctx.fillStyle=kind==='gold'?'#f2c94c':'#284f37'; ctx.fill();
 ctx.save(); ctx.beginPath(); ctx.arc(0,0,size/2,0,Math.PI*2); ctx.clip();
 if(targetPhoto.complete && targetPhoto.naturalWidth){
   const iw=targetPhoto.naturalWidth, ih=targetPhoto.naturalHeight;
   const crop=Math.min(iw,ih);
   const sx=(iw-crop)/2, sy=(ih-crop)*0.25;
   ctx.drawImage(targetPhoto,sx,sy,crop,crop,-size/2,-size/2,size,size);
 } else {
   ctx.fillStyle='#d8c9b8';ctx.fillRect(-size/2,-size/2,size,size);
   ctx.fillStyle='#284f37';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('ZIEL',0,5);
 }
 ctx.restore();
 ctx.strokeStyle='#fff4d0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,size/2,0,Math.PI*2);ctx.stroke();
 ctx.restore();
}

function drawScene(dt){drawBackground();for(const t of targets)if(t.alive)drawBird(t);for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/.5);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
if(state==='running'||state==='ready'||state==='paused'){ctx.save();ctx.translate(mouse.x,mouse.y);ctx.strokeStyle='#1b3425';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.moveTo(-24,0);ctx.lineTo(-7,0);ctx.moveTo(7,0);ctx.lineTo(24,0);ctx.moveTo(0,-24);ctx.lineTo(0,-7);ctx.moveTo(0,7);ctx.lineTo(0,24);ctx.stroke();ctx.fillStyle='#e9f4d7';ctx.beginPath();ctx.arc(0,0,2,0,Math.PI*2);ctx.fill();ctx.restore();}
if(shotFlash>0){ctx.fillStyle=`rgba(255,245,200,${shotFlash*.55})`;ctx.fillRect(0,0,W,H);}}
function loop(now){if(state!=='running')return;const dt=Math.min((now-lastTime)/1000,.04);lastTime=now;timeLeft-=dt;spawnClock+=dt;shotFlash=Math.max(0,shotFlash-dt*8);
if(spawnClock>(.55+Math.random()*.5)){spawnTarget();spawnClock=0}
for(const t of targets){t.x+=t.vx*dt;t.y+=t.vy*dt;t.phase+=dt*7;if(t.x<-90||t.x>W+90)t.alive=0}
targets=targets.filter(t=>t.alive);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
if(timeLeft<=0){timeLeft=0;updateHud();drawScene(dt);endGame();return}updateHud();drawScene(dt);raf=requestAnimationFrame(loop);}
function reload(){if(state!=='running'||ammo===maxAmmo)return;ammo=maxAmmo;audio(410,.08,'triangle');updateHud();}
function shoot(x,y){if(state!=='running')return;if(ammo<=0){audio(90,.04,'square',.015);return}ammo--;shots++;shotFlash=.12;let hit=null;for(let i=targets.length-1;i>=0;i--){const t=targets[i],dx=x-t.x,dy=y-(t.y+Math.sin(t.phase)*3);if(Math.hypot(dx,dy)<t.r*1.02){hit=t;break}}
if(hit){hits++;hit.alive=0;const points=hit.kind==='gold'?250:100;score+=points;for(let i=0;i<10;i++)particles.push({x:hit.x,y:hit.y,vx:(Math.random()-.5)*140,vy:(Math.random()-.5)*140,r:2+Math.random()*3,life:.25+Math.random()*.3,color:hit.kind==='gold'?'#f8c849':'#fff4cf'});audio(hit.kind==='gold'?760:510,.07,'triangle',.035);audio(900,.05,'sine',.012)}else{audio(150,.055,'square',.02)}
updateHud();drawScene(0);}
function pointer(e){const rect=canvas.getBoundingClientRect();mouse.x=(e.clientX-rect.left)/rect.width*W;mouse.y=(e.clientY-rect.top)/rect.height*H;}
canvas.addEventListener('pointermove',pointer);canvas.addEventListener('pointerdown',e=>{pointer(e);shoot(mouse.x,mouse.y)});canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('playBtn').onclick=()=>{if(!playerName){$('playerName').focus();$('nameStatus').textContent='Speichere zuerst deinen Spielernamen.';return;}startGame();};$('fieldStartBtn').onclick=beginRun;$('againBtn').onclick=()=>{startGame();beginRun()};$('pauseBtn').onclick=pauseGame;$('resumeBtn').onclick=pauseGame;$('reloadBtn').onclick=reload;$('homeBtn').onclick=()=>{state='home';cancelAnimationFrame(raf);showScreen('home');$('howPanel').classList.add('hidden')};
$('howBtn').onclick=()=>{$('howPanel').classList.remove('hidden');$('howPanel').scrollIntoView({behavior:'smooth',block:'center'})};$('closeHow').onclick=()=>$('howPanel').classList.add('hidden');$('howPlayBtn').onclick=()=>{if(!playerName){$('homeScreen').scrollIntoView({behavior:'smooth'});$('playerName').focus();$('nameStatus').textContent='Speichere zuerst deinen Spielernamen.';return;}startGame();beginRun()};
$('saveNameBtn').onclick=savePlayerName;$('playerName').addEventListener('keydown',e=>{if(e.key==='Enter')savePlayerName()});$('refreshLeaderboard').onclick=refreshLeaderboard;
$('soundToggle').onclick=()=>{soundOn=!soundOn;$('soundToggle').textContent=soundOn?'♫':'♪';$('soundToggle').style.color=soundOn?'var(--cream)':'var(--orange)';if(soundOn)audio(520,.05,'sine')};
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r'){e.preventDefault();reload()}if(e.code==='Escape'&&(state==='running'||state==='paused'))pauseGame();if(e.code==='Space'&&state==='ready'){e.preventDefault();beginRun()}});
function homeArt(){drawBackground();}homeArt();updateNameUI();refreshLeaderboard();
})();