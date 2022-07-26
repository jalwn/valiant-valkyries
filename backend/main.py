from fastapi import FastAPI, WebSocket
import time

app = FastAPI()

@app.websocket_route("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        pass