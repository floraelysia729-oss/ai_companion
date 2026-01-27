import sys
import os
import time
import re

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ai_modules
import asyncio
import json
import base64
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def receive(self, websocket: WebSocket) -> dict:
        data = await websocket.receive_text()
        return json.loads(data)

    async def send(self, content: dict, websocket: WebSocket):
        await websocket.send_text(json.dumps(content))


def data_construct(
    sender: str, type: str, format: str, time: str, content, live2d_emotion=None
) -> dict:
    if isinstance(content, bytes):
        content = base64.b64encode(content).decode("utf-8")
    if live2d_emotion is not None:
        return {
            "sender": sender,
            "type": type,
            "format": format,
            "time": time,
            "content": content,
            "live2d_emotion": live2d_emotion,
        }
    return {
        "sender": sender,
        "type": type,
        "format": format,
        "time": time,
        "content": content,
    }


manager = ConnectionManager()


@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            message = await manager.receive(websocket)
            message_type = message.get("format")
            content = message.get("content")
            text = ""
            if message_type == "text":
                text = content
            elif message_type == "audio":
                audio_data = content
                text = await ai_modules.ASR.speech_to_text(audio_data)
                print(f"Recognized text: {text}")
                user_message = data_construct(
                    sender="user",
                    type="message",
                    format="text",
                    time=str(time.time()),
                    content=text,
                )
                await manager.send(user_message, websocket)
            ai_response = await ai_modules.LLM.generate_response(text)
            emotion_tag = re.search(r"\[(.*?)\]", ai_response)
            ai_message = data_construct(
                sender="ai",
                type="message",
                format="text",
                time=str(time.time()),
                content=ai_response,
                live2d_emotion=emotion_tag.group(1) if emotion_tag else None,
            )
            await manager.send(ai_message, websocket)
            tts_audio = await ai_modules.TTS.text_to_speech(ai_response)
            ai_audio_message = data_construct(
                sender="ai",
                type="voice",
                format="audio",
                time=str(time.time()),
                content=tts_audio,
            )
            await manager.send(ai_audio_message, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("client disconnected")


if __name__ == "__main__":
    uvicorn.run("server:app", host="localhost", port=8000, reload=True)
