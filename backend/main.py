from fastapi import FastAPI, WebSocket
import time

app = FastAPI()

@app.websocket_route("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        
        receive_data = await websocket.receive_json()
        #Todo: take this data and calculate where more food will spawn
        #and which direction would it move
        print(receive_data)

        #Todo: send back the food location and direction where the food will move 
        data = {
            "type": "move"
        }
        await websocket.send_json(data)

#try to do it functionally 