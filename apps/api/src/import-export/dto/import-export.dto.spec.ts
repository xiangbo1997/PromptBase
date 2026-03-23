import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateImportJobDto } from './create-import-job.dto';
import { CreateExportJobDto } from './create-export-job.dto';

function toImportDto(plain: Record<string, unknown>) {
  return plainToInstance(CreateImportJobDto, plain);
}

function toExportDto(plain: Record<string, unknown>) {
  return plainToInstance(CreateExportJobDto, plain);
}

describe('CreateImportJobDto', () => {
  it('should pass with valid format', async () => {
    const errors = await validate(toImportDto({ format: 'JSON' }));
    expect(errors).toHaveLength(0);
  });

  it('should fail when format is missing', async () => {
    const errors = await validate(toImportDto({}));
    expect(errors.find((e) => e.property === 'format')).toBeDefined();
  });

  it('should fail when format is invalid', async () => {
    const errors = await validate(toImportDto({ format: 'XML' }));
    expect(errors.find((e) => e.property === 'format')).toBeDefined();
  });
});

describe('CreateExportJobDto', () => {
  it('should pass with valid format', async () => {
    const errors = await validate(toExportDto({ format: 'CSV' }));
    expect(errors).toHaveLength(0);
  });

  it('should pass with all optional fields', async () => {
    const errors = await validate(toExportDto({
      format: 'JSON',
      folderId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
      search: 'test',
    }));
    expect(errors).toHaveLength(0);
  });

  it('should fail when format is invalid', async () => {
    const errors = await validate(toExportDto({ format: 'YAML' }));
    expect(errors.find((e) => e.property === 'format')).toBeDefined();
  });

  it('should fail when folderId is not UUID', async () => {
    const errors = await validate(toExportDto({ format: 'JSON', folderId: 'bad' }));
    expect(errors.find((e) => e.property === 'folderId')).toBeDefined();
  });
});
