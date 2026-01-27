import { useState, useEffect, useRef } from 'react'
import './App.css'
import Live2DViewer from './Live2DViewer';

function App() {
  const [messages, setMessages] = useState([]);
  const ws = useRef(null);
  const [showLogs, setShowLogs] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const currentAudio = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8000/ws/chat");

    ws.current.onopen = () => {
      console.log("连接成功");
      setMessages(prev => [...prev, { role: "system", content: "WebSocket 连接已建立" }]);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setMessages(prev => [...prev, { role: data.sender, content: data.content }]);
      }
      else if (data.type === 'voice') {
        if (currentAudio.current) {
          currentAudio.current.pause();
        }
        const audioContent = data.content;
        const audio = new Audio(`data:audio/wav;base64,${audioContent}`);
        currentAudio.current = audio;
        audio.onended = () => {
          currentAudio.current = null;
        };
        audio.play();
      }
    };
    ws.current.onclose = () => {
      console.log("连接关闭");
      setMessages(prev => [...prev, { role: "system", content: "WebSocket 连接已关闭" }]);
    }
    return () => {
      if (ws.current)
        ws.current.close();
    };
  }, []);

  const handleSend = () => {
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current = null;
    }
    if (!inputValue.trim()) return;
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        sender: "user",
        format: "text",
        content: inputValue,
        time: new Date().toISOString()
      }));
      setMessages(prev => [...prev, { role: "user", content: inputValue }]);
      setInputValue("");
      if (currentAudio.current) {
        currentAudio.current.pause();
        currentAudio.current = null;
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = reader.result.split(',')[1];
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
              sender: "user",
              type: "voice",
              format: "audio",
              content: base64String,
              time: new Date().toISOString()
            }));
            setMessages(prev => [...prev, { role: "system", content: "[语音消息已发送]" }]);
          }
        };
      };

      mediaRecorder.current.start();
      if (currentAudio.current) {
        currentAudio.current.pause();
        currentAudio.current = null;
      }
      setIsRecording(true);
    }
    catch (err) {
      console.error("获取麦克风失败:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="app-container">
      <Live2DViewer />
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            {showLogs ? "系统日志" : "历史对话"}
          </div>
          <button
            className="icon-btn"
            onClick={() => setShowLogs(!showLogs)}
            title={showLogs ? "返回对话" : "查看日志"}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
          </button>
        </div>
        <div className="message-list">
          {messages
            .filter(msg => showLogs ? msg.role === "system" : msg.role !== "system")
            .map((msg, index) => (
              <div
                key={index}
                className={`message-item ${msg.role}`}
                style={showLogs ? { fontSize: '12px', color: '#666', fontFamily: 'monospace' } : {}}
              >
                {msg.content}
              </div>
            ))}
          {messages.filter(msg => showLogs ? msg.role === "system" : msg.role !== "system").length === 0 && (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '20px', fontSize: '12px' }}>
              {showLogs ? "暂无系统日志" : "暂无对话记录"}
            </div>
          )}
        </div>
      </div>
      <div className="main-area">
        <div className="input-area">
          <input
            type="text"
            placeholder="和我说点什么吧..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button
            className={`icon-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "停止录音" : "点击开始说话"}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>
          <button className="send-btn" onClick={handleSend} title={"单击或enter发送消息"}>
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

export default App