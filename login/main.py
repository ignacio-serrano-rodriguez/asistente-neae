from fastapi import FastAPI, Request, Form, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

# In-memory user store (for demonstration purposes)
# In a real application, use a database and hashed passwords
fake_keys_db = {
    "supersecretkey": {"count": 0, "max_uses": 100},
    "anothersecretkey": {"count": 0, "max_uses": 100}
} # Changed to store count and max_uses

def get_current_user_key(request: Request): # Renamed for clarity
    return request.cookies.get("auth_key")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request, auth_key: str = Depends(get_current_user_key)): # Changed user to auth_key
    if auth_key and auth_key in fake_keys_db:
        key_data = fake_keys_db[auth_key]
        return templates.TemplateResponse(
            "index.html", 
            {
                "request": request, 
                "user": auth_key, 
                "usage_count": key_data["count"],
                "max_uses": key_data["max_uses"]
            }
        )
    return RedirectResponse(url="/login", status_code=302)

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
async def login_submit(request: Request, key: str = Form(...)): # Changed username and password to key
    if key in fake_keys_db: # Check if key exists
        response = RedirectResponse(url="/", status_code=302)
        response.set_cookie(key="auth_key", value=key) # Store the key in cookie
        return response
    return templates.TemplateResponse("login.html", {"request": request, "error": "Invalid key"})

@app.post("/increment_usage")
async def increment_usage(request: Request, auth_key: str = Depends(get_current_user_key)):
    if auth_key and auth_key in fake_keys_db:
        key_data = fake_keys_db[auth_key]
        if key_data["count"] < key_data["max_uses"]:
            key_data["count"] += 1
        return RedirectResponse(url="/", status_code=302)
    return RedirectResponse(url="/login", status_code=302) # If no valid key, redirect to login

@app.get("/logout")
async def logout(request: Request):
    response = RedirectResponse(url="/login", status_code=302)
    response.delete_cookie("auth_key") # Delete the auth_key cookie
    return response

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
