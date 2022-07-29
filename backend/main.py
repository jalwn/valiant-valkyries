import math
import random
from typing import List

import uvicorn
from fastapi import FastAPI, WebSocket

BLOCK_SIZE = 10
app = FastAPI()
snake_position = [0, 0]
snake_size = 0
leaderboard = {}


@app.websocket_route("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    Websocket server endpoint.

    This is where a websocket connection is made
    and it is used to send and recive data to the client.
    """
    await websocket.accept()
    # Send food list to client
    foods_list = food_list()
    await send_food_client(websocket, foods_list)
    try:
        while True:

            # Recive data from client
            receive_data = await websocket.receive_json()
            # print(receive_data)
            if "info" in receive_data:
                # todo: save info to the local variable
                continue
                # print(receive_data["info"])
            if "food_eaten" in receive_data:
                del foods_list[receive_data["food_eaten"]]
                foods_list.append(food := create_food())
                await send_single_food(websocket, food)
            if "save" in receive_data:
                score_data = receive_data["save"]
                save_score(score_data)
                await websocket.close()
            if "Game_Over" in receive_data:
                # Todo send leaderboard to client
                print(receive_data["Game_Over"])

    except Exception as e:
        print(f"Connection closed with code {e.args[0]}")


async def send_food_client(socket: WebSocket, food_list: List[List[int]]) -> None:
    """Send created food data to client."""
    await socket.send_json({"food_list": food_list})


async def send_single_food(socket: WebSocket, food: List[int]) -> None:
    """Send single created food data to client."""
    await socket.send_json({"food": food})


def create_food() -> List[int]:
    """
    Create one food item for snake to consume.

    List of the form [postion_x, position_y, direction].
    """
    ran = random.SystemRandom()
    r = math.floor(ran.random() * 40)
    food_x = r * BLOCK_SIZE
    r = math.floor(ran.random() * 40)
    food_y = r * BLOCK_SIZE
    food_direction = math.floor(ran.random() * 3)
    return [food_x, food_y, food_direction]


def food_list() -> List[List[int]]:
    """
    Create a list of food items for snake to consume.

    List of the form [food, food, food ...].
    """
    food_list = []
    for _ in range(3):
        food = create_food()
        food_list.append(food)
    # print(food_list)
    return food_list


def save_score(data: dict) -> None:
    """Save the score for a user into leaderboard."""
    leaderboard[data["user"]] = data["score"]


def start() -> None:
    """Launched with `poetry run start` at root level"""
    uvicorn.run("backend.main:app", port=8000, log_level="info", reload=True)
