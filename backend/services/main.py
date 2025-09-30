# Optional: sentence-transformers for SBERT embeddings
try:
    from sentence_transformers import SentenceTransformer, util as st_util
    _sbert_model: SentenceTransformer | None = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    print("Loaded SBERT model: all-MiniLM-L6-v2")
except Exception as _e:
    _sbert_model = None
    print(f"SBERT not available ({_e}); will fallback to TF-IDF endpoint")
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from pydantic import BaseModel
import PyPDF2
import spacy
from skillNer.skill_extractor_class import SkillExtractor
import io
import re
from typing import List, Dict, Any, Tuple
import math
import uvicorn

app = FastAPI(title="Resume and Job Parsing Service", version="1.0.0")

# CORS middleware (configurable via env var CORS_ORIGINS as comma-separated list)
_cors_env = os.getenv("CORS_ORIGINS", "")
_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
# Sensible defaults for local dev if not provided
if not _origins:
    _origins = ["http://localhost:3000", "http://localhost:5000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("spaCy model not found. Please install with: python -m spacy download en_core_web_sm")
    nlp = None

# Initialize SkillExtractor
try:
    # skillNer requires additional parameters, so we'll use fallback for now
    skill_extractor = None
    print("Using fallback skill extraction (skillNer requires additional setup)")
except Exception as e:
    print(f"Error initializing SkillExtractor: {e}")
    skill_extractor = None

class JobParseRequest(BaseModel):
    jobDescription: str

class ParsedData(BaseModel):
    skills: List[str]
    education: List[Dict[str, Any]]
    experience: List[Dict[str, Any]]
    locations: List[str]
    sectors: List[str]
    raw_text: str

class TextRequest(BaseModel):
    text: str

class NormalizeSkillsRequest(BaseModel):
    skills: List[str]

class EmbeddingDoc(BaseModel):
    id: str
    text: str

class TFIDFRequest(BaseModel):
    resumeText: str
    jobs: List[EmbeddingDoc]

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error extracting text from PDF: {str(e)}")

def extract_skills(text: str) -> List[str]:
    """Extract skills from text using skillNer"""
    if not skill_extractor or not nlp:
        return extract_skills_fallback(text)
    
    try:
        doc = nlp(text)
        annotations = skill_extractor.annotate(doc)
        
        skills = []
        for skill in annotations.get('results', {}).get('full_matches', []):
            skills.append(skill['doc_node_value'])
        
        # Remove duplicates and return
        return list(set(skills))
    except Exception as e:
        print(f"Error extracting skills with skillNer: {e}")
        return extract_skills_fallback(text)

def extract_skills_fallback(text: str) -> List[str]:
    """Fallback skill extraction using simple keyword matching"""
    skill_keywords = [
        'python', 'javascript', 'java', 'react', 'node.js', 'sql', 'git', 'docker',
        'kubernetes', 'aws', 'azure', 'gcp', 'machine learning', 'ai', 'data analysis',
        'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'excel', 'powerbi',
        'tableau', 'financial modeling', 'project management', 'agile', 'scrum',
        'html', 'css', 'typescript', 'angular', 'vue', 'mongodb', 'postgresql',
        'linux', 'bash', 'api', 'rest', 'graphql', 'microservices', 'devops'
    ]
    
    text_lower = text.lower()
    found_skills = []
    
    for skill in skill_keywords:
        if skill in text_lower:
            found_skills.append(skill.title())
    
    return list(set(found_skills))

def normalize_skill_token(token: str) -> str:
    m = {
        "js": "JavaScript",
        "javascript": "JavaScript",
        "ts": "TypeScript",
        "typescript": "TypeScript",
        "reactjs": "React",
        "react": "React",
        "node": "Node.js",
        "nodejs": "Node.js",
        "node.js": "Node.js",
        "py": "Python",
        "py3": "Python",
        "postgres": "PostgreSQL",
        "postgresql": "PostgreSQL",
        "ml": "Machine Learning",
        "sklearn": "Scikit-Learn",
        "scikit-learn": "Scikit-Learn",
        "gcp": "GCP",
        "aws": "AWS",
        "azure": "Azure",
    }
    k = (token or "").strip().lower()
    if not k:
        return ""
    v = m.get(k, token)
    # title-case where appropriate
    return v if v in ["Node.js", "PostgreSQL", "AWS", "GCP", "Azure"] else " ".join(w.capitalize() for w in str(v).split())

def normalize_skills_list(skills: List[str]) -> List[str]:
    out, seen = [], set()
    for s in skills or []:
        v = normalize_skill_token(s)
        if v and v not in seen:
            out.append(v)
            seen.add(v)
    return out

def extract_education(text: str) -> List[Dict[str, Any]]:
    """Extract education information from text"""
    education = []

    degree_patterns = [
        r'(Bachelor|B\.?S\.?|B\.?A\.?|Master|M\.?S\.?|M\.?A\.?|MBA|PhD|Doctorate)\s+(?:of\s+)?(?:Science|Arts|Engineering|Business|Computer Science|Information Technology|Data Science|Finance|Economics|Marketing|Management)',
        r'(Associate|A\.?A\.?|A\.?S\.?)\s+(?:of\s+)?(?:Science|Arts|Engineering|Business)',
        r'(Certificate|Diploma)\s+(?:in\s+)?(?:Computer Science|Information Technology|Data Science|Business|Finance)'
    ]
    
    for pattern in degree_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            education.append({
                'degree': match.group(0),
                'field': match.group(2) if len(match.groups()) > 1 else None
            })
    
    return education

def extract_degrees(text: str) -> List[str]:
    degrees = set()
    patterns = [
        r"\b(Bachelor|Master|PhD|MBA|B\.Tech|M\.Tech|BSc|MSc|B\.E\.|M\.E\.)\b",
        r"\b(Computer Science|Information Technology|Data Science|Finance|Economics|Mechanical Engineering|Electrical Engineering)\b",
    ]
    for p in patterns:
        for m in re.finditer(p, text, re.IGNORECASE):
            degrees.add(m.group(0))
    return list(degrees)

def extract_experience(text: str) -> List[Dict[str, Any]]:
    """Extract work experience from text"""
    experience = []
    
    # Look for job titles and companies
    job_patterns = [
        r'(Software Engineer|Developer|Analyst|Manager|Intern|Consultant|Specialist|Coordinator|Assistant)',
        r'(at|@)\s+([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Company|Ltd|Technologies|Solutions|Systems)?)',
        r'(\d{4})\s*[-–]\s*(\d{4}|\bPresent\b|\bCurrent\b)'
    ]
    
    # Simple extraction - in a real implementation, you'd use more sophisticated NLP
    lines = text.split('\n')
    current_job = {}
    
    for line in lines:
        line = line.strip()
        if any(keyword in line.lower() for keyword in ['experience', 'work', 'employment', 'career']):
            continue
        
        # Look for job titles
        for pattern in job_patterns[0]:
            if re.search(pattern, line, re.IGNORECASE):
                current_job['title'] = line
                break
        
        # Look for companies
        for pattern in job_patterns[1]:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                current_job['company'] = match.group(2).strip()
                break
        
        # Look for dates
        for pattern in job_patterns[2]:
            match = re.search(pattern, line)
            if match:
                current_job['start_date'] = match.group(1)
                current_job['end_date'] = match.group(2)
                if current_job:
                    experience.append(current_job.copy())
                current_job = {}
                break
    
    return experience

def extract_roles_responsibilities(text: str) -> Tuple[List[str], List[str]]:
    roles = []
    responsibilities = []
    # crude heuristics
    for line in text.splitlines():
        l = line.strip()
        if re.search(r"developer|engineer|analyst|intern|manager|designer|consultant", l, re.I):
            roles.append(l)
        if l.startswith("-") or l.startswith("•"):
            responsibilities.append(l.lstrip("-• "))
    # dedupe
    roles = list(dict.fromkeys(roles))
    responsibilities = list(dict.fromkeys(responsibilities))
    return roles, responsibilities

def extract_locations(text: str) -> List[str]:
    """Extract locations from text using spaCy NER"""
    if not nlp:
        return []
    
    try:
        doc = nlp(text)
        locations = []
        
        for ent in doc.ents:
            if ent.label_ in ("GPE", "LOC"):
                locations.append(ent.text)
        
        return list(set(locations))
    except Exception as e:
        print(f"Error extracting locations: {e}")
        return []

def extract_sectors(text: str) -> List[str]:
    """Extract industry sectors from text"""
    sector_keywords = {
        'Technology': ['software', 'tech', 'computer', 'programming', 'development', 'engineering', 'ai', 'machine learning'],
        'Finance': ['finance', 'financial', 'banking', 'investment', 'accounting', 'fintech', 'trading'],
        'Healthcare': ['healthcare', 'medical', 'health', 'hospital', 'pharmaceutical', 'biotech'],
        'Education': ['education', 'teaching', 'academic', 'university', 'school', 'learning'],
        'Marketing': ['marketing', 'advertising', 'brand', 'digital marketing', 'social media'],
        'Environmental': ['environmental', 'sustainability', 'green', 'renewable', 'climate']
    }
    
    text_lower = text.lower()
    found_sectors = []
    
    for sector, keywords in sector_keywords.items():
        if any(keyword in text_lower for keyword in keywords):
            found_sectors.append(sector)
    
    return found_sectors

def extract_keywords(text: str, topn: int = 20) -> List[str]:
    toks = simple_tokenize(text)
    stop = set(["the","a","an","and","or","for","with","to","of","in","on","at","is","are","be","as","by","this","that","from","it","we","you"]) \
        | set(["and/or","etc","eg","ie","must","should","will"]) 
    freq = {}
    for t in toks:
        if t.isnumeric() or t in stop:
            continue
        freq[t] = freq.get(t, 0) + 1
    items = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:topn]
    return [w for w,_ in items]

def extract_durations(text: str) -> List[str]:
    pats = [
        r"\b(\d{1,2})\s*(weeks|months|years|yrs|mos)\b",
        r"\b(6-month|3-month|12-month)\b",
        r"\b(part-time|full-time)\b",
    ]
    hits = set()
    for p in pats:
        for m in re.finditer(p, text, re.IGNORECASE):
            hits.add(m.group(0))
    return list(hits)

def simple_tokenize(text: str) -> List[str]:
    tokens = re.findall(r"[a-zA-Z0-9_+#.]+", text.lower())
    return tokens

def tfidf_cosine_similarity(query: str, docs: List[str]) -> List[float]:
    # Lightweight TF-IDF without external heavy deps
    corpus = [query] + docs
    tokenized = [simple_tokenize(t) for t in corpus]
    # Build doc frequency
    vocab_df = {}
    for toks in tokenized:
        for tok in set(toks):
            vocab_df[tok] = vocab_df.get(tok, 0) + 1
    N = len(tokenized)
    idf = {tok: math.log((N + 1) / (df + 1)) + 1.0 for tok, df in vocab_df.items()}
    # TF-IDF with L2 norm
    vecs = []
    for toks in tokenized:
        tf = {}
        for t in toks:
            tf[t] = tf.get(t, 0) + 1
        tfidf = {t: tf[t] * idf.get(t, 0.0) for t in tf}
        norm = math.sqrt(sum(v*v for v in tfidf.values())) or 1.0
        vecs.append({t: v / norm for t, v in tfidf.items()})
    q = vecs[0]
    ds = vecs[1:]
    sims = []
    for d in ds:
        common = set(q.keys()) & set(d.keys())
        dot = sum(q[t]*d[t] for t in common)
        sims.append(dot)
    return sims

def tfidf_matrix(docs: List[str]):
    """Build a lightweight TF-IDF matrix and associated vocabulary for a list of docs.
    Returns (matrix: List[Dict[token,float]], idf: Dict[token,float], tokens_per_doc: List[List[str]]).
    """
    tokenized = [simple_tokenize(t or "") for t in docs]
    vocab_df = {}
    for toks in tokenized:
        for tok in set(toks):
            vocab_df[tok] = vocab_df.get(tok, 0) + 1
    import math
    N = len(tokenized)
    idf = {tok: math.log((N + 1) / (df + 1)) + 1.0 for tok, df in vocab_df.items()}
    vecs = []
    for toks in tokenized:
        tf = {}
        for t in toks:
            tf[t] = tf.get(t, 0) + 1
        tfidf = {t: tf[t] * idf.get(t, 0.0) for t in tf}
        norm = math.sqrt(sum(v*v for v in tfidf.values())) or 1.0
        vecs.append({t: v / norm for t, v in tfidf.items()})
    return vecs, idf, tokenized

def kmeans_sparse(vecs: List[dict], k: int, max_iter: int = 20, seed: int = 42):
    """Simple KMeans on sparse dict vectors. Uses cosine distance approximation via normalized TF-IDF.
    Returns labels (len=docs) and centroids (list of dicts).
    """
    import random
    random.seed(seed)
    n = len(vecs)
    if n == 0 or k <= 0:
        return [0]*n, []
    k = min(k, n)
    # init: pick k random docs as centroids
    init_idx = random.sample(range(n), k)
    centroids = [vecs[i].copy() for i in init_idx]

    def cosine_sim_sparse(a: dict, b: dict):
        common = set(a.keys()) & set(b.keys())
        return sum(a[t]*b[t] for t in common)

    def recompute_centroid(indices):
        from collections import defaultdict
        acc = defaultdict(float)
        for i in indices:
            v = vecs[i]
            for t, val in v.items():
                acc[t] += val
        # L2 normalize
        norm = math.sqrt(sum(v*v for v in acc.values())) or 1.0
        return {t: val/norm for t, val in acc.items()}

    labels = [0]*n
    for _ in range(max_iter):
        changed = False
        # assign
        for i, v in enumerate(vecs):
            best = 0
            best_sim = -1
            for c_idx, c in enumerate(centroids):
                sim = cosine_sim_sparse(v, c)
                if sim > best_sim:
                    best_sim = sim
                    best = c_idx
            if labels[i] != best:
                labels[i] = best
                changed = True
        # update
        clusters = [[] for _ in range(k)]
        for i, lab in enumerate(labels):
            clusters[lab].append(i)
        new_centroids = []
        for cluster in clusters:
            if cluster:
                new_centroids.append(recompute_centroid(cluster))
            else:
                # reassign empty centroid to random doc
                import random
                ridx = random.randrange(n)
                new_centroids.append(vecs[ridx].copy())
        centroids = new_centroids
        if not changed:
            break
    return labels, centroids

class ClusterRequest(BaseModel):
    jobs: List[EmbeddingDoc]
    k: int = 6
    maxFeatures: int | None = None  # kept for API compat, unused in lightweight impl
    maxIter: int = 20

@app.post("/embeddings/cluster")
async def embeddings_cluster(req: ClusterRequest):
    try:
        jobs = req.jobs or []
        if not jobs:
            return {"success": True, "data": {"labels": [], "clusters": [], "k": 0}}
        texts = [j.text or "" for j in jobs]
        vecs, idf, tokenized = tfidf_matrix(texts)
        labels, centroids = kmeans_sparse(vecs, max(1, req.k), max_iter=max(1, req.maxIter))
        # derive top terms per centroid
        def top_terms(centroid: dict, topn: int = 8):
            items = sorted(centroid.items(), key=lambda x: x[1], reverse=True)[:topn]
            return [t for t, _ in items]
        clusters = []
        for c_idx, c in enumerate(centroids):
            clusters.append({
                "cluster": c_idx,
                "topTerms": top_terms(c)
            })
        labeled = [{"id": jobs[i].id, "cluster": int(labels[i])} for i in range(len(jobs))]
        return {"success": True, "data": {"labels": labeled, "clusters": clusters, "k": len(centroids)}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "spacy_loaded": nlp is not None,
        "skill_extractor_loaded": skill_extractor is not None
    }

@app.post("/nlp/extract")
async def nlp_extract(req: TextRequest):
    try:
        text = req.text or ""
        skills = extract_skills(text)
        education = extract_education(text)
        experience = extract_experience(text)
        locations = extract_locations(text)
        sectors = extract_sectors(text)
        return {
            "success": True,
            "data": {
                "skills": skills,
                "education": education,
                "experience": experience,
                "locations": locations,
                "sectors": sectors,
                "raw_text": text,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

@app.post("/nlp/normalize-skills")
async def normalize_skills(req: NormalizeSkillsRequest):
    try:
        out = normalize_skills_list(req.skills)
        return {"success": True, "data": {"skills": out}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Normalization failed: {str(e)}")

@app.post("/embeddings/tfidf")
async def embeddings_tfidf(req: TFIDFRequest):
    try:
        resume = req.resumeText or ""
        jobs = req.jobs or []
        docs = [j.text or "" for j in jobs]
        sims = tfidf_cosine_similarity(resume, docs)
        scores = [{"id": jobs[i].id, "similarity": sims[i]} for i in range(len(jobs))]
        return {"success": True, "data": {"scores": scores, "modelVersion": "tfidf_v1"}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TFIDF failed: {str(e)}")

class SentenceEmbReq(BaseModel):
    resumeText: str
    jobs: List[EmbeddingDoc]

@app.post("/embeddings/sentence")
async def embeddings_sentence(req: SentenceEmbReq):
    """Return cosine similarity scores using SBERT if available; else fallback to TF-IDF."""
    try:
        resume = req.resumeText or ""
        jobs = req.jobs or []
        docs = [j.text or "" for j in jobs]
        if _sbert_model is None:
            # fallback
            sims = tfidf_cosine_similarity(resume, docs)
            scores = [{"id": jobs[i].id, "similarity": sims[i]} for i in range(len(jobs))]
            return {"success": True, "data": {"scores": scores, "modelVersion": "tfidf_fallback"}}
        # SBERT path
        corpus = [resume] + docs
        emb = _sbert_model.encode(corpus, convert_to_tensor=True, normalize_embeddings=True)
        q = emb[0]
        ds = emb[1:]
        # cosine similarity
        sims = st_util.cos_sim(q, ds).cpu().tolist()[0]
        scores = [{"id": jobs[i].id, "similarity": float(sims[i])} for i in range(len(jobs))]
        return {"success": True, "data": {"scores": scores, "modelVersion": "sbert_all-MiniLM-L6-v2"}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sentence embeddings failed: {str(e)}")

@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    """Parse resume PDF and extract information"""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Extract text from PDF
        text = extract_text_from_pdf(file_content)
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text found in PDF")
        
        # Extract information
        skills = normalize_skills_list(extract_skills(text))
        education = extract_education(text)
        experience = extract_experience(text)
        locations = extract_locations(text)
        sectors = extract_sectors(text)
        degrees = extract_degrees(text)
        roles, responsibilities = extract_roles_responsibilities(text)
        keywords = extract_keywords(text)
        durations = extract_durations(text)
        
        return {
            "success": True,
            "data": {
                "skills": skills,
                "education": education,
                "experience": experience,
                "locations": locations,
                "sectors": sectors,
                "degrees": degrees,
                "roles": roles,
                "responsibilities": responsibilities,
                "keywords": keywords,
                "durations": durations,
                "raw_text": text
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing resume: {str(e)}")

@app.post("/parse-job")
async def parse_job(request: JobParseRequest):
    """Parse job description and extract information"""
    try:
        text = request.jobDescription
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="Job description cannot be empty")
        
        # Extract information
        skills = normalize_skills_list(extract_skills(text))
        locations = extract_locations(text)
        sectors = extract_sectors(text)
        degrees = extract_degrees(text)
        roles, responsibilities = extract_roles_responsibilities(text)
        keywords = extract_keywords(text)
        durations = extract_durations(text)
        
        return {
            "success": True,
            "data": {
                "skills": skills,
                "locations": locations,
                "sectors": sectors,
                "degrees": degrees,
                "roles": roles,
                "responsibilities": responsibilities,
                "keywords": keywords,
                "durations": durations,
                "raw_text": text
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing job description: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
