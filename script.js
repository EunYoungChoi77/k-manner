const gameArea = document.getElementById('game-area');

const SFX = {
  ok: document.getElementById('sfx-ok'),
  no: document.getElementById('sfx-no')
};

function vibrate(ms=100){
  if(navigator.vibrate) navigator.vibrate(ms);
}

function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function timerStart(ms, fail){
  const bar = document.getElementById('timer');
  bar.style.transition='none';
  bar.style.width='100%';

  setTimeout(()=>{
    bar.style.transition=`width ${ms}ms linear`;
    bar.style.width='0%';
  },10);

  return setTimeout(fail, ms);
}

function cutscene(text, cb){
  const cut = document.getElementById('cut');
  document.getElementById('cut-text').innerText=text;
  cut.classList.remove('hidden');

  setTimeout(()=>{
    cut.classList.add('hidden');
    cb();
  },1000);
}

function getCharByStage(stage){
  return `assets/char${stage}.png`;
}

function createChar(src){
  const img=document.createElement('img');
  img.src=src;
  img.className='character';
  gameArea.appendChild(img);

  // 등장 애니메이션
  img.style.transform="translate(-50%,200px)";
  setTimeout(()=>{
    img.style.transform="translate(-50%,0)";
  },50);

  return img;
}

/* 애니메이션 */
function squash(el){
  el.style.transform="translateX(-50%) scale(1.2,0.8)";
  setTimeout(()=>{
    el.style.transform="translateX(-50%) scale(0.9,1.2)";
    setTimeout(()=>{
      el.style.transform="translateX(-50%) scale(1,1)";
    },100);
  },100);
}

class Game{
  constructor(){
    this.stage=1;
    this.base=4000;
  }

  time(){
    return this.base - this.stage*300;
  }

  start(){
    this.stage=1;
    this.next();
  }

  next(){
    show('stage');
    gameArea.innerHTML='';
    this.runStage();
  }

  success(){
    vibrate(50);
    SFX.ok.currentTime = 0;
    SFX.ok.play();
    this.stage++;
    setTimeout(()=>this.next(),500);
  }

  fail(msg){
    vibrate([100,50,100]);
    SFX.no.currentTime = 0;
    SFX.no.play();
    document.body.classList.add('shake');

    cutscene(msg, ()=>show('over'));
  }

  runStage(){
    switch(this.stage){
      case 1: stageSwipe(this); break;
      case 2: stageHold(this); break;
      case 3: stageDrag(this); break;
      case 4: stageTap(this); break;
      case 5: stageTurn(this); break;
      default: show('main');
    }
  }
}

/* ---------- Stage 1 SWIPE ---------- */
function stageSwipe(g){
  let timer = timerStart(g.time(), ()=>g.fail("신발 안 벗음"));

  const char = createChar(getCharByStage(1));
  let startY=0;

  gameArea.ontouchstart=e=>startY=e.touches[0].clientY;

  gameArea.ontouchend=e=>{
    let end=e.changedTouches[0].clientY;

    if(startY-end>80){
      clearTimeout(timer);
      squash(char);
      g.success();
    }else{
      g.fail("🚫 신발 매너 실패");
    }
  };
}

/* ---------- Stage 2 HOLD ---------- */
function stageHold(g){
  let timer = timerStart(g.time(), ()=>g.fail("김치 싸닥션"));

  const char = createChar(getCharByStage(2));
  let start=0;

  gameArea.ontouchstart=()=>start=Date.now();

  gameArea.ontouchend=()=>{
    if(Date.now()-start>2000){
      clearTimeout(timer);
      squash(char);
      g.success();
    }else{
      g.fail("💥 김치 싸닥션");
    }
  };
}

/* ---------- Stage 3 DRAG ---------- */
function stageDrag(g){
  let timer = timerStart(g.time(), ()=>g.fail("두 손 실패"));

  const char = createChar(getCharByStage(3));

  const hand=document.createElement('div');
  const target=document.createElement('div');

  hand.style.width='80px';
  hand.style.height='80px';
  hand.style.background='yellow';

  target.style.width='100px';
  target.style.height='100px';
  target.style.background='black';
  target.style.position='absolute';
  target.style.right='20%';
  target.style.bottom='20%';

  gameArea.append(hand,target);

  let drag=false;

  hand.ontouchstart=()=>drag=true;

  hand.ontouchmove=e=>{
    if(!drag)return;
    let t=e.touches[0];
    hand.style.left=t.clientX+'px';
    hand.style.top=t.clientY+'px';
  };

  hand.ontouchend=()=>{
    drag=false;
    clearTimeout(timer);
    squash(char);
    g.success();
  };
}

/* ---------- Stage 4 TAP ---------- */
function stageTap(g){
  let timer = timerStart(g.time(), ()=>g.fail("자리 매너 실패"));

  const char = createChar(getCharByStage(4));

  const ok=document.createElement('div');
  const no=document.createElement('div');

  ok.style.width='40%';
  ok.style.height='40%';
  ok.style.background='green';

  no.style.width='40%';
  no.style.height='40%';
  no.style.background='red';

  gameArea.append(ok,no);

  ok.onclick=()=>{
    clearTimeout(timer);
    squash(char);
    g.success();
  };

  no.onclick=()=>g.fail("🪨 자리 실수");
}

/* ---------- Stage 5 TURN ---------- */
function stageTurn(g){
  let timer = timerStart(g.time(), ()=>g.fail("회식 실패"));

  const char = createChar(getCharByStage(5));

  function handle(e){
    if(Math.abs(e.gamma)>30){
      window.removeEventListener('deviceorientation', handle);
      clearTimeout(timer);
      squash(char);
      g.success();
    }
  }

  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(p=>{
        if(p==='granted') window.addEventListener('deviceorientation', handle);
        else g.fail("센서 거부");
      });
  } else {
    window.addEventListener('deviceorientation', handle);
  }
}

/* init */
const game=new Game();

document.getElementById('start').onclick=()=>game.start();
document.getElementById('retry').onclick=()=>show('main');
