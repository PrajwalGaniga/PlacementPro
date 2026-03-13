"""
utils/pdf_parser.py – Extract text from PDF uploads.
"""

import io
from fastapi import UploadFile, HTTPException


async def extract_pdf_text(file: UploadFile) -> str:
    """Extract all text from a PDF UploadFile."""
    contents = await file.read()
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(contents))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text.strip())
        return "\n\n".join(pages)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse PDF: {e}")


def extract_pdf_text_from_bytes(contents: bytes) -> str:
    """Extract all text from PDF bytes (for already-read files)."""
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(contents))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text.strip())
        return "\n\n".join(pages)
    except Exception as e:
        return ""


async def extract_pdf_text_and_restore(file: UploadFile) -> tuple[str, bytes]:
    """Extract text and also return the raw bytes (so they can be saved)."""
    contents = await file.read()
    text = extract_pdf_text_from_bytes(contents)
    return text, contents
