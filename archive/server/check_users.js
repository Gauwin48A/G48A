const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  database: 'db_shop_2',
  user: 'postgres',
  password: 'postgres123',
});

async function run() {
  await client.connect();
  console.log("Connected to DB successfully.");
  
  try {
    // 1. Change user 95 phone
    await client.query("UPDATE users SET phone_number = '9876543211' WHERE user_id = 95");
    console.log("Updated user 95 phone number to 9876543211.");
    
    // 2. Set demo_user phone
    await client.query("UPDATE users SET phone_number = '9876543210' WHERE user_id = 540");
    console.log("Updated demo_user (540) phone number to 9876543210.");

  } catch (err) {
    console.error("Error running query:", err);
  } finally {
    await client.end();
  }
}

run();
