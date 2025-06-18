import json
import os
from pathlib import Path
import json
from dotenv import load_dotenv
# Removed: from google.ai.generativelanguage import GoogleSearchRetrieval
from fastapi import FastAPI, HTTPException, Request, Form, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import google.generativeai as genai
import uvicorn

# Cargar variables de entorno
load_dotenv(override=True)

# --- Configuración del Modelo Gemini ---
# Adaptado de asistente-virtual.py y la lógica previa de main.py
credentials_path_from_env_file = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_PATH")
effective_credentials_path = None
script_dir = os.path.dirname(os.path.abspath(__file__))

if credentials_path_from_env_file:
    if os.path.isabs(credentials_path_from_env_file):
        potential_path = credentials_path_from_env_file
    else:
        potential_path = os.path.join(script_dir, credentials_path_from_env_file)
    potential_path = os.path.normpath(potential_path)
    if os.path.exists(potential_path):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = potential_path
        effective_credentials_path = potential_path
        print(f"Usando credenciales de servicio desde el archivo: {effective_credentials_path}")
    else:
        print(f"Advertencia: El archivo de credenciales JSON especificado en GOOGLE_APPLICATION_CREDENTIALS_PATH ('{credentials_path_from_env_file}') no se encontró en '{potential_path}'.")
elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
    effective_credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not os.path.exists(effective_credentials_path):
        print(f"Advertencia: El archivo de credenciales JSON especificado por GOOGLE_APPLICATION_CREDENTIALS ('{effective_credentials_path}') no se encontró.")
    else:
        print(f"Usando credenciales de servicio desde GOOGLE_APPLICATION_CREDENTIALS: {effective_credentials_path}")

try:
    api_key_from_env = os.getenv("GOOGLE_API_KEY")
    if api_key_from_env:
        genai.configure(api_key=api_key_from_env)
        print("Usando GOOGLE_API_KEY para configurar Gemini.")
    elif effective_credentials_path and os.path.exists(effective_credentials_path):
        genai.configure() 
        print("Intentando configurar Gemini usando Application Default Credentials (ADC) a través de GOOGLE_APPLICATION_CREDENTIALS.")
    else:
        # Fallback a intentar configurar sin nada explícito, puede que funcione si ADC está configurado de otra manera
        genai.configure()
        print("Intentando configurar Gemini (puede usar ADC si está disponible de otra forma, o fallará si no hay credenciales).")

except Exception as e:
    print(f"Error inicial al configurar genai: {e}. El modelo no estará disponible.")
    # No levantar RuntimeError aquí para permitir que la app inicie y muestre errores en endpoints
    # modelo_gemini se manejará como None si la configuración falla.

MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-pro-latest") # Usar variable de entorno o default
SYSTEM_PROMPT_ASISTENTE_NEAE = "Eres un asistente virtual de apoyo docente especializado en Necesidades Específicas de Apoyo Educativo (NEAE) para Andalucía." # Default simple
RUTA_PROMPT_TXT = os.path.join(script_dir, "prompt.txt")
if os.path.exists(RUTA_PROMPT_TXT):
    with open(RUTA_PROMPT_TXT, 'r', encoding='utf-8') as f:
        SYSTEM_PROMPT_ASISTENTE_NEAE = f.read()
        print(f"Prompt del sistema cargado desde {RUTA_PROMPT_TXT}")

modelo_gemini = None
try:
    # Directly attempt to initialize the model.
    # genai.configure() should have been called in the preceding block.
    # If configuration failed, GenerativeModel() will likely raise an error, caught below.
    modelo_gemini = genai.GenerativeModel(
        MODEL_NAME
        # system_instruction=SYSTEM_PROMPT_ASISTENTE_NEAE, # Removed: system_instruction not supported by this version
        # tools=[GoogleSearchRetrieval()] # Descomentar si se necesita Google Search
        # safety_settings=SAFETY_SETTINGS # Descomentar y definir si se necesitan ajustes de seguridad
    )
    print(f"Modelo Gemini '{MODEL_NAME}' inicializado correctamente.")
except Exception as e:
    print(f"Error al inicializar el modelo Gemini '{MODEL_NAME}': {e}")
    # modelo_gemini will remain None, and endpoints will report 503 if they rely on it.
# --- Fin Configuración del Modelo Gemini ---

app = FastAPI(
    title="Asistente NEAE API",
    description="API para interactuar con el Asistente Virtual de Apoyo Docente NEAE para Andalucía.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# Remove template dependency for pure SPA approach
# templates = Jinja2Templates(directory="frontend/templates")

# User keys management
USER_KEYS_FILE = Path(__file__).parent / "user_keys.json"

def load_user_keys():
    """Load user keys from external JSON file"""
    try:
        if USER_KEYS_FILE.exists():
            with open(USER_KEYS_FILE, 'r', encoding='utf-8') as f:
                keys_data = json.load(f)
                print(f"✅ User keys loaded from {USER_KEYS_FILE}")
                print(f"📊 Found {len(keys_data)} user keys configured")
                return keys_data
        else:
            print(f"⚠️ User keys file not found: {USER_KEYS_FILE}")
            print("📝 Creating default user keys file...")
            default_keys = {
                "supersecretkey": {"count": 0, "max_uses": 100, "user_id": "user1", "description": "Usuario principal"},
                "anothersecretkey": {"count": 0, "max_uses": 50, "user_id": "user2", "description": "Usuario secundario"}
            }
            save_user_keys(default_keys)
            return default_keys
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing user keys JSON: {e}")
        return {}
    except Exception as e:
        print(f"❌ Error loading user keys: {e}")
        return {}

def save_user_keys(keys_data):
    """Save user keys to external JSON file"""
    try:
        with open(USER_KEYS_FILE, 'w', encoding='utf-8') as f:
            json.dump(keys_data, f, indent=4, ensure_ascii=False)
        print(f"💾 User keys saved to {USER_KEYS_FILE}")
    except Exception as e:
        print(f"❌ Error saving user keys: {e}")

def get_user_keys():
    """Get current user keys, reload if needed"""
    global fake_keys_db
    if not fake_keys_db:
        fake_keys_db = load_user_keys()
    return fake_keys_db

def reload_user_keys():
    """Force reload user keys from file"""
    global fake_keys_db
    fake_keys_db = load_user_keys()
    return fake_keys_db

def increment_user_usage(user_key: str):
    """Increment usage count for a user key and save to file"""
    global fake_keys_db
    if user_key in fake_keys_db:
        fake_keys_db[user_key]["count"] += 1
        save_user_keys(fake_keys_db)
        print(f"📈 Usage incremented for key {user_key}: {fake_keys_db[user_key]['count']}/{fake_keys_db[user_key]['max_uses']}")

# Load user keys at startup
fake_keys_db = load_user_keys()

chat_sessions = {} # Almacén en memoria para sesiones de chat

def get_current_user_key(request: Request):
    return request.cookies.get("auth_key")

@app.get("/", response_class=FileResponse)
async def read_root():
    # Serve the SPA shell for all routes
    return FileResponse("frontend/static/index.html")

@app.get("/login", response_class=FileResponse)
async def login_page_get():
    # SPA handles all routing, serve the same index.html
    return FileResponse("frontend/static/index.html")

@app.post("/login")
async def login_submit(request: Request, key: str = Form(...)):
    if key in fake_keys_db:
        # For SPA, set cookie and return success. Client will re-route.
        response = JSONResponse(content={"message": "Inicio de sesión exitoso. Cookie establecida."})
        response.set_cookie(key="auth_key", value=key)
        return response
    else:
        # SPA expects a JSON error for failed login
        raise HTTPException(status_code=401, detail="Clave no válida")

@app.get("/chat", response_class=FileResponse)
async def chat_interface_get():
    # SPA handles all routing, serve the same index.html
    return FileResponse("frontend/static/index.html")

@app.get("/logout")
async def logout(request: Request):
    # Server clears the cookie.
    # SPA will detect lack of cookie on next interaction or route change and show login.
    response = JSONResponse(content={"message": "Cierre de sesión exitoso. Cookie eliminada."})
    response.delete_cookie("auth_key")
    return response

# New endpoint for SPA to fetch user data
@app.get("/api/user-data", tags=["User"])
async def get_user_data(request: Request, auth_key: str = Depends(get_current_user_key)):
    if not auth_key or auth_key not in fake_keys_db:
        raise HTTPException(status_code=401, detail="No autenticado o clave inválida")
    
    key_data = fake_keys_db[auth_key]
    return {
        "user_key": auth_key, # Optional: if client needs to be aware of the key itself
        "usage_count": key_data["count"],
        "max_uses": key_data["max_uses"]
    }

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

@app.post("/chat/start", response_model=ChatInitResponse, tags=["Chat"])
async def start_chat_session(auth_key: str = Depends(get_current_user_key)):
    if not auth_key or auth_key not in fake_keys_db:
        raise HTTPException(status_code=401, detail="No autenticado o clave inválida")
    if not modelo_gemini:
        raise HTTPException(status_code=503, detail="Servicio de chat no disponible: Modelo no cargado.")
    try:
        initial_history = [
            {"role": "user", "parts": [SYSTEM_PROMPT_ASISTENTE_NEAE]},
            {"role": "model", "parts": ["Entendido. Estoy listo para asistir como un especialista en NEAE para Andalucía."]}
        ]
        chat = modelo_gemini.start_chat(history=initial_history)
        session_id = str(uuid.uuid4())
        chat_sessions[session_id] = chat
        return ChatInitResponse(
            session_id=session_id,
            message="Hola, soy tu Asistente NEAE. Sesión iniciada."
        )
    except Exception as e:
        print(f"Error al iniciar sesión de chat: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno al iniciar el chat: {str(e)}")

@app.post("/chat/send", response_model=ChatMessageResponse, tags=["Chat"])
async def send_chat_message(request: ChatMessageRequest, auth_key: str = Depends(get_current_user_key)):
    if not auth_key or auth_key not in fake_keys_db:
        raise HTTPException(status_code=401, detail="No autenticado o clave inválida")

    key_data = fake_keys_db[auth_key]
    if key_data["count"] >= key_data["max_uses"]:
        raise HTTPException(status_code=403, detail="Máximo uso de API alcanzado para esta clave.")

    chat_session = chat_sessions.get(request.session_id)
    if not chat_session:
        raise HTTPException(status_code=404, detail=f"Sesión de chat '{request.session_id}' no encontrada.")
    if not request.pregunta or not request.pregunta.strip():
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía.")
    if not modelo_gemini: # Comprobar de nuevo si el modelo está disponible
        raise HTTPException(status_code=503, detail="Servicio de chat no disponible: Modelo no cargado.")

    try:
        print(f"🤖 Asistente NEAE (API) pensando para sesión {request.session_id}...")
        response = chat_session.send_message(request.pregunta)
        # Asegurarse de que response.text exista. Algunos modelos/SDKs pueden tener response.parts[0].text
        response_text = ""
        if hasattr(response, 'text') and response.text:
            response_text = response.text
        elif hasattr(response, 'parts') and response.parts and hasattr(response.parts[0], 'text'):
            response_text = response.parts[0].text
        else:
            # Fallback o log de estructura de respuesta inesperada
            print(f"Respuesta inesperada del modelo: {response}")
            raise HTTPException(status_code=500, detail="Formato de respuesta inesperado del modelo.")

        increment_user_usage(auth_key)
        return ChatMessageResponse(session_id=request.session_id, respuesta=response_text)
    except Exception as e:
        print(f"Error al enviar mensaje a Gemini: {e}")
        # Podrías querer ser más específico con el error aquí
        if isinstance(e, HTTPException): # Re-raise si ya es una HTTPException
             raise
        raise HTTPException(status_code=500, detail=f"Error interno al procesar el mensaje: {str(e)}")

# Admin endpoints for user key management
@app.post("/admin/reload-keys", tags=["Admin"])
async def reload_keys():
    """Reload user keys from the configuration file"""
    try:
        new_keys = reload_user_keys()
        return {
            "message": "Claves de usuario recargadas exitosamente",
            "keys_count": len(new_keys),
            "keys": list(new_keys.keys())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al recargar claves: {str(e)}")

@app.get("/admin/keys-status", tags=["Admin"])
async def get_keys_status():
    """Get current status of all user keys"""
    try:
        keys_status = {}
        for key, data in fake_keys_db.items():            keys_status[key] = {
                "user_id": data.get("user_id", "desconocido"),
                "description": data.get("description", "Sin descripción"),
                "usage_count": data["count"],
                "max_uses": data["max_uses"],
                "usage_percentage": round((data["count"] / data["max_uses"]) * 100, 1),
                "remaining_uses": data["max_uses"] - data["count"]
            }
        return {
            "total_keys": len(fake_keys_db),
            "keys_file": str(USER_KEYS_FILE),
            "keys_status": keys_status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estado de claves: {str(e)}")

# Debug endpoint to test logout button issues
@app.get("/debug/elements", tags=["Debug"])
async def debug_elements():
    """Debug endpoint to check if elements are being served correctly"""
    return {
        "message": "Endpoint de depuración funcionando",
        "expected_elements": [
            "usageInfo - debería estar en el header",
            "logoutButton - debería estar en el header", 
            "Ambos deberían estar ocultos por defecto",
            "Ambos deberían mostrarse después de llamar SessionManager.updateUsageDisplay()"
        ],
        "check_console": "Busca los logs de depuración de SessionManager"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)