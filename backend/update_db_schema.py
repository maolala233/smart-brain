from database import engine
from sqlalchemy import text

def update_schema():
    with engine.connect() as conn:
        try:
            # Add name column
            print("Adding name column...")
            conn.execute(text("ALTER TABLE employee_personas ADD COLUMN name VARCHAR(200) DEFAULT 'Default Persona'"))
            # Update existing rows to have a name (handled by default, but good to be sure)
            conn.execute(text("UPDATE employee_personas SET name = 'Default Persona' WHERE name IS NULL"))
            # Now we can potentially make it NOT NULL, but MySQL might need strict mode or specific command. 
            # For now, just adding it is enough.
            
            # Add description column
            print("Adding description column...")
            conn.execute(text("ALTER TABLE employee_personas ADD COLUMN description TEXT"))
            
            # Add created_at column
            print("Adding created_at column...")
            conn.execute(text("ALTER TABLE employee_personas ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"))
            
            # Add updated_at column
            print("Adding updated_at column...")
            conn.execute(text("ALTER TABLE employee_personas ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))
            
            conn.commit()
            print("Schema update completed successfully.")
        except Exception as e:
            print(f"Error updating schema: {e}")
            # It might fail if columns already exist, which is fine-ish.

if __name__ == "__main__":
    update_schema()
