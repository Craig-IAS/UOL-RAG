import React, {useState, useEffect, useRef} from 'react';
import {fetchEventSource} from "@microsoft/fetch-event-source";
import logo from './logo.svg';
import './App.css';
import DocumentList from './DocumentList';
import {v4 as uuidv4} from "uuid";

interface  Message {
    message: string;
    isUser: boolean;
    sources? : string[];
}

async function fetchDocumentList(): Promise<string[]> {
    const response = await fetch('http://localhost:8000/documents/');
    if (!response.ok) {
        throw new Error('Failed to fetch document list');
    }
    const data = await response.json();
    return data.documents;
}
function App() {
    const [inputValue,setInputValue] = useState('');
    const [messages,setMessages] = useState<Message[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [documentList, setDocumentList] = useState<string[]>([]);
    const sessionIdRef = useRef<string>(uuidv4());

    const loadDocumentList = async () => {
        try {
            const documents = await fetchDocumentList();
            setDocumentList(documents);
        } catch (error) {
            console.error('Failed to load document list', error);
        }
    };

    useEffect(() => {
        sessionIdRef.current = uuidv4();
        loadDocumentList();
    }, []);

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
                loadDocumentList(); // Refresh document list after successful upload

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
    console.log(parsedData);
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
                },
                config:{
                    configurable:{
                        session_id: sessionIdRef.current,

                    }

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
        <main className="flex-grow container mx-auto p-4 flex">
            <div className="w-1/4 bg-gray-700 shadow overflow-hidden sm:rounded-lg  mr-4" >
                <DocumentList documents={documentList}/>
            </div>
            <div className="w-3/4 bg-gray-700 shadow overflow-hidden sm:rounded-lg">
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
                        onClick={() => handleSendMessage(inputValue.trim())}

                    >
                        Send
                    </button>

                    {/*add drag and drop to upload files*/}
                    <div className="flex justify-center mt-4">
                        <label
                            className="flex flex-col items-center px-4 py-6 bg-white text-blue
                            rounded-lg shadow-lg tracking-wide uppercase border
                            border-blue cursor-pointer hover:bg-blue hover:text-white">
                            <span className="mt-2 text-base leading-normal">Upload a file</span>
                            <input type="file" className="hidden" onChange={handleFileChange}/>
                        </label>
                    </div>
                </div>
            </div>


        </main>
        <footer className={`bg-gray-800 text-white flex items-center justify-center h-16`}>

        </footer>

    </div>
    );
}

export default App;
