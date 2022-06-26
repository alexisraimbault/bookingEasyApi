const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool();

module.exports = {
    async query(text, params) {
        // invocation timestamp for the query method
        const start = Date.now();
        try {
            const res = await pool.query(text, params);
            // time elapsed since invocation to execution
            const duration = Date.now() - start;
            console.log(
              'executed query', 
              {text, duration, rows: res.rowCount}
            );
            return res;
        } catch (error) {
            console.log('error in query', {text, error});
            throw error;
        }
    }
};
