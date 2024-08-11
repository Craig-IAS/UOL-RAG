// DocumentList.tsx
import React from 'react';

interface DocumentListProps {
    documents: string[];
}

const DocumentList: React.FC<DocumentListProps> = ({ documents }) => {
    const getDownloadUrl = (doc: string) => {
        return `http://localhost:8000/rag/static/${encodeURI(doc)}`;
    };

    return (
        <div className="bg-gray-800 text-white p-4 mt-8 mb-8 ml-4 mr-4 rounded-lg">
            <h2 className="text-lg font-bold mb-4">Loaded Documents</h2>
            <ul>
                {documents.map((doc, index) => (
                    <li key={index} className="mb-2">
                        <a href={getDownloadUrl(doc)} download target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                            {doc}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default DocumentList;