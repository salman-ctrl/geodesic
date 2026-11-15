-- Run this yourself in an existing MySQL 8 database (for example through Laragon).
-- This script deliberately does not create a database or a database user.
CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  teacher_name VARCHAR(80) NOT NULL,
  mission ENUM('moon','mars','jupiter','saturn','neptune') NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_rooms_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS teams (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_team_name (room_id, name),
  CONSTRAINT fk_teams_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  client_run_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  design JSON NOT NULL,
  result JSON NOT NULL,
  successful BOOLEAN NOT NULL,
  mission_score SMALLINT UNSIGNED NULL,
  science_points DOUBLE NOT NULL,
  propellant_saved DOUBLE NOT NULL,
  cost_million DOUBLE NOT NULL,
  flight_days DOUBLE NOT NULL,
  lesson VARCHAR(1000) NOT NULL DEFAULT '',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_client_run (team_id, client_run_id),
  KEY idx_room_score (room_id, successful, mission_score),
  CONSTRAINT fk_runs_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_runs_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT ck_mission_score CHECK ((successful = 0 AND mission_score IS NULL) OR (successful = 1 AND mission_score BETWEEN 0 AND 1000))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
