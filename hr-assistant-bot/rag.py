"""
RAG-рушій для HR-бота.
Завантажує документи з папки docs/, індексує їх у ChromaDB,
шукає релевантні фрагменти та генерує відповідь через OpenAI.
"""

import asyncio
import logging
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.document_loaders import (
    DirectoryLoader,
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    UnstructuredHTMLLoader,
)
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

load_dotenv()
logger = logging.getLogger(__name__)

DOCS_DIR = Path(os.getenv("DOCS_DIR", "docs"))
CHROMA_DIR = Path(os.getenv("CHROMA_DIR", "chroma_db"))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

HR_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""Ти — HR-асистент компанії. Відповідай на запитання співробітників,
спираючись ТІЛЬКИ на надану базу знань компанії.

Правила:
- Відповідай тією ж мовою, якою написане запитання (українська, англійська, португальська, хінді, іспанська).
- Якщо відповідь є в базі знань — дай чітку, структуровану відповідь.
- Якщо відповіді немає в базі знань — скажи: "На жаль, я не знайшов відповіді на це питання в базі знань. Будь ласка, зверніться до HR-команди безпосередньо."
- Не вигадуй інформацію, якої немає в контексті.
- Будь ввічливим і доброзичливим.
- Використовуй емодзі помірно для кращого сприйняття.

База знань компанії:
{context}

Запитання: {question}

Відповідь:""",
)


class HRRagEngine:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            openai_api_key=OPENAI_API_KEY,
        )
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.2,
            openai_api_key=OPENAI_API_KEY,
        )
        self.vectorstore: Chroma | None = None
        self.qa_chain: RetrievalQA | None = None

    def _get_loaders(self):
        """Завантажувачі для різних форматів документів."""
        loaders = []
        if not DOCS_DIR.exists():
            DOCS_DIR.mkdir(parents=True)
            logger.warning(f"Папка {DOCS_DIR} не існувала — створено.")

        for file in DOCS_DIR.rglob("*"):
            if file.suffix.lower() == ".pdf":
                loaders.append(PyPDFLoader(str(file)))
            elif file.suffix.lower() in (".docx", ".doc"):
                loaders.append(Docx2txtLoader(str(file)))
            elif file.suffix.lower() in (".txt", ".md"):
                loaders.append(TextLoader(str(file), encoding="utf-8"))
            elif file.suffix.lower() in (".html", ".htm"):
                loaders.append(UnstructuredHTMLLoader(str(file)))

        logger.info(f"Знайдено {len(loaders)} документів у {DOCS_DIR}")
        return loaders

    def load(self):
        """Завантаження та індексування документів."""
        # Якщо ChromaDB вже є — просто підключаємось
        if CHROMA_DIR.exists() and any(CHROMA_DIR.iterdir()):
            logger.info("Завантажую існуючу ChromaDB...")
            self.vectorstore = Chroma(
                persist_directory=str(CHROMA_DIR),
                embedding_function=self.embeddings,
            )
        else:
            logger.info("Будую нову базу знань...")
            self._rebuild_index()

        self._build_chain()

    def reload(self):
        """Повне перебудування індексу (після додавання нових документів)."""
        import shutil
        if CHROMA_DIR.exists():
            shutil.rmtree(CHROMA_DIR)
        self._rebuild_index()
        self._build_chain()
        logger.info("База знань перебудована.")

    def _rebuild_index(self):
        """Читає документи, ділить на чанки, будує векторний індекс."""
        loaders = self._get_loaders()
        if not loaders:
            logger.warning("Немає документів для індексування! Покладіть файли у папку docs/")
            # Створюємо порожній стор щоб бот не падав
            self.vectorstore = Chroma(
                persist_directory=str(CHROMA_DIR),
                embedding_function=self.embeddings,
            )
            return

        # Завантажуємо всі документи
        all_docs = []
        for loader in loaders:
            try:
                docs = loader.load()
                all_docs.extend(docs)
            except Exception as e:
                logger.error(f"Помилка завантаження {loader}: {e}")

        # Ділимо на чанки
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        chunks = splitter.split_documents(all_docs)
        logger.info(f"Створено {len(chunks)} чанків із {len(all_docs)} документів")

        # Будуємо векторний стор
        self.vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            persist_directory=str(CHROMA_DIR),
        )

    def _build_chain(self):
        """Будує QA-ланцюжок."""
        if self.vectorstore is None:
            return

        retriever = self.vectorstore.as_retriever(
            search_type="mmr",          # Maximum Marginal Relevance — різноманітніші результати
            search_kwargs={"k": 5},
        )

        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=retriever,
            return_source_documents=True,
            chain_type_kwargs={"prompt": HR_PROMPT},
        )

    async def answer(self, question: str) -> dict[str, Any]:
        """Асинхронна відповідь на запитання."""
        if self.qa_chain is None:
            return {
                "answer": "База знань ще не завантажена. Зверніться до адміністратора.",
                "found": False,
                "sources": [],
            }

        # Запускаємо синхронний ланцюжок у пулі потоків
        result = await asyncio.to_thread(
            self.qa_chain.invoke, {"query": question}
        )

        answer = result.get("result", "")
        source_docs = result.get("source_documents", [])

        # Збираємо унікальні назви джерел
        sources = list({
            Path(doc.metadata.get("source", "")).name
            for doc in source_docs
            if doc.metadata.get("source")
        })

        found = "не знайшов відповіді" not in answer.lower() and "зверніться до hr" not in answer.lower()

        return {"answer": answer, "found": found, "sources": sources}
