"use strict";

// MIGRACIÓN 3: tabla de usuarios para la autenticación.
// La contraseña NUNCA se guarda en texto plano: solo su hash bcrypt.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING(80), allowNull: false },
      email: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(100), allowNull: false },
      role: { type: Sequelize.STRING(15), allowNull: false, defaultValue: "lector" },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE users
        ADD CONSTRAINT chk_users_role  CHECK (role IN ('admin','analista','lector')),
        ADD CONSTRAINT chk_users_hash  CHECK (password_hash LIKE '$2%');
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("users");
  }
};
