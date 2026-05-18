const screens = {
    start: document.getElementById('screen-start'),
    game: document.getElementById('screen-game'),
    fail: document.getElementById('screen-fail'),
    clear: document.getElementById('screen-clear')
};

const UI = {
    timerFill: document.getElementById('timer-fill'),
    instruction: document.getElementById('instruction'),
    interactionLayer: document.getElementById('interaction-layer'),
    failMessage: document.getElementById('fail-message')
};

let currentStage = 0;
let timer;
let timeLeft;
const timeLimit = 5000; // 스테이지당 5초
let isGameRunning = false;

// 스테이지 데이터 (이미지 파일명 매칭)
const stages = [
    { id: 1, type: 'swipe', img: '스테이지1.jpg', text: 'SWIPE\n신발을 벗으세요', failMsg: '하늘의 별이 되었습니다...' },
    { id: 2, type: 'hold', img: '스테이지2.jpg', text: 'HOLD\n어른을 기다리세요', failMsg: '김치싸닥션을 맞았습니다!' },
    { id: 3, type: 'drag', img: '스테이지3.jpg', text: 'DRAG & DROP\n두 손으로 받으세요', failMsg: '레이저에 타버렸습니다!' },
    { id: 4, type: 'tap', img: '스테이지4.jpg', text: 'TAP\n자리를 양보하세요', failMsg: '메두사가 되어 돌로 굳었습니다.' },
    { id: 5, type: 'turn', img: '스테이지5.jpg', text: 'TURN\n고개를 돌리세요', failMsg: '상사의 브레스에 당했습니다!' }
];

// 화면 전환 함수
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// 게임 시작
document.getElementById('btn-start').addEventListener('click', async () => {
    // Stage 5를 위한 방향 센서 권한 요청 (iOS 대응)
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permissionState = await DeviceOrientationEvent.requestPermission();
            if (permissionState !== 'granted') alert('센서 권한이 없어 Stage 5 진행이 어렵습니다.');
        } catch (e) { console.error(e); }
    }
    
    currentStage = 0;
    loadStage();
});

document.getElementById('btn-retry').addEventListener('click', () => { currentStage = 0; loadStage(); });
document.getElementById('btn-home').addEventListener('click', () => showScreen('start'));

// 스테이지 로딩
function loadStage() {
    if (currentStage >= stages.length) {
        showScreen('clear');
        return;
    }

    const stageData = stages[currentStage];
    showScreen('game');
    
    // 배경 이미지 및 텍스트 설정
    screens.game.style.backgroundImage = `url('${stageData.img}')`;
    UI.instruction.innerText = stageData.text;
    UI.interactionLayer.innerHTML = ''; // 초기화
    
    isGameRunning = true;
    startTimer();
    setupInteraction(stageData);
}

// 타이머
function startTimer() {
    timeLeft = timeLimit;
    UI.timerFill.style.width = '100%';
    
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft -= 50;
        UI.timerFill.style.width = `${(timeLeft / timeLimit) * 100}%`;
        
        if (timeLeft <= 0) {
            failStage();
        }
    }, 50);
}

// 성공/실패 처리
function clearStage() {
    if(!isGameRunning) return;
    isGameRunning = false;
    clearInterval(timer);
    UI.interactionLayer.innerHTML = '';
    currentStage++;
    setTimeout(loadStage, 500); // 0.5초 대기 후 다음 스테이지
}

function failStage() {
    if(!isGameRunning) return;
    isGameRunning = false;
    clearInterval(timer);
    UI.interactionLayer.innerHTML = '';
    UI.failMessage.innerText = stages[currentStage].failMsg;
    showScreen('fail');
}

// ★ 핵심 인터랙션 세팅 ★
function setupInteraction(stage) {
    const layer = UI.interactionLayer;

    if (stage.type === 'swipe') {
        let startY = 0;
        layer.addEventListener('touchstart', e => startY = e.touches[0].clientY, {passive: true});
        layer.addEventListener('touchend', e => {
            let endY = e.changedTouches[0].clientY;
            if (startY - endY > 100) clearStage(); // 100px 이상 위로 스와이프
        });
    } 
    
    else if (stage.type === 'hold') {
        let holdTimeout;
        layer.addEventListener('touchstart', () => {
            holdTimeout = setTimeout(clearStage, 2000); // 2초간 홀드 시 성공
        }, {passive: true});
        layer.addEventListener('touchend', () => {
            clearTimeout(holdTimeout); // 손을 떼면 타이머 취소
        });
    }

    else if (stage.type === 'drag') {
        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone';
        const dragItem = document.createElement('div');
        dragItem.className = 'drag-item';
        
        layer.appendChild(dropZone);
        layer.appendChild(dragItem);

        dragItem.addEventListener('touchmove', e => {
            let touch = e.touches[0];
            dragItem.style.left = touch.clientX + 'px';
            dragItem.style.top = touch.clientY + 'px';
        }, {passive: true});

        dragItem.addEventListener('touchend', () => {
            const rect1 = dragItem.getBoundingClientRect();
            const rect2 = dropZone.getBoundingClientRect();
            // 겹침 판정
            if (!(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom)) {
                clearStage();
            }
        });
    }

    else if (stage.type === 'tap') {
        // 정답 자리 (화면 중앙쯤)
        const correctTap = document.createElement('div');
        correctTap.className = 'tap-zone';
        correctTap.style.top = '60%'; correctTap.style.left = '50%';
        correctTap.addEventListener('touchstart', clearStage);
        
        // 오답 자리 (임산부/노약자석 위치)
        const wrongTap1 = document.createElement('div');
        wrongTap1.className = 'tap-zone wrong';
        wrongTap1.style.top = '60%'; wrongTap1.style.left = '20%';
        wrongTap1.addEventListener('touchstart', failStage);

        layer.appendChild(correctTap);
        layer.appendChild(wrongTap1);
    }

    else if (stage.type === 'turn') {
        const handleOrientation = (e) => {
            if (!isGameRunning) return;
            // 모바일 기기를 좌/우로 30도 이상 기울였을 때
            if (e.gamma > 30 || e.gamma < -30) {
                window.removeEventListener('deviceorientation', handleOrientation);
                clearStage();
            }
        };
        window.addEventListener('deviceorientation', handleOrientation);
    }
}
