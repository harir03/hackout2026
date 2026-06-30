import json
from pathlib import Path
import chromadb
from google import genai
import httpx

from app.rag.chunker import chunk_text

OLLAMA_URL = "http://localhost:11434"
RAG_SOURCES_DIR = Path(__file__).resolve().parents[2] / ".." / "data" / "rag_sources"

_client: chromadb.ClientAPI | None = None


def _get_chroma_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        persist_dir = Path(__file__).resolve().parents[2] / ".." / "data" / "chroma_db"
        persist_dir.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(path=str(persist_dir))
    return _client


async def _embed_texts(texts: list[str], api_key: str | None = None) -> list[list[float]]:
    try:
        async with httpx.AsyncClient() as client:
            embeddings = []
            for t in texts:
                res = await client.post(
                    f"{OLLAMA_URL}/api/embeddings",
                    json={"model": "nomic-embed-text", "prompt": t},
                    timeout=300.0
                )
                if res.status_code == 200:
                    embeddings.append(res.json()["embedding"])
                else:
                    raise Exception(f"Ollama returned status {res.status_code}")
            return embeddings
    except Exception as e:
        print(f"Ollama batch embedding failed: {e}. Trying Gemini or fallback.")
        if api_key:
            try:
                ai_client = genai.Client(api_key=api_key)
                result = ai_client.models.embed_content(
                    model="text-embedding-004",
                    contents=texts,
                    config={"task_type": "RETRIEVAL_DOCUMENT"},
                )
                return [e.values for e in result.embeddings]
            except Exception as gem_ex:
                print(f"Gemini fallback embedding failed: {gem_ex}")
        
        return [[0.0] * 768 for _ in texts]


async def _embed_query(text: str, api_key: str | None = None) -> list[float]:
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{OLLAMA_URL}/api/embeddings",
                json={"model": "nomic-embed-text", "prompt": text},
                timeout=300.0
            )
            if res.status_code == 200:
                return res.json()["embedding"]
            else:
                raise Exception(f"Ollama returned status {res.status_code}")
    except Exception as e:
        print(f"Ollama query embedding failed: {e}. Trying Gemini or fallback.")
        if api_key:
            try:
                ai_client = genai.Client(api_key=api_key)
                result = ai_client.models.embed_content(
                    model="text-embedding-004",
                    contents=text,
                    config={"task_type": "RETRIEVAL_QUERY"},
                )
                return result.embeddings[0].values
            except Exception as gem_ex:
                print(f"Gemini fallback embedding failed: {gem_ex}")
        
        return [0.0] * 768


async def ingest_sources(api_key: str | None = None) -> dict[str, int]:
    chroma = _get_chroma_client()
    stats = {}

    rbi_text = (RAG_SOURCES_DIR / "rbi_fair_practices.txt").read_text(encoding="utf-8")
    rbi_chunks = chunk_text(rbi_text)

    dpdp_text = (RAG_SOURCES_DIR / "dpdp_act_2023.txt").read_text(encoding="utf-8")
    dpdp_chunks = chunk_text(dpdp_text)

    all_rbi_chunks = rbi_chunks + dpdp_chunks
    all_rbi_sources = (
        ["rbi_fair_practices"] * len(rbi_chunks)
        + ["dpdp_act_2023"] * len(dpdp_chunks)
    )

    rbi_embeddings = await _embed_texts(all_rbi_chunks, api_key)

    try:
        chroma.delete_collection("rbi_guidelines")
    except Exception:
        pass
    rbi_collection = chroma.create_collection(
        name="rbi_guidelines",
        metadata={"description": "RBI Fair Practices Code and DPDP Act 2023"},
    )

    rbi_collection.add(
        ids=[f"rbi_{i}" for i in range(len(all_rbi_chunks))],
        documents=all_rbi_chunks,
        embeddings=rbi_embeddings,
        metadatas=[{"source": src} for src in all_rbi_sources],
    )
    stats["rbi_guidelines"] = len(all_rbi_chunks)

    precedents_raw = json.loads(
        (RAG_SOURCES_DIR / "lending_precedents.json").read_text(encoding="utf-8")
    )

    precedent_chunks = []
    precedent_ids = []
    for ticket in precedents_raw:
        text = (
            f"Ticket: {ticket['ticket_id']} | Category: {ticket['category']}\n"
            f"Profile: {ticket['applicant_profile']}\n"
            f"Issue: {ticket['issue']}\n"
            f"Investigation: {ticket['investigation']}\n"
            f"Resolution: {ticket['resolution']}\n"
            f"RBI Reference: {ticket['rbi_reference']}\n"
            f"Outcome: {ticket['outcome']}"
        )
        sub_chunks = chunk_text(text, chunk_size=400, overlap=50)
        for j, sc in enumerate(sub_chunks):
            precedent_chunks.append(sc)
            precedent_ids.append(f"lp_{ticket['ticket_id']}_{j}")

    lp_embeddings = await _embed_texts(precedent_chunks, api_key)

    try:
        chroma.delete_collection("lending_precedents")
    except Exception:
        pass
    lp_collection = chroma.create_collection(
        name="lending_precedents",
        metadata={"description": "Resolved lending ticket precedents"},
    )

    lp_collection.add(
        ids=precedent_ids,
        documents=precedent_chunks,
        embeddings=lp_embeddings,
        metadatas=[{"source": "lending_precedents"} for _ in precedent_chunks],
    )
    stats["lending_precedents"] = len(precedent_chunks)

    return stats


async def query_collection(
    collection_name: str,
    query_text: str,
    api_key: str | None = None,
    n_results: int = 3,
) -> list[dict]:
    chroma = _get_chroma_client()
    query_embedding = await _embed_query(query_text, api_key)
    try:
        collection = chroma.get_collection(collection_name)
    except Exception:
        return []

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
    )

    retrieved = []
    for i in range(len(results["documents"][0])):
        retrieved.append({
            "id": results["ids"][0][i],
            "text": results["documents"][0][i],
            "source": results["metadatas"][0][i].get("source", "unknown"),
            "distance": results["distances"][0][i] if results.get("distances") else None,
        })

    return retrieved
