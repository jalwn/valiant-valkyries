import json
import math
import random
from typing import List, Tuple

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

BLOCK_SIZE = 10
app = FastAPI()
init_snake_size = 3
init_difficulty = 3*1000  # time in milliseconds
leaderboard = []
# leaderboard will be sorted by this key
LEADERBOARD_SORT_BY = "score"


with open('leaderboard.json', 'r+') as f:
    # leaderboard = json.load(f)
    # Todo: make it in from a dict to list like [[name, score], [name, score], ...]
    # sort leaderboard by score in descending order
    print(leaderboard)

with open("env.json") as j:
    env = json.load(j)
    # todo add the env values to the app
    print(env)


@app.websocket_route("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    Websocket server endpoint.

    This is where a websocket connection is made
    and it is used to send and recive data to the client.
    """
    await websocket.accept()
    snake_position = []
    score = 0
    snake_size = init_snake_size
    difficulty = init_difficulty
    # Send food list to client
    foods_list = food_list()
    await send_food_list(websocket, foods_list)
    try:
        while True:

            # Recive data from client
            receive_data = await websocket.receive_json()
            # print(receive_data)

            if "info" in receive_data:
                snake_position = receive_data["info"]["snake_pos"]
                score = receive_data["info"]["score"]
                print("Snake position: ", snake_position, "| Score: ", score)

            if "food_eaten" in receive_data:
                food_eaten = foods_list[receive_data["food_eaten"]]
                if food_eaten[3] == 0:
                    # reduce difficulty
                    difficulty = difficulty - 1000
                    # todo send difficulty to client
                elif food_eaten[3] == 1:
                    # increase snake size
                    snake_size += 4
                else:
                    # normal food
                    snake_size += 1
                del foods_list[receive_data["food_eaten"]]
                foods_list.append(food := create_food(score))
                await send_single_food(websocket, food)

            if "save" in receive_data:
                score_data = receive_data["save"]
                save_score_ng(score_data)
                await send_leaderboard(websocket, leaderboard)
                print("leaderboard: ", leaderboard)
                await websocket.close()

            if "Game_Over" in receive_data:
                await send_leaderboard(websocket, leaderboard)
                print("Gameover: ", receive_data["Game_Over"])
                snake_position = []
                score = 0
                snake_size = 3

    except Exception as e:
        if (e == WebSocketDisconnect):
            print("Connection closed by client")
        else:
            print("Error: ", e)


async def send_food_list(socket: WebSocket, food_list: List[List[int]]) -> None:
    """Send created food list to client."""
    await socket.send_json({"food_list": food_list})


async def send_single_food(socket: WebSocket, food: List[int]) -> None:
    """Send single created food data to client."""
    await socket.send_json({"food": food})


async def send_leaderboard(socket: WebSocket, leaderboard: List[Tuple]) -> None:
    """Send leaderboard data to client."""
    await socket.send_json({"leaderboard": leaderboard})


def create_food(score: int) -> List[int]:
    """
    Create one food item for snake to consume.

    List of the form [postion_x, position_y, direction, food_type].
    """
    ran = random.SystemRandom()
    r = math.floor(ran.random() * 40)
    food_x = r * BLOCK_SIZE
    r = math.floor(ran.random() * 40)
    food_y = r * BLOCK_SIZE
    food_direction = math.floor(ran.random() * 4)  # up, down, left, right
    # current foods 0=reduce difficulty, 1=+4hp, 2=normal
    # todo add more food types and make the logic better to make the game more fun
    if score > 2000:
        food_type = math.floor(ran.random() * 2)  # 0, 1
    else:
        food_type = 3
    return [food_x, food_y, food_direction, food_type]


def food_list() -> List[List[int]]:
    """
    Create a list of food items for snake to consume.

    List of the form [food, food, food ...].
    """
    food_list = []
    for _ in range(5):
        food = create_food(0)
        food_list.append(food)
    # print(food_list)
    return food_list


def save_score(data: dict) -> None:
    """Save the score for a user into leaderboard.

    Leaderboard is sorted by score in descending order.
    """
    # convert dict to tuple of its values
    entry = tuple(data.values())
    # currently used sort value
    sort_value = data[LEADERBOARD_SORT_BY]
    # index of the `sort_value` in the tuple
    sort_value_idx = entry.index(sort_value)

    for (i, row) in enumerate(leaderboard):
        # if the score is lower than the current score
        # then insert the current entry before it
        if row[sort_value_idx] < sort_value:
            leaderboard.insert(i, entry)
            return

    leaderboard.append(entry)


def save_score_ng(data: dict) -> None:
    """Save the score for a user into leaderboard.

    Leaderboard is sorted by score in descending order.
    """
    # create dict to load file values
    leaderboard_ng = dict()
    # load and append to dict, clear file and dump
    with open('leaderboard.json', 'r+') as f:
        leaderboard_ng = json.load(f)
        leaderboard_ng["user_scores"].append(data)
        f.seek(0)
        f.truncate(0)
        json.dump(leaderboard_ng, f, indent=4)
        f.close()


def start() -> None:
    """Launched with `poetry run start` at root level"""
    uvicorn.run("backend.main:app", port=8000, log_level="info", reload=True)
