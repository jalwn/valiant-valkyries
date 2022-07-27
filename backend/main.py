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
            # Recive data from client
            receive_data = await websocket.receive_json()
            print(receive_data)
            # Todo: take this data and calculate where more food will spawn
            # and which direction would it move

            # sending dummy data to the client
            data = {
                "food": create_food()
            }
            await websocket.send_json(data)
            # Todo: send back the food location and direction where the food will move
    except Exception as e:
        print(f"Connection closed with code {e.args[0]}")


# Try to do it functionally and efficiently (cpu budget: 100ms+network budget: 40ms)
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
