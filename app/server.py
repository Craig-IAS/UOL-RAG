from fastapi import FastAPI, File, UploadFile
from fastapi.responses import RedirectResponse
from langserve import add_routes
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from importer.loadFile import load_file_to_pgvector

from app.rag_chain import final_chain

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount("/rag/static", StaticFiles(directory="./source_docs"), name="static")
@app.get("/")
async def redirect_root_to_docs():
    return RedirectResponse("/docs")
@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    file_location = f"./source_docs/{file.filename}"
    with open(file_location, "wb") as f:
        f.write(file.file.read())
    # Call the function to load the file to PGVector
    load_file_to_pgvector(file_location)
    return {"info": f"file '{file.filename}' saved at '{file_location}'"}


# Edit this to add the chain you want to add
add_routes(app, final_chain, path="/rag")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
