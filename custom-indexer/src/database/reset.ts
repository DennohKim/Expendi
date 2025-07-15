import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from './connection';

const readSchemaFile = (): string => {
  const schemaPath = join(__dirname, 'schema.sql');
  return readFileSync(schemaPath, 'utf8');
};

const dropAllTables = async (): Promise<void> => {
  console.log('Dropping all tables and triggers...');
  
  const dropScript = `
    -- Drop triggers first
    DROP TRIGGER IF EXISTS update_events_updated_at ON events;
    DROP TRIGGER IF EXISTS update_buckets_updated_at ON buckets;
    DROP TRIGGER IF EXISTS update_delegate_permissions_updated_at ON delegate_permissions;
    
    -- Drop function
    DROP FUNCTION IF EXISTS update_updated_at_column();
    
    -- Drop tables in reverse order of dependencies
    DROP TABLE IF EXISTS withdrawals;
    DROP TABLE IF EXISTS token_transfers;
    DROP TABLE IF EXISTS delegate_permissions;
    DROP TABLE IF EXISTS spending_records;
    DROP TABLE IF EXISTS buckets;
    DROP TABLE IF EXISTS wallet_registry;
    DROP TABLE IF EXISTS indexer_status;
    DROP TABLE IF EXISTS events;
    
    -- Drop extension if it exists
    DROP EXTENSION IF EXISTS "uuid-ossp";
  `;
  
  try {
    await query(dropScript);
    console.log('All tables and triggers dropped successfully');
  } catch (error) {
    console.error('Error dropping tables:', error);
    throw error;
  }
};

const recreateTables = async (): Promise<void> => {
  console.log('Creating tables from schema...');
  const schema = readSchemaFile();
  
  try {
    await query(schema);
    console.log('Tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

const resetDatabase = async (): Promise<void> => {
  console.log('Starting database reset...');
  
  try {
    await dropAllTables();
    await recreateTables();
    console.log('Database reset completed successfully');
  } catch (error) {
    console.error('Database reset failed:', error);
    throw error;
  }
};

export { resetDatabase };

// Run reset if this file is executed directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('Database reset completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database reset failed:', error);
      process.exit(1);
    });
}