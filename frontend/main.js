//Initializing
var canvas;
var ctx;
var head;
var food_img;
var body;
var snake_size;
var food;
var foods = [];
var leftDirection = false;
var rightDirection = true;
var upDirection = false;
var downDirection = false;
var inGame = true;

const BLOCK_SIZE = 10;//change the block size will also need a change in the images
const MAX_LENGTH = 100;//max length of the snake
const DELAY = 120;
const CANVAS_HEIGHT = 480;
const CANVAS_WIDTH = 480;
const MAX_FOOD = 1;

var x = new Array(MAX_LENGTH);
var y = new Array(MAX_LENGTH);

//connect to the server
let socket = new WebSocket("ws://localhost:8000/ws");
//todo: catch connection error

function init() {
    canvas = document.getElementById('Canvas');
    ctx = canvas.getContext('2d');
    loadImages();
    createSnake();
    //Todo: get the food from the server
    Createfood();
    Createfood();
    Createfood();
    setTimeout("gameCycle()", DELAY);
}

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
        x[z] = 50 - z * 10;
        y[z] = 50;
    }
}

//draw the game
function doDrawing() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (inGame) {

        //draw the foods
        for (var i = 0; i < foods.length; i++) {
            food=foods[i];
            ctx.drawImage(food_img, food[0], food[1]);
        }
        //draw the snake
        for (var z = 0; z < snake_size; z++) {
            if (z == 0) {
                ctx.drawImage(head, x[z], y[z]);
            } else {
                ctx.drawImage(body, x[z], y[z]);
            }
        }
    } else {
        gameOver();
    }
}

function gameOver() {
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = 'normal bold 18px serif';
    ctx.fillText('Game over', CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
    btn=document.getElementById("btn");
    btn.textContent="Play Again";
    btn.style.display="block";
    btn.onclick=function(){
        location.reload();
    }
    socket.send(JSON.stringify({ "game_over": true }));
    socket.close();
}

function move() {
    //move the snake
    for (var z = snake_size; z > 0; z--) {
        x[z] = x[(z - 1)];
        y[z] = y[(z - 1)];
    }
    //move the foods
    for (var i = 0; i < foods.length; i++) {
        food=foods[i]
        if (food[2] == 0) {
            foods[i][0] -= BLOCK_SIZE;
        } else if (food[2] == 1) {
            foods[i][0] += BLOCK_SIZE;
        } else if (food[2] == 2) {
            foods[i][1] -= BLOCK_SIZE;
        } else if (food[2] == 3) {
            foods[i][1] += BLOCK_SIZE;
        }
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
}

//check if the snake hits the wall
function checkSnakeCollision() {
    if (y[0] >= CANVAS_HEIGHT) {
        inGame = false;
    }
    if (y[0] < 0) {
       inGame = false;
    }
    if (x[0] >= CANVAS_WIDTH) {
      inGame = false;
    }
    if (x[0] < 0) {
      inGame = false;
    }
}

//check if the food hit the wall
function checkFoodCollision() {
    for (var i = 0; i < foods.length; i++) {
        food=foods[i];
        if (food[0] >= CANVAS_WIDTH) {
            foods[i][2] = 0;
        } else if (food[0] < 0) {
            foods[i][2] = 1;
        } else if (food[1] >= CANVAS_HEIGHT) {
            foods[i][2] = 2;
        } else if (food[1] < 0) {
            foods[i][2] = 3;
        }
    }
}

//check if the snake hits the food
function checkfood() {
    for (var i = 0; i < foods.length; i++) {
        if ((x[0] == foods[i][0]) && (y[0] == foods[i][1])) {
            snake_size++;
            foods.splice(i, 1);
            Createfood();
        }
    }
}

//random food generation
//TODO replace with a location from server
function Createfood() {
    var r = Math.floor(Math.random() * 40);
    food_x = r * BLOCK_SIZE;
    r = Math.floor(Math.random() * 40);
    food_y = r * BLOCK_SIZE;
    food_direction = Math.floor(Math.random() * 3);//0:left, 1:right, 2:up, 3:down
    foods.push([food_x, food_y, food_direction]);
}

//game loop
function gameCycle() {
    //console.timeEnd("gameCycle");
    if (inGame) {
        //console.time("gameCycle");
        checkSnakeCollision();
        checkFoodCollision();
        move();
        doDrawing();
        checkfood();
        var snake_pos = [x[0],y[0]];
        send_sever(socket, snake_pos, snake_size, foods);
        //TODO get data from server
        setTimeout("gameCycle()", DELAY);
    }
}

//check if the key is pressed
onkeydown = function(e) {
    var key = e.key;
    if ((key == "ArrowLeft") && (!rightDirection)) {//move left
        leftDirection = true;
        upDirection = false;
        downDirection = false;
    }
    if ((key == "ArrowRight") && (!leftDirection)) {//move right
        rightDirection = true;
        upDirection = false;
        downDirection = false;
    }
    if ((key == "ArrowUp") && (!downDirection)) {//move up
        upDirection = true;
        rightDirection = false;
        leftDirection = false;
    }
    if ((key == "ArrowDown") && (!upDirection)) {//move down
        downDirection = true;
        rightDirection = false;
        leftDirection = false;
    }
};

//send data to server
function send_sever(socket, snake_pos, snake_size, food_pos) {
    data = {
        "snake_pos": snake_pos,
        "snake_size": snake_size,
        "food_pos": food_pos
    };
    socket.send(JSON.stringify(data));
}

//for debugging
socket.onmessage = function(event) {
    //alert(`[message] Data received from server: ${event.data}`);
    var data = JSON.parse(event.data);
    console.log(event.data);
};

socket.onclose = function(event) {
    if (event.wasClean) {
        console.log(`[close] Connection closed cleanly, code=${event.code}`);
    } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        alert('[close] Connection died');
    }
};
//for debugging
socket.onerror = function(error) {
    alert(`[error] ${error.message}`);
};
