/* eslint-disable @typescript-eslint/naming-convention */ // node-redis does not follow eslint naming convention
type PropertyName = `${'@' | '$.'}${string}`;

interface LoadField {
  identifier: PropertyName;
  AS?: string;
}

export const LOAD_FIELDS: LoadField[] = [
  { identifier: '@z', AS: 'z' },
  { identifier: '@x', AS: 'x' },
  { identifier: '@y', AS: 'y' },
  { identifier: '$.kit', AS: 'kit' },
  { identifier: '$.state', AS: 'state' },
  { identifier: '$.states', AS: 'states' },
  { identifier: '$.createdAt', AS: 'createdAt' },
  { identifier: '$.updatedAt', AS: 'updatedAt' },
  { identifier: '$.renderedAt', AS: 'renderedAt' },
  { identifier: '$.updateCount', AS: 'updateCount' },
  { identifier: '$.renderCount', AS: 'renderCount' },
  { identifier: '$.skipCount', AS: 'skipCount' },
  { identifier: '$.geoshape', AS: 'geoshape' },
  { identifier: '$.coordinates', AS: 'coordinates' },
];
/* eslint-enable @typescript-eslint/naming-convention */

export const transformDocument = (input: Record<string, string>): Record<string, string | number> => {
  const result: Record<string, string | number> = {};

  Object.entries(input).forEach(([key, value]) => {
    // remove square brackets, extra slashes, and quotes
    const cleanedValue = value
      .replace(/^\[|\]$/g, '')
      .replace(/\\/g, '')
      .replace(/^"|"$/g, '');

    // attempt to convert to a number
    const numberValue = Number(cleanedValue);

    // if it's a valid number, use it; otherwise, keep it as a string
    result[key] = isNaN(numberValue) ? cleanedValue : numberValue;
  });

  return result;
};
