# test_tidb_connection.py
import pymysql

# Your TiDB Cloud connection details
connection = pymysql.connect(
    host='gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    user='cK4zXDXwjnu4GxF.root',
    password='MHEqEKcJbKrNYl5u',
    port=4000,
    database='test',  # Try connecting to default 'test' database first
    ssl={'ssl-mode': 'VERIFY_IDENTITY'}
)

cursor = connection.cursor()

# Show all databases
cursor.execute("SHOW DATABASES")
databases = cursor.fetchall()
print("Available databases:")
for db in databases:
    print(f"  - {db[0]}")

# Check if ai_support_db exists
cursor.execute("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'ai_support_db'")
result = cursor.fetchone()
if result:
    print(f"\n✅ Database 'ai_support_db' already exists!")
else:
    print(f"\n❌ Database 'ai_support_db' does not exist yet")
    # Create it
    cursor.execute("CREATE DATABASE ai_support_db")
    print("✅ Created 'ai_support_db' database!")

connection.close()