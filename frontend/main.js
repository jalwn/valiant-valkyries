//Initializing
var canvas;
var ctx;
var head;
var food_img;
var body;
var snake_size;
var food;
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

const BLOCK_SIZE = 10;  //change the block size will also need a change in the images
const MAX_LENGTH = 100;  //max length of the snake
const DELAY = 120;
const CANVAS_HEIGHT = 480;
const CANVAS_WIDTH = 480;
const SNAKE_SPEED = BLOCK_SIZE; //or it tiggers a bug in move function when block size is changed
const FOOD_SPEED = 4;

var x = new Array(MAX_LENGTH);
var y = new Array(MAX_LENGTH);

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
        doDrawing();
        checkSnakeHealth();
        checkSnakeCollision();
        checkFoodCollision();
        checkFoodSnakeCollision();
        move();
        info = {
            "info": {
                "snake_pos": [x[0], y[0]],
                "score": score
            },
        };
        send_sever(socket, info);
        setTimeout("gameCycle()", DELAY);
    }
}

//send data to server
function send_sever(socket, data) {
    if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(data));
    }
}

//receive data from server
socket.onmessage = function (event) {
    var data = JSON.parse(event.data);
    console.log(data);

    //getting food from server
    if (data["food"]) {
        food_list.push(data["food"]);
        //console.log("got food from server " + food_list);
    }
    //getting food list from server
    if (data["food_list"]) {
        food_list = data["food_list"];
        console.log("Got food list from server " + food_list);
    }
    //getting leaderboard data from server
    if (data["leaderboard"]) {
        leaderboard = data["leaderboard"];
        console.log("Got leaderboard from server " + leaderboard);
        populate_leaderboard_table();
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
        console.log(`Key ${key} is prevented`);
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
    head = new Image();
    head.src = 'images/head.png';
    body = new Image();
    body.src = 'images/body.png';
    food_img = new Image();
    food_img.src = 'images/apple.png';
}

//initialize the snake
function createSnake() {
    snake_size = 3;
    for (var z = 0; z < snake_size; z++) {
        x[z] = 250 - z * BLOCK_SIZE;
        y[z] = 50;
    }
    console.log(x, y);
}

//draw the game
function doDrawing() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    //draw the snake
    for (var z = snake_size - 1; z >= 0; z--) {
        if (z == 0) {
            ctx.drawImage(head, x[z], y[z]);
            ctx.strokeStyle = 'red';
            ctx.strokeRect(x[z], y[z], BLOCK_SIZE, BLOCK_SIZE);
        } else {
            ctx.drawImage(body, x[z], y[z]);
            ctx.strokeStyle = 'blue';
            ctx.strokeRect(x[z], y[z], BLOCK_SIZE, BLOCK_SIZE);
        }
    }
    //draw the food_list
    for (var i = 0; i < food_list.length; i++) {
        food = food_list[i];
        ctx.drawImage(food_img, food[0], food[1]);
        ctx.strokeStyle = 'green';
        ctx.strokeRect(food[0], food[1], BLOCK_SIZE, BLOCK_SIZE);
    }
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
    snake_size--;
    x.pop();
    y.pop();
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
    clearInterval(scoreIntervalId);
    clearInterval(reduceIntervalId);
    send_sever(socket, {'Game_Over': true});
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = 'normal bold 18px serif';
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
    //move the food_list
    for (var i = 0; i < food_list.length; i++) {
        food = food_list[i]
        if (food[2] == 0) {
            food_list[i][0] -= FOOD_SPEED;
        } else if (food[2] == 1) {
            food_list[i][0] += FOOD_SPEED;
        } else if (food[2] == 2) {
            food_list[i][1] -= FOOD_SPEED;
        } else if (food[2] == 3) {
            food_list[i][1] += FOOD_SPEED;
        }
    }
    if (leftDirection) {
        x[0] -= SNAKE_SPEED;
    }
    if (rightDirection) {
        x[0] += SNAKE_SPEED;
    }
    if (upDirection) {
        y[0] -= SNAKE_SPEED;
    }
    if (downDirection) {
        y[0] += SNAKE_SPEED;
    }
}

//check if the snake hits the wall
function checkSnakeCollision() {
    var hitWall = false;
    if (y[0] >= CANVAS_HEIGHT) {
        hitWall = true;
    }
    if (y[0] < 0) {
        hitWall = true;
    }
    if (x[0] >= CANVAS_WIDTH) {
        hitWall = true;
    }
    if (x[0] < 0) {
        hitWall = true;
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
        if (food[0] >= CANVAS_WIDTH) {
            food_list[i][2] = 0;
        } else if (food[0] < 0) {
            food_list[i][2] = 1;
        } else if (food[1] >= CANVAS_HEIGHT) {
            food_list[i][2] = 2;
        } else if (food[1] < 0) {
            food_list[i][2] = 3;
        }
    }
}

//check if the snake hits the food
function checkFoodSnakeCollision() {
    snake = [x[0], y[0]];
    for (var i = 0; i < food_list.length; i++) {
        food = [food_list[i][0], food_list[i][1]];
        if (intersect(snake, food)) {
            snake_size++;
            food_list.splice(i, 1);
            send_sever(socket, { "food_eaten": i });//sending the food index to the server
        }
    }
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
    console.log("Running populate_leaderboard_table with data: " + leaderboard);
    const tbody = document.getElementById("leaderboard").tBodies[0];
    tbody.innerHTML = "";
    leaderboard.forEach((entry, i) => {
        console.log("entry in `leaderboard`: " + entry)
        // append row at the end
        const row = tbody.insertRow(-1);
        // add cells with `leaderboard`
        for (let j = 0; j < entry.length; j++) {
            const cell = row.insertCell(j);
            cell.textContent = String(entry[j]);
        }
    });
}
