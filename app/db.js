const mysql = require('mysql2/promise');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
require('dotenv').config();

let pool;

async function getDbCredentials() {
  if (process.env.NODE_ENV === 'production') {
    const secretName = process.env.AWS_SECRET_NAME || 'prod/myapp/db';
    const region = process.env.AWS_REGION || 'us-east-1';

    const client = new SecretsManagerClient({ region });
    
    try {
      const response = await client.send(
        new GetSecretValueCommand({ SecretId: secretName })
      );
      
      if ('SecretString' in response) {
        return JSON.parse(response.SecretString);
      }
      
      const buff = Buffer.from(response.SecretBinary, 'base64');
      return JSON.parse(buff.toString('ascii'));
    } catch (error) {
      console.error('Error retrieving secrets from AWS Secrets Manager:', error);
      throw error;
    }
  } else {
    return {
      host: process.env.DB_HOST || 'localhost',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      dbname: process.env.DB_NAME || 'taskdb',
      port: process.env.DB_PORT || 3306
    };
  }
}

async function initializeDbPool() {
  if (!pool) {
    const creds = await getDbCredentials();
    pool = mysql.createPool({
      host: creds.host,
      user: creds.username,
      password: creds.password,
      database: creds.dbname,
      port: creds.port || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    connection.release();
    console.log('Database initialized successfully.');
  }
  return pool;
}

module.exports = { initializeDbPool };