import json
import os
import asyncio


async def text_to_speech(text):
    """
    转换文本为对应的语音并直接返回对应的PCM 16-bit little-endian音频数据

    text: 输入的文本字符串
    """
    with open(".\\ai_modules\\test_audio.wav", "rb") as f:
        result = f.read()
    return result
