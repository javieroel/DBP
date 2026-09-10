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