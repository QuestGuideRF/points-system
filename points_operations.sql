SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
;
;
;
;
CREATE TABLE `points_operations` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `points` int NOT NULL,
  `operation_type` enum('add','remove') NOT NULL,
  `reason` text NOT NULL,
  `admin_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_read` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO `points_operations` (`id`, `user_id`, `points`, `operation_type`, `reason`, `admin_id`, `created_at`, `is_read`) VALUES
(9, 4, 1, 'add', 'Привет', 1, '2025-09-02 14:45:56', 0);
ALTER TABLE `points_operations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `admin_id` (`admin_id`);
ALTER TABLE `points_operations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;
ALTER TABLE `points_operations`
  ADD CONSTRAINT `points_operations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `points_operations_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;
;
;
;