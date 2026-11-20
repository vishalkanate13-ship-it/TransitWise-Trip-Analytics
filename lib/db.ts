
import mysql from "mysql2/promise";
import { MongoClient, Db } from "mongodb";

// MySQL connection pool
const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "transit_db",
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true
});

// MongoDB connection cache
let mongoClient: MongoClient | null = null;
let mongoConnection: Promise<MongoClient> | null = null;

export async function sql() {
  return mysqlPool;
}

export async function mongo(): Promise<Db> {
  if (!mongoConnection) {
    mongoClient = new MongoClient(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
    );

    mongoConnection = mongoClient.connect().catch((error) => {
      mongoConnection = null;
      mongoClient = null;
      throw error;
    });
  }

  const client = await mongoConnection;

  return client.db(
    process.env.MONGODB_DATABASE || "transitwise"
  );
}
