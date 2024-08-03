import os

from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader, UnstructuredPDFLoader
from langchain_community.vectorstores import PGVector
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

from config import EMBEDDING_MODEL, PG_COLLECTION_NAME, POSTGRES_CONNECTION_STRING

load_dotenv()

loader = DirectoryLoader(
    os.path.abspath("../source_docs"),
    glob="**/*.pdf",
    #use_multithreading=True,
    show_progress=True,
    max_concurrency=50,
    loader_cls=UnstructuredPDFLoader,
)
docs = loader.load()
print(docs)

embeddings=OpenAIEmbeddings(
    model=EMBEDDING_MODEL,
)

text_splitter = SemanticChunker(
    embeddings=OpenAIEmbeddings()
)

chunks = text_splitter.split_documents(docs)

PGVector.from_documents(
    documents=chunks,
    embedding=embeddings,
    collection_name=PG_COLLECTION_NAME,
    connection_string=POSTGRES_CONNECTION_STRING,
    pre_delete_collection=True,
),

print("chunks")
print(chunks)