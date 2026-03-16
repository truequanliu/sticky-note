// Migration runner script
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function columnExists(connection, tableName, columnName) {
  const [columns] = await connection.query(
    `SHOW COLUMNS FROM ${tableName} LIKE ?`,
    [columnName]
  );
  return columns.length > 0;
}

async function addColumnIfNotExists(connection, tableName, columnName, definition) {
  const exists = await columnExists(connection, tableName, columnName);
  if (!exists) {
    const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`;
    await connection.query(sql);
    console.log(`  [ADD] Column ${columnName} added to ${tableName}`);
    return true;
  } else {
    console.log(`  [SKIP] Column ${columnName} already exists in ${tableName}`);
    return false;
  }
}

async function addIndexIfNotExists(connection, indexName, indexDefinition) {
  const [indexes] = await connection.query(`SHOW INDEX FROM notes WHERE Key_name = ?`, [indexName]);
  if (indexes.length === 0) {
    const sql = `CREATE INDEX ${indexName} ON notes ${indexDefinition}`;
    await connection.query(sql);
    console.log(`  [ADD] Index ${indexName} created`);
  } else {
    console.log(`  [SKIP] Index ${indexName} already exists`);
  }
}

async function runMigration() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 33060,
    user: 'homestead',
    password: 'secret',
    database: 'sticky_note',
    multipleStatements: false
  });

  try {
    console.log('Running database migration...\n');

    // Add new columns to colors table
    await addColumnIfNotExists(connection, 'colors', 'sort_order', 'INT DEFAULT 999');
    await addColumnIfNotExists(connection, 'colors', 'icon', "VARCHAR(50) DEFAULT NULL");

    // Update sort_order for existing colors
    await connection.query('UPDATE colors SET sort_order = 10 WHERE name = ? AND sort_order = 999', ['yellow']);
    await connection.query('UPDATE colors SET sort_order = 20 WHERE name = ? AND sort_order = 999', ['red']);
    await connection.query('UPDATE colors SET sort_order = 30 WHERE name = ? AND sort_order = 999', ['blue']);
    await connection.query('UPDATE colors SET sort_order = 40 WHERE name = ? AND sort_order = 999', ['green']);
    await connection.query('UPDATE colors SET sort_order = 50 WHERE name = ? AND sort_order = 999', ['purple']);
    console.log('  [UPDATE] Sort order values updated for existing colors');

    // Insert new colors
    const newColors = [
      { name: 'orange', display_name: '橙色', hex_code: '#ffedd5', sort_order: 15 },
      { name: 'pink', display_name: '粉色', hex_code: '#fce7f3', sort_order: 25 },
      { name: 'sky', display_name: '天蓝', hex_code: '#e0f2fe', sort_order: 35 },
      { name: 'rose', display_name: '玫红', hex_code: '#ffe4e6', sort_order: 45 },
      { name: 'gray', display_name: '灰色', hex_code: '#f3f4f6', sort_order: 55 }
    ];

    for (const color of newColors) {
      const [existing] = await connection.query('SELECT id FROM colors WHERE name = ?', [color.name]);
      if (existing.length === 0) {
        await connection.query(
          'INSERT INTO colors (name, display_name, hex_code, sort_order) VALUES (?, ?, ?, ?)',
          [color.name, color.display_name, color.hex_code, color.sort_order]
        );
        console.log(`  [INSERT] Color ${color.name} added`);
      } else {
        console.log(`  [SKIP] Color ${color.name} already exists`);
      }
    }

    // Add indexes
    await addIndexIfNotExists(connection, 'idx_pinned_completed', '(is_pinned, is_completed)');
    await addIndexIfNotExists(connection, 'idx_color_id', '(color_id)');
    await addIndexIfNotExists(connection, 'idx_created_at', '(created_at DESC)');
    await addIndexIfNotExists(connection, 'idx_color_id_completed', '(color_id, is_completed)');

    console.log('\n✓ Migration completed!');

    // Verify the changes
    const [colors] = await connection.query(
      'SELECT id, name, display_name, hex_code, sort_order FROM colors ORDER BY sort_order'
    );
    console.log('\nCurrent colors in database:');
    console.table(colors.map(c => ({
      id: c.id,
      name: c.name,
      display_name: c.display_name,
      sort_order: c.sort_order
    })));

  } catch (error) {
    console.error('\nMigration failed:', error.message);
  } finally {
    await connection.end();
  }
}

runMigration();
