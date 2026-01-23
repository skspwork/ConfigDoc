import { describe, test, expect } from 'vitest';
import {
  sortTagsByOrder,
  reorderFields,
  detectTagChanges,
  detectFieldChanges
} from '../../lib/configManagerUtils';

describe('sortTagsByOrder', () => {
  test('sorts tags according to availableTagsOrder', () => {
    const tags = ['tag3', 'tag1', 'tag2'];
    const order = ['tag1', 'tag2', 'tag3'];

    const result = sortTagsByOrder(tags, order);

    expect(result).toEqual(['tag1', 'tag2', 'tag3']);
  });

  test('places tags not in order list at the end', () => {
    const tags = ['unknown', 'tag1', 'tag2'];
    const order = ['tag1', 'tag2'];

    const result = sortTagsByOrder(tags, order);

    expect(result).toEqual(['tag1', 'tag2', 'unknown']);
  });

  test('handles multiple unknown tags', () => {
    const tags = ['unknown2', 'tag1', 'unknown1'];
    const order = ['tag1', 'tag2'];

    const result = sortTagsByOrder(tags, order);

    // Unknown tags should be at the end, maintaining their relative order
    expect(result[0]).toBe('tag1');
    expect(result.slice(1)).toContain('unknown1');
    expect(result.slice(1)).toContain('unknown2');
  });

  test('returns empty array for empty input', () => {
    const result = sortTagsByOrder([], ['tag1', 'tag2']);

    expect(result).toEqual([]);
  });

  test('handles empty order list', () => {
    const tags = ['tag1', 'tag2'];
    const result = sortTagsByOrder(tags, []);

    // All tags are "unknown" so order is preserved
    expect(result.length).toBe(2);
    expect(result).toContain('tag1');
    expect(result).toContain('tag2');
  });

  test('does not mutate original array', () => {
    const tags = ['tag3', 'tag1'];
    const order = ['tag1', 'tag2', 'tag3'];
    const original = [...tags];

    sortTagsByOrder(tags, order);

    expect(tags).toEqual(original);
  });
});

describe('reorderFields', () => {
  test('reorders fields according to newFieldKeys', () => {
    const fields = {
      '備考': 'note value',
      '説明': 'description value'
    };
    const newFieldKeys = ['説明', '備考'];

    const result = reorderFields(fields, newFieldKeys);

    expect(Object.keys(result)).toEqual(['説明', '備考']);
    expect(result['説明']).toBe('description value');
    expect(result['備考']).toBe('note value');
  });

  test('adds missing fields with empty strings', () => {
    const fields = {
      '説明': 'description value'
    };
    const newFieldKeys = ['説明', '備考', '例'];

    const result = reorderFields(fields, newFieldKeys);

    expect(result).toEqual({
      '説明': 'description value',
      '備考': '',
      '例': ''
    });
  });

  test('removes fields not in newFieldKeys', () => {
    const fields = {
      '説明': 'description value',
      '備考': 'note value',
      '古いフィールド': 'old value'
    };
    const newFieldKeys = ['説明', '備考'];

    const result = reorderFields(fields, newFieldKeys);

    expect(result).toEqual({
      '説明': 'description value',
      '備考': 'note value'
    });
    expect(result['古いフィールド']).toBeUndefined();
  });

  test('handles empty fields object', () => {
    const result = reorderFields({}, ['説明', '備考']);

    expect(result).toEqual({
      '説明': '',
      '備考': ''
    });
  });

  test('handles empty newFieldKeys', () => {
    const fields = {
      '説明': 'description value',
      '備考': 'note value'
    };

    const result = reorderFields(fields, []);

    expect(result).toEqual({});
  });
});

describe('detectTagChanges', () => {
  test('detects when tags are added', () => {
    const oldTags = ['tag1'];
    const newTags = ['tag1', 'tag2'];

    expect(detectTagChanges(oldTags, newTags)).toBe(true);
  });

  test('detects when tags are removed', () => {
    const oldTags = ['tag1', 'tag2'];
    const newTags = ['tag1'];

    expect(detectTagChanges(oldTags, newTags)).toBe(true);
  });

  test('detects when tag order changes', () => {
    const oldTags = ['tag1', 'tag2'];
    const newTags = ['tag2', 'tag1'];

    expect(detectTagChanges(oldTags, newTags)).toBe(true);
  });

  test('detects when tag values change', () => {
    const oldTags = ['tag1', 'tag2'];
    const newTags = ['tag1', 'tag3'];

    expect(detectTagChanges(oldTags, newTags)).toBe(true);
  });

  test('returns false when tags are identical', () => {
    const oldTags = ['tag1', 'tag2'];
    const newTags = ['tag1', 'tag2'];

    expect(detectTagChanges(oldTags, newTags)).toBe(false);
  });

  test('returns false for empty arrays', () => {
    expect(detectTagChanges([], [])).toBe(false);
  });

  test('detects change from empty to non-empty', () => {
    expect(detectTagChanges([], ['tag1'])).toBe(true);
  });

  test('detects change from non-empty to empty', () => {
    expect(detectTagChanges(['tag1'], [])).toBe(true);
  });
});

describe('detectFieldChanges', () => {
  test('detects when field value changes', () => {
    const oldFields = {
      '説明': 'old description'
    };
    const newFields = {
      '説明': 'new description'
    };

    expect(detectFieldChanges(oldFields, newFields)).toBe(true);
  });

  test('detects when field is added', () => {
    const oldFields = {
      '説明': 'description'
    };
    const newFields = {
      '説明': 'description',
      '備考': 'note'
    };

    expect(detectFieldChanges(oldFields, newFields)).toBe(true);
  });

  test('detects when field is removed', () => {
    const oldFields = {
      '説明': 'description',
      '備考': 'note'
    };
    const newFields = {
      '説明': 'description'
    };

    expect(detectFieldChanges(oldFields, newFields)).toBe(true);
  });

  test('treats empty string and missing key as different', () => {
    const oldFields = {
      '説明': 'description'
    };
    const newFields = {
      '説明': 'description',
      '備考': ''
    };

    expect(detectFieldChanges(oldFields, newFields)).toBe(false);
  });

  test('returns false when fields are identical', () => {
    const oldFields = {
      '説明': 'description',
      '備考': 'note'
    };
    const newFields = {
      '説明': 'description',
      '備考': 'note'
    };

    expect(detectFieldChanges(oldFields, newFields)).toBe(false);
  });

  test('returns false for empty objects', () => {
    expect(detectFieldChanges({}, {})).toBe(false);
  });

  test('handles field order differences', () => {
    const oldFields = {
      '説明': 'description',
      '備考': 'note'
    };
    const newFields = {
      '備考': 'note',
      '説明': 'description'
    };

    // Field order doesn't matter, only values
    expect(detectFieldChanges(oldFields, newFields)).toBe(false);
  });

  test('detects when value changes from non-empty to empty', () => {
    const oldFields = {
      '説明': 'description'
    };
    const newFields = {
      '説明': ''
    };

    expect(detectFieldChanges(oldFields, newFields)).toBe(true);
  });

  test('detects when value changes from empty to non-empty', () => {
    const oldFields = {
      '説明': ''
    };
    const newFields = {
      '説明': 'description'
    };

    expect(detectFieldChanges(oldFields, newFields)).toBe(true);
  });
});
