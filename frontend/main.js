//Initializing
var canvas;
var ctx;
var head;
var tail;
var food_img;
var body;
var snake_size;
var food;
var bug_feature= false;
var leaderboard;
var username;
var deathReason;
var scoreIntervalId;
var reduceIntervalId;
var score = 0;
var difficulty = 3*1000;//time in milliseconds
var food_list = [];
var leftDirection = false;
var rightDirection = true;
var upDirection = false;
var downDirection = false;
var inGame = true;

const BLOCK_SIZE = 20;  //change the block size will also need a change in the images
const MAX_LENGTH = 100;  //max length of the snake
const DELAY = 120;
const CANVAS_HEIGHT = 500;
const CANVAS_WIDTH = 500;
const FOOD_SPEED = 6;

var x = new Array(MAX_LENGTH);
var y = new Array(MAX_LENGTH);

// background music
var music_bg = new Audio('audio/background_music.wav')
music_bg.loop = true
music_bg.volume = 0.4
// sounds
var sounds = {
    eat_sfx: {
        audio: new Audio('audio/apple_bite.ogg'),
        isplaying: false,
    },
    death_sfx: {
        audio: new Audio('audio/death.ogg'),
        isplaying: false,
    },
    integer_overflow_sfx: {
        audio: new Audio('audio/magnet_action.wav'),
        isplaying: false,
    }
}

sounds.eat_sfx.audio.addEventListener("ended", function(){
    sounds.eat_sfx.audio.currentTime = 0;
    sounds.eat_sfx.isplaying = false
})

sounds.death_sfx.audio.addEventListener("ended", function(){
    sounds.death_sfx.audio.currentTime = 0;
    sounds.death_sfx.isplaying = false
})

sounds.integer_overflow_sfx.audio.addEventListener("ended", function(){
    sounds.integer_overflow_sfx.audio.currentTime = 0;
    sounds.integer_overflow_sfx.isplaying = false
})

//connect to the server
let socket = new WebSocket("ws://localhost:8000/ws");

async function init() {
    canvas = document.getElementById('Canvas');
    ctx = canvas.getContext('2d');
    await displayInstructions();
    // hide cursor
    document.body.style.cursor = "none";
    loadImages();
    createSnake();
    setTimeout("gameCycle()", DELAY);
    scoreIntervalId = setInterval(updateScore, 10);
    reduceIntervalId = setInterval(reduceSnake, difficulty);
    //check if user existed
    if (getCookie("user")) {
        username = getCookie("user");
        document.getElementById("username").value = username;
    }
}

//game loop
function gameCycle() {
    //console.timeEnd("gameCycle");
    if (inGame) {
        //console.time("gameCycle");
        info = {
            "info": {
                "snake_pos": [x[0], y[0]],
                "score": score
            },
        };
        send_sever(socket, info);
        doDrawing();
        checkSnakeHealth();
        checkSnakeCollision();
        checkFoodCollision();
        checkFoodSnakeCollision();
        move();
        setTimeout("gameCycle()", DELAY);
    }
}

//send data to server
function send_sever(socket, data) {
    if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(data));
    }
}

function updateSnakeReduceInterval(){
    clearInterval(reduceIntervalId);
    reduceIntervalId = setInterval(reduceSnake, difficulty);
}

//receive data from server
socket.onmessage = function (event) {
    var data = JSON.parse(event.data);
    //console.log(data);
    if (data["food"]) {
        food_list.push(data["food"]);
        console.log("got food from server " + food[3]);
    }
    if (data["food_list"]) {
        food_list = data["food_list"];
        console.log("Got food list from server " + food_list);
    }
    if (data["leaderboard"]) {
        leaderboard = data["leaderboard"];
        console.log("Got leaderboard from server " + leaderboard);
        populate_leaderboard_table();
    }
    if (data["difficulty"]) {
        difficulty = data["difficulty"];
        console.log("Game difficulty set to: " + difficulty);
        updateSnakeReduceInterval();
    }
    if (data["bug_feature"]) {
        bug_feature = data["bug_feature"];
        console.log("Got bug_feature from server: " + bug_feature);
    }
    if (data["alert"]) {
        alert(data["alert"]);
        console.log("Got alert from server: " + data["alert"]);
    }
};

//for debugging
socket.onclose = function (event) {
    if (event.wasClean) {
        console.log(`[close] Connection closed cleanly, code=${event.code}`);
    } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        alert('[close] Connection died');
    }
};

//check if the key is pressed
onkeydown = function (e) {
    var key = e.key;
    upKeys = ["ArrowUp", "w", "W"]
    downKeys = ["ArrowDown", "s", "S"]
    leftKeys = ["ArrowLeft", "a", "A"]
    rightKeys = ["ArrowRight", "d", "D"]

    // prevent default behaviour on move keys
    if ([...upKeys, ...downKeys, ...leftKeys, ...rightKeys].includes(key)){
        // console.log(`Key ${key} is prevented`);
        e.preventDefault();
    }
    if ((upKeys.includes(key)) && (!downDirection)) {       //move up
        upDirection = true;
        rightDirection = false;
        leftDirection = false;
    }
    if ((downKeys.includes(key)) && (!upDirection)) {       //move down
        downDirection = true;
        rightDirection = false;
        leftDirection = false;
    }
    if ((leftKeys.includes(key)) && (!rightDirection)) {    //move left
        leftDirection = true;
        upDirection = false;
        downDirection = false;
    }
    if ((rightKeys.includes(key)) && (!leftDirection)) {    //move right
        rightDirection = true;
        upDirection = false;
        downDirection = false;
    }
};

function loadImages() {
    //0=up, 1=down, 2=left, 3=right
    const PREFIX = 'images';
    loadImageArray = function (folder, n = 4) {
        // load all imgs `0.png`, `1.png`, ... upto `n.png` under folder `images/${folder}`
        // NOTE: `path` must NOT contain a trailing slash or backslash
        let images = [];
        for (let i = 0; i < n; i++) {
            let img = new Image();
            path_i = `${PREFIX}/${folder}/${i}.png`;
            img.src = path_i;
            images.push(img);
        }
        return images;
    };
    head = loadImageArray('head');
    body = loadImageArray('body');
    tail = loadImageArray('tail');
    bug_1hp = loadImageArray('yellow-bug');
    bug_4hp = loadImageArray('red-bug');
    bug_easy = loadImageArray('caterpillar');
    bug_fly = loadImageArray('butterfly');

    // TODO: implement directional head, body, tail images
    head = head[0];
    body = body[0];
    tail = tail[0];
}

//initialize the snake
function createSnake() {
    snake_size = 3;
    for (var z = 0; z < snake_size; z++) {
        x[z] = 250 - z * BLOCK_SIZE + BLOCK_SIZE / 2;
        y[z] = 50 + BLOCK_SIZE / 2;
    }
    console.log(x, y);
}

//draw the game
function doDrawing() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    //draw the snake
    for (var z = snake_size - 1; z >= 0; z--) {
        if ((z == 0) && !(bug_feature)) {
            //head
            draw(head, x[z], y[z])
        } else if ((z == snake_size-1) && !(bug_feature)) {
            //tail
            draw(tail, x[z], y[z])
        } else if ((z == 0) && bug_feature) {
            //head if bug_feature is true
            draw(tail, x[z], y[z])
        } else if ((z == snake_size-1) && bug_feature) {
            //tail if bug_feature is true
            draw(head, x[z], y[z])
        } else {
            //body
            draw(body, x[z], y[z])
        }
    }
    //draw the food_list
    for (var i = 0; i < food_list.length; i++) {
        food = food_list[i];
        // food[0]: x, food[1]: y
        // food[2]: direction (0,1,2,3)
        if (food[3]  == 0) {
            // aspect ratio 3 : 2 ≈ 2.66 : 2
            draw(bug_easy[food[2]], food[0], food[1], scale=1.2, aspect=[2.66,2]);
        }
        else if(food[3] == 1) {
            draw(bug_4hp[food[2]], food[0], food[1]);
        }
        else if (food[3] == 2) {
            draw(bug_fly[food[2]], food[0], food[1]);
        }
        else if (food[3] == 3) {
            draw(bug_1hp[food[2]], food[0], food[1]);
        }
        // ctx.strokeStyle = 'green';
        // ctx.strokeRect(food[0], food[1], BLOCK_SIZE, BLOCK_SIZE);
    }
}

// draw function to draw the images
function draw(img, x, y, scale = 1.0, aspect = [1,1], width = BLOCK_SIZE, height = BLOCK_SIZE) {
    /*
    img: image element
    x, y: x and y coordinates to draw at
        (modified according to `scaled_width` and `scaled_height`)
    scale: overall scaling factor for image
        eg: 1.0 (default) leaves image as is
        eg: 0.5 scales image by 0.5 in both weight and height
    aspect: aspect ratio to apply on the image
        eg: 1x1 (default) leaves image as is even if it is not actually 1x1
        eg: 2x1 scales width by 2 and height by 0.5
    width: base width to draw image (combined with `aspect` and `scale`)
        defaults to BLOCK_SIZE
    height: base height to draw image (combined with `aspect` and `scale`)
        defaults to BLOCK_SIZE
    */
    // reduce `aspect` to a `ratio` (i.e., X:1)
    const ratio = aspect[0] / aspect[1];
    // `width` is scaled up by `ratio`, and scaled up by `scale`
    let scaled_width = width * ratio * scale;
    // `height` is scaled down by `ratio`, and scaled up by `scale`
    let scaled_height = height / ratio * scale;
    // shift `x` and `y` by half the width/height difference so the img is still centered
    let shifted_x = x - (scaled_width - width) / 2;
    let shifted_y = y - (scaled_height - height) / 2;
    // debug info
    // console.log(`\tratio: ${ratio} & scale: ${scale}`);
    // console.log(`\tdimensions: ${width}x${height} -> ${scaled_width}x${scaled_height}`);
    // console.log(`\tx, y: ${x}, ${y} -> ${shifted_x}x${shifted_y}`);
    ctx.drawImage(img, shifted_x, shifted_y, scaled_width, scaled_height);
}

//function to update score
function updateScore() {
    score+=50;
    var score_text = String(score/10);
    while (score_text.length < 6) {
        score_text = "0" + score_text;
    }
    score_text = score_text.slice(0, 2) + ":" + score_text.slice(2, 4) + "." + score_text.slice(4, 6);
    document.getElementById("score").innerHTML = score_text;
}

//function to reduce the snake size
function reduceSnake() {
    //console.timeEnd("reduceSnake");
    snake_size--;
    x.pop();
    y.pop();
    send_sever(socket,{"snake_size" : snake_size});
    //console.time("reduceSnake");
}

//function to check if the snake health is 0
function checkSnakeHealth() {
    if (snake_size == 1) {
        inGame = false;
        deathReason = "You died of Starvation!";
        gameOver();
    }
}

function gameOver() {
    music_bg.pause()
    play_sound(sounds.death_sfx)
    clearInterval(scoreIntervalId);
    clearInterval(reduceIntervalId);
    send_sever(socket, {'Game_Over': true});
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = "normal bold 22px sans-serif";
    display_text = 'Game over Score: ' + score ;
    ctx.fillText(display_text, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
    ctx.fillText(deathReason, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 20);
    const play_btn = document.getElementById("play");
    play_btn.style.display = "inline-block";
    play_btn.onclick = function () {
        socket.close();
        location.reload();
    }
    // hide score
    document.getElementById("score").style.display = "none";
    // show leaderboard
    document.getElementById("leaderboard").style.display = "table";
    // show save button
    document.getElementById("save").style.display = "inline-block";
    // show form controls
    document.getElementById("username").style.display = "inline-block";

    // show cursor
    document.body.style.cursor = "default";

    // stop capturing keystrokes
    onkeydown = function () {}
}

//to send save data to server
function save() {
    if (document.getElementById("username").value === "") {
        alert("Please enter your username");
    } else {
        username = document.getElementById("username").value;
    }
    data = {
        "save": {
            "user": username,
            "score": score
        },
    };
    send_sever(socket, data);
    setCookie("user", username, 90);
}

function move() {
    //move the snake
    for (var z = snake_size; z > 0; z--) {
        x[z] = x[(z - 1)];
        y[z] = y[(z - 1)];
    }
    if (leftDirection) {
        x[0] -= BLOCK_SIZE;
    }
    if (rightDirection) {
        x[0] += BLOCK_SIZE;
    }
    if (upDirection) {
        y[0] -= BLOCK_SIZE;
    }
    if (downDirection) {
        y[0] += BLOCK_SIZE;
    }
    //move the foods
    for (var i = 0; i < food_list.length; i++) {
        food = food_list[i]
        if (food[2] == 0) {
            food_list[i][1] -= FOOD_SPEED;
        } else if (food[2] == 1) {
            food_list[i][1] += FOOD_SPEED;
        } else if (food[2] == 2) {
            food_list[i][0] -= FOOD_SPEED;
        } else if (food[2] == 3) {
            food_list[i][0] += FOOD_SPEED;
        }
    }
}

// check if the snake head hits the wall
function checkSnakeCollision() {
    var hitWall = false;
    var head_pos = [x[0], y[0]];
    var tail_pos = [x[snake_size - 1], y[snake_size - 1]];
    // return 0 if no collision, or one of [1,2,3,4] if collision occurs
    checkCollision = (x, y) => {
        if (x < 0) { // x too low
            return 1;
        }
        if (x > CANVAS_WIDTH - BLOCK_SIZE) { // x too high
            return 2;
        }
        if (y < 0) { // y too low
            return 3;
        }
        if (y > CANVAS_HEIGHT - BLOCK_SIZE) { // y too high
            return 4;
        }
        return 0;
    }
    if (bug_feature) {
        headHitWall = checkCollision(...head_pos);
        tailHitWall = checkCollision(...tail_pos);
        // if "start" is out of canvas,
        // and both "start" and "end" are out of canvas in the same direction
        // then snake dies
        hitWall = ((headHitWall) && (headHitWall == tailHitWall));
    } else {
        hitWall = !!(checkCollision(...head_pos));
    }
    if (hitWall == true) {
        inGame = false;
        deathReason = "You died because you hit the poison wall!";
        gameOver();
    }
}

//check if the food hit the wall
function checkFoodCollision() {
    for (var i = 0; i < food_list.length; i++) {
        food = food_list[i];
        if (food[0] > CANVAS_WIDTH - BLOCK_SIZE) {
            food_list[i][2] = 2;
        } else if (food[0] < 0) {
            food_list[i][2] = 3;
        } else if (food[1] > CANVAS_HEIGHT - BLOCK_SIZE) {
            food_list[i][2] = 0;
        } else if (food[1] < 0) {
            food_list[i][2] = 1;
        }
    }
}

//check if the snake hits the food
function checkFoodSnakeCollision() {
    snake = [x[0], y[0]];
    for (var i = 0; i < food_list.length; i++) {
        food = [food_list[i][0], food_list[i][1]];
        if (intersect(snake, food)) {
            //do thing depending on the food type
            //console.log("food eaten:"+food_list[i][3]);
            if (food_list[i][3] == 0) {
                // Difficulty reducing is done in onmessage event
            } else if (food_list[i][3] == 1) {
                snake_size+=4;
            } else if (food_list[i][3] == 2) {
                // changing bugfeature is done in onmessage event
            } else if (food_list[i][3] == 3){
                snake_size+=1;
            }
            food_list.splice(i, 1);
            send_sever(socket, { "food_eaten": i });//sending the food index to the server
            play_sound(sounds.eat_sfx)
        }
    }
}

function play_sound(sound){
    if (sound.isplaying){
        sound.audio.pause
        sound.audio.currentTime = 0;
    }
    sound.isplaying = true
    sound.audio.play()
}

function play_music_bg(){
    music_bg.play()
}

//fuction to check if a rectangle intersects another rectangle
function intersect(a, b) {
    return !(a[0] > b[0] + BLOCK_SIZE || a[0] + BLOCK_SIZE < b[0] || a[1] > b[1] + BLOCK_SIZE || a[1] + BLOCK_SIZE < b[1]);
}


//cookie functions
function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/;SameSite=Strict";
}

function getCookie(cname) {
    const name = cname + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function checkCookie(cname) {
    const value = getCookie(cname);
    if (value != "") {
        return true;
    } else {
        return false;
    }
}

// display instructions to the user before starting the game
function displayInstructions() {
    return new Promise((resolve, reject) => {
        // console.log("display instructions...");
        const instructions_el = document.getElementById("instructions");
        const instructions_modal = new bootstrap.Modal(instructions_el, {
            keyboard: true,
            focus: true
        });
        instructions_modal.show();
        instructions_el.addEventListener("hidden.bs.modal", (e) => {
            // console.log("instructions hidden");
            resolve(null);
        })
    })
}

// populate leaderboard table
function populate_leaderboard_table() {
    const tbody = document.getElementById("leaderboard").tBodies[0];
    tbody.innerHTML = "";
    leaderboard.forEach((entry, i) => {
        // append row at the end
        const row = tbody.insertRow(-1);
        // add cells with `leaderboard`
        for (let j = 0; j < entry.length; j++) {
            const cell = row.insertCell(j);
            cell.textContent = String(entry[j]);
            // add attr `scope="row"` for first cell
            if (j == 0) {
                cell.setAttribute("scope", "row");
            }
        }
    });
}
