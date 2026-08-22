/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `branches` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[key]` on the table `roles` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `employee_branches` DROP FOREIGN KEY `employee_branches_branch_id_fkey`;

-- DropForeignKey
ALTER TABLE `employee_branches` DROP FOREIGN KEY `employee_branches_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `payments` DROP FOREIGN KEY `payments_shipment_id_fkey`;

-- DropForeignKey
ALTER TABLE `shipment_branch_log` DROP FOREIGN KEY `shipment_branch_log_shipment_id_fkey`;

-- DropForeignKey
ALTER TABLE `shipment_details` DROP FOREIGN KEY `shipment_details_shipment_id_fkey`;

-- DropForeignKey
ALTER TABLE `shipment_histories` DROP FOREIGN KEY `shipment_histories_shipment_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_addresses` DROP FOREIGN KEY `user_addresses_user_id_fkey`;

-- DropIndex
DROP INDEX `employee_branches_branch_id_fkey` ON `employee_branches`;

-- DropIndex
DROP INDEX `employee_branches_user_id_fkey` ON `employee_branches`;

-- DropIndex
DROP INDEX `shipment_branch_log_shipment_id_fkey` ON `shipment_branch_log`;

-- DropIndex
DROP INDEX `shipment_histories_shipment_id_fkey` ON `shipment_histories`;

-- DropIndex
DROP INDEX `user_addresses_user_id_fkey` ON `user_addresses`;

-- AlterTable
ALTER TABLE `permissions` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `role_permissions` ALTER COLUMN `updated_at` DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX `branches_name_key` ON `branches`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `roles_key_key` ON `roles`(`key`);

-- AddForeignKey
ALTER TABLE `employee_branches` ADD CONSTRAINT `employee_branches_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_branches` ADD CONSTRAINT `employee_branches_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_addresses` ADD CONSTRAINT `user_addresses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment_details` ADD CONSTRAINT `shipment_details_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment_histories` ADD CONSTRAINT `shipment_histories_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment_branch_log` ADD CONSTRAINT `shipment_branch_log_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
