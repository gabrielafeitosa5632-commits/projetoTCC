from __future__ import annotations

import os
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from python_api.pipeline import Sensitivity, decode_image, segment_leaf


MAX_UPLOAD_BYTES = int(os.environ.get("PHYTO_MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))
allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "PHYTO_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,https://localhost",
    ).split(",")
    if origin.strip()
]

app = FastAPI(
    title="PhytoPathometric Leaf Segmentation API",
    version="1.0.0",
    description="Segmentação automática conservadora de tecido foliar, doenças e desfolha.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Accept", "Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/segment-leaf")
async def segment_leaf_endpoint(
    image: Annotated[UploadFile, File(description="Fotografia foliar em JPEG, PNG ou WebP")],
    sensitivity: Annotated[Sensitivity, Form()] = "automatico",
) -> JSONResponse:
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="O arquivo enviado não é uma imagem.")

    content = await image.read(MAX_UPLOAD_BYTES + 1)
    if not content:
        raise HTTPException(status_code=400, detail="A imagem está vazia.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="A imagem excede o limite configurado.")

    try:
        rgb = await run_in_threadpool(decode_image, content)
        result = await run_in_threadpool(segment_leaf, rgb, sensitivity)
    except (UnidentifiedImageError, OSError) as error:
        raise HTTPException(status_code=400, detail="Não foi possível decodificar a imagem.") from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return JSONResponse(result.response)
