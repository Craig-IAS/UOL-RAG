import os
from operator import itemgetter
from typing import TypedDict

from dotenv import load_dotenv
from langchain_community.vectorstores.pgvector import PGVector
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableParallel
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from config import PG_COLLECTION_NAME, POSTGRES_CONNECTION_STRING

load_dotenv()

vector_store = PGVector(
    collection_name=PG_COLLECTION_NAME,
    connection_string=POSTGRES_CONNECTION_STRING,
    embedding_function=OpenAIEmbeddings(),
)
template = """
Answer given the following context:
{context}

Question: {question}
"""

ANSWER_PROMPT = ChatPromptTemplate.from_template(template)

llm = ChatOpenAI(temperature=0, model='gpt-4-1106-preview', streaming=True)


class RagInput(TypedDict):
    question: str


final_chain = (
        RunnableParallel(
            context=(itemgetter("question") | vector_store.as_retriever()),
            question=itemgetter("question")
        ) |
        RunnableParallel(
            answer=(ANSWER_PROMPT | llm),
            docs=itemgetter("context")
        )

).with_types(input_type=RagInput)


























# final_chain = {"context": itemgetter("question") | vector_store.as_retriever() , "question": itemgetter("question")} | ANSWER_PROMPT | llm | StrOutputParser()
# FINAL_CHAIN_INVOKE = final_chain.astream_log({"question":"What are the challenges in evaulating a RAG system, provides quotes from the paper to support your answer?"})
# async def __main__():
#     async for c in FINAL_CHAIN_INVOKE:
#         print(c)
# asyncio.run(__main__())
