import google.generativeai as genai
import os
from dotenv import load_dotenv
from google.ai.generativelanguage import GoogleSearchRetrieval # Importar GoogleSearchRetrieval

# Cargar variables de entorno (API KEY)
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("No se encontró la API Key de Gemini. Asegúrate de que está en el archivo .env como GEMINI_API_KEY.")

genai.configure(api_key=GEMINI_API_KEY)

# --- Configuración del Asistente Virtual NEAE ---

# Selecciona el modelo.
MODEL_NAME = "gemini-1.5-flash-latest"

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

# Cargar el prompt de sistema desde prompt.txt
# Asegúrate de que prompt.txt esté en el mismo directorio que asistente-virtual.py o proporciona la ruta completa.
RUTA_PROMPT_TXT = os.path.join(os.path.dirname(__file__), "prompt.txt")
SYSTEM_PROMPT_ASISTENTE_NEAE = cargar_prompt_desde_archivo(RUTA_PROMPT_TXT)

if not SYSTEM_PROMPT_ASISTENTE_NEAE:
    raise ValueError("No se pudo cargar el prompt del sistema desde prompt.txt. Verifica el archivo y la ruta.")

# --- Funciones del Asistente ---

def inicializar_modelo():
    """Inicializa el modelo generativo de Gemini."""
    try:
        # Configurar la herramienta de búsqueda de Google
        google_search_tool = GoogleSearchRetrieval()

        model = genai.GenerativeModel(
            MODEL_NAME,
            system_instruction=SYSTEM_PROMPT_ASISTENTE_NEAE, # Usamos el prompt cargado de prompt.txt
            tools=[google_search_tool] # Habilitar la búsqueda en Google
        )
        return model
    except Exception as e:
        print(f"Error al inicializar el modelo: {e}")
        return None

def iniciar_chat(model):
    """Inicia una sesión de chat con el modelo."""
    if model:
        chat = model.start_chat(history=[]) # Historial vacío para empezar
        return chat
    return None

def preguntar_al_asistente(chat_session, pregunta_usuario):
    """Envía una pregunta al chat y obtiene una respuesta."""
    if not chat_session:
        return "Error: La sesión de chat no está iniciada."
    try:
        print("🤖 Asistente NEAE está pensando...")
        response = chat_session.send_message(pregunta_usuario)
        # El descargo de responsabilidad y la leyenda de iconos deben ser manejados por el LLM
        # según las instrucciones en prompt.txt
        return response.text
    except Exception as e:
        return f"Error al comunicarse con el modelo: {e}"

# --- Interfaz de Usuario Simple (Consola) ---
if __name__ == "__main__":
    print("Iniciando Asistente Virtual NEAE...")
    modelo_gemini = inicializar_modelo()

    if not modelo_gemini:
        print("No se pudo iniciar el asistente. Revisa la configuración, la API Key y el archivo prompt.txt.")
    else:
        chat_sesion = iniciar_chat(modelo_gemini)
        if not chat_sesion:
            print("No se pudo iniciar la sesión de chat.")
        else:
            # El LLM debería presentarse según las instrucciones de prompt.txt
            # Podrías enviar un mensaje inicial como "Hola" o "Preséntate" para que lo haga.
            print("\n🤖 Asistente NEAE: ¡Hola! Estoy aquí para ayudarte con tus consultas sobre NEAE.")
            print("Para empezar, por favor, indícame el curso o etapa educativa, el tipo de NEAE y la Comunidad Autónoma.")
            print("Escribe 'salir' para terminar la conversación.")
            print("---")

            while True:
                pregunta = input("👤 Tú: ")
                if pregunta.lower() == 'salir':
                    print("🤖 Asistente NEAE: ¡Hasta pronto! Espero haberte sido de ayuda.")
                    break
                if pregunta.strip():
                    respuesta = preguntar_al_asistente(chat_sesion, pregunta)
                    print(f"🤖 Asistente NEAE:\\n{respuesta}\\n---")
                else:
                    print("🤖 Asistente NEAE: Por favor, escribe una pregunta.")