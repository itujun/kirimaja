-- DropForeignKey
ALTER TABLE `employee_branches` DROP FOREIGN KEY `employee_branches_branch_id_fkey`;

-- DropIndex
DROP INDEX `employee_branches_branch_id_fkey` ON `employee_branches`;

-- AddForeignKey
ALTER TABLE `employee_branches` ADD CONSTRAINT `employee_branches_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
