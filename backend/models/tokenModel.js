import sql from "mssql";

class Token {
  constructor(email, token) {
    this.email = email;
    this.token = token;
  }

  static async create(email, token) {
    try {
      const pool = await sql.connect(config);
      const insertQuery = `INSERT INTO tokens (email, token) VALUES ('${email}', '${token}')`;
      const result = await pool.request().query(insertQuery);
      sql.close();
      return new Token(email, token);
    } catch (error) {
      console.error(error);
      throw new Error("Error creating token");
    }
  }

  static async findByEmail(email) {
    try {
      const pool = await sql.connect(config);
      const selectQuery = `SELECT * FROM tokens WHERE email = '${email}'`;
      const result = await pool.request().query(selectQuery);
      sql.close();
      const token = result.recordset[0];
      if (token) {
        return new Token(token.email, token.token);
      }
      return null;
    } catch (error) {
      console.error(error);
      throw new Error("Error finding token by email");
    }
  }

  async update(token) {
    try {
      const pool = await sql.connect(config);
      const updateQuery = `UPDATE tokens SET token = '${token}' WHERE email = '${this.email}'`;
      const result = await pool.request().query(updateQuery);
      sql.close();
      this.token = token;
      return this;
    } catch (error) {
      console.error(error);
      throw new Error("Error updating token");
    }
  }

  async delete() {
    try {
      const pool = await sql.connect(config);
      const deleteQuery = `DELETE FROM tokens WHERE email = '${this.email}'`;
      const result = await pool.request().query(deleteQuery);
      sql.close();
      return this;
    } catch (error) {
      console.error(error);
      throw new Error("Error deleting token");
    }
  }
}

export default Token;
