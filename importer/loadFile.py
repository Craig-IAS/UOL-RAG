import logging
import os

from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader, UnstructuredPDFLoader
from langchain_community.vectorstores import PGVector
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings


# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

def load_file_to_pgvector(filename: str):
    from langchain_community.document_loaders import UnstructuredPDFLoader
    from langchain_experimental.text_splitter import SemanticChunker
    from langchain_openai import OpenAIEmbeddings
    from langchain_community.vectorstores import PGVector
    from config import EMBEDDING_MODEL, PG_COLLECTION_NAME, POSTGRES_CONNECTION_STRING

    logging.debug(f"Starting to load file: {filename}")

    try:
        # Load the document
        loader = UnstructuredPDFLoader(os.path.abspath(filename))
        docs = loader.load()
        logging.debug(f"Loaded document: {docs}")

        # Create embeddings
        embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)
        logging.debug("Created embeddings")

        # Split the document into chunks
        text_splitter = SemanticChunker(embeddings=embeddings)
        chunks = text_splitter.split_documents(docs)
        logging.debug(f"Split document into chunks: {chunks}")

        # Store the chunks in the PGVector vector store
        PGVector.from_documents(
            documents=chunks,
            embedding=embeddings,
            collection_name=PG_COLLECTION_NAME,
            connection_string=POSTGRES_CONNECTION_STRING,
            pre_delete_collection=False,
        )
        logging.debug("Stored chunks in PGVector")

    except Exception as e:
        logging.error(f"An error occurred: {e}")