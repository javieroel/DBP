// MODELO ORM de usuarios. toJSON() nunca expone el hash de la contraseña.
const { DataTypes } = require("sequelize");
const { sequelize } = require("../db/sequelize");

const ROLES = ["admin", "analista", "lector"];

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(80), allowNull: false },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: { isEmail: { msg: "El correo no es válido." } }
    },
    passwordHash: { type: DataTypes.STRING(100), allowNull: false, field: "password_hash" },
    role: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: "lector",
      validate: { isIn: { args: [ROLES], msg: "El rol no es válido." } }
    }
  },
  { tableName: "users", underscored: true, timestamps: true }
);

User.prototype.toJSON = function toJSON() {
  return { id: this.id, name: this.name, email: this.email, role: this.role };
};

module.exports = { User, ROLES };
