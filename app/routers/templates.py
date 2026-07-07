import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.repos.connection import get_db
from app.models import DocumentTemplateResponse, TemplateGenerateRequest
from app.repos.templates import list_templates, get_template
from app.settings import get_settings

router = APIRouter(prefix="/api/templates", tags=["Document Templates"])

@router.get("", response_model=List[DocumentTemplateResponse])
async def get_all_templates(db: AsyncSession = Depends(get_db)):
    """List all available DIY document templates."""
    return await list_templates(db)

@router.post("/{template_id}/generate", status_code=status.HTTP_200_OK)
async def generate_template(
    template_id: int,
    req: TemplateGenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a PDF document based on a template and provided variables.
    In a full production environment, this would verify payment first if price_ngn > 0.
    """
    template = await get_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    try:
        from fpdf import FPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="fpdf2 is not installed")
        
    # Generate the PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    
    # Header
    pdf.set_font("Helvetica", style="B", size=16)
    pdf.cell(200, 10, txt=template["name"].upper(), ln=True, align="C")
    pdf.ln(10)
    
    pdf.set_font("Helvetica", size=12)
    
    # Body
    text_content = f"This is an automated {template['name']}.\n\n"
    for key, value in req.variables.items():
        text_content += f"{key.replace('_', ' ').title()}: {value}\n"
        
    text_content += "\nGenerated on: " + datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    text_content += "\n\nDisclaimer: This is a generated template and does not constitute formal legal advice. Please consult a lawyer for review."
    
    pdf.multi_cell(0, 10, txt=text_content)
    
    # Save to uploads directory
    settings = get_settings()
    file_id = str(uuid.uuid4())
    filename = f"{template['name'].replace(' ', '_').lower()}_{file_id}.pdf"
    
    uploads_dir = settings.app_uploads_dir
    os.makedirs(uploads_dir, exist_ok=True)
    
    file_path = os.path.join(uploads_dir, filename)
    pdf.output(file_path)
    
    return {
        "status": "success",
        "message": "Template generated successfully",
        "file_path": f"/storage/uploads/{filename}",
        "template": template["name"]
    }
