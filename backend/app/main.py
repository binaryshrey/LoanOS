from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
from google.cloud import storage
import vertexai
from vertexai.generative_models import GenerativeModel, Part

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="LoanOS API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# Initialize Google Cloud Storage and Vertex AI
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")  # Default to us-central1

if GCP_PROJECT_ID:
    storage_client = storage.Client(project=GCP_PROJECT_ID)
    # Initialize Vertex AI
    vertexai.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)
    print(f"✅ Vertex AI initialized: {GCP_PROJECT_ID} in {GCP_LOCATION}")
else:
    storage_client = None
    print("⚠️  GCP_PROJECT_ID not set. Vertex AI and Storage disabled.")

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_contexts: Dict[str, Dict] = {}
    
    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.session_contexts:
            del self.session_contexts[session_id]
    
    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(message)
    
    def set_context(self, session_id: str, context: dict):
        self.session_contexts[session_id] = context
    
    def get_context(self, session_id: str) -> Optional[Dict]:
        return self.session_contexts.get(session_id)

manager = ConnectionManager()

# Pydantic models
class SessionContextRequest(BaseModel):
    session_id: str
    user_id: str

class QuestionRequest(BaseModel):
    session_id: str
    question: str

@app.get("/health")
def health():
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/session/context")
async def initialize_session_context(request: SessionContextRequest):
    """
    Initialize session context by fetching loan session data from Supabase
    This should be called after onboarding, before starting the WebSocket
    """
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Supabase not configured")
        
        # Check if context already exists in memory
        existing_context = manager.get_context(request.session_id)
        if existing_context:
            print(f"✅ Context already initialized for session {request.session_id}, skipping re-initialization")
            return {
                "success": True,
                "message": "Session context already initialized (cached)",
                "context_summary": {
                    "loan_name": existing_context["loan_name"],
                    "user_role": existing_context["user_role"],
                    "document_count": len(existing_context.get("documents", [])),
                    "region": existing_context["region"]
                }
            }
        
        print(f"🔄 Initializing new context for session {request.session_id}...")
        
        # Fetch loan session data from Supabase
        response = supabase.table("loan_sessions").select("*").eq("id", request.session_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_data = response.data
        
        # Download and process documents from GCS
        document_contents = []
        if session_data.get("documents"):
            for doc in session_data["documents"]:
                try:
                    content = await download_document_from_gcs(
                        doc.get("gcs_bucket"),
                        doc.get("gcs_object_path")
                    )
                    document_contents.append({
                        "filename": doc.get("filename"),
                        "content": content,
                        "type": doc.get("contentType", "")
                    })
                except Exception as e:
                    print(f"Error downloading document {doc.get('filename')}: {e}")
        
        # Build context for AI
        context = {
            "session_id": request.session_id,
            "user_id": session_data.get("user_id"),
            "user_email": session_data.get("user_email"),
            "loan_name": session_data.get("loan_name"),
            "user_role": session_data.get("user_role"),
            "institution": session_data.get("institution"),
            "ai_focus": session_data.get("ai_focus"),
            "language": session_data.get("language"),
            "region": session_data.get("region"),
            "documents": document_contents,
            "conversations": session_data.get("conversations", []),
            "created_at": session_data.get("created_at")
        }
        
        # 🚀 Pre-process documents with Gemini to confirm readability
        print(f"📄 Pre-processing {len(document_contents)} document(s) with Gemini...")
        document_summaries = []
        
        if document_contents and GCP_PROJECT_ID:
            try:
                model = GenerativeModel("gemini-2.0-flash-exp")
                
                for doc in document_contents:
                    try:
                        # Prepare document for Gemini
                        document_parts = []
                        if doc["content"].startswith("gs://"):
                            # PDF/Excel - use URI
                            mime_type = "application/pdf" if doc["filename"].lower().endswith(".pdf") else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            document_parts.append(Part.from_uri(doc["content"], mime_type=mime_type))
                            print(f"📄 Processing PDF via URI: {doc['content']}")
                        else:
                            # Text content
                            document_parts.append(doc["content"])
                        
                        # Ask Gemini to summarize the document
                        prompt = f"""Analyze this loan document and provide a brief summary including:
1. Document type (e.g., Loan Agreement, Term Sheet, etc.)
2. Key loan details if present (amount, interest rate, term, parties)
3. Total number of pages or sections

Keep it concise (2-3 sentences)."""
                        
                        document_parts.insert(0, prompt)
                        
                        response = model.generate_content(document_parts)
                        summary = response.text.strip()
                        
                        document_summaries.append({
                            "filename": doc["filename"],
                            "summary": summary,
                            "processed": True
                        })
                        
                        print(f"✅ Processed {doc['filename']}: {summary[:100]}...")
                        
                    except Exception as doc_error:
                        print(f"⚠️ Error processing {doc['filename']}: {doc_error}")
                        document_summaries.append({
                            "filename": doc["filename"],
                            "summary": "Document uploaded but summary unavailable",
                            "processed": False,
                            "error": str(doc_error)
                        })
                
                # Add summaries to context
                context["document_summaries"] = document_summaries
                
            except Exception as gemini_error:
                print(f"⚠️ Gemini processing error: {gemini_error}")
                # Continue without summaries if Gemini fails
        
        # Store context in memory
        manager.set_context(request.session_id, context)
        
        return {
            "success": True,
            "message": "Session context initialized and documents processed",
            "context_summary": {
                "loan_name": context["loan_name"],
                "user_role": context["user_role"],
                "document_count": len(document_contents),
                "region": context["region"],
                "documents_processed": len([s for s in document_summaries if s.get("processed", False)]),
                "document_summaries": document_summaries
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error initializing session context: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/session/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time Q&A during loan sessions
    """
    await manager.connect(session_id, websocket)
    
    try:
        # Get session context
        context = manager.get_context(session_id)
        
        if not context:
            await manager.send_message(session_id, {
                "type": "error",
                "message": "Session context not initialized. Please call /api/session/context first."
            })
            return
        
        # Send welcome message
        await manager.send_message(session_id, {
            "type": "system",
            "message": f"Connected to LoanOS AI for {context['loan_name']}",
            "context": {
                "loan_name": context["loan_name"],
                "user_role": context["user_role"],
                "document_count": len(context.get("documents", []))
            }
        })
        
        # Listen for messages
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "question":
                question = message_data.get("question", "").strip()
                
                if not question:
                    await manager.send_message(session_id, {
                        "type": "error",
                        "message": "Question cannot be empty"
                    })
                    continue
                
                # Send acknowledgment
                await manager.send_message(session_id, {
                    "type": "processing",
                    "message": "Processing your question..."
                })
                
                # Generate AI response
                try:
                    answer = await generate_ai_response(context, question)
                    
                    # Save conversation to context
                    conversation_entry = {
                        "timestamp": datetime.utcnow().isoformat(),
                        "role": "user",
                        "message": question
                    }
                    context["conversations"].append(conversation_entry)
                    
                    assistant_entry = {
                        "timestamp": datetime.utcnow().isoformat(),
                        "role": "assistant",
                        "message": answer
                    }
                    context["conversations"].append(assistant_entry)
                    
                    # Update Supabase with new conversation
                    if supabase:
                        try:
                            supabase.table("loan_sessions").update({
                                "conversations": context["conversations"]
                            }).eq("id", session_id).execute()
                        except Exception as e:
                            print(f"Error updating conversations in Supabase: {e}")
                    
                    # Send response
                    await manager.send_message(session_id, {
                        "type": "answer",
                        "question": question,
                        "answer": answer,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
                except Exception as e:
                    print(f"Error generating AI response: {e}")
                    await manager.send_message(session_id, {
                        "type": "error",
                        "message": f"Error generating response: {str(e)}"
                    })
            
            elif message_data.get("type") == "ping":
                await manager.send_message(session_id, {
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat()
                })
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)
        print(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(session_id)


async def download_document_from_gcs(bucket_name: str, object_path: str) -> str:
    """
    Download document content from Google Cloud Storage
    Returns GCS URI for PDFs and Excel files to be processed by Vertex AI
    """
    try:
        if not storage_client:
            return ""
        
        # For PDF and Excel files, return GCS URI for Vertex AI to process
        file_extension = object_path.lower().split('.')[-1]
        if file_extension in ['pdf', 'xlsx', 'xls']:
            gcs_uri = f"gs://{bucket_name}/{object_path}"
            print(f"Document will be processed by Vertex AI: {gcs_uri}")
            return gcs_uri
        
        # For text-based files, download and decode
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(object_path)
        
        # Download as bytes
        content_bytes = blob.download_as_bytes()
        
        # Try to decode as text (works for text files, CSV, etc.)
        try:
            return content_bytes.decode('utf-8')
        except UnicodeDecodeError:
            # For other binary files, return GCS URI
            return f"gs://{bucket_name}/{object_path}"
            
    except Exception as e:
        print(f"Error downloading from GCS: {e}")
        return ""


async def generate_ai_response(context: Dict, question: str) -> str:
    """
    Generate AI response using Vertex AI Gemini 2.0 Flash based on context and question
    This function is called both by WebSocket and by ElevenLabs custom tools
    """
    try:
        if not GCP_PROJECT_ID:
            return "AI service is not configured. Please contact support."
        
        # Build context prompt
        system_prompt = f"""You are LoanOS AI, an intelligent assistant specializing in loan analysis and documentation.

Context:
- Loan/Deal Name: {context['loan_name']}
- User Role: {context['user_role']}
- Institution: {context.get('institution', 'Not specified')}
- AI Focus: {context.get('ai_focus', 'General loan analysis')}
- Region: {context['region']}
- Language: {context['language']}

Documents available:
"""
        
        # Prepare document parts for Vertex AI
        document_parts = []
        
        for idx, doc in enumerate(context.get('documents', []), 1):
            system_prompt += f"\n{idx}. {doc['filename']}"
            
            content = doc.get('content', '')
            
            # Check if it's a GCS URI (PDF/Excel)
            if content.startswith('gs://'):
                # Add as Part for Vertex AI to process
                document_parts.append(Part.from_uri(content, mime_type=doc.get('type', 'application/pdf')))
                system_prompt += f" (File will be analyzed by AI)"
            elif content and len(content) > 10:
                # Text content - include snippet in prompt
                snippet = content[:1000] if len(content) > 1000 else content
                system_prompt += f"\n   Content: {snippet}..."
        
        # Add recent conversation history
        recent_conversations = context.get('conversations', [])[-6:]  # Last 3 Q&A pairs
        if recent_conversations:
            system_prompt += "\n\nRecent conversation history:"
            for conv in recent_conversations:
                role = conv.get('role', 'unknown')
                message = conv.get('message', '')
                system_prompt += f"\n{role.capitalize()}: {message}"
        
        system_prompt += f"""

Instructions:
1. Analyze ALL provided documents to answer questions accurately
2. For PDF/Excel files, carefully read and extract relevant information
3. Focus on {context.get('ai_focus', 'general loan analysis')} when relevant
4. Consider the user's role as {context['user_role']}
5. Use {context['region']} regional standards and conventions
6. If information is not found in the documents, say so clearly
7. Keep responses concise (2-4 sentences) unless more detail is requested
8. Use natural conversational language suitable for voice interaction

User Question: {question}

Provide a brief, accurate answer based on the documents:"""

        # Use Vertex AI Gemini 2.0 Flash to generate response
        model = GenerativeModel("gemini-2.0-flash-exp")
        
        # Configure generation parameters for better performance
        generation_config = {
            "max_output_tokens": 2048,
            "temperature": 0.7,
            "top_p": 0.95,
        }
        
        # Prepare content list (text prompt + document parts)
        content_parts = [system_prompt] + document_parts
        
        # Generate response
        response = model.generate_content(
            content_parts,
            generation_config=generation_config,
        )
        
        return response.text.strip()
        
    except Exception as e:
        print(f"Error in AI generation: {e}")
        import traceback
        traceback.print_exc()
        return f"I apologize, but I encountered an error processing your question. Please try rephrasing or ask something else about the {context.get('loan_name', 'loan')}."


@app.post("/api/query")
async def query_loan_context(request: Request):
    """
    Query endpoint for ElevenLabs custom tools to get context-aware answers
    This is called by ElevenLabs agent during conversations
    """
    try:
        data = await request.json()
        session_id = data.get("session_id")
        question = data.get("question")
        
        if not session_id or not question:
            raise HTTPException(
                status_code=400,
                detail="session_id and question are required"
            )
        
        # Get context from memory
        context = manager.get_context(session_id)
        
        if not context:
            # If not in memory, try to fetch from Supabase
            if not supabase:
                raise HTTPException(
                    status_code=500,
                    detail="Context not found and Supabase not configured"
                )
            
            response = supabase.table("loan_sessions").select("*").eq("id", session_id).single().execute()
            
            if not response.data:
                raise HTTPException(status_code=404, detail="Session not found")
            
            session_data = response.data
            
            # Build minimal context (without downloading documents)
            context = {
                "session_id": session_id,
                "loan_name": session_data.get("loan_name"),
                "user_role": session_data.get("user_role"),
                "institution": session_data.get("institution"),
                "ai_focus": session_data.get("ai_focus"),
                "language": session_data.get("language"),
                "region": session_data.get("region"),
                "documents": session_data.get("documents", []),
                "conversations": session_data.get("conversations", []),
            }
        
        # Generate AI response
        answer = await generate_ai_response(context, question)
        
        # Log the query for tracking
        print(f"[Query API] Session: {session_id}, Q: {question[:50]}...")
        
        return {
            "success": True,
            "answer": answer,
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in query endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/session/{session_id}/context")
async def get_session_context(session_id: str):
    """
    Get the current session context (without sensitive document content)
    """
    context = manager.get_context(session_id)
    
    if not context:
        raise HTTPException(status_code=404, detail="Session context not found")
    
    # Return sanitized context
    return {
        "success": True,
        "context": {
            "session_id": context["session_id"],
            "loan_name": context["loan_name"],
            "user_role": context["user_role"],
            "institution": context.get("institution"),
            "region": context["region"],
            "document_count": len(context.get("documents", [])),
            "conversation_count": len(context.get("conversations", []))
        }
    }


@app.post("/api/session/{session_id}/end")
async def end_session(session_id: str):
    """
    End a session and cleanup resources
    """
    context = manager.get_context(session_id)
    
    if context:
        # Update final status in Supabase
        if supabase:
            try:
                supabase.table("loan_sessions").update({
                    "status": "Completed",
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", session_id).execute()
            except Exception as e:
                print(f"Error updating session status: {e}")
        
        manager.disconnect(session_id)
    
    return {
        "success": True,
        "message": "Session ended successfully"
    }

