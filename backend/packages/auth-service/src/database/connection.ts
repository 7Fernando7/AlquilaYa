import { DataSource } from 'typeorm';
import { User } from './entities/User';

const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'dev.sqlite',
  synchronize: true, // solo en desarrollo
  logging: true,
  entities: [User],
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
