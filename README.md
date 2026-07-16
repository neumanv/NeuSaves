# NeuSaves 💰

Aplicación web de gestión personal de gastos e ingresos con asistente de IA integrado.

---

## Tecnologías

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| **Angular** | 21 | Framework principal (standalone components, signals) |
| **Tailwind CSS** | v4 | Estilos utilitarios con paleta de colores personalizada |
| **Bootstrap + Bootstrap Icons** | 5.3 / 1.13 | Componentes UI e iconografía |
| **TypeScript** | 5.9 | Tipado estático |
| **Bellota Text / Radio Canada Big** | — | Fuentes tipográficas (via `@fontsource`) |

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| **Java** | 17 | Lenguaje del servidor |
| **Spring Boot** | 4.0 | Framework REST API |
| **Spring Data JPA + Hibernate** | — | ORM y acceso a base de datos |
| **Spring Security Crypto** | — | Cifrado de contraseñas (BCrypt) |
| **Spring Mail** | — | Envío de correos de verificación |
| **Jackson** | — | Serialización/deserialización JSON |

### Base de datos e infraestructura
| Tecnología | Uso |
|---|---|
| **PostgreSQL 15** | Base de datos principal |
| **Docker + Docker Compose** | Orquestación de todos los servicios |
| **Mailpit** | Servidor SMTP local para desarrollo (bandeja en `localhost:8025`) |

### APIs e integraciones externas
| Integración | Descripción |
|---|---|
| **Groq API** (`api.groq.com`) | LLM para el chat FinBot (modelo `llama-3.3-70b-versatile` por defecto) |

---

## Arquitectura

```
NeuSaves/
├── angular/          # Frontend Angular (puerto 4200)
├── java/             # Backend Spring Boot (puerto 8080)
├── db/               # Scripts SQL de inicialización de la base de datos
└── docker-compose.yml
```

Los cuatro servicios Docker son:
- `base-datos` — PostgreSQL en el puerto `5432`
- `correo` — Mailpit SMTP en `1025`, interfaz web en `8025`
- `backend` — Spring Boot REST API en `8080`
- `frontend` — Angular compilado y servido por nginx en `4200`

---

## Instalación y puesta en marcha

### Requisitos previos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)
- Una clave de API de [Groq](https://console.groq.com/) *(opcional: el chat FinBot no funcionará sin ella)*

### 1 · Clona el repositorio

```bash
git clone <url-del-repositorio>
cd NeuSaves
```

### 2 · Configura las variables de entorno

Crea un archivo `.env` en la raíz del proyecto (junto al `docker-compose.yml`):

```env
# Clave de API de Groq para el chat FinBot (obtenla en https://console.groq.com/)
GROQ_API_KEY=tu_clave_de_groq

# Opcional: cambia el modelo de Groq (por defecto llama-3.3-70b-versatile)
# GROQ_MODEL=llama-3.3-70b-versatile
```

> ⚠️ El archivo `.env` contiene credenciales y **nunca debe subirse al repositorio**. Asegúrate de que esté incluido en tu `.gitignore`.

> Si no tienes clave de Groq, el chat FinBot mostrará un aviso pero el resto de la app funciona con normalidad.

### 3 · Arranca todos los servicios

```bash
docker compose up --build
```

La primera vez construye las imágenes de Angular y Spring Boot. Las siguientes veces basta con:

```bash
docker compose up
```

### 4 · Accede a la aplicación

| Servicio | URL |
|---|---|
| **Aplicación web** | http://localhost:4200 |
| **API REST** | http://localhost:8080 |
| **Bandeja de correo (Mailpit)** | http://localhost:8025 |

---

## Desarrollo en local (sin Docker)

Si prefieres ejecutar cada parte por separado para desarrollo activo:

### Backend (Spring Boot)

```bash
cd java
./mvnw spring-boot:run
```

> Necesitas PostgreSQL corriendo en `localhost:5432` con la base de datos `gastos_db` ya creada.  
> Puedes levantar solo la base de datos con Docker:
> ```bash
> docker compose up base-datos correo
> ```

### Frontend (Angular)

```bash
cd angular
npm install
npm start
```

La app de Angular arrancará en `http://localhost:4200` con hot-reload activado.

---

## Variables de entorno del backend

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `GROQ_API_KEY` | *(vacío)* | Clave de API de Groq para FinBot |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Modelo LLM de Groq |
| `SPRING_MAIL_HOST` | `localhost` | Host SMTP |
| `SPRING_MAIL_PORT` | `1025` | Puerto SMTP |
| `SPRING_DATASOURCE_URL` | *(configurable)* | URL de conexión a PostgreSQL |
| `SPRING_DATASOURCE_USERNAME` | *(configurable)* | Usuario de la base de datos |
| `SPRING_DATASOURCE_PASSWORD` | *(configurable)* | Contraseña de la base de datos |

> Las credenciales de la base de datos se definen mediante variables de entorno. En producción, usa valores robustos y gestiónalos de forma segura (nunca en texto plano dentro del repositorio).