(()=>{
'use strict';
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d'),mini=document.getElementById('mini'),mctx=mini.getContext('2d');
const ui={district:document.getElementById('district'),world:document.getElementById('worldState'),quest:document.getElementById('questShort'),objective:document.getElementById('objectiveText'),hearts:document.getElementById('hearts'),prompt:document.getElementById('prompt'),toast:document.getElementById('toast'),dialog:document.getElementById('dialog'),dialogText:document.getElementById('dialogText')};
const W=2400,H=1200,keys={},touch={x:0,y:0},camera={x:0,y:0,zoom:1},SAVE='hub-forest-direct-v1';
let last=performance.now(),time=8.4,toastTimer=0,dialogOpen=false,mapOpen=false,shake=0;
const player={x:330,y:610,r:17,speed:215,hp:5,maxHp:5,angle:0,attack:0,roll:0,inv:0,rupees:0,checkpoint:{x:330,y:610}};
const state=Object.assign({stage:0,kills:0,complete:false},load());
const districts=[
 ['Central Plaza',0,0,520,1200],['Market Row',520,0,330,520],['Greenroof Gardens',520,520,330,680],['Archive Tower',850,0,250,560],['Old Rail Station',850,560,250,640],['Ancient Frontier',1100,0,220,1200],['Whispering Woods',1320,0,520,1200],['Sacred Grove',1840,0,560,1200]
];
const buildings=[
 {x:180,y:210,w:180,h:120,n:'Council Hall',c:'#263b52'},{x:160,y:840,w:210,h:125,n:'Skybridge Gate',c:'#203646'},
 {x:590,y:120,w:190,h:130,n:'Market Hall',c:'#59402d'},{x:590,y:690,w:190,h:145,n:'Greenroof Conservatory',c:'#294b3b'},
 {x:900,y:185,w:150,h:210,n:'Archive Tower',c:'#263d59'},{x:885,y:755,w:180,h:150,n:'Old Rail Station',c:'#45382f'}
];
const npcs=[
 {name:'Mira',role:'Archivist',x:975,y:430,home:[975,430],path:[[975,430],[930,500],[1020,510]],i:0,c:'#f0c56c',important:true},
 {name:'Juno',role:'Market Courier',x:610,y:420,home:[610,420],path:[[610,420],[760,350],[700,520],[555,450]],i:0,c:'#7ad9ef'},
 {name:'Brann',role:'Rail Smith',x:980,y:910,home:[980,910],path:[[980,910],[900,980],[1030,1030]],i:0,c:'#e2875d'},
 {name:'Maeve',role:'Garden Keeper',x:700,y:760,home:[700,760],path:[[700,760],[590,930],[770,1040],[810,800]],i:0,c:'#8ce08d'},
 {name:'Blank',role:'Wanderer',x:380,y:420,home:[380,420],path:[[380,420],[440,690],[260,760],[270,340]],i:0,c:'#d7c6ff'}
];
const enemies=[
 {x:1510,y:330,hp:3,alive:true,c:'#b755d6'},{x:1680,y:780,hp:3,alive:true,c:'#c44fd9'},{x:1970,y:430,hp:4,alive:true,c:'#d74891'},{x:2110,y:860,hp:4,alive:true,c:'#a84be0'}
];
const trees=[];for(let x=1360;x<2370;x+=85)for(let y=45;y<1170;y+=90){if(Math.random()<.72&&!(x>2140&&y>420&&y<780))trees.push({x:x+(Math.random()-.5)*45,y:y+(Math.random()-.5)*50,r:18+Math.random()*14});}
const particles=[];
function load(){try{return JSON.parse(localStorage.getItem(SAVE)||'{}')}catch{return{}}}function save(){try{localStorage.setItem(SAVE,JSON.stringify(state))}catch{}}
function resize(){const d=Math.min(2,devicePixelRatio||1);canvas.width=innerWidth*d;canvas.height=innerHeight*d;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(d,0,0,d,0,0);mini.width=mini.clientWidth*d;mini.height=mini.clientHeight*d;mctx.setTransform(d,0,0,d,0,0);camera.zoom=Math.max(.62,Math.min(1.12,innerWidth/1000));}
addEventListener('resize',resize);resize();
function districtAt(x,y){for(const d of districts)if(x>=d[1]&&x<d[1]+d[3]&&y>=d[2]&&y<d[2]+d[4])return d[0];return'Frontier Road'}
function objective(){if(state.complete)return'The frontier is restored. Explore The Hub and the Sacred Grove.';if(state.stage===0)return'Find Mira the Archivist at Archive Tower and interact.';if(state.stage===1)return'Cross the Ancient Frontier into Whispering Woods.';if(state.stage===2)return`Defeat corrupted wisps in the forest (${state.kills}/3).`;if(state.stage===3)return'Reach the Great Tree in the Sacred Grove and interact.';return'Explore the living world.'}
function updateUI(){ui.district.textContent=districtAt(player.x,player.y);const hour=Math.floor(time)%24,part=hour<6?'Night':hour<12?'Morning':hour<18?'Afternoon':'Evening';ui.world.textContent=`${player.x>1320?'Misty':'Clear'} • ${part}`;ui.objective.textContent=objective();ui.quest.textContent=state.complete?'Frontier restored':state.stage===0?'Meet the Archivist':state.stage===1?'Enter the forest':state.stage===2?`Wisps ${state.kills}/3`:'Find the Great Tree';ui.hearts.innerHTML='';for(let i=0;i<player.maxHp;i++){const s=document.createElement('span');s.className='heart'+(i>=player.hp?' empty':'');s.textContent='♥';ui.hearts.appendChild(s)}}
function toast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');toastTimer=2.1}
function dialog(msg){dialogOpen=true;ui.dialogText.textContent=msg;ui.dialog.style.display='block';touch.x=touch.y=0}
function closeDialog(){dialogOpen=false;ui.dialog.style.display='none'}
function near(x,y,r=70){return Math.hypot(player.x-x,player.y-y)<r}
function interact(){if(dialogOpen){closeDialog();return}const mira=npcs[0];if(near(mira.x,mira.y,75)){if(state.stage===0){state.stage=1;save();dialog('Mira: The forest beyond the Ancient Frontier is bleeding strange light. Cross the old gate, cleanse three corrupted wisps, then speak with the Great Tree. The city will react to what you restore.')}else dialog('Mira: The Archive is recording every change beyond the gate. The Hub remembers what you do.');return}if(near(2265,600,115)){if(state.stage>=3&&!state.complete){state.complete=true;state.stage=4;player.rupees+=50;save();dialog('Great Tree: The frontier breathes again. Your actions now echo through The Hub. New expeditions, merchants, and citizens will arrive as this world grows.')}else if(state.stage<3)dialog('Great Tree: The corruption still moves through my roots. Cleanse the wisps first.');else dialog('Great Tree: Wander freely, child of the city and forest.');return}for(const n of npcs.slice(1))if(near(n.x,n.y,65)){dialog(`${n.name}, ${n.role}: ${n.role.includes('Market')?'Trade is picking up since the frontier opened.':n.role.includes('Garden')?'The forest seeds are changing our rooftop gardens.':n.role.includes('Rail')?'Bring me relic metal and I will forge something worth carrying.':'The city keeps moving, even when you are away.'}`);return}}
function attack(){if(dialogOpen||player.attack>0)return;player.attack=.28;for(const e of enemies){if(!e.alive)continue;const d=Math.hypot(e.x-player.x,e.y-player.y);if(d<78){e.hp--;shake=5;particles.push(...burst(e.x,e.y,e.c,9));if(e.hp<=0){e.alive=false;state.kills++;player.rupees+=8;toast('Corrupted wisp cleansed +8');if(state.stage===2&&state.kills>=3){state.stage=3;toast('The path to the Great Tree is open');}save()}}}}
function roll(){if(dialogOpen||player.roll>0)return;player.roll=.42;player.inv=.55}
function burst(x,y,c,n){return Array.from({length:n},()=>({x,y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,t:.5+Math.random()*.4,c}))}
function damage(){if(player.inv>0)return;player.hp--;player.inv=1;shake=9;toast('The corruption struck you');if(player.hp<=0){player.hp=player.maxHp;player.x=player.checkpoint.x;player.y=player.checkpoint.y;toast('Returned to the last safe checkpoint')}}
function collide(nx,ny){for(const b of buildings){if(nx>b.x-20&&nx<b.x+b.w+20&&ny>b.y-20&&ny<b.y+b.h+20)return true}for(const t of trees)if(Math.hypot(nx-t.x,ny-t.y)<t.r+10)return true;if(Math.hypot(nx-2265,ny-600)<88)return true;return false}
function update(dt){time=(time+dt*.28)%24;if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show')}if(player.attack>0)player.attack-=dt;if(player.roll>0)player.roll-=dt;if(player.inv>0)player.inv-=dt;if(dialogOpen){updateUI();return}
 let dx=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0)+touch.x,dy=(keys.ArrowDown||keys.KeyS?1:0)-(keys.ArrowUp||keys.KeyW?1:0)+touch.y;const len=Math.hypot(dx,dy);if(len>0){dx/=len;dy/=len;player.angle=Math.atan2(dy,dx);const sp=player.speed*(player.roll>0?2.6:1);const nx=Math.max(20,Math.min(W-20,player.x+dx*sp*dt)),ny=Math.max(20,Math.min(H-20,player.y+dy*sp*dt));if(!collide(nx,player.y))player.x=nx;if(!collide(player.x,ny))player.y=ny}
 if(state.stage===1&&player.x>1340){state.stage=2;player.checkpoint={x:1390,y:600};save();toast('Whispering Woods discovered • checkpoint saved')}
 for(const n of npcs){const p=n.path[n.i],vx=p[0]-n.x,vy=p[1]-n.y,d=Math.hypot(vx,vy);if(d<7)n.i=(n.i+1)%n.path.length;else{n.x+=vx/d*22*dt;n.y+=vy/d*22*dt}}
 for(const e of enemies){if(!e.alive)continue;const d=Math.hypot(player.x-e.x,player.y-e.y);if(d<250){e.x+=(player.x-e.x)/d*44*dt;e.y+=(player.y-e.y)/d*44*dt}if(d<32)damage()}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy*=.94;p.t-=dt;if(p.t<=0)particles.splice(i,1)}
 camera.x+=(player.x-camera.x)*Math.min(1,dt*6);camera.y+=(player.y-camera.y)*Math.min(1,dt*6);updateUI()}
function worldToScreen(x,y){const z=camera.zoom;return{x:(x-camera.x)*z+innerWidth/2,y:(y-camera.y)*z+innerHeight/2}}
function rect(x,y,w,h,c,stroke){const p=worldToScreen(x,y),z=camera.zoom;ctx.fillStyle=c;ctx.fillRect(p.x,p.y,w*z,h*z);if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.strokeRect(p.x,p.y,w*z,h*z)}}
function circle(x,y,r,c){const p=worldToScreen(x,y);ctx.beginPath();ctx.arc(p.x,p.y,r*camera.zoom,0,Math.PI*2);ctx.fillStyle=c;ctx.fill()}
function label(text,x,y,size=13,c='#fff'){const p=worldToScreen(x,y);ctx.font=`700 ${size*camera.zoom}px system-ui`;ctx.textAlign='center';ctx.fillStyle='#000b';ctx.fillText(text,p.x+2,p.y+2);ctx.fillStyle=c;ctx.fillText(text,p.x,p.y)}
function draw(){const z=camera.zoom;ctx.clearRect(0,0,innerWidth,innerHeight);const night=Math.max(0,Math.cos((time-2)/24*Math.PI*2)*.55);ctx.fillStyle=`rgb(${20-night*16},${48-night*26},${52-night*24})`;ctx.fillRect(0,0,innerWidth,innerHeight);
 rect(0,0,1100,H,'#213b49');rect(1100,0,220,H,'#5d4c35');rect(1320,0,520,H,'#285438');rect(1840,0,560,H,'#1e4b32');
 for(const [x,y,w,h] of [[0,560,1320,90],[440,0,90,1200],[810,0,70,1200],[1100,0,220,1200],[1320,555,1080,90]])rect(x,y,w,h,'#756a4e');
 rect(1500,0,105,H,'#236b7b');rect(1500,520,105,150,'#7b5733');for(let i=0;i<8;i++)rect(1505,526+i*18,95,11,i%2?'#8a653c':'#6e4d30');
 for(const b of buildings){rect(b.x,b.y,b.w,b.h,b.c,'#d7bd6a');rect(b.x+18,b.y+18,b.w-36,16,'#6bdcf0');label(b.n,b.x+b.w/2,b.y-10,12,'#f5df9e')}
 circle(390,610,52,'#1d2d3b');circle(390,610,31,'#62e0f2');circle(390,610,13,'#fff4a9');
 label('CENTRAL PLAZA',270,110,16,'#f0cf78');label('MARKET ROW',680,70,15,'#f0cf78');label('GREENROOF GARDENS',680,1140,15,'#b6e89c');label('ANCIENT FRONTIER',1210,90,15,'#f0cf78');label('WHISPERING WOODS',1580,90,15,'#c6e3ba');label('SACRED GROVE',2120,90,15,'#d7f0c9');
 for(const t of trees){circle(t.x,t.y,t.r*.42,'#49311f');circle(t.x,t.y-t.r*.55,t.r,'#174329');circle(t.x-t.r*.35,t.y-t.r*.6,t.r*.62,'#2f6a3c')}
 rect(1125,420,36,360,'#27343e','#e5c56c');rect(1258,420,36,360,'#27343e','#e5c56c');rect(1125,420,169,32,'#bd9142');label('ANCIENT FRONTIER',1210,405,11,'#ffe7a5');
 circle(2265,600,92,'#4e2d1a');circle(2265,500,130,'#1e6338');circle(2185,545,88,'#2d7c46');circle(2345,545,88,'#275f3a');circle(2228,585,9,'#12100e');circle(2302,585,9,'#12100e');ctx.strokeStyle='#160e08';ctx.lineWidth=5;const gp=worldToScreen(2265,625);ctx.beginPath();ctx.arc(gp.x,gp.y,30*z,.1,Math.PI-.1);ctx.stroke();label('THE GREAT TREE',2265,390,15,'#f4e5ac');
 for(const n of npcs){circle(n.x,n.y,15,n.c);circle(n.x,n.y-17,10,'#e3b884');label(n.name,n.x,n.y-34,10,n.important?'#ffe187':'#dbeef1')}
 for(const e of enemies){if(!e.alive)continue;circle(e.x,e.y,17,e.c);circle(e.x,e.y,7,'#25112c');const p=worldToScreen(e.x,e.y);ctx.strokeStyle='#f6a6ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,23*z+Math.sin(performance.now()/180)*3,0,Math.PI*2);ctx.stroke()}
 for(const p of particles)circle(p.x,p.y,4,p.c);
 const pp=worldToScreen(player.x,player.y);ctx.save();ctx.translate(pp.x,pp.y);ctx.rotate(player.angle);ctx.fillStyle=player.inv>0&&Math.floor(player.inv*12)%2?'#fff':'#f2d173';ctx.beginPath();ctx.arc(0,0,player.r*z,0,Math.PI*2);ctx.fill();ctx.fillStyle='#19364c';ctx.beginPath();ctx.moveTo(17*z,0);ctx.lineTo(-8*z,-10*z);ctx.lineTo(-8*z,10*z);ctx.closePath();ctx.fill();if(player.attack>0){ctx.strokeStyle='#fff2a6';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,50*z,-.8,.8);ctx.stroke()}ctx.restore();
 if(mapOpen){ctx.fillStyle='#02090de6';ctx.fillRect(0,0,innerWidth,innerHeight);ctx.fillStyle='#f0cf78';ctx.font='32px Georgia';ctx.textAlign='center';ctx.fillText('THE HUB • FOREST FRONTIER',innerWidth/2,55);const scale=Math.min((innerWidth-70)/W,(innerHeight-130)/H),ox=(innerWidth-W*scale)/2,oy=90;ctx.fillStyle='#263e4d';ctx.fillRect(ox,oy,1100*scale,H*scale);ctx.fillStyle='#5d4c35';ctx.fillRect(ox+1100*scale,oy,220*scale,H*scale);ctx.fillStyle='#295a3a';ctx.fillRect(ox+1320*scale,oy,1080*scale,H*scale);ctx.fillStyle='#ffe47a';ctx.beginPath();ctx.arc(ox+player.x*scale,oy+player.y*scale,7,0,Math.PI*2);ctx.fill();ctx.font='13px system-ui';ctx.fillStyle='#fff';ctx.fillText('Tap M to close',innerWidth/2,innerHeight-25)}
 drawMini()}
function drawMini(){const w=mini.clientWidth,h=mini.clientHeight;mctx.clearRect(0,0,w,h);mctx.fillStyle='#28404d';mctx.fillRect(0,0,w*.46,h);mctx.fillStyle='#65543c';mctx.fillRect(w*.46,0,w*.1,h);mctx.fillStyle='#2d603d';mctx.fillRect(w*.56,0,w*.44,h);mctx.fillStyle='#f7dc72';mctx.beginPath();mctx.arc(player.x/W*w,player.y/H*h,4,0,Math.PI*2);mctx.fill();mctx.fillStyle='#d957d5';for(const e of enemies)if(e.alive)mctx.fillRect(e.x/W*w-2,e.y/H*h-2,4,4)}
function prompts(){let msg='';if(near(npcs[0].x,npcs[0].y,75))msg='Interact with Mira';else if(near(2265,600,115))msg='Speak with the Great Tree';else for(const n of npcs.slice(1))if(near(n.x,n.y,65))msg=`Talk to ${n.name}`;ui.prompt.textContent=msg;ui.prompt.style.display=msg?'block':'none'}
function frame(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);prompts();if(shake>0){camera.x+=(Math.random()-.5)*shake;camera.y+=(Math.random()-.5)*shake;shake*=.85}draw();requestAnimationFrame(frame)}
addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Space')attack();if(e.code==='ShiftLeft'||e.code==='ShiftRight')roll();if(e.code==='KeyE')interact();if(e.code==='KeyM')mapOpen=!mapOpen});addEventListener('keyup',e=>keys[e.code]=false);
ui.dialog.addEventListener('click',closeDialog);document.getElementById('attack').addEventListener('pointerdown',e=>{e.preventDefault();attack()});document.getElementById('roll').addEventListener('pointerdown',e=>{e.preventDefault();roll()});document.getElementById('interact').addEventListener('pointerdown',e=>{e.preventDefault();interact()});document.getElementById('mapBtn').addEventListener('pointerdown',e=>{e.preventDefault();mapOpen=!mapOpen});
const stick=document.getElementById('stick'),knob=document.getElementById('knob');let stickId=null;function moveStick(e){const r=stick.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),m=Math.hypot(x,y),max=r.width*.32,k=Math.min(1,max/(m||1));touch.x=x/max*k;touch.y=y/max*k;knob.style.transform=`translate(${x*k}px,${y*k}px)`}stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;stick.setPointerCapture(stickId);moveStick(e)});stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e)});function endStick(e){if(e.pointerId!==stickId)return;stickId=null;touch.x=touch.y=0;knob.style.transform='translate(0,0)'}stick.addEventListener('pointerup',endStick);stick.addEventListener('pointercancel',endStick);
state.kills=Math.max(0,state.kills||0);if(state.complete)state.stage=4;updateUI();requestAnimationFrame(frame);
})();
