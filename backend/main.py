import math
import random
from typing import List

from fastapi import FastAPI, WebSocket

BLOCK_SIZE = 10
app = FastAPI()


@app.websocket_route("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Websocket server endpoint

    This function is called when a websocket connection is made.
    and it is used to send and recive data to the client.
    """
    await websocket.accept()
    try:
        while True:
            # Send food data to client
            foodList = create_food()
            await send_food_client(websocket, foodList)

            # Recive data from client
            receive_data = await websocket.receive_json()
            print(receive_data)
    except Exception as e:
        print(f"Connection closed with code {e.args[0]}")


async def send_food_client(socket: WebSocket, food_list: List[List[int]]) -> None:
    """Send created food data to client."""
    await socket.send_json({"food": food_list})


def create_food() -> List[List[int]]:
    """
    Create a list of food items for snake to consume.

    Inner list in the form [postion_x, position_y, direction].
    """
    food_list = []
    for _ in range(3):
        ran = random.SystemRandom()
        r = math.floor(ran.random() * 40)
        food_x = r * BLOCK_SIZE
        r = math.floor(ran.random() * 40)
        food_y = r * BLOCK_SIZE
        food_direction = math.floor(ran.random() * 3)
        food_list.append([food_x, food_y, food_direction])
    return food_list
