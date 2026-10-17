// Variables de entorno de PRUEBA: las pruebas unitarias no se conectan a ninguna base real.
process.env.DB_HOST = process.env.DB_HOST || "localhost";
process.env.DB_NAME = process.env.DB_NAME || "prueba";
process.env.DB_USER = process.env.DB_USER || "prueba";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "prueba";
process.env.JWT_SECRET = "clave-solo-para-pruebas-unitarias-0123456789abcdef";
