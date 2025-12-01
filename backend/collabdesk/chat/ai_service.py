"""
AI Service for document analysis using Google Gemini
Handles document processing and AI-generated summaries/plans
"""

import os
import io
from typing import Tuple
from django.conf import settings
import google.generativeai as genai
from PyPDF2 import PdfReader
from docx import Document
from resources.s3_utils import download_file_from_s3
import logging

logger = logging.getLogger(__name__)

# Configure Gemini API
if not getattr(settings, "GEMINI_API_KEY", None):
    logger.error("Gemini credentials not configured in settings")
    raise ValueError("Gemini credentials not configured")

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
# if GEMINI_API_KEY:
#     genai.configure(api_key=GEMINI_API_KEY)


# Prompts for different action types
PROMPTS = {
    "summary": """
    You are an expert document analyzer. Please create a comprehensive summary of the following document.

    Your summary should:
    - Capture the main ideas and key points
    - Be well-structured with clear sections
    - Highlight important findings, conclusions, or recommendations
    - Be concise (around 100-200 words)
    - well-formatted in markdown

    Document content:
    {document_text}

    Please provide a simple, to the point and concise summary.
    """,
    "plan": """
    You are an expert project planner and strategist. Based on the following document, create a detailed execution plan.

    Your plan should include:
    - Clear objectives and goals derived from the document
    - Step-by-step action items with logical sequencing
    - Key milestones and deliverables
    - Potential risks or challenges to consider
    - Resource requirements if applicable
    - Estimated timeline or phases
    - Should be in to-do list format for easy readability
    - Be concise and actionable (around 100-200 words)
    - well-formatted in markdown

    Document content:
    {document_text}

    Please provide a simple, to the point, concise and actionable execution plan.
    """,
}


class DocumentProcessingError(Exception):
    """Raised when document processing fails"""

    pass


class AIServiceError(Exception):
    """Raised when AI service fails"""

    pass


def extract_text_from_pdf(file_content: bytes) -> str:
    """
    Extract text from PDF file

    Args:
        file_content: PDF file content as bytes

    Returns:
        Extracted text as string

    Raises:
        DocumentProcessingError: If PDF processing fails
    """
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PdfReader(pdf_file)

        text_parts = []
        for page_num, page in enumerate(pdf_reader.pages, 1):
            text = page.extract_text()
            if text.strip():
                text_parts.append(f"--- Page {page_num} ---\n{text}")

        if not text_parts:
            raise DocumentProcessingError("No text could be extracted from PDF")

        return "\n\n".join(text_parts)

    except Exception as e:
        raise DocumentProcessingError(f"Failed to extract text from PDF: {str(e)}")


def extract_text_from_docx(file_content: bytes) -> str:
    """
    Extract text from DOCX file

    Args:
        file_content: DOCX file content as bytes

    Returns:
        Extracted text as string

    Raises:
        DocumentProcessingError: If DOCX processing fails
    """
    try:
        docx_file = io.BytesIO(file_content)
        doc = Document(docx_file)

        text_parts = []
        for para in doc.paragraphs:
            if para.text.strip():
                text_parts.append(para.text)

        if not text_parts:
            raise DocumentProcessingError("No text could be extracted from DOCX")

        return "\n\n".join(text_parts)

    except Exception as e:
        raise DocumentProcessingError(f"Failed to extract text from DOCX: {str(e)}")


def extract_text_from_txt(file_content: bytes) -> str:
    """
    Extract text from TXT file

    Args:
        file_content: TXT file content as bytes

    Returns:
        Extracted text as string

    Raises:
        DocumentProcessingError: If TXT processing fails
    """
    try:
        # Try UTF-8 first, fall back to latin-1
        try:
            text = file_content.decode("utf-8")
        except UnicodeDecodeError:
            text = file_content.decode("latin-1")

        if not text.strip():
            raise DocumentProcessingError("Text file is empty")

        return text

    except Exception as e:
        raise DocumentProcessingError(f"Failed to extract text from TXT: {str(e)}")


def extract_text_from_document(file_content: bytes, file_name: str) -> str:
    """
    Extract text from document based on file extension

    Args:
        file_content: File content as bytes
        file_name: Original filename with extension

    Returns:
        Extracted text as string

    Raises:
        DocumentProcessingError: If file type is unsupported or processing fails
    """
    file_extension = file_name.lower().split(".")[-1]

    if file_extension == "pdf":
        return extract_text_from_pdf(file_content)
    elif file_extension in ["docx", "doc"]:
        return extract_text_from_docx(file_content)
    elif file_extension == "txt":
        return extract_text_from_txt(file_content)
    else:
        raise DocumentProcessingError(
            f"Unsupported file type: .{file_extension}. "
            "Supported types: PDF, DOCX, TXT"
        )


def download_document_from_s3(file_key: str) -> bytes:
    """
    Download document from S3 using file key

    Args:
        file_key: S3 file key

    Returns:
        File content as bytes

    Raises:
        DocumentProcessingError: If download fails
    """
    try:
        result = download_file_from_s3(file_key)

        if not result.get("success"):
            raise DocumentProcessingError(
                result.get("error", "Unknown error downloading from S3")
            )

        return result["file_content"]
    except DocumentProcessingError:
        raise
    except Exception as e:
        raise DocumentProcessingError(f"Failed to download document from S3: {str(e)}")


def generate_ai_response(document_text: str, action_type: str) -> str:
    """
    Generate AI response using Google Gemini

    Args:
        document_text: Extracted text from document
        action_type: Type of analysis ('summary' or 'plan')

    Returns:
        AI-generated response as string

    Raises:
        AIServiceError: If AI generation fails
    """
    if not settings.GEMINI_API_KEY:
        raise AIServiceError(
            "GEMINI_API_KEY not configured. Please set the environment variable."
        )

    if action_type not in PROMPTS:
        raise AIServiceError(f"Invalid action type: {action_type}")

    try:
        # Initialize Gemini model (Flash 2.0 experimental)
        model = genai.GenerativeModel("gemini-2.5-flash")

        # Get the appropriate prompt
        prompt = PROMPTS[action_type].format(document_text=document_text)

        # Truncate document text if too long (Gemini has token limits)
        max_chars = 30000  # Approximately 7500 tokens
        if len(prompt) > max_chars:
            truncated_text = document_text[: max_chars - 1000]
            prompt = PROMPTS[action_type].format(
                document_text=truncated_text
                + "\n\n[Document truncated due to length...]"
            )

        # Generate response
        response = model.generate_content(prompt)

        if not response.text:
            raise AIServiceError("Gemini returned empty response")

        return response.text

    except Exception as e:
        raise AIServiceError(f"Failed to generate AI response: {str(e)}")


def process_document_and_generate_response(
    file_key: str, file_name: str, action_type: str
) -> Tuple[str, str]:
    """
    Complete pipeline: Download document, extract text, generate AI response

    Args:
        file_key: S3 file key
        file_name: Original filename
        action_type: Type of analysis ('summary' or 'plan')

    Returns:
        Tuple of (extracted_text, ai_response)

    Raises:
        DocumentProcessingError: If document processing fails
        AIServiceError: If AI generation fails
    """
    # Step 1: Download document from S3
    file_content = download_document_from_s3(file_key)

    # Step 2: Extract text from document
    document_text = extract_text_from_document(file_content, file_name)

    # Step 3: Generate AI response
    ai_response = generate_ai_response(document_text, action_type)

    return document_text, ai_response


def validate_file_type(file_name: str) -> bool:
    """
    Validate if file type is supported

    Args:
        file_name: Original filename

    Returns:
        True if supported, False otherwise
    """
    supported_extensions = ["pdf", "docx", "doc", "txt"]
    file_extension = file_name.lower().split(".")[-1]
    return file_extension in supported_extensions


def get_supported_file_types() -> list:
    """
    Get list of supported file types

    Returns:
        List of supported file extensions
    """
    return ["pdf", "docx", "doc", "txt"]
