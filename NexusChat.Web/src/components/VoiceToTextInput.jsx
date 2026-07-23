import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Camera, Mic, MicOff, Send, Smile } from 'lucide-react';

export const VoiceToTextInput = ({ onSend, onOpenAttachment, onOpenCamera, onTyping }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (err) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleChangeText = (e) => {
    setText(e.target.value);
    if (onTyping) onTyping();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text || !text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="input-bar-container">
      <div className="input-actions-left">
        <button
          type="button"
          className="input-action-btn"
          onClick={onOpenAttachment}
          title="Add Attachment"
        >
          <Paperclip size={20} />
        </button>
        <button
          type="button"
          className="input-action-btn"
          onClick={onOpenCamera}
          title="Open Camera"
        >
          <Camera size={20} />
        </button>
      </div>

      <div className="input-field-wrapper">
        <input
          type="text"
          value={text}
          onChange={handleChangeText}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening... Speak now...' : 'Type a message...'}
          className={`chat-input-field ${isListening ? 'listening' : ''}`}
        />
      </div>

      <div className="input-actions-right">
        <button
          type="button"
          className={`input-action-btn ${isListening ? 'recording' : ''}`}
          onClick={toggleListening}
          title={isListening ? 'Stop Listening' : 'Voice-to-Text Dictation'}
        >
          {isListening ? <MicOff size={20} className="text-red-400" /> : <Mic size={20} />}
        </button>

        <button
          type="button"
          className="send-msg-btn"
          onClick={handleSend}
          disabled={!text.trim()}
          title="Send Message"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
