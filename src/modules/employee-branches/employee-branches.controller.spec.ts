import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeBranchesController } from './employee-branches.controller';
import { EmployeeBranchesService } from './employee-branches.service';

describe('EmployeeBranchesController', () => {
  let controller: EmployeeBranchesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeBranchesController],
      providers: [EmployeeBranchesService],
    }).compile();

    controller = module.get<EmployeeBranchesController>(EmployeeBranchesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
