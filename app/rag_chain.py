import os
from operator import itemgetter
from typing import TypedDict

from dotenv import load_dotenv
from langchain.retrievers import MultiQueryRetriever
from langchain_community.chat_message_histories import SQLChatMessageHistory
from langchain_community.vectorstores.pgvector import PGVector
from langchain_core.messages import get_buffer_string
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from config import PG_COLLECTION_NAME, POSTGRES_CONNECTION_STRING,POSTGRES_MEMORY_CONNECTION_STRING

load_dotenv()

vector_store = PGVector(
    collection_name=PG_COLLECTION_NAME,
    connection_string=POSTGRES_CONNECTION_STRING,
    embedding_function=OpenAIEmbeddings(),
)
llm = ChatOpenAI(temperature=0, model='gpt-4-1106-preview', streaming=True)



template = """
Answer given the following context:
{context}
if there is no information in the context, please tell me that you cannot answer the question from the uploaded documents. Unless I ask you to answer the question of your own knowledge.
Always include quotes from the document to support your answer and provide the page number of the quote. when giving the document name only provide the name of the document not the full path

Question: {question}
"""

ANSWER_PROMPT = ChatPromptTemplate.from_template(template)




class RagInput(TypedDict):
    question: str


vector_store.as_retriever()

multiquery = MultiQueryRetriever.from_llm(retriever=vector_store.as_retriever(search_type="similarity_score_threshold", search_kwargs={"score_threshold": 0.6}), llm=llm)

no_history = (
        RunnableParallel(
            context=(itemgetter("question") | multiquery),
            question=itemgetter("question")
        ) |
        RunnableParallel(
            answer=(ANSWER_PROMPT | llm),
            docs=itemgetter("context")
        )

).with_types(input_type=RagInput)

history_retriever = lambda sessionId : SQLChatMessageHistory(
        connection_string=POSTGRES_MEMORY_CONNECTION_STRING,
        session_id=sessionId
    )

_conversationTemplate = """ Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question. in its original language.

Chat History: 
{chat_history}
Follow up question: {question}
standalone question:"
"""
condensed_conversation = PromptTemplate.from_template(_conversationTemplate)


standalone_question = RunnableParallel(
    question=RunnableParallel(
        question = RunnablePassthrough(),
        chat_history = lambda x : get_buffer_string(x["chat_history"])
    )
    | condensed_conversation
    | llm
    | StrOutputParser()
)
final_chain = RunnableWithMessageHistory(
    runnable=standalone_question | no_history,
    input_messages_key="question",
    history_messages_key="chat_history",
    out_messages_key="answer",
    get_session_history=history_retriever
)


























