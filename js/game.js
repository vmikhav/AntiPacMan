"use strict";

window.requestAnimationFrame = window.requestAnimationFrame
  || window.mozRequestAnimationFrame
  || window.webkitRequestAnimationFrame
  || window.msRequestAnimationFrame
  || function(f){return setTimeout(f, 1000/60);};

window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

let textBlock = document.getElementById('text');

const tileXsize = 20;
const tileYsize = 20;

preloader.onupdate = x => {textBlock.innerHTML = x+' %';};
preloader.add('./img/sprites.png');


let atlas;

let canvasM = document.getElementById('map');
let canvasA = document.getElementById('act');
let canvasT = document.getElementById('txt');
let ctxM = canvasM.getContext('2d'); //background
let ctxA = canvasA.getContext('2d'); //actors
let ctxT = canvasT.getContext('2d'); //text

let canvasArray = [canvasM, canvasA, canvasT];

let scoreBlock = document.getElementById('scoreBlock');
let scoreDisplay = document.getElementById('score');
let startButton = document.getElementById('start');

let engine = (function (){

  let map = {width: 0, height: 0, offsetX: 0, offsetY: 0, scale: 0, orient: 1, data: []};
  let path = [];
  let mouseIsDown = false, isActive = false, needForceDraw = false;
  let currTick = 0, globalTick = 0, requestID = 0;

  let maxEnemy = 0, enemyOffset = Math.floor(Math.random()*4);

  let score = 0, canSound = parseInt(localStorage.getItem("sound"));
  if (isNaN(canSound)){canSound = 1;}
  let highScore = parseInt(localStorage.getItem("high"));
  if (isNaN(highScore)){highScore = 0;}
  let level = 0, multipler = 1, enemyCount = 0;

  let player = {}, enemys = [], enemyPositions = [];

  let realWidth  = canvasM.scrollWidth;
  let realHeight = canvasM.scrollHeight;

  function swapSound(){
    canSound ^= 1;
    ctxM.clearRect(10, 10, tileXsize*map.scale, tileYsize*map.scale);
    ctxM.drawImage(atlas, (6+canSound)*tileXsize, 0, tileXsize, tileYsize, 10, 10, tileXsize*map.scale, tileYsize*map.scale);
    localStorage.setItem('sound', canSound);
  }

  function generateMap(){
    let i,j,k,s,r,l;
    map.data = [[],[]];
    for (i=0; i<map.height; i++){
      map.data[0].push(new Int8Array(map.width));
      map.data[1].push(new Int8Array(map.width));
      for (j=0; j<map.width; j++){
        map.data[0][i][j] = 0;
        map.data[1][i][j] = 0;
      }
    }

    for (i = 1; i < Math.ceil(map.height/2) - 1; i++){
      for (j = 1; j < Math.ceil(map.width/2) - 1; j++){
        if (map.data[0][i-1][j] == 0 && map.data[0][i][j-1] == 0 && map.data[0][i-1][j+1] == 0 && map.data[0][i-1][j-1] == 0){
          k = 1; map.data[0][i][j] = 1; l = 0;
        }
        else if ((k > 4) || map.data[0][i][j-1] > 5 || map.data[0][i-1][j] > 4 || (map.data[0][i-1][j] > 0 && map.data[0][i][j-1] > 0)){
          k = 0; l = 0;
        }
        else if (map.data[0][i-1][j+1] > 0 && map.data[0][i-1][j] == 0){
          k = 0; l = 0;
        }
        else if (map.data[0][i-1][j] > 0 && map.data[0][i][j-1] == 0 && map.data[0][i][j+1] == 0){
          if (Math.random() > map.data[0][i-1][j]*0.25){
            k = 1; map.data[0][i][j] = map.data[0][i-1][j] + 1; l = 1;
          }
          else {k = 0; l = 0;}
        }
        else {
          if (Math.random() > 0.8 || k == 1){
            k++; map.data[0][i][j] = map.data[0][i][j-1] + 1;
          }
          else {k = 0; l = 0;}
        }
      }
    }
    for (i = Math.ceil(map.height/2) - 2; i <= Math.ceil(map.height/2); i++){
      for (j = Math.ceil(map.width/2) - 2; j <= Math.ceil(map.width/2); j++){
        map.data[0][i][j] = 0;
      }
    }


    for (i = Math.floor(map.height/2); i >= 0; i--){
      for (j = Math.floor(map.width/2); j >= 0; j--){
        map.data[0][map.height - i - 1][j] = map.data[0][i][j];
        map.data[0][i][map.width - j - 1]  = map.data[0][i][j];
        map.data[0][map.height - i - 1][map.width - j - 1] = map.data[0][i][j];
      }
    }

    //mark tiles
    i = map.height - 1;
    for (j = map.width - 2; j>=0; j--){
      if (map.data[0][i][j] && map.data[0][i][j+1]){
        map.data[1][i][j] += 2; map.data[1][i][j+1] += 8;
      }
    }
    for (i = map.height - 2; i>=0; i--){
      j = map.width - 1;
      if (map.data[0][i][j] && map.data[0][i+1][j]){
        map.data[1][i][j] += 4; map.data[1][i+1][j] += 1;
      }
      for (j = map.width - 2; j>=0; j--){
        if (map.data[0][i][j]){
          if (map.data[0][i][j+1]){
            map.data[1][i][j] += 2; map.data[1][i][j+1] += 8;
          }
          if (map.data[0][i+1][j]){
            map.data[1][i][j] += 4; map.data[1][i+1][j] += 1;
          }
        }
      }
    }
  }

  function drawMap(){
    let i, j, x = 0, y = 0, xs = tileXsize*map.scale, ys = tileYsize*map.scale;
    ctxM.clearRect(0, 0, realWidth, realHeight);
    ctxM.drawImage(atlas, (6+canSound)*tileXsize, 0, tileXsize, tileYsize, 10, 10, tileXsize*map.scale, tileYsize*map.scale);
    
    if (!map.orient){
      ctxM.translate(realWidth/2,realHeight/2);
      ctxM.rotate(Math.PI/2);
      ctxM.translate(-realHeight/2,-realWidth/2);
    }
    for (i=0; i<map.height; i++){ 
      for (j=0; j<map.width; j++){
        if (map.orient){
          ctxM.drawImage(atlas, ~~(map.data[1][i][j]&7)*tileXsize, ~~((map.data[1][i][j]>>3)+5)*tileYsize, tileXsize, tileYsize, map.offsetX+x, map.offsetY+y, xs, ys);
        }
        else{
          ctxM.drawImage(atlas, ~~(map.data[1][j][i]&7)*tileXsize, ~~((map.data[1][j][i]>>3)+5)*tileYsize, tileXsize, tileYsize, map.offsetY+y, map.offsetX+x, xs, ys); 
        }
        x += tileXsize*map.scale;
      }
      x = 0; y += tileYsize*map.scale;
    }
    if (!map.orient){ ctxM.setTransform(1,0,0,1,0,0); }
  }

  function updateCanvasSize(force = false){
    if (isActive || force === true ){
      realWidth  = canvasM.scrollWidth;
      realHeight = canvasM.scrollHeight;
      let pixelRatio = window.devicePixelRatio;
      let i;

      for (i=0; i<canvasArray.length; i++){
        canvasArray[i].width  = realWidth;
        canvasArray[i].height = realHeight;
      }

      map.scale = pixelRatio + Math.floor(realWidth/1000);
      if (map.scale < 2){ map.scale = 2;}

      if ((realWidth - map.width*20*map.scale) < 0 || (realHeight - map.height*20*map.scale) < 0){
        while ((realWidth  - map.width*20*map.scale) < 0 || (realHeight - map.height*20*map.scale) < 0){
          map.scale--;
        }
      }
      else{
        while ((realWidth - map.width*20*(map.scale+1)) > realWidth*0.15 && (realHeight - map.height*20*(map.scale+1)) > realHeight*0.15){
          map.scale++;
        }
      }

      map.offsetX = Math.ceil((realWidth  - map.width*20*map.scale)/2);
      map.offsetY = Math.ceil((realHeight - map.height*20*map.scale)/2);

      needForceDraw = true;
    }
  }

  function rotate(){
    if (isActive){
      let i, j, data = [];
      i = map.width; map.width = map.height; map.height = i;
      map.orient ^= 1;
      i = player.x; player.newX = player.y; player.newY = i;
      for (i = enemys.length - 1; i >= 0; i--) {
        enemys[i].rotate();
      }
    }
  }

  function damagePlayer(){
    let res = 0;
    player.health--;
    multipler = 1;
    if (player.health == 0){
      stopGame(); res = 1;
    }
    else{
      player.changeAction(act.damaged);
    }
    return res;
  }

  function drawMousePath(){
    let i;
    if (path.length > 1){
      let color = gestureColors[cogniteGesture(simplifyPath(path, 20))];
      ctxT.clearRect(0, 0, realWidth, realHeight);
      ctxT.beginPath();
      ctxT.strokeStyle = color;
      ctxT.lineCap  = "round";
      ctxT.lineJoin = "round";
      ctxT.lineWidth = 4*map.scale;
      ctxT.moveTo(path[0].x, path[0].y);
      for (i = 1; i < path.length; i++){
        ctxT.lineTo(path[i].x, path[i].y);
      }
      ctxT.stroke();
      ctxT.closePath();
    }
  }

  function generateEnemy(){
    let i, j, k, c, t;
    if (enemys.length < maxEnemy){
      do {
        c = Math.floor(Math.random()*Math.min(maxEnemy - enemys.length + 1, 5));
      } while (!(enemyCount || c));
      if (c < 4 && Math.floor(Math.random()*level)) {c++;}
      enemyCount = c;
      for (i = 1; i < c; i++){
        t = []; k = Math.floor(Math.random()*Math.min(Math.ceil(5 + level/2 - c), 4));
        if (k == 0 && level > 1){k++;}
        if (k < 2 && Math.floor(Math.random()*level)){k++;}
        for (; k >= 0; k--){
          j = Math.floor(Math.random()*8);
          j = j < 6 ? j&1 : j-4;
          t.push(j+2);
        }
        enemys.push(new Pacman(enemyPositions[enemyOffset][0], enemyPositions[enemyOffset][1], enemyOffset, player.x, player.y, t));
        enemyOffset++;
        if (enemyOffset >= 4){enemyOffset = 0;}
      }
    }
  }

  function tick(){
    let i, j, n, dmin;
    if (isActive){
      currTick++; globalTick++;
      drawMousePath();
      if (globalTick >= 65){
        globalTick = 0;
        if (enemys.length == 0){
          multipler = 1;
        }
        generateEnemy();
      }

      if (currTick >= 4){      
        if (needForceDraw){
          drawMap();
          needForceDraw = false;
        }
        player.clear(); player.tick(); dmin = 100000; n = -1;
        for (i = enemys.length - 1; i >= 0; i--) { enemys[i].clear(); enemys[i].tick();}
        for (i = enemys.length - 1; i >= 0; i--) {
          if (enemys[i].active){
            enemys[i].draw();
          }
          else{
            enemys.splice(i, 1);
          }
        }
        for (i = enemys.length - 1; i >= 0; i--) {
          if (enemys[i].active && enemys[i].action != act.die){
            j = getDistance(enemys[i], player);
            if (j<dmin){ dmin = j; n = i;}
          }
        }
        if (n >= 0){player.lookAtEnemy(enemys[n]);}
        player.draw();
        currTick = 0;

      }


      requestID = requestAnimationFrame(tick); 
    }
  }

  function startGame(){
    score = 0; multipler = 1; level = 0;
    scoreDisplay.innerHTML = score;
    isActive = true;
    tick();
  }

  function stopGame(){
    let text;
    isActive = false;
    cancelAnimationFrame(requestID);
    if (score > highScore){
      localStorage.setItem('high', score);
      highScore = score;
      text = "<p class='big'>New record!</p><p>High score : "+score+"</p><p>Try again ;)</p>";
    }
    else{
      if (score > highScore/2){
        text = "<p class='big'>Not bad!</p>";
      }
      else{
        text = "<p class='big'>Cheer up!</p>";
      }
      text += "<p>Your score : "+score+"</p><p>High score : "+highScore+"</p><p>Try again ;)</p>";
    }
    textBlock.innerHTML = text;
    ctxM.clearRect(0, 0, realWidth, realHeight);
    ctxA.clearRect(0, 0, realWidth, realHeight);
    ctxT.clearRect(0, 0, realWidth, realHeight);
    textBlock.classList.remove('hidden');
    startButton.classList.remove('hidden');
    scoreBlock.classList.add('hidden');
  }

  function init(){
    realWidth  = canvasM.scrollWidth;
    realHeight = canvasM.scrollHeight;
    let pixelRatio = window.devicePixelRatio;

    map.scale = pixelRatio + Math.floor(realWidth/1000);
    if (pixelRatio == 3 && realWidth > realHeight){ map.scale--; }
    if (map.scale < 2){ map.scale = 2;}

    map.width  = Math.floor(realWidth*0.75/(20*map.scale));
    map.height = Math.floor(realHeight*0.75/(20*map.scale));
    maxEnemy = Math.min(Math.ceil((map.width + map.height)/ 8), 6);
    
    updateCanvasSize(true);
    generateMap();

    enemyPositions = [[Math.ceil((map.width - 0.5)*tileXsize), Math.ceil((map.height/2 - 0.5)*tileYsize)],
                      [0, Math.ceil((map.height/2 - 0.5)*tileYsize)],
                      [Math.ceil((map.width/2 - 0.5)*tileXsize), Math.ceil((map.height - 0.5)*tileYsize)],
                      [Math.ceil((map.width/2 - 0.5)*tileXsize), 0]]

    player = new Ghost(Math.ceil((map.width/2 - 0.5)*tileXsize), Math.ceil((map.height/2 - 0.5)*tileYsize));
    enemys = [];
  }

  function log2(x){
    let i = 0;
    while (x){
      x>>=1; i++;
    }
    return i;
  }

  function applyGesture(g) {
    let i, r, result = 0;
    if (isActive){
      if (g){
        for (i = enemys.length - 1; i >= 0; i--) {
          if (enemys[i].active && enemys[i].action != act.die){
            r = enemys[i].checkGesture(g);
            if (r == 1){
              result += 10;
            }
            else if (r == 2){
              result += 20;
            }
          }
        }
        if (result == 0){
          multipler = 1;
        }
        else{
          if (multipler < 5){
            multipler += 0.25;
          }
        }
        score += Math.floor(result*multipler);
        if (level < log2(score>>10)){
          level++;
          if (player.health < 3){
            if (level&1){
              player.health++;
            }
          }
          else{
            score += 100*level;
          }
        }
        scoreDisplay.innerHTML = score;
      }
      else{
        multipler = 1;
      }
    }
  }

  function preventDefault(e) {
    e = e || window.event;
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.returnValue = false;
  }

  function gestureStart(evt){
    mouseIsDown = true;
    //window.ontouchmove = preventDefault;
    path = [Point(evt)];
  }

  function gestureMove(evt){
    if (mouseIsDown){
      path.push(Point(evt));
    }
  }

  function gestureEnd(evt){
    let gesture;
    if (mouseIsDown){
      mouseIsDown = false;
      //window.ontouchmove = null;

      path = simplifyPath(path, 20);

      gesture = cogniteGesture(path);
      if (gesture == gestures.click && 'changedTouches' in evt){
        gesture = gestures.unknown;
      }
      if (gesture == gestures.click && path[0].x < 10+tileXsize*map.scale && path[0].y < 10+tileYsize*map.scale){
        swapSound();
      }
      path = [];
      ctxT.clearRect(0, 0, realWidth, realHeight);


      applyGesture(gesture);
    }
  }

  let _engine = {
    onresize:       updateCanvasSize,
    onrotate:       rotate,
    startGame:      startGame,
    stopGame:       stopGame,
    init:           init,

    gestureStart:   gestureStart,
    gestureMove:    gestureMove,
    gestureEnd:     gestureEnd,

    damagePlayer:   damagePlayer,
    
    promise:        null,
    map:            map,
    score:          0,
    player:         player,

  };

  return _engine;
}());

let map = engine.map;

window.addEventListener("orientationchange", engine.onrotate);
window.addEventListener("resize", engine.onresize);

document.addEventListener("visibilitychange", () => { if (!document.hidden) {engine.onresize();}}, false);

canvasT.addEventListener('mousedown',  engine.gestureStart);
canvasT.addEventListener('mousemove',  engine.gestureMove);
canvasT.addEventListener('mouseup',    engine.gestureEnd);
canvasT.addEventListener('mouseout',   engine.gestureEnd);

canvasT.addEventListener('touchstart', engine.gestureStart);
canvasT.addEventListener('touchmove',  engine.gestureMove);
canvasT.addEventListener('touchend',   engine.gestureEnd);

preloader.start().then(() => {
  atlas = preloader.images[0];

  textBlock.innerHTML = "<p class='big'>AntiPacMan</p><p>Defeat a pacman by drawing its symbol anywhere</p>";

  startButton.classList.remove('hidden');
  startButton.onclick = () => {
    startButton.classList.add('hidden');
    textBlock.classList.add('hidden');
    scoreBlock.classList.remove('hidden');
    engine.init();
    engine.startGame();
  };
});