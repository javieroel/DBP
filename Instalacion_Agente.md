# Manual de Instalación de Claude Code Agent en VS Code

Este documento detalla el procedimiento para instalar, configurar e integrar Claude Code como agente de desarrollo dentro del entorno de Visual Studio Code. El flujo está adaptado para un proyecto basado en HTML, CSS y JavaScript, con miras a un despliegue en servidor propio o en GitHub Pages.

---

## 1. Requisitos Previos

Asegúrese de contar con las siguientes herramientas instaladas en su sistema operativo:
* **Node.js:** Versión 18 o superior.
* **Visual Studio Code:** Versión estable más reciente.
* **Credenciales de Anthropic:** Cuenta activa con acceso a la API o suscripción válida.

---

## 2. Instalación de la Herramienta de Línea de Comandos (CLI)

Claude Code opera principalmente mediante un agente autónomo ejecutable desde la terminal. Para realizar la instalación global en el sistema, ejecute el siguiente comando en su terminal:

```bash
npm install -g @anthropic-ai/claude-code
```

---

## 3. Configuración de la Extensión en VS Code

Para integrar la interfaz de usuario en el entorno de desarrollo:
1. Abra Visual Studio Code.
2. Acceda al panel de Extensiones mediante el atajo `Ctrl+Shift+X` (en Windows/Linux) o `Cmd+Shift+X` (en macOS).
3. Introduzca en el buscador el término "Claude Code".
4. Seleccione la extensión oficial provista por Anthropic y haga clic en el botón de instalación.

---

## 4. Inicialización y Autenticación

1. Abra en Visual Studio Code el directorio raíz que aloja los archivos de su plataforma (HTML, CSS y JavaScript).
2. Despliegue la terminal integrada de la aplicación con la combinación de teclas `Ctrl + \`` o `Cmd + \``.
3. Inicie el agente ejecutando el comando:

```bash
claude
```

4. La terminal generará un enlace de autenticación o solicitará la ejecución del comando `/login`. Siga las instrucciones en pantalla para ingresar su clave de API de Anthropic y validar la sesión.

---

## 5. Directrices del Proyecto (Archivo CLAUDE.md)

Para garantizar que el agente de inteligencia artificial genere código alineado con los requerimientos técnicos y de infraestructura del proyecto, cree un archivo denominado `CLAUDE.md` en el directorio raíz de la plataforma con la siguiente estructura:

```markdown
# Convenciones y Reglas del Proyecto

## Especificaciones Tecnológicas
- Arquitectura: Desarrollo Frontend nativo sin frameworks.
- Lenguajes: HTML5, CSS3 (diseño responsivo mediante Flexbox y Grid) y JavaScript (ES6+).
- Entornos de Hosting: Servidores web locales, Apache, Nginx o almacenamiento estático en GitHub Pages.

## Directrices de Desarrollo
- Separación de responsabilidades: Mantener el código modular. Organizar los scripts en un directorio `/js` y las hojas de estilo en un directorio `/css`.
- Archivo de entrada: El punto de acceso principal del sitio debe ser estrictamente `index.html`.

## Requisitos de Despliegue
- Rutas de recursos: Para asegurar la compatibilidad con GitHub Pages y evitar fallos de resolución en subdominios, todas las referencias a archivos internos (`href`, `src`) deben declararse mediante rutas relativas (ejemplo: `./css/styles.css` en lugar de `/css/styles.css`).
```

El agente procesará este archivo de forma automática al inicio de cada sesión para ajustar el comportamiento de las herramientas y la generación de código.

---

## 6. Comandos Operativos del Agente

Una vez iniciada la sesión interactiva en la terminal, puede emplear las siguientes instrucciones:
* **Consultas directas:** Solicite modificaciones o creación de código mediante lenguaje natural. El agente analizará los archivos locales y requerirá aprobación explícita antes de aplicar cualquier cambio en el sistema de archivos.
* **/copy:** Copia al portapapeles la última respuesta emitida por el agente en formato Markdown.
* **exit:** Finaliza la sesión actual y cierra la conexión del agente con el entorno de desarrollo.
