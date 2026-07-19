import { describe, expect, it } from 'vitest';
import { filterOperations, sortOperations, type OperationFilters } from '../operationFilters';

const operations = [
  {
    id: '1', name: 'Clairoix Centre', stage: '2', department: '60', commune: 'Clairoix', operations_manager: 'COP-A',
    project_manager: 'CTX-A', promoter_name: null, operation_type: 'MOD', certification: 'NF Habitat HQE',
    contractual_delivery_date: '2026-06-30', expected_delivery_date: '2026-07-31', actual_delivery_date: null,
  },
  {
    id: '2', name: 'Amiens Hoche', stage: '3', department: '80', commune: 'Amiens', operations_manager: 'COP-B',
    project_manager: 'CTX-B', promoter_name: 'Promoteur X', operation_type: 'VEFA', certification: 'BBCA',
    contractual_delivery_date: '2027-01-15', expected_delivery_date: '2027-02-15', actual_delivery_date: '2027-02-10',
  },
  {
    id: '3', name: 'Clairoix Ferme', stage: '2', department: '60', commune: 'Clairoix', operations_manager: 'COP-B',
    project_manager: 'CTX-C', promoter_name: null, operation_type: 'CR/démol', certification: null,
    contractual_delivery_date: null, expected_delivery_date: null, actual_delivery_date: null,
  },
];

const emptyFilters: OperationFilters = {
  stages: [], departments: [], communes: [], cops: [], ctxs: [], promoters: [], operationTypes: [], labels: [],
  deliveryFrom: '', deliveryTo: '', query: '',
};

describe('filterOperations', () => {
  it('cumule plusieurs valeurs dans un filtre et plusieurs critères entre eux', () => {
    const result = filterOperations(operations, {
      ...emptyFilters,
      stages: ['2', '3'],
      departments: ['60'],
      communes: ['Clairoix'],
      cops: ['COP-A', 'COP-B'],
    });
    expect(result.map((operation) => operation.id)).toEqual(['1', '3']);
  });

  it('filtre promoteur, type, label et intervalle de livraison', () => {
    const result = filterOperations(operations, {
      ...emptyFilters,
      promoters: ['Promoteur X'],
      operationTypes: ['VEFA'],
      labels: ['BBCA'],
      deliveryFrom: '2027-01-01',
      deliveryTo: '2027-12-31',
    });
    expect(result.map((operation) => operation.id)).toEqual(['2']);
  });

  it('recherche sans erreur dans les champs nuls', () => {
    expect(filterOperations(operations, { ...emptyFilters, query: 'ferme' }).map((operation) => operation.id)).toEqual(['3']);
    expect(filterOperations(operations, { ...emptyFilters, query: 'introuvable' })).toEqual([]);
  });
});

describe('sortOperations', () => {
  it('trie les valeurs textuelles et place les valeurs nulles à la fin', () => {
    expect(sortOperations(operations, 'promoter_name', 'asc').map((operation) => operation.id)).toEqual(['2', '1', '3']);
  });
});
