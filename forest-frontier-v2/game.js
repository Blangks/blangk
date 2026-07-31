(()=>{
'use strict';

const $=id=>document.getElementById(id);
const canvas=$('world'),ctx=canvas.getContext('2d',{alpha:false});
const mini=$('mini'),mctx=mini.getContext('2d');
const worldMap=$('worldMap'),mapCtx=worldMap.getContext('2d');
const ui={
 district:$('district'),world:$('worldState'),quest:$('questShort'),objective:$('objectiveText'),distance:$('objectiveDistance'),arrow:$('objectiveArrow'),
 hearts:$('hearts'),energy:$('energyFill'),rupees:$('rupees'),prompt:$('prompt'),toast:$('toast'),dialog:$('dialog'),speaker:$('dialogSpeaker'),text:$('dialogText'),portrait:$('dialogPortrait'),
 title:$('titleScreen'),pause:$('pauseScreen'),map:$('mapScreen'),complete:$('completeScreen'),pauseSummary:$('pauseSummary')
};

const WORLD={w:3200,h:1900};
const SAVE_KEY='the-hub-forest-frontier-v2';
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const now=()=>performance.now()/1000;

function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const rand=mulberry32(841926);

const districts=[
 {id:'plaza',name:'Central Plaza',x:0,y:480,w:720,h:700,color:'#203b4d',accent:'#6ee7ff'},
 {id:'market',name:'Market Row',x:0,y:1180,w:780,h:720,color:'#5a3d2f',accent:'#ffb86f'},
 {id:'garden',name:'Greenroof Gardens',x:720,y:0,w:700,h:660,color:'#28513d',accent:'#8ee5a4'},
 {id:'archive',name:'Archive Tower',x:720,y:660,w:600,h:570,color:'#263d59',accent:'#79dff4'},
 {id:'rail',name:'Old Rail Station',x:780,y:1230,w:640,h:670,color:'#40362f',accent:'#f3cb7a'},
 {id:'sky',name:'Skybridge District',x:1420,y:0,w:560,h:640,color:'#303c62',accent:'#98b7ff'},
 {id:'neon',name:'Neon Alley',x:1980,y:0,w:620,h:650,color:'#3e214c',accent:'#ee73ff'},
 {id:'tunnels',name:'Lower Tunnels',x:1420,y:650,w:1180,h:430,color:'#173f42',accent:'#65e2d2'},
 {id:'frontier',name:'Ancient Frontier',x:2600,y:0,w:260,h:1900,color:'#645038',accent:'#f0cf78'},
 {id:'woods',name:'Whispering Woods',x:2860,y:0,w:340,h:1220,color:'#244f37',accent:'#8fe09e'},
 {id:'grove',name:'Sacred Grove',x:2860,y:1220,w:340,h:680,color:'#183f2c',accent:'#a8f0b7'}
];

const buildings=[
 {x:105,y:585,w:190,h:135,hgt:72,label:'Council Hall',district:'plaza',roof:'#27384b',trim:'#f0cf78'},
 {x:410,y:590,w:210,h:145,hgt:84,label:'Guild Lodge',district:'plaza',roof:'#2d3b4d',trim:'#78def1'},
 {x:110,y:1320,w:230,h:145,hgt:68,label:'Market Hall',district:'market',roof:'#5d3c2c',trim:'#ffbd73'},
 {x:430,y:1390,w:260,h:160,hgt:76,label:'Relic Bazaar',district:'market',roof:'#4b2f28',trim:'#ef8d67'},
 {x:810,y:120,w:230,h:155,hgt:95,label:'Conservatory',district:'garden',roof:'#315941',trim:'#94e5a7'},
 {x:1100,y:300,w:235,h:155,hgt:78,label:'Garden Commons',district:'garden',roof:'#2a4e3a',trim:'#84d69a'},
 {x:820,y:755,w:240,h:175,hgt:145,label:'Archive Tower',district:'archive',roof:'#293d5b',trim:'#79e3f6'},
 {x:1085,y:890,w:180,h:125,hgt:82,label:'Scholar Annex',district:'archive',roof:'#2a3b50',trim:'#96d7e8'},
 {x:860,y:1405,w:310,h:170,hgt:74,label:'Old Rail Station',district:'rail',roof:'#47392e',trim:'#f0ca78'},
 {x:1180,y:1640,w:190,h:135,hgt:68,label:'Rail Foundry',district:'rail',roof:'#4a342c',trim:'#e78d5f'},
 {x:1480,y:110,w:250,h:150,hgt:118,label:'Skybridge Hall',district:'sky',roof:'#36436d',trim:'#9bbcff'},
 {x:1735,y:330,w:180,h:145,hgt:96,label:'Airship Dock',district:'sky',roof:'#29354f',trim:'#79dff4'},
 {x:2040,y:115,w:220,h:160,hgt:92,label:'Neon Theater',district:'neon',roof:'#4e235b',trim:'#ef73ff'},
 {x:2300,y:360,w:220,h:160,hgt:100,label:'Arcade House',district:'neon',roof:'#49234f',trim:'#75e5ff'},
 {x:1500,y:745,w:235,h:145,hgt:62,label:'Tunnel Exchange',district:'tunnels',roof:'#174447',trim:'#68e0d3'},
 {x:1950,y:800,w:260,h:150,hgt:60,label:'Underworks',district:'tunnels',roof:'#18383c',trim:'#69d5ca'}
];

const obstacles=[];
for(const b of buildings)obstacles.push({x:b.x-16,y:b.y-16,w:b.w+32,h:b.h+32});
obstacles.push({x:2612,y:0,w:92,h:720},{x:2612,y:1180,w:92,h:720});

const paths=[
 [[250,1110],[660,1110],[930,1110],[1320,1110],[1700,1110],[2100,1110],[2580,1110]],
 [[680,520],[680,1090],[680,1500]],
 [[1420,560],[1960,560],[2600,560]],
 [[1420,1080],[1960,1080],[2600,1080]],
 [[780,1250],[1420,1250]],
 [[2860,590],[3190,590]],
 [[2860,1500],[3190,1500]]
];

const landmarks={mira:{x:925,y:1065},brann:{x:1120,y:1600},gate:{x:2730,y:950},shrineA:{x:3010,y:330},shrineB:{x:3050,y:900},guardian:{x:3040,y:1450},tree:{x:3050,y:1745},return:{x:360,y:1060}};
const questSteps=[
 {title:'The Archive Signal',text:'Find Mira at Archive Tower.',target:'mira'},
 {title:'A Lantern for the Gate',text:'Ask Brann at Old Rail Station for a frontier lantern.',target:'brann'},
 {title:'Beyond the Ancient Gate',text:'Cross the Ancient Frontier into Whispering Woods.',target:'gate'},
 {title:'Cleanse the Corruption',text:'Defeat three corrupted wisps in Whispering Woods.',target:'shrineA'},
 {title:'Wake the Forest Shrines',text:'Activate both forest shrines.',target:'shrineA'},
 {title:'The Grove Guardian',text:'Defeat the corrupted Grove Guardian.',target:'guardian'},
 {title:'The Great Tree',text:'Speak with the Great Tree.',target:'tree'},
 {title:'Return to The Hub',text:'Return to Central Plaza and report the restored frontier.',target:'return'},
 {title:'Frontier Restored',text:'Explore the living world. The city remembers what you changed.',target:'tree'}
];

const stateDefault={stage:0,kills:0,shrines:[false,false],guardian:false,complete:false,discovered:['plaza'],rupees:0,lantern:false,sound:true,quality:'high',player:null};
let state=loadState();
const player={x:360,y:1060,r:18,speed:230,hp:6,maxHp:6,energy:100,maxEnergy:100,angle:0,attack:0,roll:0,inv:0,combo:0,comboTimer:0,checkpoint:{x:360,y:1060},focusTarget:null};
if(state.player){player.x=state.player.x||player.x;player.y=state.player.y||player.y;player.hp=state.player.hp||player.maxHp;player.checkpoint=state.player.checkpoint||player.checkpoint}
const keys={},touch={x:0,y:0},camera={x:player.x,y:player.y,lookX:0,lookY:0,zoom:1};
let dpr=1,lastTime=performance.now(),paused=true,titleOpen=true,dialogOpen=false,mapOpen=false,toastTimer=0,shake=0,weather='Clear',worldTime=8.2,autosaveTimer=0,quality=state.quality||'high',audioCtx=null,masterGain=null;

const civilians=[],civilianColors=['#7bdff2','#f4c575','#b6a7ff','#8fe0a0','#f09ccf','#d7d9df'];
for(let i=0;i<34;i++){const route=paths[Math.floor(rand()*5)],p=route[Math.floor(rand()*route.length)];civilians.push({x:p[0]+(rand()-.5)*45,y:p[1]+(rand()-.5)*45,route,i:Math.floor(rand()*route.length),speed:22+rand()*22,c:civilianColors[Math.floor(rand()*civilianColors.length)]})}
const npcs=[
 {id:'mira',name:'Mira',role:'Archivist',x:925,y:1065,c:'#ffe080',path:[[925,1065],[845,1120],[1035,1120]],i:0},
 {id:'brann',name:'Brann',role:'Rail Smith',x:1120,y:1600,c:'#e98b61',path:[[1120,1600],[1000,1700],[1240,1740]],i:0},
 {id:'maeve',name:'Maeve',role:'Garden Keeper',x:1050,y:520,c:'#8ee7a3',path:[[1050,520],[900,560],[1210,560]],i:0},
 {id:'juno',name:'Juno',role:'Market Courier',x:420,y:1190,c:'#77dff0',path:[[420,1190],[610,1270],[350,1510]],i:0},
 {id:'blank',name:'Blank',role:'Wanderer',x:550,y:1000,c:'#d8c7ff',path:[[550,1000],[300,970],[550,1120]],i:0},
 {id:'nyx',name:'Nyx',role:'Neon Storyteller',x:2230,y:550,c:'#ec79ff',path:[[2230,550],[2080,520],[2420,520]],i:0}
];
const enemies=[];
function spawnEnemy(type,x,y,id){const s={wisp:{hp:3,r:17,speed:62,c:'#d85ae8',damage:1},stalker:{hp:5,r:22,speed:42,c:'#7fd45f',damage:1},guardian:{hp:14,r:44,speed:34,c:'#e6529e',damage:2}}[type];enemies.push({...s,type,x,y,id,alive:true,maxHp:s.hp,attack:0,telegraph:0,hitFlash:0,knockX:0,knockY:0,seed:rand()*10})}
spawnEnemy('wisp',2940,260,'w1');spawnEnemy('wisp',3120,590,'w2');spawnEnemy('wisp',2945,980,'w3');spawnEnemy('stalker',3140,1120,'s1');spawnEnemy('guardian',3040,1450,'guardian');
if(state.kills>=3)enemies.filter(e=>e.type==='wisp').forEach(e=>e.alive=false);if(state.guardian)enemies.find(e=>e.type==='guardian').alive=false;

const trees=[];
for(let x=2885;x<3190;x+=58)for(let y=20;y<1880;y+=64){const gap=(y>520&&y<660)||(y>1390&&y<1530)||(Math.abs(x-3010)<55&&Math.abs(y-330)<75)||(Math.abs(x-3050)<55&&Math.abs(y-900)<75)||(Math.abs(x-3040)<120&&Math.abs(y-1450)<120)||(Math.abs(x-3050)<120&&Math.abs(y-1745)<120);if(!gap&&rand()>.34)trees.push({x:x+(rand()-.5)*34,y:y+(rand()-.5)*36,r:17+rand()*12,shade:rand()})}
const lamps=[];for(const route of paths.slice(0,5))for(let i=0;i<route.length;i++)lamps.push({x:route[i][0]+(i%2?22:-22),y:route[i][1]-28,color:i%3===0?'#71e6ff':'#ffd37a'});
const particles=[],rain=[],motes=[];for(let i=0;i<130;i++)rain.push({x:rand(),y:rand(),s:.4+rand()*.8});for(let i=0;i<55;i++)motes.push({x:2860+rand()*340,y:rand()*1900,a:rand()*TAU,s:6+rand()*12});

function storageGet(){try{return localStorage.getItem(SAVE_KEY)}catch{return null}}
function storageSet(v){try{localStorage.setItem(SAVE_KEY,v)}catch{}}
function storageRemove(){try{localStorage.removeItem(SAVE_KEY)}catch{}}
function loadState(){try{return{...stateDefault,...JSON.parse(storageGet()||'{}')}}catch{return{...stateDefault}}}
function saveState(){state.player={x:Math.round(player.x),y:Math.round(player.y),hp:player.hp,checkpoint:player.checkpoint};state.quality=quality;storageSet(JSON.stringify(state))}
function addRupees(n){state.rupees=(state.rupees||0)+n;saveState()}
function districtAt(x,y){return districts.find(d=>x>=d.x&&x<d.x+d.w&&y>=d.y&&y<d.y+d.h)||districts[0]}
function discoverDistrict(d){if(!state.discovered.includes(d.id)){state.discovered.push(d.id);toast(`${d.name} discovered`);tone(540,.08,'sine',.06);saveState()}}
function currentStep(){return questSteps[Math.min(state.stage,questSteps.length-1)]}
function targetPoint(){const t=currentStep().target;if(t==='shrineA'&&state.shrines[0])return landmarks.shrineB;if(t==='guardian'&&state.guardian)return landmarks.tree;return landmarks[t]||landmarks.tree}
function objectiveDistance(){const t=targetPoint();return Math.round(Math.hypot(t.x-player.x,t.y-player.y)/10)}
function resize(){dpr=Math.min(quality==='high'?2:1.25,devicePixelRatio||1);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);camera.zoom=clamp(innerWidth/1120,.62,1.08)*(innerHeight<580?.88:1);const mw=mini.clientWidth||150,mh=mini.clientHeight||95;mini.width=Math.round(mw*dpr);mini.height=Math.round(mh*dpr);mctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();

function initAudio(){if(audioCtx)return;try{audioCtx=new(AudioContext||webkitAudioContext)();masterGain=audioCtx.createGain();masterGain.gain.value=.22;masterGain.connect(audioCtx.destination)}catch{}}
function tone(freq,duration,type='sine',gain=.08,slide=0){if(!state.sound)return;initAudio();if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.linearRampToValueAtTime(freq+slide,t+duration);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+duration)}
setInterval(()=>{if(state.sound&&audioCtx&&!paused){const id=districtAt(player.x,player.y).id;tone(id==='neon'?220:id==='woods'||id==='grove'?164:196,1.8,'sine',.012,10)}},3100);
function toast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');toastTimer=2.3}
const dialogueQueue=[];
function say(speaker,text,portrait='✦'){dialogueQueue.push({speaker,text,portrait});if(!dialogOpen)nextDialogue()}
function nextDialogue(){if(!dialogueQueue.length){dialogOpen=false;ui.dialog.style.display='none';return}const line=dialogueQueue.shift();dialogOpen=true;ui.speaker.textContent=line.speaker;ui.text.textContent=line.text;ui.portrait.textContent=line.portrait;ui.dialog.style.display='grid';touch.x=touch.y=0}
function setStage(n,msg){state.stage=Math.max(state.stage,n);saveState();if(msg)toast(msg);tone(680,.18,'triangle',.08,110)}
function resetSave(){storageRemove();location.reload()}
function returnCheckpoint(){player.x=player.checkpoint.x;player.y=player.checkpoint.y;player.hp=player.maxHp;player.energy=player.maxEnergy;closeScreens();toast('Returned to checkpoint')}
function startGame(newGame=false){if(newGame){storageRemove();state={...stateDefault,shrines:[false,false],discovered:['plaza']};player.x=360;player.y=1060;player.hp=player.maxHp;player.energy=player.maxEnergy;player.checkpoint={x:360,y:1060};enemies.forEach(e=>{e.alive=true;e.hp=e.maxHp})}titleOpen=false;paused=false;ui.title.classList.remove('active');ui.pause.classList.remove('active');initAudio();audioCtx?.resume();updateUI();toast(newGame?'A new journey begins':'Journey resumed')}
function pauseGame(){if(titleOpen||dialogOpen)return;paused=true;ui.pauseSummary.textContent=`${districtAt(player.x,player.y).name} • ${currentStep().title}`;ui.pause.classList.add('active')}
function resumeGame(){paused=false;ui.pause.classList.remove('active');audioCtx?.resume()}
function openMap(){if(titleOpen)return;mapOpen=true;paused=true;drawWorldMap();ui.map.classList.add('active')}
function closeMap(){mapOpen=false;paused=false;ui.map.classList.remove('active')}
function closeScreens(){ui.pause.classList.remove('active');ui.map.classList.remove('active');mapOpen=false;paused=false}

function rectCollision(x,y,r,o){const cx=clamp(x,o.x,o.x+o.w),cy=clamp(y,o.y,o.y+o.h);return Math.hypot(x-cx,y-cy)<r}
function blocked(x,y,r=player.r){if(x<r||y<r||x>WORLD.w-r||y>WORLD.h-r)return true;for(const o of obstacles)if(rectCollision(x,y,r,o))return true;for(const t of trees)if(Math.hypot(x-t.x,y-t.y)<r+t.r*.55)return true;if(Math.hypot(x-3050,y-1745)<r+72)return true;return false}
function burst(x,y,c,n=10,s=160){for(let i=0;i<n;i++){const a=rand()*TAU,v=(.35+rand()*.65)*s;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:.35+rand()*.45,max:.8,c,size:2+rand()*4})}}
function attack(){if(paused||dialogOpen||player.attack>0||player.energy<6)return;player.attack=.26;player.energy-=6;player.combo=player.comboTimer>0?Math.min(3,player.combo+1):1;player.comboTimer=.55;tone(250,.09,'square',.05,140);for(const e of enemies){if(!e.alive)continue;const d=Math.hypot(e.x-player.x,e.y-player.y),a=Math.atan2(e.y-player.y,e.x-player.x),da=Math.atan2(Math.sin(a-player.angle),Math.cos(a-player.angle));if(d<86+player.combo*4&&Math.abs(da)<1.08)damageEnemy(e,1+(player.combo===3?1:0),a)}}
function damageEnemy(e,n,a){e.hp-=n;e.hitFlash=.16;e.knockX=Math.cos(a)*150;e.knockY=Math.sin(a)*150;shake=7;burst(e.x,e.y,e.c,12,190);tone(110,.08,'sawtooth',.055,80);if(e.hp<=0)defeatEnemy(e)}
function defeatEnemy(e){e.alive=false;burst(e.x,e.y,'#fff0a0',22,230);addRupees(e.type==='guardian'?45:e.type==='stalker'?14:9);if(e.type==='wisp'){state.kills++;toast(`Corrupted wisp cleansed • ${Math.min(state.kills,3)}/3`);if(state.stage===3&&state.kills>=3)setStage(4,'The forest shrines are responding')}else if(e.type==='guardian'){state.guardian=true;setStage(6,'The path to the Great Tree is open');player.checkpoint={x:3040,y:1550}}saveState()}
function roll(){if(paused||dialogOpen||player.roll>0||player.energy<18)return;player.roll=.42;player.inv=.55;player.energy-=18;tone(180,.12,'triangle',.04,90)}
function focus(){const living=enemies.filter(e=>e.alive&&Math.hypot(e.x-player.x,e.y-player.y)<360);player.focusTarget=living.sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]||null;toast(player.focusTarget?`Focused: ${player.focusTarget.type==='guardian'?'Grove Guardian':'Corruption'}`:'No danger nearby')}
function hurtPlayer(amount,source){if(player.inv>0)return;player.hp-=amount;player.inv=1.1;shake=12;burst(player.x,player.y,'#ff7b78',14,180);tone(75,.22,'sawtooth',.08,-20);if(player.hp<=0){player.hp=player.maxHp;player.energy=player.maxEnergy;player.x=player.checkpoint.x;player.y=player.checkpoint.y;toast('The frontier returned you to safety')}else toast(source==='guardian'?'The guardian struck hard':'The corruption struck you')}

function interact(){
 if(dialogOpen){nextDialogue();return}
 const n=npcs.find(n=>Math.hypot(n.x-player.x,n.y-player.y)<74);
 if(n){
  if(n.id==='mira'){if(state.stage===0){say('Mira • Archivist','The Archive is hearing a heartbeat beyond the Ancient Frontier. Brann still keeps the old gate lantern. Bring it to the forest, cleanse what has rooted there, and return with the truth.','✦');setStage(1)}else if(state.complete)say('Mira • Archivist','Every district is reacting to the restored frontier. This is no longer a forgotten edge of the map. It is part of The Hub.','✦');else say('Mira • Archivist',currentStep().text,'✦')}
  else if(n.id==='brann'){if(state.stage===1){state.lantern=true;setStage(2,'Frontier lantern acquired');say('Brann • Rail Smith','The lantern remembers old roads. At the gate, its light will recognize you. Try not to lose it to anything with too many teeth.','◆')}else say('Brann • Rail Smith',state.complete?'Forest metal is arriving by rail now. Give me time and I will make weapons worthy of the new frontier.':'The old lantern burns blue when the forest is near.','◆')}
  else{const lines={maeve:'The rooftop gardens react to every forest change. Bring the frontier back alive and the city will bloom differently.',juno:'Market Row already has people betting on whether you return. Charming city, really.',blank:'I have walked many broken places. This one still wants to heal.',nyx:'Neon Alley turns every danger into a story by midnight. Try to give us a good ending.'};say(`${n.name} • ${n.role}`,lines[n.id]||'The Hub keeps moving.','•')}
  return
 }
 if(Math.hypot(player.x-3010,player.y-330)<72){activateShrine(0);return}
 if(Math.hypot(player.x-3050,player.y-900)<72){activateShrine(1);return}
 if(Math.hypot(player.x-3050,player.y-1745)<120){if(state.stage<6)say('The Great Tree','My roots are awake, but the guardian still carries the corruption.','✦');else if(state.stage===6){setStage(7,'The Great Tree has awakened');say('The Great Tree','City-light and forest-song were never enemies. Return to The Hub. Let them see that the frontier is not a wall, but a bridge.','✦');player.checkpoint={x:3040,y:1660}}else say('The Great Tree','The roads between us are open. What grows next belongs to both worlds.','✦');return}
 if(Math.hypot(player.x-360,player.y-1060)<95&&state.stage===7){state.complete=true;setStage(8);saveState();paused=true;ui.complete.classList.add('active');tone(392,.4,'triangle',.07,130);setTimeout(()=>tone(523,.55,'triangle',.06,100),180)}
}
function activateShrine(i){if(state.stage<4){say('Forest Shrine','The shrine is dormant. The nearby corruption must be cleansed first.','✦');return}if(state.shrines[i]){say('Forest Shrine','The shrine burns with a steady blue-green light.','✦');return}state.shrines[i]=true;const s=i?landmarks.shrineB:landmarks.shrineA;burst(s.x,s.y,'#76f1d1',35,260);tone(330,.5,'sine',.08,180);toast(`Forest shrine awakened • ${state.shrines.filter(Boolean).length}/2`);if(state.shrines.every(Boolean)){setStage(5,'The Grove Guardian has awakened');player.checkpoint={x:3020,y:1120}}saveState()}

function updateNPCs(dt){for(const n of npcs){const p=n.path[n.i],dx=p[0]-n.x,dy=p[1]-n.y,d=Math.hypot(dx,dy);if(d<5)n.i=(n.i+1)%n.path.length;else{n.x+=dx/d*19*dt;n.y+=dy/d*19*dt}}for(const c of civilians){const p=c.route[c.i],dx=p[0]-c.x,dy=p[1]-c.y,d=Math.hypot(dx,dy);if(d<8)c.i=(c.i+1)%c.route.length;else{c.x+=dx/d*c.speed*dt;c.y+=dy/d*c.speed*dt}}}
function updateEnemies(dt){for(const e of enemies){if(!e.alive||e.type==='guardian'&&state.stage<5)continue;e.hitFlash=Math.max(0,e.hitFlash-dt);e.attack=Math.max(0,e.attack-dt);e.telegraph=Math.max(0,e.telegraph-dt);e.x+=e.knockX*dt;e.y+=e.knockY*dt;e.knockX*=Math.pow(.05,dt);e.knockY*=Math.pow(.05,dt);const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1,aggro=e.type==='guardian'?470:300;if(d<aggro&&e.telegraph<=0&&e.attack<=0){if(d<(e.type==='guardian'?92:48)){e.telegraph=e.type==='guardian'?.72:.45;e.attack=e.telegraph+.26}else{const speed=e.speed*(e.type==='wisp'?(1+.12*Math.sin(now()*3+e.seed)):1);e.x+=dx/d*speed*dt;e.y+=dy/d*speed*dt}}if(e.attack>0&&e.telegraph<=0&&e.attack<.22&&d<(e.type==='guardian'?115:58))hurtPlayer(e.damage,e.type)}}
function updateWeather(dt){worldTime=(worldTime+dt*.11)%24;const cycle=Math.floor(worldTime/4)%3;weather=player.x>2860?(cycle===0?'Mist':cycle===1?'Drizzle':'Clear'):(cycle===2?'Light Rain':'Clear');for(const p of motes){p.a+=dt*.5;p.y-=dt*p.s;if(p.y<0)p.y=WORLD.h;p.x+=Math.sin(p.a)*dt*4}}
function lerpAngle(a,b,t){const d=Math.atan2(Math.sin(b-a),Math.cos(b-a));return a+d*clamp(t,0,1)}
function update(dt){
 if(paused||titleOpen||dialogOpen)return;
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show')}
 player.attack=Math.max(0,player.attack-dt);player.roll=Math.max(0,player.roll-dt);player.inv=Math.max(0,player.inv-dt);player.comboTimer=Math.max(0,player.comboTimer-dt);if(player.comboTimer<=0)player.combo=0;player.energy=clamp(player.energy+dt*(player.roll>0?3:17),0,player.maxEnergy);
 let dx=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0)+touch.x,dy=(keys.ArrowDown||keys.KeyS?1:0)-(keys.ArrowUp||keys.KeyW?1:0)+touch.y;
 if(player.focusTarget&&player.focusTarget.alive)player.angle=lerpAngle(player.angle,Math.atan2(player.focusTarget.y-player.y,player.focusTarget.x-player.x),dt*8);else player.focusTarget=null;
 const len=Math.hypot(dx,dy);if(len>0){dx/=len;dy/=len;if(!player.focusTarget)player.angle=Math.atan2(dy,dx);const sp=player.speed*(player.roll>0?2.35:1),nx=clamp(player.x+dx*sp*dt,20,WORLD.w-20),ny=clamp(player.y+dy*sp*dt,20,WORLD.h-20);if(!blocked(nx,player.y))player.x=nx;if(!blocked(player.x,ny))player.y=ny}
 discoverDistrict(districtAt(player.x,player.y));if(state.stage===2&&player.x>2868){setStage(3,'Whispering Woods entered');player.checkpoint={x:2900,y:590}}
 updateNPCs(dt);updateEnemies(dt);updateWeather(dt);
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.08,dt);p.vy*=Math.pow(.08,dt);p.t-=dt;if(p.t<=0)particles.splice(i,1)}
 camera.x=lerp(camera.x,player.x+camera.lookX,1-Math.pow(.001,dt));camera.y=lerp(camera.y,player.y+camera.lookY,1-Math.pow(.001,dt));autosaveTimer+=dt;if(autosaveTimer>8){autosaveTimer=0;saveState()}updateUI()
}
function updateUI(){const d=districtAt(player.x,player.y),hour=Math.floor(worldTime)%24,part=hour<6?'Night':hour<12?'Morning':hour<18?'Afternoon':'Evening';ui.district.textContent=d.name;ui.world.textContent=`${weather} • ${part}`;ui.quest.textContent=currentStep().title;ui.objective.textContent=currentStep().text;ui.distance.textContent=`${objectiveDistance()}m`;ui.rupees.textContent=state.rupees||0;ui.energy.style.width=`${player.energy}%`;const t=targetPoint(),ang=Math.atan2(t.y-player.y,t.x-player.x)+Math.PI/2;ui.arrow.style.transform=`rotate(${ang}rad)`;ui.hearts.replaceChildren();for(let i=0;i<player.maxHp;i++){const s=document.createElement('span');s.className='heart'+(i>=player.hp?' empty':'');s.textContent='♥';ui.hearts.appendChild(s)}}

function sx(x){return(x-camera.x)*camera.zoom+innerWidth/2}function sy(y){return(y-camera.y)*camera.zoom+innerHeight/2}function visible(x,y,p=140){const X=sx(x),Y=sy(y);return X>-p&&Y>-p&&X<innerWidth+p&&Y<innerHeight+p}
function fillRect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(sx(x),sy(y),w*camera.zoom,h*camera.zoom)}function strokeRect(x,y,w,h,c,l=1){ctx.strokeStyle=c;ctx.lineWidth=l;ctx.strokeRect(sx(x),sy(y),w*camera.zoom,h*camera.zoom)}function circle(x,y,r,c){if(!visible(x,y,r))return;ctx.beginPath();ctx.arc(sx(x),sy(y),r*camera.zoom,0,TAU);ctx.fillStyle=c;ctx.fill()}
function label(text,x,y,size=12,c='#fff'){if(!visible(x,y,120))return;ctx.font=`700 ${Math.max(9,size*camera.zoom)}px Georgia,serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#02070ad9';ctx.fillText(text,sx(x)+2,sy(y)+2);ctx.fillStyle=c;ctx.fillText(text,sx(x),sy(y))}
function shade(hex,amt){const n=parseInt(hex.slice(1),16),r=clamp((n>>16)+amt,0,255),g=clamp((n>>8&255)+amt,0,255),b=clamp((n&255)+amt,0,255);return`rgb(${r},${g},${b})`}
function drawGround(){const night=clamp(Math.cos((worldTime-2)/24*TAU)*.62,0,.62);ctx.fillStyle=`rgb(${Math.round(12-night*8)},${Math.round(26-night*14)},${Math.round(37-night*18)})`;ctx.fillRect(0,0,innerWidth,innerHeight);for(const d of districts){if(!visible(d.x+d.w/2,d.y+d.h/2,Math.max(d.w,d.h)))continue;fillRect(d.x,d.y,d.w,d.h,d.color);ctx.globalAlpha=.12;for(let x=d.x;x<d.x+d.w;x+=80)for(let y=d.y;y<d.y+d.h;y+=80)circle(x+20,y+20,2,d.accent);ctx.globalAlpha=1}for(const path of paths){ctx.strokeStyle='#8a7758';ctx.lineWidth=44*camera.zoom;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();path.forEach((p,i)=>i?ctx.lineTo(sx(p[0]),sy(p[1])):ctx.moveTo(sx(p[0]),sy(p[1])));ctx.stroke();ctx.strokeStyle='#d9bd7866';ctx.lineWidth=2*camera.zoom;ctx.setLineDash([10*camera.zoom,13*camera.zoom]);ctx.stroke();ctx.setLineDash([])}ctx.strokeStyle='#216b7e';ctx.lineWidth=50*camera.zoom;ctx.beginPath();ctx.moveTo(sx(1530),sy(650));ctx.lineTo(sx(1530),sy(1040));ctx.stroke();ctx.strokeStyle='#65dbef44';ctx.lineWidth=5*camera.zoom;ctx.stroke();ctx.strokeStyle='#171718';ctx.lineWidth=20*camera.zoom;ctx.beginPath();ctx.moveTo(sx(820),sy(1810));ctx.lineTo(sx(1400),sy(1810));ctx.stroke();ctx.strokeStyle='#d3a65d';ctx.lineWidth=3*camera.zoom;ctx.setLineDash([6*camera.zoom,10*camera.zoom]);ctx.stroke();ctx.setLineDash([])}
function drawBuilding(b){if(!visible(b.x+b.w/2,b.y+b.h/2,b.w))return;const z=camera.zoom,X=sx(b.x),Y=sy(b.y),w=b.w*z,h=b.h*z,d=b.hgt*z*.46;ctx.fillStyle='#02070a66';ctx.beginPath();ctx.moveTo(X+14*z,Y+h+12*z);ctx.lineTo(X+w+30*z,Y+h-8*z);ctx.lineTo(X+w+30*z,Y+h+d*.55);ctx.lineTo(X+14*z,Y+h+d*.75);ctx.closePath();ctx.fill();ctx.fillStyle=b.roof;ctx.fillRect(X,Y,w,h);ctx.fillStyle='#10202b';ctx.beginPath();ctx.moveTo(X,Y+h);ctx.lineTo(X+w,Y+h);ctx.lineTo(X+w+d*.35,Y+h+d);ctx.lineTo(X+d*.35,Y+h+d);ctx.closePath();ctx.fill();ctx.fillStyle=shade(b.roof,-20);ctx.beginPath();ctx.moveTo(X+w,Y);ctx.lineTo(X+w,Y+h);ctx.lineTo(X+w+d*.35,Y+h+d);ctx.lineTo(X+w+d*.35,Y+d);ctx.closePath();ctx.fill();ctx.fillStyle=shade(b.roof,18);ctx.beginPath();ctx.moveTo(X,Y);ctx.lineTo(X+w,Y);ctx.lineTo(X+w+d*.35,Y+d);ctx.lineTo(X+d*.35,Y+d);ctx.closePath();ctx.fill();ctx.strokeStyle=b.trim;ctx.lineWidth=2;ctx.strokeRect(X,Y,w,h);for(let wx=X+18*z;wx<X+w-12*z;wx+=34*z){ctx.fillStyle=b.trim;ctx.globalAlpha=.8;ctx.fillRect(wx,Y+h+18*z,12*z,18*z);ctx.globalAlpha=1}label(b.label,b.x+b.w/2,b.y-18,12,b.trim)}
function drawLandmarks(){circle(360,1060,55,'#183245');circle(360,1060,34,'#4bdff5');circle(360,1060,16,'#fff6b7');ctx.strokeStyle='#b3f5ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx(360),sy(985));ctx.lineTo(sx(334),sy(1052));ctx.lineTo(sx(360),sy(1085));ctx.lineTo(sx(386),sy(1052));ctx.closePath();ctx.stroke();fillRect(2610,700,42,500,'#27323a');fillRect(2810,700,42,500,'#27323a');fillRect(2610,700,242,42,'#b38947');strokeRect(2610,700,242,500,'#e8ca77',2);label('ANCIENT FRONTIER',2730,670,13,'#ffe49a');if(state.lantern){circle(2730,745,18,'#7ceaff');ctx.globalAlpha=.22;circle(2730,745,56,'#7ceaff');ctx.globalAlpha=1}[landmarks.shrineA,landmarks.shrineB].forEach((s,i)=>{const on=state.shrines[i];circle(s.x,s.y,34,on?'#52d8b0':'#344b44');circle(s.x,s.y,18,on?'#d5fff3':'#6b7d75');ctx.globalAlpha=on?.25:.08;circle(s.x,s.y,72,on?'#7fffe0':'#93a79e');ctx.globalAlpha=1;label(on?'AWAKENED SHRINE':'FOREST SHRINE',s.x,s.y-58,10,on?'#a9ffe4':'#ccd7d0')});circle(3050,1745,72,'#4b2d1d');circle(3050,1657,104,state.stage>=6?'#2f7b43':'#285436');circle(2982,1683,72,'#2a6b3d');circle(3118,1683,72,'#285f39');circle(3028,1739,8,'#17110d');circle(3072,1739,8,'#17110d');ctx.strokeStyle='#1b100b';ctx.lineWidth=5;ctx.beginPath();ctx.arc(sx(3050),sy(1763),24*camera.zoom,.1,Math.PI-.1);ctx.stroke();label('THE GREAT TREE',3050,1525,14,state.stage>=6?'#c9ffd3':'#c8d8c9')}
function drawTree(t){if(!visible(t.x,t.y,45))return;circle(t.x,t.y,t.r*.35,'#4c3320');circle(t.x,t.y-t.r*.45,t.r,t.shade>.5?'#1e5534':'#17452c');circle(t.x-t.r*.45,t.y-t.r*.52,t.r*.62,'#2f7042')}
function drawLamp(l){if(!visible(l.x,l.y,40))return;fillRect(l.x-2,l.y,4,22,'#2a2521');circle(l.x,l.y-4,6,l.color);ctx.globalAlpha=.13;circle(l.x,l.y-4,22,l.color);ctx.globalAlpha=1}
function drawPerson(p,important=false){if(!visible(p.x,p.y,45))return;circle(p.x,p.y,11,p.c);circle(p.x,p.y-13,7,'#dfb783');fillRect(p.x-5,p.y+8,10,11,shade(p.c,-25));if(important)label(p.name,p.x,p.y-34,10,'#ffe389')}
function drawEnemy(e){if(!e.alive||!visible(e.x,e.y,90)||e.type==='guardian'&&state.stage<5)return;const pulse=1+Math.sin(now()*4+e.seed)*.08;circle(e.x,e.y,e.r*pulse,e.hitFlash>0?'#fff':e.c);circle(e.x,e.y,e.r*.42,'#231129');ctx.strokeStyle=e.telegraph>0?'#ffdd77':'#f5a0ff';ctx.lineWidth=e.telegraph>0?5:2;ctx.beginPath();ctx.arc(sx(e.x),sy(e.y),(e.r+9+Math.sin(now()*5)*3)*camera.zoom,0,TAU);ctx.stroke();if(e.hp<e.maxHp||e.type==='guardian'){const w=(e.type==='guardian'?110:46)*camera.zoom,x=sx(e.x)-w/2,y=sy(e.y)-(e.r+22)*camera.zoom;ctx.fillStyle='#150b12';ctx.fillRect(x,y,w,6);ctx.fillStyle=e.type==='guardian'?'#ff668e':'#d972df';ctx.fillRect(x,y,w*(e.hp/e.maxHp),6)}if(e.type==='guardian')label('GROVE GUARDIAN',e.x,e.y-72,12,'#ff9fc0')}
function drawPlayer(){const X=sx(player.x),Y=sy(player.y),z=camera.zoom;ctx.save();ctx.translate(X,Y);ctx.rotate(player.angle);if(player.focusTarget){ctx.strokeStyle='#ffdf78';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,26*z,0,TAU);ctx.stroke()}ctx.fillStyle=player.inv>0&&Math.floor(player.inv*14)%2?'#fff':'#f2d173';ctx.beginPath();ctx.arc(0,0,player.r*z,0,TAU);ctx.fill();ctx.fillStyle='#19364c';ctx.beginPath();ctx.moveTo(20*z,0);ctx.lineTo(-9*z,-11*z);ctx.lineTo(-9*z,11*z);ctx.closePath();ctx.fill();ctx.fillStyle='#7de4f3';ctx.beginPath();ctx.arc(-3*z,-3*z,4*z,0,TAU);ctx.fill();if(player.attack>0){ctx.strokeStyle=player.combo===3?'#7ef8ff':'#fff2a6';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,(50+player.combo*5)*z,-.9,.9);ctx.stroke()}ctx.restore();if(state.lantern){circle(player.x-14,player.y+12,5,'#85eaff');ctx.globalAlpha=.13;circle(player.x-14,player.y+12,24,'#85eaff');ctx.globalAlpha=1}}
function drawAtmosphere(){if(weather==='Light Rain'||weather==='Drizzle'){ctx.strokeStyle=weather==='Drizzle'?'#a7d8e755':'#a7d8e788';ctx.lineWidth=1;for(const r of rain.slice(0,quality==='high'?130:60)){const x=(r.x*innerWidth+now()*80*r.s)%innerWidth,y=(r.y*innerHeight+now()*190*r.s)%innerHeight;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-5,y+13);ctx.stroke()}}if(player.x>2860)for(const m of motes.slice(0,quality==='high'?55:24))circle(m.x,m.y,2.5,'#d8ffe3');const night=clamp(Math.cos((worldTime-2)/24*TAU)*.72,0,.72);if(night>0){ctx.fillStyle=`rgba(2,8,18,${night})`;ctx.fillRect(0,0,innerWidth,innerHeight);ctx.globalCompositeOperation='lighter';for(const l of lamps){if(!visible(l.x,l.y,80))continue;const g=ctx.createRadialGradient(sx(l.x),sy(l.y),0,sx(l.x),sy(l.y),44*camera.zoom);g.addColorStop(0,l.color+'88');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx(l.x),sy(l.y),44*camera.zoom,0,TAU);ctx.fill()}ctx.globalCompositeOperation='source-over'}}
function drawParticles(){for(const p of particles){ctx.globalAlpha=clamp(p.t/p.max,0,1);circle(p.x,p.y,p.size,p.c)}ctx.globalAlpha=1}
function drawDistrictTitles(){for(const d of districts){if(!visible(d.x+d.w/2,d.y+45,400))continue;label(d.name.toUpperCase(),d.x+d.w/2,d.y+50,14,d.accent);ctx.strokeStyle=d.accent+'55';ctx.lineWidth=1;ctx.strokeRect(sx(d.x+12),sy(d.y+12),(d.w-24)*camera.zoom,(d.h-24)*camera.zoom)}}
function draw(){ctx.clearRect(0,0,innerWidth,innerHeight);ctx.save();if(shake>0){ctx.translate((rand()-.5)*shake,(rand()-.5)*shake);shake*=.82}drawGround();drawDistrictTitles();for(const b of buildings)drawBuilding(b);drawLandmarks();for(const t of trees)drawTree(t);for(const l of lamps)drawLamp(l);for(const c of civilians)drawPerson(c);for(const n of npcs)drawPerson(n,true);for(const e of enemies)drawEnemy(e);drawParticles();drawPlayer();drawAtmosphere();ctx.restore();drawMini()}
function drawMini(){const w=mini.clientWidth||150,h=mini.clientHeight||95;mctx.clearRect(0,0,w,h);for(const d of districts){mctx.fillStyle=state.discovered.includes(d.id)?d.color:'#10171c';mctx.fillRect(d.x/WORLD.w*w,d.y/WORLD.h*h,d.w/WORLD.w*w,d.h/WORLD.h*h)}mctx.strokeStyle='#d9bc6b';mctx.strokeRect(.5,.5,w-1,h-1);const t=targetPoint();mctx.fillStyle='#6eeaff';mctx.beginPath();mctx.arc(t.x/WORLD.w*w,t.y/WORLD.h*h,3,0,TAU);mctx.fill();mctx.fillStyle='#ffe270';mctx.beginPath();mctx.arc(player.x/WORLD.w*w,player.y/WORLD.h*h,4,0,TAU);mctx.fill();mctx.fillStyle='#ef66e4';for(const e of enemies)if(e.alive)mctx.fillRect(e.x/WORLD.w*w-1.5,e.y/WORLD.h*h-1.5,3,3)}
function drawWorldMap(){const w=worldMap.clientWidth||1200,h=worldMap.clientHeight||700,mapDpr=Math.min(2,devicePixelRatio||1);worldMap.width=Math.round(w*mapDpr);worldMap.height=Math.round(h*mapDpr);mapCtx.setTransform(mapDpr,0,0,mapDpr,0,0);mapCtx.clearRect(0,0,w,h);const s=Math.min((w-30)/WORLD.w,(h-30)/WORLD.h),ox=(w-WORLD.w*s)/2,oy=(h-WORLD.h*s)/2;for(const d of districts){mapCtx.fillStyle=state.discovered.includes(d.id)?d.color:'#10171c';mapCtx.fillRect(ox+d.x*s,oy+d.y*s,d.w*s,d.h*s);mapCtx.strokeStyle=state.discovered.includes(d.id)?d.accent+'88':'#303940';mapCtx.strokeRect(ox+d.x*s,oy+d.y*s,d.w*s,d.h*s);if(state.discovered.includes(d.id)){mapCtx.fillStyle=d.accent;mapCtx.font='700 11px system-ui';mapCtx.textAlign='center';mapCtx.fillText(d.name,ox+(d.x+d.w/2)*s,oy+(d.y+28)*s)}}for(const e of enemies)if(e.alive){mapCtx.fillStyle='#e85be9';mapCtx.beginPath();mapCtx.arc(ox+e.x*s,oy+e.y*s,4,0,TAU);mapCtx.fill()}const t=targetPoint();mapCtx.fillStyle='#6eeaff';mapCtx.beginPath();mapCtx.arc(ox+t.x*s,oy+t.y*s,6,0,TAU);mapCtx.fill();mapCtx.fillStyle='#ffe270';mapCtx.beginPath();mapCtx.arc(ox+player.x*s,oy+player.y*s,7,0,TAU);mapCtx.fill()}
function promptText(){const n=npcs.find(n=>Math.hypot(n.x-player.x,n.y-player.y)<74);if(n)return`A • Talk to ${n.name}`;if(Math.hypot(player.x-3010,player.y-330)<72||Math.hypot(player.x-3050,player.y-900)<72)return'A • Activate shrine';if(Math.hypot(player.x-3050,player.y-1745)<120)return'A • Speak with the Great Tree';if(Math.hypot(player.x-360,player.y-1060)<95&&state.stage===7)return'A • Report to Central Plaza';return''}
function updatePrompt(){const p=promptText();ui.prompt.textContent=p;ui.prompt.style.display=p?'block':'none'}
function frame(t){const dt=Math.min(.034,(t-lastTime)/1000);lastTime=t;update(dt);updatePrompt();draw();requestAnimationFrame(frame)}

addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Space')attack();if(e.code==='ShiftLeft'||e.code==='ShiftRight')roll();if(e.code==='KeyE')interact();if(e.code==='KeyQ')focus();if(e.code==='KeyM')mapOpen?closeMap():openMap();if(e.code==='Escape'){if(mapOpen)closeMap();else if(paused)resumeGame();else pauseGame()}});addEventListener('keyup',e=>keys[e.code]=false);document.addEventListener('visibilitychange',()=>{if(document.hidden&&!titleOpen&&!paused)pauseGame()});
ui.dialog.addEventListener('click',nextDialogue);$('pauseBtn').addEventListener('click',pauseGame);$('resumeBtn').addEventListener('click',resumeGame);$('openMapBtn').addEventListener('click',()=>{ui.pause.classList.remove('active');openMap()});$('closeMapBtn').addEventListener('click',closeMap);$('restartCheckpointBtn').addEventListener('click',returnCheckpoint);$('resetBtn').addEventListener('click',()=>{if(confirm('Reset all Forest Frontier progress?'))resetSave()});$('continueBtn').addEventListener('click',()=>startGame(false));$('newBtn').addEventListener('click',()=>startGame(true));$('continueWorldBtn').addEventListener('click',()=>{ui.complete.classList.remove('active');paused=false});$('soundBtn').addEventListener('click',()=>{state.sound=!state.sound;$('soundBtn').textContent=`Sound: ${state.sound?'On':'Off'}`;saveState();if(state.sound){initAudio();tone(440,.1)}});$('qualityBtn').addEventListener('click',()=>{quality=quality==='high'?'battery':'high';state.quality=quality;$('qualityBtn').textContent=`Quality: ${quality==='high'?'High':'Battery'}`;resize();saveState()});$('fullscreenBtn').addEventListener('click',()=>document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.());$('attack').addEventListener('pointerdown',e=>{e.preventDefault();attack()});$('roll').addEventListener('pointerdown',e=>{e.preventDefault();roll()});$('interact').addEventListener('pointerdown',e=>{e.preventDefault();interact()});$('focus').addEventListener('pointerdown',e=>{e.preventDefault();focus()});$('mapBtn').addEventListener('pointerdown',e=>{e.preventDefault();openMap()});
const stick=$('stick'),knob=$('knob');let stickId=null;function moveStick(e){const r=stick.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),max=r.width*.31,m=Math.hypot(x,y),k=Math.min(1,max/(m||1));touch.x=x/max*k;touch.y=y/max*k;knob.style.transform=`translate(${x*k}px,${y*k}px)`}stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;stick.setPointerCapture(stickId);moveStick(e)});stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e)});function endStick(e){if(e.pointerId!==stickId)return;stickId=null;touch.x=touch.y=0;knob.style.transform='translate(0,0)'}stick.addEventListener('pointerup',endStick);stick.addEventListener('pointercancel',endStick);
let camId=null,camStart=null;$('cameraPad').addEventListener('pointerdown',e=>{camId=e.pointerId;camStart={x:e.clientX,y:e.clientY,lx:camera.lookX,ly:camera.lookY};$('cameraPad').setPointerCapture(camId)});$('cameraPad').addEventListener('pointermove',e=>{if(e.pointerId!==camId||!camStart)return;camera.lookX=clamp(camStart.lx-(e.clientX-camStart.x)/camera.zoom,-260,260);camera.lookY=clamp(camStart.ly-(e.clientY-camStart.y)/camera.zoom,-180,180)});function endCam(e){if(e.pointerId!==camId)return;camId=null;camStart=null;setTimeout(()=>{camera.lookX*=.25;camera.lookY*=.25},160)}$('cameraPad').addEventListener('pointerup',endCam);$('cameraPad').addEventListener('pointercancel',endCam);
$('soundBtn').textContent=`Sound: ${state.sound?'On':'Off'}`;$('qualityBtn').textContent=`Quality: ${quality==='high'?'High':'Battery'}`;if(!storageGet())$('continueBtn').style.display='none';updateUI();requestAnimationFrame(frame);if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
