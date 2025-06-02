import google.generativeai as genai
import os
from dotenv import load_dotenv
from google.ai.generativelanguage import GoogleSearchRetrieval
from fastapi import FastAPI, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel
import uuid

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

# Define your static API keys
API_KEYS = [
    "clave_secreta_1_aqui",  # Replace with your actual strong keys
    "clave_secreta_2_aqui",
    "clave_secreta_3_aqui",
    "clave_secreta_4_aqui",
    "clave_secreta_5_aqui",
    "clave_secreta_6_aqui",
]

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

async def get_api_key(api_key: str = Security(api_key_header)):
    if api_key in API_KEYS:
        return api_key
    else:
        raise HTTPException(
            status_code=403, detail="Could not validate credentials or API key is invalid."
        )

app = FastAPI(
    title="Asistente NEAE API",
    description="API para interactuar con el Asistente Virtual de Apoyo Docente NEAE para Andalucía.",
    version="1.0.0"
)

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
async def start_chat_session(api_key: str = Security(get_api_key)):
    """
    Inicializa una nueva sesión de chat con el asistente virtual.
    Devuelve un ID de sesión único que debe usarse para las interacciones posteriores.
    Requires X-API-Key header for authentication.
    """
    try:
        chat = modelo_gemini.start_chat(history=[]) # Historial vacío para empezar
        session_id = str(uuid.uuid4())
        chat_sessions[session_id] = chat
        return ChatInitResponse(
            session_id=session_id,
            message="Hola, soy tu Asistente NEAE de Apoyo Docente para Andalucía. Sesión iniciada."
        )
    except Exception as e:
        print(f"Error crítico al iniciar el chat: {e}") # Log para el servidor
        raise HTTPException(status_code=500, detail=f"Error interno del servidor al iniciar el chat: {str(e)}")

@app.post("/chat/send",
            response_model=ChatMessageResponse,
            summary="Enviar un mensaje a una sesión de chat",
            tags=["Chat"])
async def send_chat_message(request: ChatMessageRequest, api_key: str = Security(get_api_key)):
    """
    Envía un mensaje del usuario a una sesión de chat existente, identificada por `session_id`.
    Devuelve la respuesta del asistente.
    Requires X-API-Key header for authentication.
    """
    chat_session = chat_sessions.get(request.session_id)
    if not chat_session:
        raise HTTPException(status_code=404, detail=f"Sesión de chat con ID '{request.session_id}' no encontrada.")

    if not request.pregunta or not request.pregunta.strip():
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía.")

    try:
        print(f"🤖 Asistente NEAE (API) está pensando para sesión {request.session_id}...")
        response = chat_session.send_message(request.pregunta)
        # El descargo de responsabilidad y la leyenda de iconos deben ser manejados por el LLM
        # según las instrucciones en prompt.txt
        return ChatMessageResponse(session_id=request.session_id, respuesta=response.text)
    except Exception as e:
        # Log the full error for debugging on the server
        print(f"Error al comunicarse con el modelo para sesión {request.session_id}: {e}")
        # Consider more specific error handling based on genai exceptions if available
        # For now, return a generic error to the client
        raise HTTPException(status_code=500, detail=f"Error al comunicarse con el modelo: {str(e)}")

# Instrucciones para ejecutar la aplicación (se pueden añadir como comentarios al final del archivo o en un README)
# Para ejecutar esta aplicación FastAPI:
# 1. Asegúrate de tener este archivo (main.py) en el directorio raíz de tu proyecto.
# 2. Verifica que los archivos `.env`, `prompt.txt` y `credenciales.json` (referenciado en .env) estén correctamente configurados y en las ubicaciones esperadas.
# 3. Instala las dependencias necesarias:
#    pip install fastapi uvicorn[standard] google-generativeai python-dotenv
# 4. Ejecuta el servidor Uvicorn desde la terminal, en el directorio del proyecto:
#    uvicorn main:app --reload
#
# Una vez en ejecución, la API estará disponible (por defecto) en http://127.0.0.1:8000.
# Puedes ver la documentación interactiva de la API en http://127.0.0.1:8000/docs.
#
# Ejemplos de uso con curl:
#
# Iniciar una nueva sesión de chat:
# curl -X POST http://127.0.0.1:8000/chat/start -H "Content-Type: application/json" -d "{}" -H "X-API-Key: tu_clave_api_aqui"
# (Copia el "session_id" de la respuesta)
#
# Enviar un mensaje a la sesión:
# curl -X POST http://127.0.0.1:8000/chat/send -H "Content-Type: application/json" -d '''{
#   "session_id": "TU_SESSION_ID_AQUI",
#   "pregunta": "Necesito ayuda con un alumno con TDAH en primaria"
# }''' -H "X-API-Key: tu_clave_api_aqui"
