from fastapi import FastAPI, WebSocket

app = FastAPI()


@app.websocket_route("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Websocket server endpoint

    This function is called when a websocket connection is made.
    and it is used to send and recive data to the client.
    """
    await websocket.accept()
    while True:

        # Recive data from client
        receive_data = await websocket.receive_json()
        print(receive_data)
        # Todo: take this data and calculate where more food will spawn
        # and which direction would it move

        # sending dummy data to the client
        data = {
            "type": "move"
        }
        await websocket.send_json(data)
        # Todo: send back the food location and direction where the food will move


# Try to do it functionally and efficiently (cpu budget: 100ms+network budget: 40ms)
