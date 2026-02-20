import os, uuid, fitz, jinja2, traceback
import PyPDF2, io
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.database import get_db
from app.utils.auth import get_current_user
from docxtpl import DocxTemplate
from docx2pdf import convert
from xhtml2pdf import pisa
import google.generativeai as genai

router = APIRouter(prefix="/resume", tags=["Resume Builder"])

# We use the drive-logos directory because it is already mounted as /logos in main.py!
# This makes our generated thumbnails instantly accessible via URL.
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "drive-logos")
os.makedirs(PUBLIC_DIR, exist_ok=True)
BASE_URL = "http://localhost:8000/logos"

# The "Smoke & Mirrors" Dummy Student for generating previews
DUMMY_STUDENT = {
    "name": "Prajwal P",
    "email": "prajwalganiga06@gmail.com",
    "phone": "+91 911 068 7983",
    "cgpa": "9.25",
    "branch": "Computer Science and Design Engineering",
    "linkedin_url": "linkedin.com/in/prajwalganiga",
    "summary": "Motivated engineering student with a passion for technology and problem-solving. Skilled in programming, development, and adapting to new challenges.",
    "skills": ["Python", "FastAPI", "Deep Learning", "Full-Stack Development"],
    "experience": [
        {
            "role": "Full Stack Intern", 
            "company": "Swizosoft Pvt. Ltd.", 
            "duration": "April - May", 
            "achievements": ["Built dynamic web applications using Flask, MongoDB, HTML, CSS, and JavaScript."]
        }
    ],
    "projects": [
        {
            "name": "Smart Classroom", 
            "description": ["Personalized Student Quiz Feedback System, developed for a GDG Hackathon."]
        }
    ],
    "education": [
        {
            "degree": "Bachelor of Engineering", 
            "institution": "Srinivas Institute of Technology", 
            "score": "9.25 CGPA", 
            "years": "2023-2027"
        }
    ]
}

def generate_thumbnail(pdf_path: str, tid: str) -> str:
    """Takes a PDF, captures the first page as a PNG, and returns the public URL."""
    try:
        doc = fitz.open(pdf_path)
        page = doc.load_page(0)
        # 2x matrix for high-resolution thumbnails
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        thumb_filename = f"thumb_{tid}.png"
        pix.save(os.path.join(PUBLIC_DIR, thumb_filename))
        doc.close()
        print(f"📸 Thumbnail generated: {thumb_filename}")
        return f"{BASE_URL}/{thumb_filename}"
    except Exception as e:
        print(f"🚨 Thumbnail generation failed: {e}")
        return ""

@router.post("/upload-docx")
async def upload_docx(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Method A: Upload a Word template, generate preview, save to DB."""
    print(f"\n🚀 --- PROCESSING DOCX TEMPLATE: {file.filename} ---")
    tid = str(uuid.uuid4())
    raw_path = os.path.join(PUBLIC_DIR, f"raw_{tid}.docx")
    preview_docx = os.path.join(PUBLIC_DIR, f"prev_{tid}.docx")
    preview_pdf = os.path.join(PUBLIC_DIR, f"prev_{tid}.pdf")
    
    try:
        # 1. Save Raw Template
        with open(raw_path, "wb") as f:
            f.write(await file.read())
            
        # 2. Inject Dummy Data
        doc = DocxTemplate(raw_path)
        doc.render(DUMMY_STUDENT)
        doc.save(preview_docx)
        print("✅ Dummy data injected into DOCX")
        
        # 3. Convert to PDF for thumbnail
        # (Note: docx2pdf requires MS Word installed on the server machine)
        import pythoncom
        pythoncom.CoInitialize() # Required for async threading in Windows
        convert(preview_docx, preview_pdf)
        print("✅ Converted preview to PDF")
        
        # 4. Snap Thumbnail
        thumb_url = generate_thumbnail(preview_pdf, tid)
        
        # 5. Save to MongoDB
        db = get_db()
        template_doc = {
            "_id": tid,
            "college_id": user["college_id"],
            "name": file.filename.replace(".docx", ""),
            "type": "docx",
            "raw_path": raw_path,
            "thumb_url": thumb_url,
            "active": True
        }
        await db["resume_templates"].insert_one(template_doc)
        print("🏁 DOCX Template processing complete!\n")
        
        return {"message": "DOCX Template activated", "template_id": tid}
        
    except Exception as e:
        print("\n🚨 DOCX TEMPLATE ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process DOCX: {str(e)}")


@router.post("/upload-ai-pdf")
async def upload_ai_pdf(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Method B: AI converts static PDF into dynamic Jinja2 HTML, generates preview."""
    print(f"\n🧠 --- PROCESSING AI PDF TEMPLATE: {file.filename} ---")
    tid = str(uuid.uuid4())
    raw_path = os.path.join(PUBLIC_DIR, f"raw_{tid}.html")
    preview_pdf = os.path.join(PUBLIC_DIR, f"prev_{tid}.pdf")
    
    try:
        # 1. Extract Text
        reader = PyPDF2.PdfReader(io.BytesIO(await file.read()))
        text = "".join(p.extract_text() for p in reader.pages)
        print("✅ Extracted text from PDF")
        
        # 2. AI HTML Generation
        prompt = f"""
        You are an expert Frontend Developer. Convert this resume text into a beautiful, fully styled HTML/CSS document.
        Use Jinja2 tags to make it dynamic.
        Replace real names with: {{{{ name }}}}
        Replace email with: {{{{ email }}}}
        Replace CGPA with: {{{{ cgpa }}}}
        For experience use: {{% for exp in experience %}} <h3>{{{{exp.role}}}}</h3>... {{% endfor %}}
        For projects use: {{% for proj in projects %}} <h3>{{{{proj.name}}}}</h3>... {{% endfor %}}
        
        Resume Text:
        {text}
        
        Return ONLY valid, raw HTML code. Do not use markdown wrappers.
        """
        model = genai.GenerativeModel("gemini-2.5-flash")
        html_content = model.generate_content(prompt).text.strip()
        if html_content.startswith("```html"):
            html_content = html_content[7:-3]
        
        with open(raw_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        print("✅ Gemini generated Jinja2 HTML template")
        
        # 3. Render HTML with Dummy Data
        template = jinja2.Template(html_content)
        rendered_html = template.render(DUMMY_STUDENT)
        
        # 4. Convert HTML to PDF (PURE PYTHON WAY)
        with open(preview_pdf, "w+b") as result_file:
            pisa_status = pisa.CreatePDF(rendered_html, dest=result_file)
            
        if pisa_status.err:
            raise Exception("PDF creation failed using xhtml2pdf!")
            
        print("✅ Converted HTML preview to PDF successfully!")
        
        # 5. Snap Thumbnail
        thumb_url = generate_thumbnail(preview_pdf, tid)
        
        # 6. Save to DB
        db = get_db()
        await db["resume_templates"].insert_one({
            "_id": tid,
            "college_id": user["college_id"],
            "name": file.filename.replace(".pdf", " (AI Generated)"),
            "type": "html",
            "raw_path": raw_path,
            "thumb_url": thumb_url,
            "active": True
        })
        print("🏁 AI PDF Template processing complete!\n")
        
        return {"message": "AI Template activated", "template_id": tid}
        
    except Exception as e:
        print("\n🚨 AI PDF TEMPLATE ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process AI PDF: {str(e)}")


@router.get("/list")
async def list_templates(user: dict = Depends(get_current_user)):
    """Fetch all templates for the gallery."""
    try:
        db = get_db()
        templates = await db["resume_templates"].find({"college_id": user["college_id"]}).to_list(100)
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{tid}")
async def delete_template(tid: str, user: dict = Depends(get_current_user)):
    """Delete a template from DB."""
    try:
        db = get_db()
        await db["resume_templates"].delete_one({"_id": tid, "college_id": user["college_id"]})
        return {"message": "Template deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))