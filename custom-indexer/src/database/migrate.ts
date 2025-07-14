import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from './connection';

const readSchemaFile = (): string => {
  const schemaPath = join(__dirname, 'schema.sql');
  return readFileSync(schemaPath, 'utf8');
};

const executeMigration = async (sql: string): Promise<void> => {
  try {
    await query(sql);
    console.log('Migration executed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

const runMigration = async (): Promise<void> => {
  console.log('Starting database migration...');
  const schema = readSchemaFile();
  await executeMigration(schema);
  console.log('Database migration completed successfully');
};

export { runMigration };

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}