import { describe, expect, it } from 'vitest';
import { EMPTY_OPERATION_FORM } from '../operationPayload';
import {
  OPERATION_FIELD_PERMISSION_DEFINITIONS,
  canEditOperationField,
  operationFieldPermission,
} from '../operationFieldPermissions';

describe('operation field permissions', () => {
  it('defines one distinct permission for every persisted form field', () => {
    const formFields = Object.keys(EMPTY_OPERATION_FORM).sort();
    const permissionFields = OPERATION_FIELD_PERMISSION_DEFINITIONS
      .map((definition) => definition.field)
      .sort();

    expect(permissionFields).toEqual(formFields);
    expect(new Set(OPERATION_FIELD_PERMISSION_DEFINITIONS.map((definition) => definition.key)).size)
      .toBe(formFields.length);
  });

  it('uses a stable permission key for a field', () => {
    expect(operationFieldPermission('operations_manager'))
      .toBe('operations.field.operations_manager.edit');
  });

  it('never lets a permission for one field edit another field', () => {
    const permissions = [operationFieldPermission('operations_manager')];

    expect(canEditOperationField(permissions, 'operations_manager')).toBe(true);
    expect(canEditOperationField(permissions, 'project_manager')).toBe(false);
    expect(canEditOperationField(permissions, 'name')).toBe(false);
  });

  it('lets the creation permission populate a new operation only', () => {
    expect(canEditOperationField(['operations.create'], 'name', true)).toBe(true);
    expect(canEditOperationField(['operations.create'], 'name', false)).toBe(false);
  });
});
