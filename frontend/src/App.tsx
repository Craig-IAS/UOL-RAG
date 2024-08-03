import React, {useState} from 'react';
import {fetchEventSource} from "@microsoft/fetch-event-source";
import logo from './logo.svg';
import './App.css';

interface  Message {
    message: string;
    isUser: boolean;
    sources? : string[];
}
function App() {
    const [inputValue,setInputValue] = useState('');
    const [messages,setMessages] = useState<Message[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSelectedFile(file);

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('http://localhost:8000/upload/', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                console.log(result);
            } else {
                console.error('File upload failed');
            }
        }
    };

    const setPartialMessage = (chunk: string, sources: string[] = []) => {
    setMessages(prevMessages => {
      let lastMessage = prevMessages[prevMessages.length - 1];
      if (prevMessages.length === 0 || !lastMessage.isUser) {
        return [...prevMessages.slice(0, -1), {
          message: lastMessage.message + chunk,
          isUser: false,
          sources: lastMessage.sources ? [...lastMessage.sources, ...sources] : sources
        }];
      }

      return [...prevMessages, {message: chunk, isUser: false, sources}];
    })
  }
  function handleReceiveMessage(data: string) {
    let parsedData = JSON.parse(data);

    if (parsedData.answer) {
      setPartialMessage(parsedData.answer.content)
    }

    if (parsedData.docs) {
      setPartialMessage("", parsedData.docs.map((doc: any) => doc.metadata.source))
    }
  }
    const  handleSendMessage = async (message:string) => {

        setInputValue("");
        setMessages((prevMessages) => [...prevMessages, {message, isUser: true}]);
        await fetchEventSource('http://localhost:8000/rag/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                input: {
                    question:   message
                }
            }),
            onmessage: (event) => {
                if (event.event==="data") {
                 handleReceiveMessage(event.data);
                }

            }
        });
    }
    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          handleSendMessage(inputValue.trim());
        }
    }
    const formatSource = (source: string) => {
        return source.split("/").pop() || "";
        
    };
    return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className={`bg-gray-800 text-white flex items-center justify-center h-16`}>
          UOL Final project
      </header>
        <main className="flex-grow container mx-auto p-4 flex-col">
            <div className="flex-grow bg-gray-700 shadow overflow-hidden sm:rounded-lg">
                <div className="border-b border-gray-600 p-4">
                      {messages.map((msg, index) => (
              <div key={index}
                   className={`p-3 my-3 rounded-lg text-white ml-auto ${msg.isUser ? "bg-gray-800" : "bg-gray-900"}`}>
                {msg.message}
                {/*  Source */}
                {!msg.isUser && (
                  <div className={"text-xs"}>
                    <hr className="border-b mt-5 mb-5"></hr>
                    {msg.sources?.map((source, index) => (
                      <div>
                         <a
                          target="_blank"
                          download
                          href={`${"http://localhost:8000"}/rag/static/${encodeURI(formatSource(source))}`}
                          rel="noreferrer"
                        >{formatSource(source)}</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
                </div>
                <div className="p-4 bg-gray-800">
            <textarea
                className="form-textarea w-full p-2 border rounded text-white bg-gray-900 border-gray-600 resize-none h-auto"
                placeholder="Enter your message here..."
                onKeyUp={handleKeyPress}
                onChange={(e) => setInputValue(e.target.value)}
                value={inputValue}

            ></textarea>
                    <button
                        className="mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                        onClick={()=>handleSendMessage(inputValue.trim())}

                    >
                        Send
                    </button>
                </div>
            </div>
             {/*add drag and drop to upload files*/}
                <div className="flex justify-center mt-4">
                    <label className="flex flex-col items-center px-4 py-6 bg-white text-blue rounded-lg shadow-lg tracking-wide uppercase border border-blue cursor-pointer hover:bg-blue hover:text-white">
                        <svg
                            className="w-8 h-8"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M10 12a2 2 0 100-4 2 2 0 000 4zm0 2a4 4 0 100-8 4 4 0 000 8zm-1 2a1 1 0 112 0v3a1 1 0 11-2 0v-3zm-1-2a3 3 0 116 0 3 3 0 01-6 0z"
                            />
                        </svg>
                        <span className="mt-2 text-base leading-normal">Upload a file</span>
                        <input type="file" className="hidden" onChange={handleFileChange} />
                    </label>
                </div>


        </main>
        <footer className={`bg-gray-800 text-white flex items-center justify-center h-16`}>

        </footer>

    </div>
    );
}

export default App;
