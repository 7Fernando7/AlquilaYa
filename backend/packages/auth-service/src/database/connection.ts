import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { InitialMigration } from './migrations/1000_InitialMigration';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/formacionia',
  synchronize: false, // Use migrations in production
  logging: process.env.LOG_LEVEL === 'debug',
  entities: [User],
  migrations: [InitialMigration],
  poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '20'),
  statementCacheSize: 40,
});

export async function initializeDatabase() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      
      // Run pending migrations
      const pendingMigrations = await AppDataSource.showMigrations();
      if (pendingMigrations) {
        await AppDataSource.runMigrations();
      }
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export function getConnection() {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database connection not initialized');
  }
  return AppDataSource;
}

export default AppDataSource;
