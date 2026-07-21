# NeuSaves 💰

Aplicación web moderna de gestión personal de finanzas con IA integrada. Organiza tus gastos e ingresos, visualiza estadísticas en tiempo real, gestiona metas de ahorro y recibe asesoramiento financiero automático a través de FinBot.

---

## Características principales

- **Panel de usuario** — Resumen de saldo, movimientos del mes, ingresos/gastos, ahorrado
- **Gestión de movimientos** — Añade ingresos y gastos en un clic; visualiza el historial completo
- **Movimientos periódicos** — Define gastos e ingresos recurrentes (diarios, semanales, mensuales, anuales)
- **Próximos movimientos** — Previsualiza los ingresos y gastos periódicos de los próximos 7 días
- **Estadísticas** — Gráfica del balance de los últimos 6 meses
- **Cotizaciones de bolsa** — Panel de cotizaciones en tiempo real (IBEX 35, S&P 500, NASDAQ, EUR/USD, Bitcoin, Ethereum)
- **Chat FinBot** — Asistente de IA conversacional (basado en Groq) para consultas sobre tus finanzas
- **Metas de ahorro** — Define y rastrea objetivos financieros personalizados
- **Seguridad** — Autenticación con email, cifrado de contraseñas (BCrypt), recuperación de contraseña por email

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
| **Groq API** (`api.groq.com`) | LLM para el chat FinBot (modelo `llama-3.3-70b-versatile` por defecto); conversación en tiempo real sobre finanzas personales |
| **Yahoo Finance API** | Cotizaciones de bolsa en tiempo real (sin clave requerida); caché de 10 minutos en servidor |

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

## Estructura de la aplicación

### Páginas principales (Frontend Angular)
- **Login / Registro** — Autenticación segura con verificación por email
- **Panel de usuario (`/usuario-detalle`)** — Dashboard central con resumen financiero, últimos movimientos, chat, cotizaciones y metas
- **Movimientos** — Historial completo con filtros y búsqueda
- **Perfil** — Datos personales, seguridad, movimientos periódicos, perfil público
- **Estadísticas** — Análisis visuales del historial de gastos e ingresos
- **Metas** — Crear y gestionar objetivos de ahorro
- **Página de inicio** — Bienvenida con enlace de acceso

### Modelos de datos principales (Backend)
- **Usuario** — Datos personales, autenticación, email verificado
- **Movimiento** — Transacción individual (ingreso/gasto) con descripción, tipo, cantidad, fecha
- **MovimientoPeriódico** — Configuración de ingresos/gastos recurrentes (periodo, día de cobro, fecha de fin opcional)
- **ProximoMovimiento** — Proyección de movimientos periódicos para los próximos 7 días
- **Meta** — Objetivo de ahorro con monto objetivo, fecha límite, progreso
- **CotizacionBolsa** — Cotización de un símbolo en tiempo real (precio, variación %)
- **MensajeChat** — Historial del chat FinBot (usuario ↔ modelo)

---

## Instalación y puesta en marcha

Esta guía asume que partes de un ordenador recién comprado, sin nada instalado todavía. Solo necesitas **Docker** y **Git**; el resto (Node, Java, Angular CLI, Maven...) ya viene empaquetado dentro de los contenedores.

### Paso 0 · Instala los requisitos previos

1. **Git** — para descargar el proyecto.
   - Windows: descarga e instala [Git for Windows](https://git-scm.com/downloads) (deja las opciones por defecto).
   - macOS: instala [Xcode Command Line Tools](https://developer.apple.com/xcode/resources/) ejecutando `xcode-select --install` en la Terminal, o instala [Git](https://git-scm.com/downloads).
   - Linux: `sudo apt install git` (Debian/Ubuntu) o el gestor de paquetes de tu distribución.

2. **Docker Desktop** — para levantar todos los servicios sin instalar Java, Node ni PostgreSQL a mano.
   - Descárgalo desde [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) e instálalo para tu sistema operativo (Windows, macOS o Linux).
   - Ábrelo una vez instalado y espera a que la ballena del icono deje de animarse (indica que Docker ya está listo). En Windows puede pedirte activar WSL2: sigue el asistente que te propone la propia instalación.
   - Comprueba que funciona abriendo una terminal (`cmd`, `PowerShell`, o `Terminal`) y ejecutando:
     ```bash
     docker --version
     docker compose version
     ```
     Si ambos comandos devuelven un número de versión, todo está listo.

3. *(Opcional)* **Un editor de código** como [Visual Studio Code](https://code.visualstudio.com/) si además quieres leer o modificar el proyecto.

### 1 · Descarga el proyecto

Abre una terminal, navega a la carpeta donde quieras guardar el proyecto y ejecuta:

```bash
git clone <url-del-repositorio>
cd NeuSaves
```

> Si no usas Git, también puedes descargar el proyecto como ZIP desde el repositorio y descomprimirlo. Luego abre una terminal dentro de esa carpeta (`NeuSaves`).

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

Cuando la terminal muestre que los contenedores están arriba y saludables (puede tardar 1-2 minutos la primera vez), abre tu navegador en:

| Servicio | URL |
|---|---|
| **Aplicación web** | http://localhost:4200 |
| **API REST** | http://localhost:8080 |
| **Bandeja de correo (Mailpit)** | http://localhost:8025 |

Ya puedes crear una cuenta desde la propia aplicación web y empezar a usarla. Los correos de verificación que envíe la app (registro, recuperación de contraseña...) no van a un email real: se capturan en Mailpit, así que revísalos en http://localhost:8025.

### 5 · Para detener la aplicación

Vuelve a la terminal donde ejecutaste `docker compose up` y pulsa `Ctrl + C`. Para liberar también los contenedores:

```bash
docker compose down
```

La próxima vez que quieras usar la app, solo necesitas repetir `docker compose up` (sin `--build`) desde la carpeta del proyecto.

---

## Desarrollo en local (sin Docker)

Esta sección es solo para quien vaya a modificar el código y quiera recarga en caliente. Si únicamente quieres usar la aplicación, no la necesitas: usa la sección anterior.

Requisitos adicionales para este modo:
- [Node.js LTS](https://nodejs.org/) (incluye `npm`)
- [Java 17 (JDK)](https://adoptium.net/)

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

---

## Solución de problemas

**`docker: command not found` o el comando no se reconoce**
Docker Desktop no está instalado o no se ha añadido al PATH. Reinicia el ordenador tras instalarlo y vuelve a intentarlo.

**Docker Desktop no arranca / pide activar virtualización (Windows)**
Entra a la BIOS/UEFI del equipo y activa la virtualización (`Intel VT-x` o `AMD-V`). El propio instalador de Docker suele indicar los pasos exactos según tu placa.

**El puerto ya está en uso (`port is already allocated`)**
Otro programa está usando el puerto 4200, 8080, 5432, 1025 u 8025. Ciérralo, o cambia el puerto del lado izquierdo en `docker-compose.yml` (por ejemplo `"4300:80"` en vez de `"4200:80"`) y accede por ese nuevo puerto.

**La aplicación web no carga tras `docker compose up`**
Espera un poco más: la primera vez que se construyen las imágenes puede tardar varios minutos. Revisa que los cuatro contenedores estén en marcha con:
```bash
docker compose ps
```

**El chat FinBot no responde**
Comprueba que has creado el archivo `.env` con una `GROQ_API_KEY` válida y que has reiniciado los contenedores (`docker compose down` seguido de `docker compose up --build`) para que se recoja la nueva variable.

**Quiero volver a empezar de cero (borrar datos y contenedores)**
```bash
docker compose down -v
```
El flag `-v` elimina también el volumen de la base de datos, así que perderás los datos guardados.

**Las cotizaciones de bolsa muestran "No disponibles"**
Las cotizaciones se obtienen de Yahoo Finance en tiempo real. Si durante los fines de semana ves "No disponibles", es normal: los mercados están cerrados. Entre semana, comprueba que:
- El servidor backend está levantado (`docker compose ps` debe mostrar `backend` como `Up`).
- Yahoo Finance es accesible desde tu conexión (algunos proxies corporativos pueden bloquearlo).
- El servidor cachea las cotizaciones 10 minutos, así que si reinician los contenedores pueden tardar un poco en aparecer.

**Los correos no llegan al email real**
Por diseño, todos los correos (registro, recuperación de contraseña) se envían a **Mailpit** (http://localhost:8025) en lugar de a email real. Esto permite desarrollar y probar sin necesidad de configurar un servidor SMTP real. En producción, configura las variables de entorno `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, etc. para apuntar a tu servidor SMTP.

---

## Notas de desarrollo

### Chat FinBot
- Utiliza la API de Groq con el modelo `llama-3.3-70b-versatile` por defecto.
- Si no tienes `GROQ_API_KEY`, el chat mostrará un aviso pero el resto de la app funciona.
- El historial del chat se guarda en la base de datos y se recupera al recargar la página.
- Máximo de 20 mensajes guardados por sesión para evitar sobrecarga.

### Cotizaciones de bolsa
- Se actualizan desde **Yahoo Finance** cada 10 minutos (caché en servidor).
- Símbolos incluidos: `^IBEX` (IBEX 35), `^GSPC` (S&P 500), `^IXIC` (NASDAQ), `EURUSD=X` (EUR/USD), `BTC-EUR` (Bitcoin), `ETH-EUR` (Ethereum).
- Si un símbolo falla, se sigue mostrando el último valor en caché.

### Movimientos periódicos
- Se calculan automáticamente en base a la configuración (periodo, día de cobro).
- Los movimientos futuros se proyectan en la sección "Próximos movimientos" (7 días).
- Puedes cambiar el día de cobro o eliminar un movimiento periódico desde tu perfil.

### Seguridad
- Las contraseñas se cifran con **BCrypt** (10 rondas).
- Los tokens JWT se usan para autenticación en las peticiones a la API.
- El email debe verificarse en el registro para activar la cuenta.
- Recuperación de contraseña mediante email (enlace temporal).

---

## Licencia

Este proyecto está disponible bajo la licencia MIT. Siéntete libre de usarlo, modificarlo y distribuirlo.