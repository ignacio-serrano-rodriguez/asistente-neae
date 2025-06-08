import os
import json
from dotenv import load_dotenv
from google.ai.generativelanguage import GoogleSearchRetrieval
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import google.generativeai as genai

# Cargar variables de entorno
load_dotenv(override=True)

# --- Copied and adapted from asistente-virtual.py ---
# Configurar credenciales
credentials_path_from_env_file = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_PATH")
effective_credentials_path = None
# Use abspath for __file__ robustness, assuming main.py is in the project root
script_dir = os.path.dirname(os.path.abspath(__file__))

if credentials_path_from_env_file:
    if os.path.isabs(credentials_path_from_env_file):
        potential_path = credentials_path_from_env_file
    else:
        # If relative, resolve it with respect to the script's directory
        potential_path = os.path.join(script_dir, credentials_path_from_env_file)
    
    potential_path = os.path.normpath(potential_path)

    if os.path.exists(potential_path):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = potential_path
        effective_credentials_path = potential_path
        print(f"Usando credenciales de servicio desde el archivo: {effective_credentials_path}")
    else:
        raise FileNotFoundError(
            f"El archivo de credenciales JSON especificado en GOOGLE_APPLICATION_CREDENTIALS_PATH ('{credentials_path_from_env_file}') no se encontró. "
            f"Se intentó resolver como ruta absoluta: '{potential_path}'."
        )
elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
    effective_credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not os.path.exists(effective_credentials_path):
        print(f"Advertencia: El archivo de credenciales JSON especificado por la variable de entorno GOOGLE_APPLICATION_CREDENTIALS ('{effective_credentials_path}') no se encontró, pero se intentará usar si las librerías de Google lo permiten.")
    else:
        print(f"Usando credenciales de servicio desde la variable de entorno GOOGLE_APPLICATION_CREDENTIALS: {effective_credentials_path}")
else:
    raise ValueError(
        "No se encontraron credenciales de Google. "
        "Define GOOGLE_APPLICATION_CREDENTIALS_PATH en tu archivo .env apuntando a tu archivo de credenciales JSON, "
        "o configura la variable de entorno GOOGLE_APPLICATION_CREDENTIALS directamente en tu sistema."
    )

try:
    genai.configure() # No se pasa api_key, usará ADC
except Exception as e:
    print(f"Error al configurar genai con Application Default Credentials: {e}")
    raise RuntimeError(
        "No se pudo configurar la API de Gemini con las credenciales proporcionadas. "
        "Verifica que el archivo de credenciales es válido y que la cuenta de servicio tiene los permisos necesarios (ej. 'Vertex AI User')."
    ) from e

MODEL_NAME = "gemini-1.5-pro-latest"

def cargar_prompt_desde_archivo(ruta_archivo):
    """Carga el contenido de un archivo de texto."""
    try:
        with open(ruta_archivo, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"Error: No se encontró el archivo de prompt en {ruta_archivo}")
        return None
    except Exception as e:
        print(f"Error al leer el archivo de prompt: {e}")
        return None

# Asegúrate de que prompt.txt esté en el mismo directorio que main.py o proporciona la ruta completa.
RUTA_PROMPT_TXT = os.path.join(os.path.dirname(__file__), "prompt.txt")
SYSTEM_PROMPT_ASISTENTE_NEAE = cargar_prompt_desde_archivo(RUTA_PROMPT_TXT)

if not SYSTEM_PROMPT_ASISTENTE_NEAE:
    raise ValueError("No se pudo cargar el prompt del sistema desde prompt.txt. Verifica el archivo y la ruta.")

# Configurar la herramienta de búsqueda de Google
google_search_tool = GoogleSearchRetrieval()

# Inicializar el modelo generativo de Gemini
try:
    modelo_gemini = genai.GenerativeModel(
        MODEL_NAME,
        system_instruction=SYSTEM_PROMPT_ASISTENTE_NEAE,
        tools=[google_search_tool]
    )
except Exception as e:
    print(f"Error al inicializar el modelo Gemini: {e}")
    raise RuntimeError("No se pudo inicializar el modelo Gemini.") from e
# --- End of copied/adapted code ---

app = FastAPI(
    title="Asistente NEAE API",
    description="API para interactuar con el Asistente Virtual de Apoyo Docente NEAE para Andalucía.",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve the web interface
@app.get("/", response_class=FileResponse)
async def get_web_interface():
    """Serve the web chat interface."""
    return FileResponse("static/index.html")

# In-memory store for chat sessions (for simplicity; consider a database for production)
chat_sessions = {}

class ChatInitResponse(BaseModel):
    session_id: str
    message: str

class ChatMessageRequest(BaseModel):
    session_id: str
    pregunta: str

class ChatMessageResponse(BaseModel):
    session_id: str 
    respuesta: str 
    error: str | None = None

@app.post("/chat/start",
            response_model=ChatInitResponse,
            summary="Iniciar una nueva sesión de chat",
            tags=["Chat"])
async def start_chat_session(): # Modified function signature
    """
    Inicializa una nueva sesión de chat con el asistente virtual.
    Devuelve un ID de sesión único que debe usarse para las interacciones posteriores.
    """
    try:
        chat = modelo_gemini.start_chat(history=[]) 
        session_id = str(uuid.uuid4())
        chat_sessions[session_id] = chat
        return ChatInitResponse(
            session_id=session_id,
            message="Hola, soy tu Asistente NEAE de Apoyo Docente para Andalucía. Sesión iniciada."
        )
    except Exception as e:
        print(f"Error crítico al iniciar el chat: {e}") 
        raise HTTPException(status_code=500, detail=f"Error interno del servidor al iniciar el chat: {str(e)}")

@app.post("/chat/send",
            response_model=ChatMessageResponse,
            summary="Enviar un mensaje a una sesión de chat",
            tags=["Chat"])
async def send_chat_message(request: ChatMessageRequest): # Modified function signature
    """
    Envía un mensaje del usuario a una sesión de chat existente, identificada por `session_id`.
    Devuelve la respuesta del asistente.
    """
    chat_session = chat_sessions.get(request.session_id)
    if not chat_session:
        raise HTTPException(status_code=404, detail=f"Sesión de chat con ID \'{request.session_id}\' no encontrada.")

    if not request.pregunta or not request.pregunta.strip():
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía.")

    try:
        print(f"🤖 Asistente NEAE (API) está pensando para sesión {request.session_id}...")
        # Simulate sending message to Gemini model and getting a response
        # Replace this with actual call to your Gemini model
        response_text = chat_session.send_message(request.pregunta).text
        return ChatMessageResponse(session_id=request.session_id, respuesta=response_text)
    except Exception as e:
        print(f"Error al enviar mensaje a Gemini: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor al procesar el mensaje: {str(e)}")