from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pdfplumber
import io
import re
from typing import Optional, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from docx import Document  # for .docx support

app = FastAPI(
    title="Resume-Job Matcher API",
    description="Analyzes resume against job description using NLP and skill extraction.",
    version="1.3.0"
)

# CORS middleware
# Replace your existing CORS middleware with this:
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",  # Local Live Server
        "http://localhost:5500",  # Local Live Server alternative
        "https://your-railway-app-name.up.railway.app",  # Will update after deployment
        "https://your-custom-domain.com"  # If you add custom domain later
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Common tech skills to detect
TECH_SKILLS = [
    # Programming Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "swift", "kotlin",
    # Frameworks/Libraries
    "react", "angular", "vue", "django", "flask", "fastapi", "spring", "express", "node.js",
    # ML/AI
    "tensorflow", "pytorch", "scikit-learn", "keras", "pandas", "numpy", "matplotlib",
    # Databases
    "sql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
    # Cloud/DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "git", "linux",
    # Tools
    "git", "github", "gitlab", "jira", "confluence", "slack", "vscode", "pycharm",
    # Other relevant skills
    "api", "rest", "graphql", "microservices", "ci/cd", "agile", "scrum"
]

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            text = ""
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            return text.strip()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading PDF: {str(e)}"
        )

def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        doc = Document(io.BytesIO(file_bytes))
        text = "\n".join([para.text for para in doc.paragraphs])
        return text.strip()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading DOCX: {str(e)}"
        )

def clean_text(text: str) -> str:
    """Basic cleaning: remove extra whitespace, normalize line breaks"""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_skills(text: str) -> list:
    """Extract known tech skills from text"""
    text_lower = text.lower()
    found_skills = []
    for skill in TECH_SKILLS:
        if skill in text_lower:
            found_skills.append(skill.title())
    return sorted(list(set(found_skills)))  # Remove duplicates and sort

def extract_experience_years(text: str) -> int:
    """Simple regex to extract years of experience"""
    patterns = [
        r'(\d+)\+?\s*years?\s*(?:of|experience)',
        r'(\d+)\s*years?\s*(?:of|experience)',
        r'(\d+)\s*years?\s*experience'
    ]
    for pattern in patterns:
        matches = re.findall(pattern, text.lower())
        if matches:
            return int(max(matches, key=int))
    return 0

@app.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...),
):
    # Validate file type
    if not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF or DOCX files are supported."
        )

    # Read file content
    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # Extract text based on extension
    if file.filename.lower().endswith(".pdf"):
        resume_text = extract_text_from_pdf(contents)
    else:  # .docx
        resume_text = extract_text_from_docx(contents)

    # Clean both texts
    resume_clean = clean_text(resume_text)
    jd_clean = clean_text(job_description)

    if not resume_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No readable text found in resume."
        )
    if not jd_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty."
        )

    # Extract skills
    resume_skills = extract_skills(resume_clean)
    jd_skills = extract_skills(jd_clean)
    matched_skills = list(set(resume_skills) & set(jd_skills))

    # Extract experience
    resume_experience = extract_experience_years(resume_clean)
    jd_experience_match = "Required" in jd_clean or "experience" in jd_clean.lower()

    # Compute similarity
    vectorizer = TfidfVectorizer(stop_words='english', lowercase=True)
    try:
        tfidf_matrix = vectorizer.fit_transform([resume_clean, jd_clean])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        match_percentage = round(float(similarity) * 100, 2)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Similarity computation failed: {str(e)}"
        )

    # Generate suggestion
    if match_percentage < 50:
        suggestion = f"Low match. Missing key skills: {', '.join(set(jd_skills) - set(resume_skills))[:100]}..."
    elif match_percentage < 80:
        suggestion = f"Moderate match. Strengthen alignment by highlighting: {', '.join(matched_skills[:3])}"
    else:
        suggestion = f"Strong match! You have {len(matched_skills)} matching skills: {', '.join(matched_skills[:5])}"

    # Keyword overlap
    resume_words = set(re.findall(r'\b\w+\b', resume_clean.lower()))
    jd_words = set(re.findall(r'\b\w+\b', jd_clean.lower()))
    common = resume_words & jd_words
    missing = jd_words - resume_words
    keyword_match_ratio = len(common) / max(1, len(jd_words))

    return JSONResponse({
        "match_percentage": match_percentage,
        "keyword_overlap_ratio": round(keyword_match_ratio * 100, 2),
        "common_keywords_count": len(common),
        "missing_keywords_sample": list(missing)[:5],
        "suggestion": suggestion,
        "skills_analysis": {
            "resume_skills_found": resume_skills,
            "jd_skills_found": jd_skills,
            "matched_skills": matched_skills,
            "skills_match_count": len(matched_skills),
            "skills_match_percentage": round((len(matched_skills) / max(1, len(jd_skills))) * 100, 2) if jd_skills else 0
        },
        "experience_analysis": {
            "resume_experience_years": resume_experience,
            "jd_experience_mentioned": jd_experience_match
        },
        "details": {
            "resume_chars": len(resume_clean),
            "jd_chars": len(jd_clean),
            "resume_lines": resume_clean.count('\n') + 1,
        }
    })

@app.get("/")
async def root():
    return {
        "message": "✅ Resume-Job Matcher API v1.3.0 is running!",
        "endpoints": {
            "/analyze": "POST — upload resume (PDF/DOCX) + job description",
            "/docs": "Swagger UI (interactive API docs)",
            "/redoc": "ReDoc documentation"
        },
        "status": "healthy"
    }

@app.get("/health")
async def health():
    return {"status": "OK"}