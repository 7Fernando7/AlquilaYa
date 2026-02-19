import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class InitialMigration1000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types
    await queryRunner.query(`
      CREATE TYPE user_type_enum AS ENUM ('seeker', 'owner', 'agency', 'admin')
    `);

    await queryRunner.query(`
      CREATE TYPE verification_status_enum AS ENUM ('unverified', 'pending', 'approved', 'rejected')
    `);

    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'full_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'user_type',
            type: 'user_type_enum',
            default: "'seeker'",
          },
          {
            name: 'avatar_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'verification_status',
            type: 'verification_status_enum',
            default: "'unverified'",
          },
          {
            name: 'verification_document_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'verification_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'notification_preferences',
            type: 'jsonb',
            default: "'{\"email\": true, \"push\": false}'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        indices: [
          new TableIndex({
            name: 'idx_users_email',
            columnNames: ['email'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'idx_users_user_type',
            columnNames: ['user_type'],
          }),
          new TableIndex({
            name: 'idx_users_verification_status',
            columnNames: ['verification_status'],
          }),
          new TableIndex({
            name: 'idx_users_created_at',
            columnNames: ['created_at'],
          }),
        ],
      })
    );

    // Add email format check constraint
    await queryRunner.query(`
      ALTER TABLE users 
      ADD CONSTRAINT email_format_check 
      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$')
    `);

    // Add password hash length check
    await queryRunner.query(`
      ALTER TABLE users 
      ADD CONSTRAINT password_length_check 
      CHECK (LENGTH(password_hash) > 50)
    `);

    // Add email not empty check
    await queryRunner.query(`
      ALTER TABLE users 
      ADD CONSTRAINT email_not_empty_check 
      CHECK (TRIM(email) != '')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
    await queryRunner.query('DROP TYPE user_type_enum');
    await queryRunner.query('DROP TYPE verification_status_enum');
  }
}
