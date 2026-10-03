// MODELO ORM: describe la tabla "incidents" para Sequelize y sus reglas de validación.
// Sequelize traduce este objeto JavaScript a SQL (INSERT, SELECT, UPDATE, DELETE).
const { DataTypes } = require("sequelize");
const { sequelize } = require("../db/sequelize");

const ALLOWED_STATUS = ["open", "progress", "closed"];
const ALLOWED_PRIORITY = ["alta", "media", "baja"];
const ALLOWED_CATEGORY = ["acceso", "sistema", "red", "otro"];

// Convierte el id numérico de la base (25) en el código visible (INC-025)
function toCode(id) {
  return `INC-${String(id).padStart(3, "0")}`;
}

const Incident = sequelize.define(
  "Incident",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notNull: { msg: "El título es obligatorio." },
        len: { args: [5, 120], msg: "El título debe tener entre 5 y 120 caracteres." }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notNull: { msg: "La descripción es obligatoria." },
        len: { args: [20, 2000], msg: "La descripción debe tener entre 20 y 2000 caracteres." }
      }
    },
    category: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notNull: { msg: "La categoría es obligatoria." },
        isIn: { args: [ALLOWED_CATEGORY], msg: "La categoría no es válida." }
      }
    },
    priority: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notNull: { msg: "La prioridad es obligatoria." },
        isIn: { args: [ALLOWED_PRIORITY], msg: "La prioridad no es válida." }
      }
    },
    status: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "open",
      validate: {
        isIn: { args: [ALLOWED_STATUS], msg: "El estado no es válido." }
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        notNull: { msg: "La fecha es obligatoria." },
        is: { args: /^\d{4}-\d{2}-\d{2}$/, msg: "La fecha debe tener el formato YYYY-MM-DD." },
        isDate: { msg: "La fecha no es válida." },
        notInFuture(value) {
          const today = new Date().toISOString().slice(0, 10);
          if (value > today) throw new Error("La fecha no puede estar en el futuro.");
        }
      }
    },
    reporter: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notNull: { msg: "El correo de contacto es obligatorio." },
        isEmail: { msg: "El correo de contacto no es válido." }
      }
    },
    area: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "Sin asignar",
      validate: {
        len: { args: [1, 80], msg: "El área debe tener entre 1 y 80 caracteres." }
      }
    }
  },
  {
    tableName: "incidents",
    underscored: true, // createdAt -> created_at en la base
    timestamps: true
  }
);

// Lo que se envía al cliente: id con formato INC-### y sin detalles internos.
Incident.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  return {
    id: toCode(values.id),
    title: values.title,
    description: values.description,
    category: values.category,
    priority: values.priority,
    status: values.status,
    date: values.date,
    reporter: values.reporter,
    area: values.area,
    createdAt: values.createdAt,
    updatedAt: values.updatedAt
  };
};

module.exports = { Incident, ALLOWED_STATUS, ALLOWED_PRIORITY, ALLOWED_CATEGORY, toCode };
