# 🧩 Asistente NEAE - Asistente Virtual de Apoyo Educativo

Una interfaz web moderna para interactuar con el Asistente Virtual NEAE (Necesidades Específicas de Apoyo Educativo) para Andalucía, diseñado para proporcionar apoyo especializado a docentes y familias.

## 🌟 Descripción General

El Asistente NEAE es un asistente virtual impulsado por IA que proporciona apoyo especializado para profesionales educativos que trabajan con estudiantes que tienen Necesidades Específicas de Apoyo Educativo (NEAE) en Andalucía, España. Ofrece orientación sobre adaptaciones curriculares, recursos especializados, estrategias inclusivas y normativa educativa.

## ✨ Características

### 🖥️ Interfaz Web

- 💬 **Chat en Tiempo Real** - Comunicación instantánea con el asistente NEAE
- 📱 **Diseño Responsivo** - Funciona perfectamente en dispositivos móviles y de escritorio
- 🎨 **Interfaz Moderna** - Diseño limpio y profesional adecuado para entornos educativos
- ⚡ **Indicadores de Carga** - Retroalimentación visual para las interacciones del usuario
- 🔗 **Enlaces Automáticos** - Detección automática de URLs en las respuestas
- 📝 **Soporte de Markdown** - Formato de texto enriquecido en los mensajes
- 🌐 **Estado de Conexión** - Indicadores de conectividad del servidor en tiempo real

### 🤖 Capacidades del Asistente

- 🔐 **Autenticación Segura** - Control de acceso basado en claves API
- 🗣️ **Gestión de Sesiones** - Mantiene el contexto de la conversación
- 📊 **Manejo de Errores** - Gestión integral de errores
- 🤖 **Integración con IA** - Impulsado por Google Gemini AI
- 🎯 **Conocimiento Especializado** - Orientación experta en temas NEAE

## 🚀 Inicio Rápido

### Prerrequisitos

Asegúrate de tener Python 3.7+ instalado y las siguientes dependencias:

```bash
pip install fastapi uvicorn[standard] google-generativeai python-dotenv
```

### 1. Iniciar el Servidor

```bash
uvicorn main:app --reload
```

### 2. Acceder a la Interfaz Web

Abre tu navegador y navega a: **http://127.0.0.1:8000**

La interfaz te redirigirá automáticamente a la aplicación de chat.

## 📁 Estructura del Proyecto

```
asistente-neae/
├── main.py                # Servidor FastAPI con endpoints de chat
├── user_keys.json         # Claves de usuario y límites de uso
├── user_keys.example.json # Ejemplo de configuración de claves
├── prompt.txt             # Instrucciones del sistema para el asistente
├── .env                   # Variables de entorno
├── credenciales_google.json # Credenciales de Google
├── frontend/              # Archivos de la interfaz web (SPA)
│   └── static/            # Assets estáticos
│       ├── index.html     # Shell de la aplicación SPA
│       ├── css/
│       │   └── app.css    # Estilos CSS
│       ├── js/
│       │   ├── router.js  # Router SPA
│       │   ├── session.js # Gestión de sesiones
│       │   ├── errorHandler.js # Manejo de errores
│       │   └── config.js  # Configuración frontend
│       └── views/         # Vistas SPA
│           ├── chat/      # Vista de chat
│           └── login/     # Vista de login
├── test_setup.py          # Script de verificación de configuración
├── README.md              # Esta documentación
└── LICENSE                # Licencia del proyecto
```

## 🔧 Configuración

### Configuración de Claves de Usuario

El sistema utiliza un archivo `user_keys.json` para gestionar las claves de usuario y sus límites de uso:

1. **Crear el archivo de configuración:**

   ```bash
   cp user_keys.example.json user_keys.json
   ```

2. **Editar las claves de usuario:**

   ```json
   {
     "tu_clave_personalizada": {
       "count": 0,
       "max_uses": 100,
       "user_id": "usuario1",
       "description": "Descripción del usuario"
     },
     "otra_clave": {
       "count": 0,
       "max_uses": 50,
       "user_id": "usuario2",
       "description": "Usuario secundario"
     }
   }
   ```

3. **Campos de configuración:**

   - `count`: Número actual de usos (se incrementa automáticamente)
   - `max_uses`: Límite máximo de usos por clave
   - `user_id`: Identificador único del usuario
   - `description`: Descripción opcional del usuario

4. **Recargar configuración:**
   - Las claves se cargan automáticamente al iniciar el servidor
   - Para recargar sin reiniciar: `POST /admin/reload-keys`
   - Ver estado actual: `GET /admin/keys-status`

### Configuración del Entorno

Asegúrate de que tu archivo `.env` contenga la ruta de credenciales de Google necesaria:

```
GOOGLE_APPLICATION_CREDENTIALS_PATH=./credenciales.json
```

## 💬 Ejemplos de Uso

### Iniciar una Conversación

1. Inicia el servidor con `uvicorn main:app --reload`
2. Abre http://127.0.0.1:8000 en tu navegador
3. Escribe tu consulta relacionada con NEAE
4. Presiona Enter o haz clic en "Enviar"

### Consultas de Ejemplo

- "Necesito adaptaciones para un alumno con TDAH en 3º de primaria"
- "¿Qué recursos hay para estudiantes con dislexia?"
- "Cómo adaptar una actividad de matemáticas para TEA"
- "Normativa andaluza sobre NEAE"

## 📡 Endpoints de la API

### Autenticación

Todas las solicitudes de API requieren una clave API en el encabezado:

```
X-API-Key: tu_clave_api_aquí
```

### Endpoints Disponibles

#### POST `/chat/start`

Inicia una nueva sesión de chat.

**Encabezados:**

```
X-API-Key: [tu_clave_api]
```

**Respuesta:**

```json
{
  "session_id": "cadena-uuid",
  "message": "Mensaje de bienvenida"
}
```

#### POST `/chat/send`

Envía un mensaje al asistente.

**Encabezados:**

```
X-API-Key: [tu_clave_api]
```

**Cuerpo:**

```json
{
  "session_id": "cadena-uuid",
  "pregunta": "Tu pregunta aquí"
}
```

**Respuesta:**

```json
{
  "session_id": "cadena-uuid",
  "respuesta": "Respuesta del asistente",
  "error": null
}
```

## 🎯 Características Especiales

### Formato de Mensajes

El asistente formatea automáticamente las respuestas con:

- **Encabezados de sección** con emojis y títulos claros
- **Enlaces clickeables** para recursos externos
- **Listas con viñetas** para información estructurada
- **Texto en negrita** usando sintaxis markdown
- **Bloques de código** para ejemplos técnicos

### Validación de Entrada

- **Límite de caracteres** de 1000 caracteres por mensaje
- **Validación de sesión** para mantener el contexto de la conversación
- **Manejo de errores en tiempo real** con mensajes amigables para el usuario
- **Monitoreo de conexión** con lógica de reintento automático

## 🔍 Solución de Problemas

### Problemas del Servidor

**El servidor no inicia:**

```bash
pip install fastapi uvicorn[standard] google-generativeai python-dotenv
```

**Puerto ya en uso:**

```bash
# Terminar proceso usando el puerto 8000
netstat -ano | findstr :8000
# Luego usa el PID con: taskkill /F /PID [NÚMERO_PID]
```

### Problemas de la Interfaz Web

**Errores de conexión:**

- Verifica que el servidor esté ejecutándose en el puerto 8000
- Comprueba que la clave API esté configurada correctamente en `static/config.js`
- Abre las herramientas de desarrollador del navegador (F12) para verificar errores de JavaScript

**Problemas de CORS:**
El servidor está preconfigurado para permitir todos los orígenes en desarrollo. Si encuentras errores de CORS, verifica la configuración del servidor en `main.py`.

**Archivos estáticos no cargan:**

- Asegúrate de que todas las rutas en `index.html` usen el prefijo `/static/`
- Verifica que el montaje de archivos estáticos de FastAPI esté configurado correctamente

### Problemas de Credenciales de Google

**Errores de autenticación:**

- Verifica que tu archivo `.env` apunte al archivo de credenciales correcto
- Asegúrate de que `credenciales.json` exista y contenga credenciales válidas de la API de Google
- Comprueba que el servicio Google Generative AI esté habilitado para tu proyecto

## 🛠️ Desarrollo

### Ejecutar en Modo de Desarrollo

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Probar la Configuración

Usa el script de prueba incluido:

```bash
python test_setup.py
```

Esto verificará:

- ✅ Las claves API están disponibles
- ✅ La configuración del servidor es correcta
- ✅ Las credenciales de Google son válidas
- ✅ Los archivos de la interfaz web están presentes

### Monitoreo de Archivos

La bandera `--reload` habilita el reinicio automático del servidor cuando cambian los archivos, haciendo el desarrollo más eficiente.

## 🤝 Contribuir

1. Haz un fork del repositorio
2. Crea una rama de características
3. Realiza tus cambios
4. Prueba exhaustivamente
5. Envía un pull request

## 📄 Licencia

Este proyecto está licenciado bajo los términos especificados en el archivo LICENSE.

## 🎉 Empezar

¡Tu interfaz web está lista para usar! Simplemente ejecuta:

```bash
uvicorn main:app --reload
```

Luego abre http://127.0.0.1:8000 en tu navegador para comenzar a chatear con el asistente NEAE.

---

**Hecho con ❤️ para profesionales educativos en Andalucía**
