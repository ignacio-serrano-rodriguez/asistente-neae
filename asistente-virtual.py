import google.generativeai as genai
import os
from dotenv import load_dotenv
from google.ai.generativelanguage import GoogleSearchRetrieval

# Cargar variables de entorno
load_dotenv(override=True) # Añadir override=True para sobrescribir variables existentes

# Configurar credenciales de Google Application Credentials desde un archivo JSON
credentials_path_from_env_file = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_PATH")
effective_credentials_path = None

if credentials_path_from_env_file:
    if os.path.exists(credentials_path_from_env_file):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path_from_env_file
        effective_credentials_path = credentials_path_from_env_file
        print(f"Usando credenciales de servicio desde el archivo: {effective_credentials_path}")
    else:
        raise FileNotFoundError(
            f"El archivo de credenciales JSON especificado en GOOGLE_APPLICATION_CREDENTIALS_PATH ({credentials_path_from_env_file}) no se encontró."
        )
elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
    effective_credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not os.path.exists(effective_credentials_path):
        print(f"Advertencia: El archivo de credenciales JSON especificado por la variable de entorno GOOGLE_APPLICATION_CREDENTIALS ({effective_credentials_path}) no se encontró, pero se intentará usar.")
    else:
        print(f"Usando credenciales de servicio desde la variable de entorno GOOGLE_APPLICATION_CREDENTIALS: {effective_credentials_path}")
else:
    raise ValueError(
        "No se encontraron credenciales de Google. "
        "Define GOOGLE_APPLICATION_CREDENTIALS_PATH en tu archivo .env apuntando a tu archivo de credenciales JSON, "
        "o configura la variable de entorno GOOGLE_APPLICATION_CREDENTIALS directamente en tu sistema."
    )

# Configurar la API de Gemini.
# Al no pasar api_key, la librería usará Application Default Credentials (ADC),
# que recogerá las credenciales del archivo JSON especificado por GOOGLE_APPLICATION_CREDENTIALS.
try:
    genai.configure() # No se pasa api_key, usará ADC
except Exception as e:
    print(f"Error al configurar genai con Application Default Credentials: {e}")
    raise RuntimeError(
        "No se pudo configurar la API de Gemini con las credenciales proporcionadas. "
        "Verifica que el archivo de credenciales es válido y que la cuenta de servicio tiene los permisos necesarios (ej. 'Vertex AI User')."
    ) from e

# --- Configuración del Asistente Virtual NEAE ---

# Selecciona el modelo.
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
            # Mostrar directamente el mensaje de inicio especificado por el usuario
            print("\\n📝 Para poder ayudarte de la forma más precisa y útil posible, necesito que me indiques:")
            print("")
            print("- **El curso o etapa educativa** (Infantil, Primaria, Secundaria o FP).")
            print("- **El tipo de NEAE** (por ejemplo: TDAH, dislexia, TEA, discapacidad auditiva, motora, etc.).")
            print("")
            print("Una vez que tenga esta información, podré ofrecerte propuestas, recursos y adaptaciones específicas y fundamentadas en la normativa vigente de Andalucía. ¡Gracias! 📘✨")
            print("---")
            print("Escribe 'salir' para terminar la conversación.")
            # print("---") # Eliminado un separador extra para que coincida con el formato solicitado

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