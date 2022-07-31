import json
import os
import random
from collections import namedtuple
from typing import List, Tuple

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

BLOCK_SIZE = 20
CANVAS_HEIGHT = 500
CANVAS_WIDTH = 500
LEADERBOARD_SORT_BY = "score"
BACKEND = os.path.join(os.getcwd(), "frontend")
app = FastAPI()

snake_position: List[int]
score: int
snake_size: int
difficulty: int
tigger_bug: bool
leaderboard: List[Tuple]
food_list: List[List[int]]


FoodType = namedtuple("FoodType", ["name", "min_score", "weight", "food_type", "value"])
# score = seconds survived * 1000 = milliseconds survived
# Xe3 means X * 1000, i.e., X is the seconds survived
# value = quantitative value associated with the food
# can have different meaning for different foods

# value -> decrease in difficulty
TIME_FOOD = FoodType("time", 45e3, 10, 0, 2000)
# value -> increase in hp (x)
HP_X_FOOD = FoodType("hp_x", 20e3, 50, 1, 3)
FEATURE_FOOD = FoodType("feature", 30e3, 10, 2, 1)
# value -> increase in hp (1)
HP_1_FOOD = FoodType("hp_1", 0, 100, 3, 1)

ALL_FOODS = [TIME_FOOD, HP_X_FOOD, FEATURE_FOOD, HP_1_FOOD]


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
    snake_size = 3
    difficulty = 3*1000  # time in milliseconds
    trigger_bug = False
    leaderboard = load_leaderboard()
    foods_list = food_list()
    await send_food_list(websocket, foods_list)
    try:
        while True:
            receive_data = await websocket.receive_json()

            if "info" in receive_data:
                snake_position = receive_data["info"]["snake_pos"]
                score = receive_data["info"]["score"]

                # increase difficulty based on score
                if score >= 60000 and score % 15000 == 0 and difficulty > 1000:
                    difficulty -= 1000
                    await update_difficulty(websocket, difficulty)
                elif score % 15000 == 0 and difficulty > 2000:
                    difficulty -= 1000
                    await update_difficulty(websocket, difficulty)

                print("Snake position: ", snake_position, "| Score: ", score)

            if "food_eaten" in receive_data:
                food_eaten = foods_list[receive_data["food_eaten"]]
                # time food
                if food_eaten[3] == 0:
                    difficulty += TIME_FOOD.value
                    await update_difficulty(websocket, difficulty)
                # hp x food
                elif food_eaten[3] == 1:
                    # increase snake size by X
                    snake_size += HP_X_FOOD.value
                # feature food
                elif food_eaten[3] == 2:
                    # add a bug feature
                    trigger_bug = not trigger_bug
                    await send_trigger_bug(websocket, trigger_bug)
                # hp 1 food
                else:
                    snake_size += HP_1_FOOD.value
                del foods_list[receive_data["food_eaten"]]
                foods_list.append(food := create_food(score))
                await send_single_food(websocket, food)

            if "save" in receive_data:
                leaderboard = await save_score(websocket, receive_data["save"], leaderboard)
                print("leaderboard: ", leaderboard)

            if "snake_size" in receive_data:
                snake_size = receive_data["snake_size"]

            if "Game_Over" in receive_data:
                await send_leaderboard(websocket, leaderboard)
                print("Gameover: ", receive_data["Game_Over"])

    except WebSocketDisconnect:
        print("Connection closed by client")


async def send_food_list(socket: WebSocket, food_list: List[List[int]]) -> None:
    """Send created food list to client."""
    await socket.send_json({"food_list": food_list})


async def send_single_food(socket: WebSocket, food: List[int]) -> None:
    """Send single created food data to client."""
    await socket.send_json({"food": food})


async def send_leaderboard(socket: WebSocket, leaderboard: List[Tuple]) -> None:
    """Send leaderboard data to client."""
    await socket.send_json({"leaderboard": leaderboard})


async def update_difficulty(socket: WebSocket, difficulty: int) -> None:
    """Send difficulty update data to client."""
    await socket.send_json({"difficulty": difficulty})


async def send_trigger_bug(socket: WebSocket, trigger_bug: bool) -> None:
    """Send bug/feature state to data to client."""
    await socket.send_json({"bug_feature": trigger_bug})


async def send_alert(socket: WebSocket, alert: str) -> None:
    """Send alert to client."""
    await socket.send_json({"alert": alert})


def create_food(score: int) -> List[int]:
    """
    Create one food item for snake to consume.

    List of the form [postion_x, position_y, direction, food_type].
    """
    food_x = random.randint(0, CANVAS_WIDTH - BLOCK_SIZE)  # noqa: S311
    food_y = random.randint(0, CANVAS_HEIGHT - BLOCK_SIZE)  # noqa: S311
    food_direction = random.randint(0, 3)  # up, down, left, right  # noqa: S311
    foodtype = get_food_type(score)
    return [food_x, food_y, food_direction, foodtype]


def get_food_type(score: int) -> int:
    """
    Return food type depending on score and rarity.

    Food type is either 0, 1, 2 or 3.
    """
    food = HP_1_FOOD

    valid_foods = [HP_1_FOOD]

    # add valid foods to the list
    for food in ALL_FOODS:
        if food.min_score <= score:
            valid_foods.append(food)

    # get a random food from the list based on weight
    food = random.choices(valid_foods, weights=[f.weight for f in valid_foods], k=1)[0]  # noqa: S311

    return food.food_type


def food_list() -> List[List[int]]:
    """
    Create a list of food items for snake to consume.

    List of the form [food, food, food ...].
    """
    food_list = []
    for _ in range(5):
        food = create_food(0)
        food_list.append(food)
    return food_list


async def save_score(websocket: WebSocket, data: dict, list: List) -> List[tuple]:
    """Save the score for a user into leaderboard.

    Leaderboard is sorted by score in descending order.
    """
    # check if the user is already in the leaderboard
    if data["user"] in [row[0] for row in list]:
        # if so, update the score of the user
        for row in list:
            if row[0] == data["user"]:
                # check if the score is higher than the previous one
                if data["score"] > row[1]:
                    entry = tuple(data.values())
                    list.remove(row)
                    alert = "Congrats, you set a new Higher Score!"
                    break
                # if not, discard the score
                else:
                    alert = "Sorry! Your score was lower than the previous one :<"
                    entry = None
    # if not, add the user to the leaderboard
    else:
        # convert dict to tuple of its values
        entry = tuple(data.values())
        alert = "Congrats! You made it to the leaderboard!"

    # check if the entry is not None//if the score is lower than the previous one
    if entry is not None:
        list.append(entry)
        # sort by score in descending order
        list.sort(key=lambda x: x[1], reverse=True)
        save_score_to_file(list)

    await send_leaderboard(websocket, list)
    await send_alert(websocket, alert)
    return list


def save_score_to_file(data: list) -> None:
    """Save the leaderboard into leaderboard.json."""
    # convert list of tuples to list of dicts
    data = [dict(zip(data[0], row)) for row in data]
    # create dict to load file values
    file_data = dict()
    with open('leaderboard.json', 'r+') as f:
        file_data = json.load(f)
        f.seek(0)
        # append new data and delete old data
        file_data.update({"user_scores": data})
        f.truncate(0)
        json.dump(file_data, f, indent=4)
        f.close()


def load_leaderboard() -> List[Tuple]:
    """Load leaderboard from file."""
    with open('leaderboard.json', 'r') as f:
        leaderboard = json.load(f)
        f.close()
    leaderboard = leaderboard["user_scores"]
    for i, row in enumerate(leaderboard):
        leaderboard[i] = tuple(row.values())
    return leaderboard


app.mount("/game", StaticFiles(directory="frontend", html=True), name="game")


def start() -> None:
    """Launched with `poetry run start` at root level"""
    uvicorn.run("backend.main:app", port=8000, log_level="info", reload=True)
