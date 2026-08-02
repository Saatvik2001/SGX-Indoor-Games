// create_tables.js
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

const sql = `
CREATE TABLE IF NOT EXISTS registrations (
  id serial primary key,
  employee_id varchar(64) not null,
  provided_employee_id varchar(128) not null,
  employee_name varchar(256) not null,
  tournament_id varchar(32) not null,
  event_id varchar(64) not null,
  partner_id varchar(64),
  location varchar(64) not null,
  registration_date timestamp not null
);

CREATE TABLE IF NOT EXISTS matches (
  id serial primary key,
  event_id varchar(64) not null,
  round varchar(64) not null,
  player1_id varchar(64) not null,
  player2_id varchar(64),
  winner_id varchar(64),
  status varchar(32) not null default 'Scheduled',
  scheduled_date timestamp,
  meta jsonb default '{}'
);

CREATE TABLE IF NOT EXISTS events (
  id varchar(64) primary key,
  tournament_id varchar(32) not null,
  name varchar(256) not null,
  type varchar(32) not null,
  game varchar(64) not null,
  meta jsonb default '{}'
);

CREATE TABLE IF NOT EXISTS tournaments (
  id varchar(32) primary key,
  name varchar(256) not null,
  description varchar(1024) not null,
  location varchar(128) not null,
  registration_start_date timestamp not null,
  registration_end_date timestamp not null,
  tournament_start_date timestamp not null,
  tournament_end_date timestamp not null,
  status varchar(64) not null
);
`;

(async () => {
  try {
    await pool.query(sql);
    console.log('tables created');
  } catch (e) {
    console.error('error creating tables', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
