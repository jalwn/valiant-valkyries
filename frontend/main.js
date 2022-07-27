//Initializing
var canvas;
var ctx;
var head;
var apple;
var body;
var snake_size;
var apple_x;
var apple_y;
var leftDirection = false;
var rightDirection = true;
var upDirection = false;
var downDirection = false;
var inGame = true;

const BLOCK_SIZE = 10;//change the block size will also need a change in the images
const MAX_LENGTH = 100;//max length of the snake
const DELAY = 140;
const CANVAS_HEIGHT = 480;
const CANVAS_WIDTH = 480;

var x = new Array(MAX_LENGTH);
var y = new Array(MAX_LENGTH);

//connect to the server
let socket = new WebSocket("ws://localhost:8000/ws");

function init() {
    canvas = document.getElementById('Canvas');
    ctx = canvas.getContext('2d');
    loadImages();
    createSnake();
    CreateApple();
    setTimeout("gameCycle()", DELAY);
}

function loadImages() {
    head = new Image();
    head.src = 'images/head.png';
    body = new Image();
    body.src = 'images/body.png';
    apple = new Image();
    apple.src = 'images/apple.png';
}

//initialize the snake
function createSnake() {
    snake_size = 3;
    for (var z = 0; z < snake_size; z++) {
        x[z] = 50 - z * 10;
        y[z] = 50;
    }
}

//check collision with the apple
function checkApple() {
    if ((x[0] == apple_x) && (y[0] == apple_y)) {
        snake_size++;
        CreateApple();
    }
}

//draw the game
function doDrawing() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (inGame) {
        ctx.drawImage(apple, apple_x, apple_y);
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
    btn.onclick=function(){
        location.reload();
    }
}

function move() {
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
}

//check if the snake hits the wall
function checkCollision() {
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

//random apple generation
//TODO replace with a location from server
function CreateApple() {
    var r = Math.floor(Math.random() * 29);
    apple_x = r * BLOCK_SIZE;
    r = Math.floor(Math.random() * 29);
    apple_y = r * BLOCK_SIZE;
}

//game loop
function gameCycle() {
    if (inGame) {
        checkApple();
        checkCollision();
        move();
        doDrawing();
        var snake_pos = [x[0],y[0]];
        var apple_pos = [apple_x,apple_y];
        send_sever(socket, snake_pos, snake_size, apple_pos);
        //TODO get data from server
        setTimeout("gameCycle()", DELAY);
    }
}

//check if the key is pressed
onkeydown = function(e) {
    var key = e.keyCode;
    if ((key == 37) && (!rightDirection)) {//move left
        leftDirection = true;
        upDirection = false;
        downDirection = false;
    }
    if ((key == 39) && (!leftDirection)) {//move right
        rightDirection = true;
        upDirection = false;
        downDirection = false;
    }
    if ((key == 38) && (!downDirection)) {//move up
        upDirection = true;
        rightDirection = false;
        leftDirection = false;
    }
    if ((key == 40) && (!upDirection)) {//move down
        downDirection = true;
        rightDirection = false;
        leftDirection = false;
    }
};

//send data to server
function send_sever(socket, snake_pos, snake_size, apple_pos) {
    data = {
        "snake_pos": snake_pos,
        "snake_size": snake_size,
        "apple_pos": apple_pos
    };
    socket.send(JSON.stringify(data));
}

socket.onmessage = function(event) {
    //alert(`[message] Data received from server: ${event.data}`);
    var data = JSON.parse(event.data);
    console.log(event.data);
};
